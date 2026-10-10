import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";

import { BloomArtwork } from "@/components/store/bloom-art";
import { ProductCard } from "@/components/store/product-card";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import { loadStorefrontCollectionBySlug } from "@/lib/data/storefront-collections";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const collection = await loadStorefrontCollectionBySlug(slug);

  if (!collection) {
    return { title: "Collection not found" };
  }

  return {
    title: collection.seoTitle || collection.name,
    description:
      collection.seoDescription ||
      collection.description ||
      `Shop ${collection.name} from Handmade Blooms by CRJ.`,
  };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const collection = await loadStorefrontCollectionBySlug(slug);

  if (!collection) notFound();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="border-b border-bloom-border bg-[#fff7fb]">
          <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_0.72fr] lg:items-center lg:px-12 lg:py-14">
            <div>
              <Link
                href="/collections"
                className="inline-flex items-center gap-2 text-xs font-semibold text-bloom-muted hover:text-bloom-plum"
              >
                <ArrowLeft className="size-3.5" />
                All collections
              </Link>
              <p className="mt-7 text-[11px] font-semibold tracking-[0.18em] text-bloom-pink uppercase">
                Handmade Blooms collection
              </p>
              <h1 className="mt-3 max-w-3xl font-display text-5xl font-semibold tracking-[-0.045em] text-bloom-plum sm:text-6xl">
                {collection.name}
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-6 text-bloom-muted sm:text-base sm:leading-7">
                {collection.description ||
                  "A curated selection of handmade crochet blooms."}
              </p>
              <p className="mt-5 text-[11px] font-medium text-bloom-muted">
                {collection.products.length} product
                {collection.products.length === 1 ? "" : "s"} · manually curated
              </p>
            </div>

            <BloomArtwork
              tone={collection.tone}
              compact
              className="aspect-[5/3] border border-bloom-border bg-white lg:aspect-[4/3]"
            />
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
          {collection.products.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-9 md:grid-cols-3 lg:grid-cols-4 md:gap-x-5">
              {collection.products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="border border-bloom-border bg-white px-6 py-14 text-center">
              <h2 className="font-display text-2xl font-semibold text-bloom-plum">
                This collection is being refreshed.
              </h2>
              <p className="mt-2 text-sm text-bloom-muted">
                Browse the full shop for currently available handmade blooms.
              </p>
              <Link
                href="/shop"
                className="mt-6 inline-flex h-11 items-center gap-2 bg-bloom-plum px-5 text-xs font-semibold text-white"
              >
                Shop all blooms
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
