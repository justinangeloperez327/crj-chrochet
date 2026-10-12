import { NextResponse } from "next/server";

import { deleteCurrentSession } from "@/lib/auth/session";

import { sameOriginForm , publicRequestOrigin } from "@/lib/auth/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOriginForm(request)) return new Response("Forbidden", { status: 403 });
  await deleteCurrentSession();
  return NextResponse.redirect(new URL("/", publicRequestOrigin(request)), 303);
}
