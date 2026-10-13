import { requireDb } from "@/lib/db";
import { getZiinaRefund } from "./ziina-client";
import { reconcileZiinaIntent } from "./ziina";
import { syncZiinaRefund } from "./refund-service";

export async function reconcileZiinaPayments(limit = 20) {
  if (!process.env.ZIINA_ACCESS_TOKEN) return { checked: 0, configured: false };
  const db = requireDb();
  const attempts = await db.paymentAttempt.findMany({ where: { provider: "ZIINA", status: { in: ["CREATED", "PENDING"] }, externalId: { not: { startsWith: "ziina-initializing:" } } }, orderBy: { updatedAt: "asc" }, take: limit });
  let failures = 0;
  for (const attempt of attempts) {
    try { await reconcileZiinaIntent(attempt.externalId, attempt.orderId); } catch { failures += 1; }
  }
  const refunds = await db.refund.findMany({ where: { provider: "ZIINA", status: "PENDING", externalId: { not: null } }, orderBy: { updatedAt: "asc" }, take: limit });
  for (const refund of refunds) {
    try { await syncZiinaRefund(await getZiinaRefund(refund.externalId!)); } catch { failures += 1; }
  }
  return { checked: attempts.length + refunds.length, failures, configured: true };
}
