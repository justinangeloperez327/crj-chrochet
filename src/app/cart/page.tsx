import type { Metadata } from "next";

import { CartPageClient } from "@/components/store/cart-page-client";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import { getStoreSettings } from "@/lib/settings/store-settings";

export const metadata: Metadata = {
  title: "Shopping Basket",
  description: "Review your Handmade Blooms basket before checkout.",
};

export default async function CartPage() {
  const settings = await getStoreSettings();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main-content">
        <CartPageClient
          giftOrdersEnabled={settings.giftOrdersEnabled}
          giftMessageMaxLength={settings.giftMessageMaxLength}
          orderNoteMaxLength={settings.orderNoteMaxLength}
          currency={settings.defaultCurrency}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
