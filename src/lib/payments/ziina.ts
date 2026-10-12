import { randomUUID } from "node:crypto";
import { requireDb, runTransaction } from "@/lib/db";
import { expireCheckoutForProvider, markOrderPaidForProvider, markPaymentFailedForProvider } from "@/lib/orders/order-lifecycle";
import { signCheckoutReturn } from "@/lib/payments/stripe";
import { assertZiinaConfigured, getZiinaIntent, parseIntent, ziinaCheckoutUrl, ziinaRequest, ziinaTestMode, ZiinaError } from "./ziina-client";

export async function createZiinaCheckoutSession(orderId: string) {
  assertZiinaConfigured();
  const initialized = await runTransaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    if (order.status !== "PENDING_PAYMENT" || order.paymentStatus === "PAID") throw new ZiinaError("Only unpaid pending orders can start checkout.", 409);
    const cents = Math.round(Number(order.total) * 100);
    if (order.currency !== "AED" || cents < 200 || !Number.isSafeInteger(cents)) throw new ZiinaError("Ziina checkout requires an AED total of at least 2 AED.", 400);
    await tx.order.update({ where: { id: order.id }, data: { updatedAt: new Date() } });
    const previous = await tx.paymentAttempt.findFirst({ where: { orderId, provider: "ZIINA" }, orderBy: { createdAt: "desc" } });
    if (previous) {
      if (previous.checkoutUrl && previous.expiresAt && previous.expiresAt > new Date() && previous.status === "PENDING") return { order, attempt: previous, reused: true };
      throw new ZiinaError("A Ziina payment is already being prepared or requires reconciliation.", 409, true);
    }
    const id = randomUUID();
    const expiresAt = order.reservationExpiresAt ?? new Date(Date.now() + 45 * 60000);
    if (expiresAt <= new Date()) throw new ZiinaError("Order reservation has expired.", 409);
    const attempt = await tx.paymentAttempt.create({ data: { id, orderId, provider: "ZIINA", externalId: "ziina-initializing:" + id, status: "CREATED", amount: order.total, currency: order.currency, expiresAt, testMode: ziinaTestMode() } });
    return { order, attempt, reused: false };
  });
  if (initialized.reused) return { id: initialized.attempt.externalId, url: initialized.attempt.checkoutUrl!, expiresAt: initialized.attempt.expiresAt! };
  const { order, attempt } = initialized;
  const origin = new URL(process.env.APP_URL!).origin;
  const returnUrl = `${origin}/api/payments/ziina/return?order_id=${encodeURIComponent(order.id)}&sig=${signCheckoutReturn(order.id)}&intent_id={PAYMENT_INTENT_ID}`;
  try {
    // The published creation schema has no operation_id input. Persist first,
    // do not blindly retry an ambiguous POST, and recover via verified API data.
    const value = await ziinaRequest("/payment_intent", {
      amount: Math.round(Number(order.total) * 100), currency_code: order.currency,
      message: `CRJ order ${order.orderNumber} · payment ${attempt.id}`,
      success_url: returnUrl, cancel_url: returnUrl + "&cancelled=1", failure_url: returnUrl + "&failed=1",
      expiry: String(attempt.expiresAt!.getTime()), allow_tips: false, test: attempt.testMode,
    });
    const intent = parseIntent(value);
    if (intent.amount !== Math.round(Number(attempt.amount) * 100) || intent.currency_code !== attempt.currency || !intent.redirect_url) throw new ZiinaError("Ziina payment details did not match this order.", 503, true);
    const url = ziinaCheckoutUrl(intent.redirect_url);
    await bindZiinaIntent(intent.id, attempt.id, intent.amount, intent.currency_code, order.id, url);
    return { id: intent.id, url, expiresAt: attempt.expiresAt! };
  } catch (error) {
    if (error instanceof ZiinaError && !error.ambiguous && error.status < 500) {
      await requireDb().paymentAttempt.updateMany({ where: { id: attempt.id, status: "CREATED", externalId: attempt.externalId }, data: { status: "FAILED" } });
      throw error;
    }
    throw new ZiinaError("Checkout could not be confirmed. The store will reconcile this payment before releasing its reservation.", 503, true);
  }
}

async function bindZiinaIntent(id: string, attemptId: string, amount: number, currency: string, expectedOrderId?: string, checkoutUrl?: string) {
  return runTransaction(async (tx) => {
    const attempt = await tx.paymentAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.provider !== "ZIINA") return null;
    if (expectedOrderId && attempt.orderId !== expectedOrderId) throw new ZiinaError("Payment does not belong to this order.", 403);
    if (amount !== Math.round(Number(attempt.amount) * 100) || currency !== attempt.currency) throw new ZiinaError("Ziina payment amount or currency mismatch.", 409);
    if (attempt.externalId !== id && attempt.externalId !== "ziina-initializing:" + attempt.id) throw new ZiinaError("Ziina payment identity mismatch.", 409);
    return tx.paymentAttempt.update({ where: { id: attempt.id }, data: { externalId: id, checkoutUrl: checkoutUrl ?? attempt.checkoutUrl, ...(attempt.status === "CREATED" ? { status: "PENDING" } : {}) } });
  });
}

export async function reconcileZiinaIntent(id: string, expectedOrderId?: string) {
  const intent = await getZiinaIntent(id);
  if (intent.id !== id) throw new ZiinaError("Ziina payment identity mismatch.", 409);
  const db = requireDb();
  let attempt = await db.paymentAttempt.findUnique({ where: { externalId: id } });
  if (!attempt) {
    const localId = intent.message?.match(/payment ([a-f0-9-]{36})$/i)?.[1];
    if (localId) attempt = await bindZiinaIntent(id, localId, intent.amount, intent.currency_code, expectedOrderId, intent.redirect_url ? ziinaCheckoutUrl(intent.redirect_url) : undefined);
  }
  if (!attempt || attempt.provider !== "ZIINA") return null;
  if (expectedOrderId && attempt.orderId !== expectedOrderId) throw new ZiinaError("Payment does not belong to this order.", 403);
  if (intent.amount !== Math.round(Number(attempt.amount) * 100) || intent.currency_code !== attempt.currency) throw new ZiinaError("Ziina payment amount or currency mismatch.", 409);
  if (intent.status === "completed") await markOrderPaidForProvider(id, "ZIINA", id, { amountTotal: intent.amount, currency: intent.currency_code });
  else if (intent.status === "failed") await markPaymentFailedForProvider(id, "ZIINA");
  else if (intent.status === "canceled") await expireCheckoutForProvider(id, "ZIINA");
  return { orderId: attempt.orderId, status: intent.status };
}
