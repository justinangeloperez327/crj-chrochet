import { NextResponse } from "next/server";
import { publicRequestOrigin } from "@/lib/auth/security";
import { verifyCheckoutReturn } from "@/lib/payments/stripe";
import { reconcileZiinaIntent } from "@/lib/payments/ziina";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const orderId = query.get("order_id") ?? "";
  const id = query.get("intent_id") ?? "";
  try {
    if (!orderId || !/^[a-f0-9-]{36}$/i.test(id) || !verifyCheckoutReturn(orderId, query.get("sig") ?? "")) return NextResponse.json({ error: "Invalid payment return." }, { status: 403 });
    const state = await reconcileZiinaIntent(id, orderId);
    if (!state) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
    // Cancelling the browser is not proof that an intent can no longer be paid.
    // Show its verified order status and retain active payment reservations.
    return NextResponse.redirect(new URL(`/order-confirmation?session_id=${encodeURIComponent(id)}`, publicRequestOrigin(request)), 303);
  } catch {
    return NextResponse.json({ error: "Payment confirmation is temporarily unavailable. Please contact the store before paying again." }, { status: 503 });
  }
}
