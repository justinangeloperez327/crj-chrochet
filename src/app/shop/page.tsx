import type { Metadata } from "next";

import { ShopBrowser } from "@/components/store/shop-browser";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import { loadStorefrontProducts } from "@/lib/data/storefront-catalog";

export const metadata: Metadata = {
  title: "Shop Crochet Blooms",
  description:
    "Browse handmade crochet flowers and bouquets from Handmade Blooms by CRJ.",
};

export default async function ShopPage() {
  const products = await loadStorefrontProducts();
  const productFlowers = Array.from(
    new Set(products.map((product) => product.flower)),
  ).sort();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="border-b border-bloom-border bg-[#fff2f8]">
          <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-18">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-bloom-pink uppercase">
              The flower shop
            </p>
            <div className="mt-3 grid gap-5 lg:grid-cols-[1fr_0.55fr] lg:items-end">
              <h1 className="font-display text-5xl font-semibold tracking-[-0.045em] text-bloom-plum sm:text-6xl">
                Find a bloom to keep.
              </h1>
              <p className="max-w-lg text-sm leading-6 text-bloom-muted lg:justify-self-end">
                Shop ready-to-ship pieces or choose a made-to-order bouquet in
                your preferred color and size.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
          <ShopBrowser products={products} flowers={productFlowers} />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
