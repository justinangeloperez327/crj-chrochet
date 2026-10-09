import { NextResponse } from "next/server";

import { requireDb } from "@/lib/db";
import { expireStripeCheckout } from "@/lib/orders/order-lifecycle";
import {
  getStripe,
  verifyCheckoutReturn,
} from "@/lib/payments/stripe";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order_id") ?? "";
  const signature = url.searchParams.get("sig") ?? "";

  if (!orderId || !signature) {
    return NextResponse.redirect(new URL("/checkout?cancelled=1", request.url));
  }

  let customPaymentToken: string | null = null;

  try {
    if (!verifyCheckoutReturn(orderId, signature)) {
      return NextResponse.json(
        { error: "Invalid checkout return." },
        { status: 403 },
      );
    }

    const db = requireDb();
    const customBouquet = await db.customBouquetRequest.findUnique({
      where: { orderId },
      select: { paymentToken: true },
    });
    customPaymentToken = customBouquet?.paymentToken ?? null;

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

    return cancellationRedirect(request.url, customPaymentToken);
  } catch (error) {
    console.error("Checkout cancellation failed.", error);
    return cancellationRedirect(request.url, customPaymentToken);
  }
}

function cancellationRedirect(
  requestUrl: string,
  customPaymentToken: string | null,
) {
  if (customPaymentToken) {
    return NextResponse.redirect(
      new URL(
        `/custom-bouquets/pay/${encodeURIComponent(customPaymentToken)}?cancelled=1`,
        requestUrl,
      ),
    );
  }

  return NextResponse.redirect(new URL("/checkout?cancelled=1", requestUrl));
}
