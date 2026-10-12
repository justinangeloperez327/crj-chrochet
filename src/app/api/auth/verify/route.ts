import { NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/auth/email-tokens";
import { sameOriginForm } from "@/lib/auth/security";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOriginForm(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  const verified = await verifyEmailToken(token);
  const result = NextResponse.redirect(
    new URL(verified ? "/login?verified=1" : "/verify-email?error=1", request.url),
    303,
  );
  result.headers.set("Cache-Control", "no-store");
  result.headers.set("Referrer-Policy", "no-referrer");
  return result;
}
