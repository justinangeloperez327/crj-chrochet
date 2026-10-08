import type { Metadata } from "next";

import { CheckoutClient } from "@/components/store/checkout-client";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Checkout for Handmade Blooms by CRJ.",
};

type CheckoutPageProps = {
  searchParams: Promise<{ cancelled?: string }>;
};

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const params = await searchParams;
  return <CheckoutClient cancelled={params.cancelled === "1"} />;
}
