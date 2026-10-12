import { NextResponse } from "next/server";
import { requestAuthLink } from "@/lib/auth/email-tokens";
import { enforceAuthRate, sameOriginForm } from "@/lib/auth/security";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!sameOriginForm(request)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const type = form.get("kind") === "verify" ? "EMAIL_VERIFICATION" : "PASSWORD_RESET";
  const email = String(form.get("email") ?? "").slice(0, 254);
  try {
    await enforceAuthRate(request, "email-" + type, email, 4);
    await requestAuthLink(email, type);
  } catch (error) {
    console.error("Account link request unavailable:", error instanceof Error ? error.name : "unknown");
  }
  return NextResponse.redirect(
    new URL(type === "EMAIL_VERIFICATION" ? "/verify-email?sent=1" : "/forgot-password?sent=1", request.url),
    303,
  );
}
