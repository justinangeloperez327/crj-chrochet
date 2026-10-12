import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test, mock } from "node:test";
import type Stripe from "stripe";
import { requireDb } from "../src/lib/db";
import { expireStripeCheckout, markOrderPaidFromStripe, markStripePaymentFailed } from "../src/lib/orders/order-lifecycle";
import { updateDeliveryFulfillment } from "../src/lib/orders/fulfillment-service";
import { syncStripeRefund } from "../src/lib/payments/refund-service";
import { getOrderQuote } from "../src/lib/orders/order-service";
import { getStripe, createStripeCheckoutSession } from "../src/lib/payments/stripe";
import { enforceAuthRate } from "../src/lib/auth/security";

function testDb() {
  const url = new URL(process.env.DATABASE_URL ?? "http://invalid");
  assert.equal(url.pathname, "/crj_test", "Use disposable crj_test database only");
  return requireDb();
}

async function fixture() {
  const db = testDb();
  const key = randomUUID();
  const product = await db.product.create({ data: {
    slug: key, name: "Test bouquet", description: "Isolated integration fixture", flowerType: "Tulip", basePrice: 100, status: "ACTIVE",
    variants: { create: { sku: key, name: "Pink", fulfillmentMode: "READY_STOCK", price: 100, stockOnHand: 10, stockReserved: 2 } },
  }, include: { variants: true } });
  const variant = product.variants[0];
  const order = await db.order.create({ data: {
    orderNumber: key, customerEmail: "integration@example.invalid", subtotal: 200, total: 200,
    reservationExpiresAt: new Date(Date.now() + 600000),
    items: { create: { productId: product.id, variantId: variant.id, productName: product.name, sku: key, variantName: variant.name, quantity: 2, reservedStockQuantity: 2, unitPrice: 100, lineTotal: 200 } },
    paymentAttempts: { create: { provider: "STRIPE", externalId: "cs_" + key, status: "PENDING", amount: 200 } },
    inventoryMovement: { create: { variantId: variant.id, type: "RESERVATION", quantity: 2 } },
  }, include: { paymentAttempts: true } });
  return { db, product, variant, order, externalId: order.paymentAttempts[0].externalId, cleanup: async () => {
    await db.order.delete({ where: { id: order.id } });
    await db.product.delete({ where: { id: product.id } });
  } };
}

test("concurrent paid callbacks confirm once and stale expiry/failure preserve payment", async () => {
  const f = await fixture();
  try {
    await Promise.all(Array.from({ length: 4 }, () => markOrderPaidFromStripe(f.externalId, "pi_" + f.order.id)));
    assert.equal(await f.db.notificationOutbox.count({ where: { orderId: f.order.id, type: "ORDER_CONFIRMED" } }), 1);
    await expireStripeCheckout(f.externalId);
    await markStripePaymentFailed(f.externalId);
    const order = await f.db.order.findUniqueOrThrow({ where: { id: f.order.id } });
    assert.equal(order.paymentStatus, "PAID");
    assert.equal((await f.db.paymentAttempt.findUniqueOrThrow({ where: { externalId: f.externalId } })).status, "PAID");
    assert.equal((await f.db.productVariant.findUniqueOrThrow({ where: { id: f.variant.id } })).stockReserved, 2);
    await f.db.order.update({ where: { id: f.order.id }, data: { status: "READY", fulfillmentStatus: "READY" } });
    await Promise.all([updateDeliveryFulfillment({ orderId: f.order.id, status: "SHIPPED" }), updateDeliveryFulfillment({ orderId: f.order.id, status: "SHIPPED" })]);
    const stock = await f.db.productVariant.findUniqueOrThrow({ where: { id: f.variant.id } });
    assert.equal(stock.stockOnHand, 8);
    assert.equal(stock.stockReserved, 0);
    assert.equal(await f.db.inventoryMovement.count({ where: { orderId: f.order.id, type: "SALE" } }), 1);
    assert.equal(await f.db.notificationOutbox.count({ where: { orderId: f.order.id, type: "ORDER_SHIPPED" } }), 1);
  } finally { await f.cleanup(); }
});

test("concurrent checkout expiry releases stock exactly once", async () => {
  const f = await fixture();
  try {
    await Promise.all([expireStripeCheckout(f.externalId), expireStripeCheckout(f.externalId)]);
    assert.equal((await f.db.productVariant.findUniqueOrThrow({ where: { id: f.variant.id } })).stockReserved, 0);
    assert.equal(await f.db.inventoryMovement.count({ where: { orderId: f.order.id, type: "RELEASE" } }), 1);
    await assert.rejects(markOrderPaidFromStripe(f.externalId), /manual reconciliation/);
  } finally { await f.cleanup(); }
});

