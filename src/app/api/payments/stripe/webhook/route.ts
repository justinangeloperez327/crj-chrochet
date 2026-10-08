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

  try {
    const payload = await request.text();
    const event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      secret,
    );

    await processStripeWebhook(event);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook verification/processing failed.", error);
    return NextResponse.json(
      { error: "Invalid webhook." },
      { status: 400 },
    );
  }
}
