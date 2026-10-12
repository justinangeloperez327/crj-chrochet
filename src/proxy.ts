import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "crj_session";

// Early navigation redirect only; real authorization stays in server layouts
// and server actions after verifying the database-backed session.
export function proxy(request: NextRequest) {
  if (request.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
