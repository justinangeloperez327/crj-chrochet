import { ziinaTestMode } from "@/lib/payments/ziina-client";
import { checkoutProvider } from "@/lib/payments/provider";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let provider: "STRIPE" | "ZIINA";
  try { provider = checkoutProvider(); if (provider === "ZIINA") ziinaTestMode(); } catch { return NextResponse.json({ ok: false, configuration: "invalid" }, { status: 503 }); }
  const providerKeys = provider === "ZIINA" ? ["ZIINA_ACCESS_TOKEN", "ZIINA_ACCOUNT_ID", "ZIINA_WEBHOOK_SECRET"] : ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];
  const missing = [
    ...providerKeys.map((name) => [name, process.env[name]]),
    ["DATABASE_URL", process.env.DATABASE_URL],
    ["APP_URL", process.env.APP_URL],
    ["CHECKOUT_RETURN_SECRET", process.env.CHECKOUT_RETURN_SECRET],
    ["RESEND_API_KEY", process.env.RESEND_API_KEY],
    ["ORDER_EMAIL_FROM", process.env.ORDER_EMAIL_FROM],
    ["CRON_SECRET", process.env.CRON_SECRET],
  ].filter(([, value]) => !value).length;

  let database = false;
  const db = getDb();
  if (db) {
    try {
      await db.$queryRaw`SELECT 1`;
      database = true;
    } catch {
      database = false;
    }
  }
  const ready = Boolean(database && missing === 0);
  return NextResponse.json(
    { ok: ready, database: database ? "connected" : "unavailable", configuration: missing ? "incomplete" : "configured" },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
