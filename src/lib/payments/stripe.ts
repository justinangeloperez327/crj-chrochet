import { createHmac, timingSafeEqual } from "node:crypto";

import Stripe from "stripe";

import { requireDb } from "@/lib/db";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  stripeClient ??= new Stripe(key);
  return stripeClient;
}

export async function createStripeCheckoutSession(orderId: string) {
  const db = requireDb();
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) throw new Error("Order not found.");
  if (order.status !== "PENDING_PAYMENT") {
    throw new Error("Only pending-payment orders can start checkout.");
  }

  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  if (!appUrl) throw new Error("APP_URL is not configured.");

  const stripe = getStripe();
  const cancelSignature = signCheckoutReturn(order.id);
  const expiresAt =
    order.reservationExpiresAt ??
    new Date(Date.now() + 45 * 60 * 1000);

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: order.orderNumber,
    customer_email: order.customerEmail,
    success_url: `${appUrl}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/api/payments/stripe/cancel?order_id=${encodeURIComponent(order.id)}&sig=${cancelSignature}`,
    expires_at: Math.floor(expiresAt.getTime() / 1000),
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
    },
    payment_intent_data: {
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: order.currency.toLowerCase(),
          unit_amount: Math.round(Number(order.total) * 100),
          product_data: {
            name: `Handmade Blooms order ${order.orderNumber}`,
            description: `${order.items.length} handmade bloom selection${order.items.length === 1 ? "" : "s"} including delivery`,
          },
        },
      },
    ],
  });

  if (!session.url) {
    throw new Error("Stripe did not return a Checkout URL.");
  }

  try {
    await db.paymentAttempt.create({
      data: {
        orderId: order.id,
        provider: "STRIPE",
        externalId: session.id,
        status: "PENDING",
        amount: order.total,
        currency: order.currency,
        checkoutUrl: session.url,
        expiresAt: new Date(session.expires_at * 1000),
      },
    });
  } catch (error) {
    await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
    throw error;
  }

  return {
    id: session.id,
    url: session.url,
    expiresAt: new Date(session.expires_at * 1000),
  };
}


export function signCheckoutReturn(orderId: string) {
  const secret = process.env.CHECKOUT_RETURN_SECRET;

  if (!secret) {
    throw new Error("CHECKOUT_RETURN_SECRET is not configured.");
  }

  return createHmac("sha256", secret).update(orderId).digest("hex");
}

export function verifyCheckoutReturn(
  orderId: string,
  signature: string,
) {
  const expected = signCheckoutReturn(orderId);
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(signature, "hex");

  return left.length === right.length && timingSafeEqual(left, right);
}
