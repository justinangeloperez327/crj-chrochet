import { NextResponse } from "next/server";

import {
  BouquetRequestError,
  createBouquetRequest,
  type CreateBouquetRequestInput,
} from "@/lib/bouquets/bouquet-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as CreateBouquetRequestInput;
    const bouquet = await createBouquetRequest(input);

    return NextResponse.json({ bouquet }, { status: 201 });
  } catch (error) {
    if (error instanceof BouquetRequestError) {
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
        { error: "Custom bouquet requests require the database connection." },
        { status: 503 },
      );
    }

    console.error("Custom bouquet request failed.", error);

    return NextResponse.json(
      { error: "Unable to submit the bouquet request." },
      { status: 500 },
    );
  }
}
