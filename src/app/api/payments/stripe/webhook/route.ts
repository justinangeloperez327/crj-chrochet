import { NextResponse } from "next/server";

import { getStripe } from "@/lib/payments/stripe";
import { processStripeWebhook } from "@/lib/payments/stripe-webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 503 },
    );
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }
  try {
    await processStripeWebhook(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Webhook processing unavailable." }, { status: 500 });
  }
}
