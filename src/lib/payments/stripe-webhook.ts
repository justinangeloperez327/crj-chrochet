import type Stripe from "stripe";

import { requireDb } from "@/lib/db";
import { processNotificationOutbox } from "@/lib/notifications/notification-service";
import {
  expireStripeCheckout,
  markOrderPaidFromStripe,
  markStripePaymentFailed,
} from "@/lib/orders/order-lifecycle";

export async function processStripeWebhook(event: Stripe.Event) {
  const db = requireDb();

  const alreadyProcessed = await db.paymentWebhookEvent.findUnique({
    where: { id: event.id },
    select: { id: true },
  });

  if (alreadyProcessed) return { duplicate: true };

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status === "paid") {
      await markOrderPaidFromStripe(session.id);
      await processNotificationOutbox(5).catch(() => undefined);
    }
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    await markStripePaymentFailed(session.id);
    await processNotificationOutbox(5).catch(() => undefined);
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    await expireStripeCheckout(session.id);
  }

  await db.paymentWebhookEvent.upsert({
    where: { id: event.id },
    update: {},
    create: {
      id: event.id,
      provider: "STRIPE",
      type: event.type,
    },
  });

  return { duplicate: false };
}
