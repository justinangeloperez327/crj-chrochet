import { createHmac, timingSafeEqual } from "node:crypto";

const BASE = "https://api-v2.ziina.com/api";
export class ZiinaError extends Error {
  constructor(message: string, public readonly status = 503, public readonly ambiguous = false) { super(message); this.name = "ZiinaError"; }
}
export function ziinaTestMode() {
  const mode = process.env.ZIINA_TEST_MODE ?? "true";
  if (!["true", "false"].includes(mode)) throw new ZiinaError("ZIINA_TEST_MODE must be true or false.");
  return mode === "true";
}
export function assertZiinaConfigured() {
  if (!process.env.ZIINA_ACCESS_TOKEN || !process.env.ZIINA_ACCOUNT_ID || !process.env.ZIINA_WEBHOOK_SECRET || !process.env.APP_URL || !process.env.CHECKOUT_RETURN_SECRET) throw new ZiinaError("Ziina payments are not configured.");
  const app = new URL(process.env.APP_URL);
  if (app.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(app.hostname)) throw new ZiinaError("APP_URL must use HTTPS.");
  ziinaTestMode();
}
export async function ziinaRequest(path: string, body?: object): Promise<unknown> {
  const token = process.env.ZIINA_ACCESS_TOKEN;
  if (!token) throw new ZiinaError("Ziina payments are not configured.");
  let response: Response;
  try {
    response = await fetch(BASE + path, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000) });
  } catch { throw new ZiinaError("Ziina request could not be confirmed. Please try again later.", 503, Boolean(body)); }
  if (!response.ok) throw new ZiinaError("Ziina request was rejected. Please contact the store if this continues.", response.status, Boolean(body) && (response.status >= 500 || response.status === 408));
  try { return await response.json(); } catch { throw new ZiinaError("Invalid Ziina response.", 503, Boolean(body)); }
}
export type ZiinaIntent = { id: string; account_id: string; amount: number; currency_code: string; status: string; message?: string; redirect_url?: string };
export type ZiinaRefund = { id: string; payment_intent_id: string; amount: number; currency_code: string; status: "pending" | "completed" | "failed" };
export function parseIntent(value: unknown): ZiinaIntent {
  if (!value || typeof value !== "object") throw new ZiinaError("Invalid Ziina payment response.");
  const p = value as Record<string, unknown>;
  if (typeof p.id !== "string" || !/^[a-f0-9-]{36}$/i.test(p.id) || typeof p.account_id !== "string" || !Number.isSafeInteger(p.amount) || Number(p.amount) < 0 || typeof p.currency_code !== "string" || !["requires_payment_instrument", "requires_user_action", "pending", "completed", "failed", "canceled"].includes(String(p.status))) throw new ZiinaError("Invalid Ziina payment response.");
  if (p.account_id !== process.env.ZIINA_ACCOUNT_ID) throw new ZiinaError("Ziina merchant account mismatch.");
  return { id: p.id, account_id: p.account_id, amount: Number(p.amount), currency_code: p.currency_code, status: String(p.status), message: typeof p.message === "string" ? p.message : undefined, redirect_url: typeof p.redirect_url === "string" ? p.redirect_url : undefined };
}
export function parseRefund(value: unknown): ZiinaRefund {
  if (!value || typeof value !== "object") throw new ZiinaError("Invalid Ziina refund response.");
  const p = value as Record<string, unknown>;
  if (typeof p.id !== "string" || typeof p.payment_intent_id !== "string" || !Number.isSafeInteger(p.amount) || Number(p.amount) < 0 || typeof p.currency_code !== "string" || !["pending", "completed", "failed"].includes(String(p.status))) throw new ZiinaError("Invalid Ziina refund response.");
  return { id: p.id, payment_intent_id: p.payment_intent_id, amount: Number(p.amount), currency_code: p.currency_code, status: p.status as ZiinaRefund["status"] };
}
export async function getZiinaIntent(id: string) { return parseIntent(await ziinaRequest("/payment_intent/" + encodeURIComponent(id))); }
export async function getZiinaRefund(id: string) { return parseRefund(await ziinaRequest("/refund/" + encodeURIComponent(id))); }
export function verifyZiinaSignature(body: string, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
export function ziinaCheckoutUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !(url.hostname === "ziina.com" || url.hostname.endsWith(".ziina.com")) || url.username || url.password) throw new ZiinaError("Invalid Ziina checkout URL.");
  return url.toString();
}
