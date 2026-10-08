import { NextResponse } from "next/server";

import {
  cancelPendingOrder,
} from "@/lib/orders/order-lifecycle";
import {
  createPendingOrder,
  OrderCreationError,
  type CreateOrderInput,
} from "@/lib/orders/order-service";
import { createStripeCheckoutSession } from "@/lib/payments/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let orderId: string | null = null;

  try {
    const input = (await request.json()) as CreateOrderInput;
    const order = await createPendingOrder(input);
    orderId = order.id;

    const checkout = await createStripeCheckoutSession(order.id);

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
    if (orderId) {
      await cancelPendingOrder(
        orderId,
        "Released because payment session creation failed",
      ).catch(() => undefined);
    }

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
