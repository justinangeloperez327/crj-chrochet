import { NextResponse } from "next/server";

import { AuthError, loginWithPassword } from "@/lib/auth/auth-service";
import { AuthRateLimitError, enforceAuthRate, sameOriginForm, safeAccountRedirect, publicRequestOrigin } from "@/lib/auth/security";
import { authSignInMessage, logAuthFailure } from "@/lib/auth/diagnostics";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOriginForm(request)) return new Response("Forbidden", { status: 403 });
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeAccountRedirect(String(formData.get("next") ?? "/account"));

  try {
    await enforceAuthRate(request, "login", email, 10);
    const user = await loginWithPassword(email, password);
    const destination =
      user.role === "ADMIN" && next === "/account" ? "/admin" : next;

    return NextResponse.redirect(new URL(destination, publicRequestOrigin(request)), 303);
  } catch (error) {
    if (!(error instanceof AuthError) && !(error instanceof AuthRateLimitError)) {
      logAuthFailure(error);
    }
    const message =
      error instanceof AuthError || error instanceof AuthRateLimitError
        ? error.message
        : authSignInMessage(error);

    const url = new URL("/login", publicRequestOrigin(request));
    url.searchParams.set("error", message);
    url.searchParams.set("next", next);

    return NextResponse.redirect(url, 303);
  }
}
