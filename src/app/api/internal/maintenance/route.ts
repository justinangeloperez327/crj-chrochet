import { reconcileZiinaPayments } from "@/lib/payments/ziina-maintenance";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

import { processNotificationOutbox } from "@/lib/notifications/notification-service";
import { releaseExpiredReservations } from "@/lib/orders/order-lifecycle";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [reservations, notifications, ziina] = await Promise.all([
    releaseExpiredReservations(),
    processNotificationOutbox(),
    reconcileZiinaPayments(),
  ]);

  const db = getDb();
  if (db) {
    await db.authToken.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await db.authThrottle.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - 86400000) } } });
  }

  return NextResponse.json({
    ok: true,
    reservations,
    ziina,
    notifications,
  });
}
