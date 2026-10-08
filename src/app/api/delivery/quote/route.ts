import { NextResponse } from "next/server";

import { getDeliveryRate } from "@/lib/delivery/delivery-service";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { emirate?: string };
    const emirate = body.emirate?.trim();

    if (!emirate) {
      return NextResponse.json(
        { error: "Select an emirate." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      quote: {
        emirate,
        amount: getDeliveryRate(emirate),
        currency: "AED",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Delivery is not configured for the selected emirate." },
      { status: 400 },
    );
  }
}
