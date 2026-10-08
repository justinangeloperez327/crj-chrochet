import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Direct pending-order creation is disabled. Start checkout through /api/checkout.",
    },
    { status: 410 },
  );
}
