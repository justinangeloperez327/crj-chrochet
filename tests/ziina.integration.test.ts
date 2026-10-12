import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test, mock } from "node:test";
import { requireDb } from "../src/lib/db";
import { createZiinaCheckoutSession, reconcileZiinaIntent } from "../src/lib/payments/ziina";
import { syncZiinaRefund } from "../src/lib/payments/refund-service";

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
    paymentAttempts: { create: { provider: "ZIINA", externalId: randomUUID(), status: "PENDING", amount: 200 } },
    inventoryMovement: { create: { variantId: variant.id, type: "RESERVATION", quantity: 2 } },
  }, include: { paymentAttempts: true } });
  return { db, product, variant, order, externalId: order.paymentAttempts[0].externalId, cleanup: async () => {
    await db.order.delete({ where: { id: order.id } });
    await db.product.delete({ where: { id: product.id } });
  } };
}


function configure() {
  const values = { ZIINA_ACCESS_TOKEN: "fixture", ZIINA_ACCOUNT_ID: "fixture-merchant", ZIINA_WEBHOOK_SECRET: "fixture-secret", CHECKOUT_RETURN_SECRET: "fixture-return-secret", APP_URL: "https://store.example", ZIINA_TEST_MODE: "true" };
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  Object.assign(process.env, values);
  return () => { mock.restoreAll(); for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } };
}

test("Ziina checkout uses persisted money and verified API completion is idempotent", async () => {
  const restore = configure(); const f = await fixture(); const id = randomUUID(); let posts = 0; let status = "requires_payment_instrument";
  await f.db.paymentAttempt.deleteMany({ where: { orderId: f.order.id } });
  mock.method(globalThis, "fetch", async (_url: unknown, options: RequestInit) => {
    if (options.method === "POST") {
      posts++; const body = JSON.parse(String(options.body));
      assert.equal(body.amount, 20000); assert.equal(body.currency_code, "AED"); assert.equal(body.test, true); assert.equal(body.allow_tips, false); assert.equal(body.operation_id, undefined);
      assert.equal(await f.db.paymentAttempt.count({ where: { orderId: f.order.id, status: "CREATED" } }), 1);
    }
    return Response.json({ id, account_id: "fixture-merchant", amount: 20000, currency_code: "AED", status, redirect_url: "https://pay.ziina.com/fixture" });
  });
  try {
    const checkout = await createZiinaCheckoutSession(f.order.id);
    assert.equal(checkout.id, id); await createZiinaCheckoutSession(f.order.id); assert.equal(posts, 1);
    status = "completed";
    await Promise.all([reconcileZiinaIntent(id), reconcileZiinaIntent(id)]);
    assert.equal((await f.db.order.findUniqueOrThrow({ where: { id: f.order.id } })).paymentStatus, "PAID");
    assert.equal(await f.db.notificationOutbox.count({ where: { orderId: f.order.id, type: "ORDER_CONFIRMED" } }), 1);
    const refund = await f.db.refund.create({ data: { id: randomUUID(), provider: "ZIINA", orderId: f.order.id, paymentAttemptId: (await f.db.paymentAttempt.findUniqueOrThrow({ where: { externalId: id } })).id, amount: 200, reason: "Test", cancelOrder: true } });
    await f.db.refund.update({ where: { id: refund.id }, data: { externalId: refund.id } });
    const data = { id: refund.id, payment_intent_id: id, amount: 20000, currency_code: "AED", status: "completed" as const };
    await assert.rejects(syncZiinaRefund({ ...data, amount: 1 }), /amount or currency/);
    await Promise.all([syncZiinaRefund(data), syncZiinaRefund(data)]);
    assert.equal((await f.db.order.findUniqueOrThrow({ where: { id: f.order.id } })).paymentStatus, "REFUNDED");
    assert.equal((await f.db.productVariant.findUniqueOrThrow({ where: { id: f.variant.id } })).stockReserved, 0);
  } finally { restore(); await f.cleanup(); }
});

test("ambiguous Ziina creation retains reservation and does not repeat the POST", async () => {
  const restore = configure(); const f = await fixture(); let posts = 0;
  await f.db.paymentAttempt.deleteMany({ where: { orderId: f.order.id } });
  mock.method(globalThis, "fetch", async () => { posts++; throw new Error("network timeout"); });
  try {
    await assert.rejects(createZiinaCheckoutSession(f.order.id));
    await assert.rejects(createZiinaCheckoutSession(f.order.id)); assert.equal(posts, 1);
    assert.equal((await f.db.productVariant.findUniqueOrThrow({ where: { id: f.variant.id } })).stockReserved, 2);
    const attempt = await f.db.paymentAttempt.findFirstOrThrow({ where: { orderId: f.order.id } });
    mock.restoreAll(); const id = randomUUID();
    mock.method(globalThis, "fetch", async () => Response.json({ id, account_id: "fixture-merchant", amount: 20000, currency_code: "AED", status: "completed", message: "CRJ payment " + attempt.id }));
    await reconcileZiinaIntent(id);
    assert.equal((await f.db.order.findUniqueOrThrow({ where: { id: f.order.id } })).paymentStatus, "PAID");
  } finally { restore(); await f.cleanup(); }
});
