import { paymentProviderName } from "@/lib/payments/provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CheckoutClient } from "@/components/store/checkout-client";
import { getStoreSettings } from "@/lib/settings/store-settings";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Secure checkout for Handmade Blooms.",
};

type CheckoutPageProps = {
  searchParams: Promise<{ cancelled?: string }>;
};

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const [params, settings] = await Promise.all([
    searchParams,
    getStoreSettings(),
  ]);

  if (settings.maintenanceMode) {
    redirect("/maintenance");
  }

  return (
    <CheckoutClient
      providerName={paymentProviderName()}
      cancelled={params.cancelled === "1"}
      businessName={settings.businessName}
      brandByline={settings.brandByline}
      currency={settings.defaultCurrency}
      giftOrdersEnabled={settings.giftOrdersEnabled}
    />
  );
}
