import { NextResponse } from "next/server";

import { AuthError, registerCustomer } from "@/lib/auth/auth-service";
import { enforceAuthRate, sameOriginForm , publicRequestOrigin } from "@/lib/auth/security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOriginForm(request)) return new Response("Forbidden", { status: 403 });
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await enforceAuthRate(request, "register", email, 5);
    await registerCustomer({ name, email, password });
    return NextResponse.redirect(new URL("/verify-email?sent=1", publicRequestOrigin(request)), 303);
  } catch (error) {
    const message =
      error instanceof AuthError
        ? error.message
        : error instanceof Error && error.message.includes("DATABASE_URL")
          ? "Account registration is not configured yet."
          : "Unable to create your account.";

    const url = new URL("/register", publicRequestOrigin(request));
    url.searchParams.set("error", message);
    url.searchParams.set("email", email);

    return NextResponse.redirect(url, 303);
  }
}
