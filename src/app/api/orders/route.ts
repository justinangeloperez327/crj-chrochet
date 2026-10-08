import { NextResponse } from "next/server";

import {
  createPendingOrder,
  OrderCreationError,
  type CreateOrderInput,
} from "@/lib/orders/order-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as CreateOrderInput;
    const order = await createPendingOrder(input);

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (error instanceof OrderCreationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    if (
      error instanceof Error &&
      error.message.includes("DATABASE_URL")
    ) {
      return NextResponse.json(
        {
          error:
            "Checkout persistence is not configured yet. Set DATABASE_URL and apply the database migration first.",
        },
        { status: 503 },
      );
    }

    console.error("Order creation failed.", error);

    return NextResponse.json(
      {
        error:
          "The order could not be created. Please review your basket and try again.",
      },
      { status: 500 },
    );
  }
}
