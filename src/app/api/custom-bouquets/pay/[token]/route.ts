import { NextResponse } from "next/server";

import {
  CustomBouquetCheckoutError,
  startCustomBouquetCheckout,
  type CustomBouquetDeliveryInput,
} from "@/lib/bouquets/custom-checkout-service";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ token: string }>;
};

export async function POST(request: Request, { params }: Props) {
  const { token } = await params;

  try {
    const delivery = (await request.json()) as CustomBouquetDeliveryInput;
    const checkout = await startCustomBouquetCheckout(token, delivery);

    return NextResponse.json(checkout);
  } catch (error) {
    if (error instanceof CustomBouquetCheckoutError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    if (
      error instanceof Error &&
      (
        error.message.includes("DATABASE_URL") ||
        error.message.includes("STRIPE_SECRET_KEY") ||
        error.message.includes("APP_URL") ||
        error.message.includes("CHECKOUT_RETURN_SECRET")
      )
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 503 },
      );
    }

    console.error("Custom bouquet checkout failed.", error);

    return NextResponse.json(
      { error: "Unable to start custom bouquet payment." },
      { status: 500 },
    );
  }
}
