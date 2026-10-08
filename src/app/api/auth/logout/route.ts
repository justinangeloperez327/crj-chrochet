import { NextResponse } from "next/server";

import { deleteCurrentSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await deleteCurrentSession();
  return NextResponse.redirect(new URL("/", request.url), 303);
}
