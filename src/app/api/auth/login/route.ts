import { NextResponse } from "next/server";

import { AuthError, loginWithPassword } from "@/lib/auth/auth-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/account"));

  try {
    const user = await loginWithPassword(email, password);
    const destination =
      user.role === "ADMIN" && next === "/account" ? "/admin" : next;

    return NextResponse.redirect(new URL(destination, request.url), 303);
  } catch (error) {
    const message =
      error instanceof AuthError
        ? error.message
        : error instanceof Error && error.message.includes("DATABASE_URL")
          ? "Account sign-in is not configured yet."
          : "Unable to sign in.";

    const url = new URL("/login", request.url);
    url.searchParams.set("error", message);
    url.searchParams.set("next", next);

    return NextResponse.redirect(url, 303);
  }
}

function safeNext(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/account";
  if (value.startsWith("/api")) return "/account";
  return value;
}
