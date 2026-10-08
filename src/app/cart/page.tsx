import type { Metadata } from "next";

import { CartPageClient } from "@/components/store/cart-page-client";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";

export const metadata: Metadata = {
  title: "Shopping Basket",
  description: "Review your Handmade Blooms by CRJ basket before checkout.",
};

export default function CartPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <CartPageClient />
      </main>
      <SiteFooter />
    </div>
  );
}
