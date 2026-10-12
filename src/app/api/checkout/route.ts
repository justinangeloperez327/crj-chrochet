import { sameOriginForm } from "@/lib/auth/security";
import { NextResponse } from "next/server";
import { enforceAuthRate } from "@/lib/auth/security";

import {
  cancelPendingOrder,
} from "@/lib/orders/order-lifecycle";
import {
  createPendingOrder,
  OrderCreationError,
  type CreateOrderInput,
} from "@/lib/orders/order-service";
import { createHostedCheckout } from "@/lib/payments/checkout-service";
import { ZiinaError } from "@/lib/payments/ziina-client";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOriginForm(request)) return new Response("Forbidden", { status: 403 });
  let orderId: string | null = null;

  try {
    const input = (await request.json()) as CreateOrderInput;
    if (!input || typeof input !== "object") throw new OrderCreationError("Invalid checkout request.");
    await enforceAuthRate(request, "checkout", String(input.email ?? ""), 20);
    const order = await createPendingOrder(input);
    orderId = order.id;

    const checkout = await createHostedCheckout(order.id);

    return NextResponse.json({
      order: {
        orderNumber: order.orderNumber,
        total: order.total,
        currency: order.currency,
        deliveryAmount: order.deliveryAmount,
      },
      checkoutUrl: checkout.url,
    });
  } catch (error) {
    if (orderId && !(error instanceof ZiinaError && error.ambiguous)) {
      await cancelPendingOrder(
        orderId,
        "Released because payment session creation failed",
      ).catch(() => undefined);
    }

    if (error instanceof ZiinaError) return NextResponse.json({ error: error.message }, { status: error.status >= 500 ? 503 : error.status });

    if (error instanceof OrderCreationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    if (
      error instanceof Error &&
      (error.message.includes("DATABASE_URL") ||
        error.message.includes("STRIPE_SECRET_KEY") ||
        error.message.includes("APP_URL") ||
        error.message.includes("CHECKOUT_RETURN_SECRET"))
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 503 },
      );
    }

    console.error("Checkout creation failed.", error);

    return NextResponse.json(
      { error: "Unable to start payment. Please try again." },
      { status: 500 },
    );
  }
}
