import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { CustomBouquetPayment } from "@/components/store/custom-bouquet-payment";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import { getCustomBouquetPaymentQuote } from "@/lib/data/custom-bouquet-payment";

export const metadata: Metadata = {
  title: "Custom Bouquet Payment",
  robots: {
    index: false,
    follow: false,
  },
};

type Props = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ cancelled?: string }>;
};

export default async function CustomBouquetPaymentPage({
  params,
  searchParams,
}: Props) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const request = await getCustomBouquetPaymentQuote(token);

  if (
    !request ||
    request.finalPrice === null ||
    request.leadTimeMinDays === null ||
    request.leadTimeMaxDays === null ||
    !request.quoteExpiresAt
  ) {
    notFound();
  }

  const attempt = request.order?.paymentAttempts[0];
  const existingCheckoutUrl =
    request.order?.status === "PENDING_PAYMENT" &&
    attempt?.status === "PENDING" &&
    attempt.checkoutUrl &&
    attempt.expiresAt &&
    attempt.expiresAt > new Date()
      ? attempt.checkoutUrl
      : null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="border-b border-bloom-border bg-[#eee5fb]">
          <div className="mx-auto max-w-[1180px] px-5 py-10 sm:px-8 lg:py-14">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-bloom-muted hover:text-bloom-plum"
            >
              <ArrowLeft className="size-3.5" />
              Handmade Blooms
            </Link>
            <p className="mt-7 text-[10px] font-semibold tracking-[0.18em] text-bloom-violet uppercase">
              CRJ approved design
            </p>
            <h1 className="mt-2 max-w-3xl font-display text-4xl font-semibold tracking-[-0.045em] text-bloom-plum sm:text-5xl">
              Complete your custom bouquet.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-bloom-muted">
              Confirm delivery details, review the approved quote, and continue
              to secure Stripe Checkout.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-[1180px] px-5 py-10 sm:px-8 lg:py-14">
          <CustomBouquetPayment
            quote={{
              token,
              referenceNumber: request.referenceNumber,
              customerName: request.customerName,
              email: request.email,
              recipientName: request.recipientName,
              totalStems: request.totalStems,
              wrappingName: request.wrapping.name,
              finalPrice: Number(request.finalPrice),
              leadTimeMinDays: request.leadTimeMinDays,
              leadTimeMaxDays: request.leadTimeMaxDays,
              quoteExpiresAt: request.quoteExpiresAt.toISOString(),
              paid: request.order?.paymentStatus === "PAID",
              existingCheckoutUrl,
              cancelled: query.cancelled === "1",
            }}
          />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
