import type { Metadata } from "next";
import Link from "next/link";
import { Check, Clock3, ShoppingBag } from "lucide-react";
import { notFound } from "next/navigation";

import { OrderConfirmationSync } from "@/components/store/order-confirmation-sync";
import { getOrderConfirmationByStripeSession } from "@/lib/data/order-confirmation";

export const metadata: Metadata = {
  title: "Order Confirmation",
  robots: {
    index: false,
    follow: false,
  },
};

type ConfirmationPageProps = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function OrderConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) notFound();

  const attempt = await getOrderConfirmationByStripeSession(sessionId);

  if (!attempt) notFound();

  const order = attempt.order;
  const paid = order.paymentStatus === "PAID";
  const customBouquet = order.customBouquetRequest;

  return (
    <div className="min-h-screen bg-background">
      <OrderConfirmationSync
        paid={paid}
        clearCartOnPaid={!customBouquet}
      />

      <header className="border-b border-bloom-border bg-white">
        <div className="mx-auto flex h-18 max-w-[1100px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="font-display text-xl font-semibold text-bloom-plum">
              Handmade Blooms
            </span>
            <span className="text-[9px] font-semibold tracking-[0.18em] text-bloom-pink uppercase">
              by CRJ
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[900px] px-5 py-12 sm:px-8 lg:py-16">
        <div className="text-center">
          <div
            className={
              "mx-auto flex size-14 items-center justify-center rounded-full " +
              (paid
                ? "bg-emerald-50 text-emerald-700"
                : "bg-bloom-violet-soft text-bloom-violet")
            }
          >
            {paid ? <Check className="size-5" /> : <Clock3 className="size-5" />}
          </div>

          <p className="mt-6 text-[10px] font-semibold tracking-[0.16em] text-bloom-pink uppercase">
            {paid ? "Payment confirmed" : "Payment processing"}
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.045em] text-bloom-plum sm:text-5xl">
            {paid
              ? customBouquet
                ? "Your custom bouquet is confirmed."
                : "Your blooms are confirmed."
              : "We’re confirming your payment."}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-bloom-muted">
            Order <strong className="text-bloom-plum">{order.orderNumber}</strong>
            {paid
              ? customBouquet
                ? ` is confirmed. CRJ can now prepare custom bouquet ${customBouquet.referenceNumber} for production.`
                : " is confirmed and ready to move into preparation."
              : " has returned from secure checkout. This page will refresh briefly while the verified payment webhook reaches us."}
          </p>
        </div>

        <section className="mt-10 border border-bloom-border bg-white">
          <div className="border-b border-bloom-border px-5 py-4">
            <h2 className="text-sm font-semibold text-bloom-plum">
              Order summary
            </h2>
          </div>

          <div className="divide-y divide-bloom-border">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-5 px-5 py-4 text-xs"
              >
                <div>
                  <p className="font-semibold text-bloom-plum">
                    {item.productName}
                  </p>
                  <p className="mt-1 text-[10px] text-bloom-muted">
                    {item.variantName} · Qty {item.quantity}
                  </p>
                </div>
                <p className="shrink-0 font-semibold text-bloom-plum">
                  AED {Number(item.lineTotal)}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t border-bloom-border px-5 py-5 text-sm">
            <Row label="Subtotal" value={`AED ${Number(order.subtotal)}`} />
            <Row
              label="Discount"
              value={`− AED ${Number(order.discountAmount)}`}
            />
            <Row
              label="Delivery"
              value={`AED ${Number(order.deliveryAmount)}`}
            />
            <div className="flex items-end justify-between border-t border-bloom-border pt-4">
              <span className="font-semibold text-bloom-plum">Total</span>
              <span className="text-xl font-semibold text-bloom-plum">
                {order.currency} {Number(order.total)}
              </span>
            </div>
          </div>
        </section>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={customBouquet ? "/account/custom-bouquets" : "/account/orders"}
            className="inline-flex h-11 items-center gap-2 border border-bloom-border bg-white px-5 text-xs font-semibold text-bloom-plum"
          >
            <ShoppingBag className="size-3.5" />
            {customBouquet ? "Track custom bouquet" : "View account orders"}
          </Link>
          <Link
            href="/shop"
            className="inline-flex h-11 items-center bg-bloom-plum px-5 text-xs font-semibold text-white"
          >
            Continue shopping
          </Link>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-bloom-muted">{label}</span>
      <span className="font-semibold text-bloom-plum">{value}</span>
    </div>
  );
}
