import { createHash } from "node:crypto";
import { requireDb } from "@/lib/db";

export function sameOriginForm(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

export async function enforceAuthRate(request: Request, action: string, email: string, limit: number) {
  const db = requireDb();
  const addr = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
  const key = createHash("sha256").update([action, addr, email.trim().toLowerCase()].join(":")).digest("hex");
  const now = new Date();
  const cutoff = new Date(now.getTime() - 15 * 60_000);
  const record = await db.authThrottle.upsert({
    where: { key },
    update: { attempts: { increment: 1 } },
    create: { key, windowStart: now, attempts: 1 },
  });
  if (record.windowStart < cutoff) {
    await db.authThrottle.updateMany({
      where: { key, windowStart: { lt: cutoff } },
      data: { attempts: 1, windowStart: now },
    });
    return;
  }
  if (record.attempts > limit) throw new Error("Too many attempts. Try again in 15 minutes.");
}