test("refund reconciliation is atomic, idempotent, and rejects mismatched money", async () => {
  const f = await fixture();
  try {
    await markOrderPaidFromStripe(f.externalId, "pi_" + f.order.id);
    const refund = await f.db.refund.create({ data: { orderId: f.order.id, paymentAttemptId: f.order.paymentAttempts[0].id, amount: 200, reason: "Test cancellation", cancelOrder: true } });
    const event = { id: "re_" + refund.id, amount: 20000, currency: "aed", status: "succeeded", metadata: { refundId: refund.id, orderId: f.order.id } } as unknown as Stripe.Refund;
    await assert.rejects(syncStripeRefund({ ...event, amount: 1 }), /amount or currency/);
    assert.equal((await f.db.refund.findUniqueOrThrow({ where: { id: refund.id } })).status, "PENDING");
    await Promise.all([syncStripeRefund(event), syncStripeRefund(event)]);
    await syncStripeRefund({ ...event, status: "pending" });
    const order = await f.db.order.findUniqueOrThrow({ where: { id: f.order.id } });
    assert.equal(order.paymentStatus, "REFUNDED");
    assert.equal(order.status, "CANCELLED");
    assert.equal(Number(order.refundedAmount), 200);
    assert.equal((await f.db.productVariant.findUniqueOrThrow({ where: { id: f.variant.id } })).stockReserved, 0);
    assert.equal(await f.db.notificationOutbox.count({ where: { orderId: f.order.id, type: "ORDER_REFUNDED" } }), 1);
  } finally { await f.cleanup(); }
});

test("quote prices come from database and invalid quantities are rejected", async () => {
  const f = await fixture();
  try {
    assert.equal((await getOrderQuote([{ productId: f.product.id, variantSku: f.variant.sku, quantity: 2 }])).total, 200);
    await assert.rejects(getOrderQuote([{ productId: f.product.id, variantSku: f.variant.sku, quantity: -1 }]));
  } finally { await f.cleanup(); }
});


test("Stripe Checkout contract uses persisted total and idempotency, with one local attempt", async () => {
  const f = await fixture();
  const previous = { key: process.env.STRIPE_SECRET_KEY, app: process.env.APP_URL, secret: process.env.CHECKOUT_RETURN_SECRET };
  process.env.STRIPE_SECRET_KEY = "sk_test_contract_fixture";
  process.env.APP_URL = "https://store.example";
  process.env.CHECKOUT_RETURN_SECRET = "contract-only-long-return-secret";
  const stripe = getStripe();
  mock.method(stripe.checkout.sessions, "create", async (params: Stripe.Checkout.SessionCreateParams, options: Stripe.RequestOptions) => {
    assert.equal(params.line_items?.[0].price_data?.unit_amount, 20000);
    assert.equal(params.line_items?.[0].price_data?.currency, "aed");
    assert.equal(params.metadata?.orderId, f.order.id);
    assert.equal(options.idempotencyKey, "checkout/" + f.order.id);
    return { id: "cs_contract_" + f.order.id, url: "https://checkout.stripe.com/test", expires_at: Math.floor(Date.now() / 1000) + 2700 };
  });
  try {
    const sessions = await Promise.all([createStripeCheckoutSession(f.order.id), createStripeCheckoutSession(f.order.id)]);
    assert.equal(sessions[0].id, sessions[1].id);
    assert.equal(await f.db.paymentAttempt.count({ where: { externalId: sessions[0].id } }), 1);
    await assert.rejects(markOrderPaidFromStripe(sessions[0].id, null, { amountTotal: 1, currency: "aed" }), /amount or currency/);
    assert.equal((await f.db.order.findUniqueOrThrow({ where: { id: f.order.id } })).paymentStatus, "PENDING");
  } finally {
    mock.restoreAll();
    for (const [name, value] of [["STRIPE_SECRET_KEY", previous.key], ["APP_URL", previous.app], ["CHECKOUT_RETURN_SECRET", previous.secret]]) {
      if (value === undefined) delete process.env[name!]; else process.env[name!] = value;
    }
    await f.cleanup();
  }
});

test("failed payment callbacks release reservations once", async () => {
  const f = await fixture();
  try {
    await Promise.all([markStripePaymentFailed(f.externalId), markStripePaymentFailed(f.externalId)]);
    assert.equal((await f.db.order.findUniqueOrThrow({ where: { id: f.order.id } })).status, "CANCELLED");
    assert.equal((await f.db.productVariant.findUniqueOrThrow({ where: { id: f.variant.id } })).stockReserved, 0);
    assert.equal(await f.db.inventoryMovement.count({ where: { orderId: f.order.id, type: "RELEASE" } }), 1);
  } finally { await f.cleanup(); }
});

test("auth throttling cannot be bypassed by changing email from the same IP", async () => {
  const db = testDb();
  const action = "test-" + randomUUID();
  const request = new Request("https://store.example/api/auth/login", { headers: { "x-vercel-forwarded-for": "192.0.2.1" } });
  await enforceAuthRate(request, action, "first@example.invalid", 1);
  await assert.rejects(enforceAuthRate(request, action, "second@example.invalid", 1), /Too many attempts/);
  await db.$disconnect();
});
