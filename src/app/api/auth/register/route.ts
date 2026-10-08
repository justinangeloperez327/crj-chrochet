import { NextResponse } from "next/server";

import { AuthError, registerCustomer } from "@/lib/auth/auth-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    await registerCustomer({ name, email, password });
    return NextResponse.redirect(new URL("/account", request.url), 303);
  } catch (error) {
    const message =
      error instanceof AuthError
        ? error.message
        : error instanceof Error && error.message.includes("DATABASE_URL")
          ? "Account registration is not configured yet."
          : "Unable to create your account.";

    const url = new URL("/register", request.url);
    url.searchParams.set("error", message);
    url.searchParams.set("email", email);

    return NextResponse.redirect(url, 303);
  }
}
