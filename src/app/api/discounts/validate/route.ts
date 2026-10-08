import { NextResponse } from "next/server";

import {
  getOrderQuote,
  OrderCreationError,
  type CheckoutLineInput,
} from "@/lib/orders/order-service";

export const runtime = "nodejs";

type DiscountRequest = {
  code?: string;
  items?: CheckoutLineInput[];
};

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as DiscountRequest;
    const quote = await getOrderQuote(input.items ?? [], input.code);

    return NextResponse.json({ quote });
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
        { error: "Discount validation requires the database connection." },
        { status: 503 },
      );
    }

    console.error("Discount validation failed.", error);

    return NextResponse.json(
      { error: "The discount could not be validated." },
      { status: 500 },
    );
  }
}
