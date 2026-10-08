import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";

import { BloomArtwork } from "@/components/store/bloom-art";
import { ProductCard } from "@/components/store/product-card";
import { ProductPurchasePanel } from "@/components/store/product-purchase-panel";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import { getProductBySlug, products } from "@/lib/catalog";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) return {};

  return {
    title: product.name,
    description: product.description,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) notFound();

  const related = products
    .filter(
      (item) =>
        item.id !== product.id &&
        (item.flower === product.flower || item.tone === product.tone),
    )
    .slice(0, 4);

  const fallbackRelated =
    related.length >= 3
      ? related
      : products.filter((item) => item.id !== product.id).slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <div className="mx-auto max-w-[1440px] px-5 py-5 sm:px-8 lg:px-12">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs text-bloom-muted"
          >
            <Link href="/" className="hover:text-bloom-plum">
              Home
            </Link>
            <ChevronRight className="size-3" />
            <Link href="/shop" className="hover:text-bloom-plum">
              Shop
            </Link>
            <ChevronRight className="size-3" />
            <span className="text-bloom-plum">{product.name}</span>
          </nav>
        </div>

        <section className="mx-auto grid max-w-[1440px] gap-10 px-5 pb-18 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16 lg:px-12 lg:pb-24">
          <div className="grid grid-cols-2 gap-3">
            <BloomArtwork
              tone={product.tone}
              className="col-span-2 aspect-[5/4] border border-bloom-border"
            />
            <BloomArtwork
              tone={product.colors[1]?.tone ?? product.tone}
              compact
              className="aspect-square border border-bloom-border"
            />
            <BloomArtwork
              tone={product.colors[2]?.tone ?? product.tone}
              compact
              className="aspect-square border border-bloom-border"
            />
          </div>

          <div className="lg:sticky lg:top-28 lg:self-start">
            <ProductPurchasePanel product={product} />
          </div>
        </section>

        <section className="border-y border-bloom-border bg-white">
          <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-12 sm:px-8 md:grid-cols-3 lg:px-12">
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-bloom-pink uppercase">
                Materials
              </p>
              <p className="mt-3 text-sm leading-6 text-bloom-muted">
                Crocheted yarn blooms with structured stems and hand-shaped
                leaves.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-bloom-violet uppercase">
                Care
              </p>
              <p className="mt-3 text-sm leading-6 text-bloom-muted">
                Keep dry, dust gently, and reshape petals by hand when needed.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-bloom-pink uppercase">
                Handmade note
              </p>
              <p className="mt-3 text-sm leading-6 text-bloom-muted">
                Slight variations in shape and stitch are part of each piece’s
                handmade character.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-5 py-18 sm:px-8 lg:px-12 lg:py-24">
          <div className="mb-9">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-bloom-violet uppercase">
              You may also like
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em] text-bloom-plum">
              More handmade blooms
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-9 md:grid-cols-4 md:gap-x-5">
            {fallbackRelated.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
