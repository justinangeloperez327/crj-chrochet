import { createHash } from "node:crypto";
import { requireDb } from "@/lib/db";

export function publicRequestOrigin(request: Request) {
  return new URL(process.env.APP_URL || request.url).origin;
}

export function sameOriginForm(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;
  try {
    const submitted = new URL(origin);
    // An Origin header must contain just an HTTP(S) origin, never a URL path.
    if (!["https:", "http:"].includes(submitted.protocol) ||
        submitted.username || submitted.password ||
        submitted.pathname !== "/" || submitted.search || submitted.hash) return false;

    const incoming = new URL(request.url);
    const configured = publicRequestOrigin(request);
    // Behind proxies, Next.js may see an internal URL. Keep the configured
    // public origin, but also recognize the actual HTTPS deployment/alias host.
    // This allows same-origin forms on Vercel aliases without trusting arbitrary
    // X-Forwarded-Host or Referer headers.
    const incomingAllowed = incoming.protocol === "https:" ||
      (process.env.NODE_ENV !== "production" && incoming.hostname === "localhost");
    return submitted.origin === configured ||
      (incomingAllowed && submitted.origin === incoming.origin);
  } catch {
    return false;
  }
}

export async function enforceAuthRate(request: Request, action: string, email: string, limit: number) {
  const db = requireDb();
  const addr = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
  const now = new Date();
  const cutoff = new Date(now.getTime() - 15 * 60_000);
  // Enforce both an IP budget and an account budget: changing email or IP
  // must not bypass the other dimension. PostgreSQL upsert resets atomically.
  for (const scope of ["ip:" + addr, "email:" + email.trim().toLowerCase()]) {
    const key = createHash("sha256").update(action + ":" + scope).digest("hex");
    const rows = await db.$queryRaw<Array<{ attempts: number }>>`
      INSERT INTO "AuthThrottle" ("key", "windowStart", "attempts") VALUES (${key}, ${now}, 1)
      ON CONFLICT ("key") DO UPDATE SET
        "attempts" = CASE WHEN "AuthThrottle"."windowStart" < ${cutoff} THEN 1 ELSE "AuthThrottle"."attempts" + 1 END,
        "windowStart" = CASE WHEN "AuthThrottle"."windowStart" < ${cutoff} THEN ${now} ELSE "AuthThrottle"."windowStart" END
      RETURNING "attempts"
    `;
    if (rows[0].attempts > limit) throw new Error("Too many attempts. Try again in 15 minutes.");
  }
}

export function safeAccountRedirect(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\x00-\x20]/.test(value)) return "/account";
  const url = new URL(value, "https://redirect.invalid");
  if (url.origin !== "https://redirect.invalid" || url.pathname.startsWith("/api")) return "/account";
  return url.pathname + url.search + url.hash;
}
