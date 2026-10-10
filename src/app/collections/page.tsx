import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";

import { BloomArtwork } from "@/components/store/bloom-art";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import { loadStorefrontCollections } from "@/lib/data/storefront-collections";

export const metadata: Metadata = {
  title: "Collections",
  description:
    "Browse curated crochet flower collections from Handmade Blooms by CRJ.",
};

export default async function CollectionsPage() {
  const collections = await loadStorefrontCollections();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="border-b border-bloom-border bg-[#f8f2fb]">
          <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
            <div className="flex size-10 items-center justify-center border border-bloom-violet/20 bg-white text-bloom-violet">
              <Layers className="size-4" />
            </div>
            <p className="mt-6 text-[11px] font-semibold tracking-[0.18em] text-bloom-violet uppercase">
              Curated by CRJ
            </p>
            <div className="mt-3 grid gap-5 lg:grid-cols-[1fr_0.6fr] lg:items-end">
              <h1 className="font-display text-5xl font-semibold tracking-[-0.045em] text-bloom-plum sm:text-6xl">
                Collections for every kind of giving.
              </h1>
              <p className="max-w-xl text-sm leading-6 text-bloom-muted lg:justify-self-end">
                Browse the pieces we group for ready gifting, customer
                favorites, made-to-order arrangements, and special moments.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
          {collections.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2">
              {collections.map((collection) => (
                <Link
                  key={collection.id}
                  href={`/collections/${collection.slug}`}
                  className="group grid overflow-hidden border border-bloom-border bg-white sm:grid-cols-[0.85fr_1.15fr]"
                >
                  <BloomArtwork
                    tone={collection.tone}
                    compact
                    className="aspect-[5/4] min-h-full border-b border-bloom-border sm:border-b-0 sm:border-r"
                  />
                  <div className="flex min-h-64 flex-col justify-between p-6 sm:p-7">
                    <div>
                      <div className="flex items-center gap-2">
                        {collection.featured ? (
                          <span className="border border-bloom-pink/20 bg-bloom-pink-soft/50 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-bloom-pink">
                            Featured
                          </span>
                        ) : null}
                        <span className="text-[10px] font-medium text-bloom-muted">
                          {collection.products.length} product
                          {collection.products.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <h2 className="mt-5 font-display text-3xl font-semibold tracking-[-0.035em] text-bloom-plum">
                        {collection.name}
                      </h2>
                      <p className="mt-3 max-w-md text-sm leading-6 text-bloom-muted">
                        {collection.description ||
                          "A curated selection of handmade crochet blooms."}
                      </p>
                    </div>

                    <span className="mt-8 inline-flex items-center gap-2 text-xs font-semibold text-bloom-plum transition-colors group-hover:text-bloom-pink">
                      View collection
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border border-bloom-border bg-white px-6 py-16 text-center">
              <Layers className="mx-auto size-6 text-bloom-violet" />
              <h2 className="mt-4 font-display text-2xl font-semibold text-bloom-plum">
                Collections are being curated.
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-bloom-muted">
                Shop all current handmade blooms while the next collection is
                prepared.
              </p>
              <Link
                href="/shop"
                className="mt-6 inline-flex h-11 items-center bg-bloom-plum px-5 text-xs font-semibold text-white"
              >
                Shop all blooms
              </Link>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
