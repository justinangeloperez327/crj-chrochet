import type { Metadata } from "next";

import { CheckoutClient } from "@/components/store/checkout-client";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Checkout for Handmade Blooms by CRJ.",
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
