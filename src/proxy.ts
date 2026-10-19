import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "crj_session";

// Early navigation redirect only; real authorization stays in server layouts
// and server actions after verifying the database-backed session.
export function proxy(request: NextRequest) {
  // The session cookie is host-bound. Authenticate on the canonical storefront
  // instead of signing in on a temporary Vercel deployment alias and losing
  // the cookie when the browser is redirected to the production domain.
  const authPages = new Set(["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"]);
  if (authPages.has(request.nextUrl.pathname) && request.method === "GET") {
    try {
      const canonical = new URL(process.env.APP_URL ?? "");
      if (canonical.protocol === "https:" && canonical.origin !== new URL(request.url).origin) {
        const target = new URL(request.nextUrl.pathname + request.nextUrl.search, canonical.origin);
        return NextResponse.redirect(target, 307);
      }
    } catch {
      // Missing or invalid APP_URL: preserve the current host.
    }
  }

  if (request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/login", "/register", "/forgot-password", "/reset-password", "/verify-email"],
};
