import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireDb } from "@/lib/db";
import { verifyZiinaSignature, getZiinaRefund } from "@/lib/payments/ziina-client";
import { reconcileZiinaIntent } from "@/lib/payments/ziina";
import { syncZiinaRefund } from "@/lib/payments/refund-service";
import { processNotificationOutbox } from "@/lib/notifications/notification-service";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.ZIINA_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Ziina webhook is not configured." }, { status: 503 });
  const source = (process.env.VERCEL === "1" ? request.headers.get("x-vercel-forwarded-for") : request.headers.get("x-forwarded-for"))?.split(",")[0]?.trim();
  const allowed = ["3.29.184.186", "3.29.190.95", "20.233.47.127", "13.202.161.181"];
  if (!source || !allowed.includes(source)) return NextResponse.json({ error: "Forbidden webhook source." }, { status: 403 });
  const body = await request.text();
  if (!verifyZiinaSignature(body, request.headers.get("x-hmac-signature") ?? "", secret)) return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  let event: { event?: unknown; data?: { id?: unknown } };
  try { event = JSON.parse(body); } catch { return NextResponse.json({ error: "Invalid webhook." }, { status: 400 }); }
  if (!event || typeof event.event !== "string" || typeof event.data?.id !== "string") return NextResponse.json({ error: "Invalid webhook." }, { status: 400 });
  try {
    const db = requireDb();
    const id = "ziina:" + createHash("sha256").update(body).digest("hex");
    if (await db.paymentWebhookEvent.findUnique({ where: { id } })) return NextResponse.json({ received: true, duplicate: true });
    // Never apply the supplied status directly. Fetch current provider state,
    // including merchant, amount, currency and local payment identity checks.
    if (event.event === "payment_intent.status.updated") await reconcileZiinaIntent(event.data.id);
    else if (event.event === "refund.status.updated") await syncZiinaRefund(await getZiinaRefund(event.data.id));
    await db.paymentWebhookEvent.upsert({ where: { id }, update: {}, create: { id, provider: "ZIINA", type: event.event } });
    await processNotificationOutbox(5).catch(() => undefined);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Ziina webhook processing failed:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Unable to reconcile payment." }, { status: 500 });
  }
}
