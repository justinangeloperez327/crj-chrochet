import { NextResponse } from "next/server";

import { expireStripeCheckout } from "@/lib/orders/order-lifecycle";
import {
  getStripe,
  verifyCheckoutReturn,
} from "@/lib/payments/stripe";
import { requireDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order_id") ?? "";
  const signature = url.searchParams.get("sig") ?? "";

  if (!orderId || !signature) {
    return NextResponse.redirect(new URL("/checkout?cancelled=1", request.url));
  }

  try {
    if (!verifyCheckoutReturn(orderId, signature)) {
      return NextResponse.json({ error: "Invalid checkout return." }, { status: 403 });
    }

    const db = requireDb();
    const attempt = await db.paymentAttempt.findFirst({
      where: {
        orderId,
        provider: "STRIPE",
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    if (attempt) {
      try {
        await getStripe().checkout.sessions.expire(attempt.externalId);
        await expireStripeCheckout(attempt.externalId);
      } catch {
        const session = await getStripe().checkout.sessions.retrieve(
          attempt.externalId,
        );

        if (session.payment_status === "paid") {
          return NextResponse.redirect(
            new URL(
              `/order-confirmation?session_id=${encodeURIComponent(session.id)}`,
              request.url,
            ),
          );
        }

        if (session.status === "expired") {
          await expireStripeCheckout(attempt.externalId);
        }
      }
    }

    return NextResponse.redirect(new URL("/checkout?cancelled=1", request.url));
  } catch (error) {
    console.error("Checkout cancellation failed.", error);
    return NextResponse.redirect(new URL("/checkout?cancelled=1", request.url));
  }
}
