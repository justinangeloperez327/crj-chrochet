import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/auth/email-tokens";
import { sameOriginForm } from "@/lib/auth/security";
import { enforceAuthRate } from "@/lib/auth/security";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOriginForm(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  try {
    await enforceAuthRate(request, "reset", token.slice(0, 50), 8);
    const success = await resetPasswordWithToken(token, password);
    return NextResponse.redirect(
      new URL(success ? "/login?reset=1" : "/forgot-password?error=expired", request.url),
      303,
    );
  } catch {
    return NextResponse.redirect(new URL("/forgot-password?error=expired", request.url), 303);
  }
}
