import Link from "next/link";
import {
  ArrowRight,
  Flower2,
  Gift,
  PackageCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import { BloomArtwork } from "@/components/store/bloom-art";
import { ProductCard } from "@/components/store/product-card";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import { flowerCollections } from "@/lib/catalog";
import { loadStorefrontProducts } from "@/lib/data/storefront-catalog";

const occasions = [
  "Birthday",
  "Anniversary",
  "Graduation",
  "Thank You",
  "Mother's Day",
  "Just Because",
];

export default async function Home() {
  const storefrontProducts = await loadStorefrontProducts();
  const featuredProducts = storefrontProducts
    .filter((product) => product.featured)
    .slice(0, 4);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <SiteHeader />

      <main>
        <section className="relative isolate overflow-hidden border-b border-bloom-border">
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_78%_22%,rgba(124,58,237,0.10),transparent_28%),radial-gradient(circle_at_18%_82%,rgba(232,93,158,0.11),transparent_32%)]" />
          <div className="absolute inset-0 -z-20 bloom-grid opacity-50" />

          <div className="mx-auto grid min-h-[660px] max-w-[1440px] items-center gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[0.92fr_1.08fr] lg:px-12 lg:py-16">
            <div className="max-w-2xl lg:pr-4">
              <div className="mb-7 inline-flex items-center gap-2 border border-bloom-border bg-white/70 px-3 py-2 text-[10px] font-semibold tracking-[0.17em] text-bloom-violet uppercase backdrop-blur">
                <Flower2 className="size-3.5" />
                Handmade crochet flowers
              </div>

              <h1 className="font-display text-[3.8rem] leading-[0.92] font-semibold tracking-[-0.055em] text-bloom-plum sm:text-[5.25rem] lg:text-[6.2rem]">
                Blooms that
                <span className="block text-bloom-pink">never fade.</span>
              </h1>

              <p className="mt-7 max-w-lg text-base leading-7 text-bloom-muted sm:text-lg">
                Crochet flowers crafted stitch by stitch for gifts, celebrations,
                and the little moments you want to keep.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/shop"
                  className="inline-flex h-12 items-center justify-center gap-2 bg-bloom-plum px-6 text-sm font-semibold text-white transition-colors hover:bg-[#492847]"
                >
                  Shop the collection
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/build-a-bouquet"
                  className="inline-flex h-12 items-center justify-center gap-2 border border-bloom-border bg-white/65 px-6 text-sm font-semibold text-bloom-plum transition-colors hover:border-bloom-violet hover:text-bloom-violet"
                >
                  Build a bouquet
                  <WandSparkles className="size-4" />
                </Link>
              </div>

              <div className="mt-10 grid max-w-xl grid-cols-3 divide-x divide-bloom-border border-y border-bloom-border py-4">
                <div className="pr-4">
                  <p className="text-sm font-semibold text-bloom-plum">Handmade</p>
                  <p className="mt-1 text-[11px] text-bloom-muted">Stitch by stitch</p>
                </div>
                <div className="px-4">
                  <p className="text-sm font-semibold text-bloom-plum">Gift ready</p>
                  <p className="mt-1 text-[11px] text-bloom-muted">Made to delight</p>
                </div>
                <div className="pl-4">
                  <p className="text-sm font-semibold text-bloom-plum">Made to keep</p>
                  <p className="mt-1 text-[11px] text-bloom-muted">Blooms that last</p>
                </div>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[720px] lg:mx-0">
              <div className="absolute -left-4 top-16 hidden h-[70%] w-20 bg-bloom-pink-soft lg:block" />
              <div className="absolute -right-8 bottom-10 hidden size-44 rounded-full border border-bloom-violet/20 lg:block" />
              <BloomArtwork
                tone="rose"
                className="aspect-[5/4] w-full border border-white/70 shadow-[0_30px_80px_rgba(71,38,66,0.15)]"
              />
              <div className="absolute -bottom-4 left-5 max-w-[230px] border border-bloom-border bg-white px-4 py-3 shadow-[0_14px_35px_rgba(80,45,72,0.12)] sm:left-8">
                <p className="text-[10px] font-semibold tracking-[0.14em] text-bloom-pink uppercase">
                  Made by hand
                </p>
                <p className="mt-1 font-display text-lg font-semibold text-bloom-plum">
                  Every stem has its own character.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="collections" className="mx-auto max-w-[1440px] px-5 py-18 sm:px-8 lg:px-12 lg:py-24">
          <div className="mb-10 flex items-end justify-between gap-8">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-bloom-pink uppercase">
                Find your favorite
              </p>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.035em] text-bloom-plum sm:text-5xl">
                Shop by flower
              </h2>
            </div>
            <Link
              href="/shop"
              className="hidden items-center gap-2 text-sm font-semibold text-bloom-plum transition-colors hover:text-bloom-pink sm:flex"
            >
              See all blooms
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            {flowerCollections.map((collection) => (
              <Link key={collection.name} href="/shop" className="group block">
                <div className="relative aspect-[4/5] overflow-hidden border border-bloom-border bg-white">
                  <BloomArtwork
                    tone={collection.tone}
                    compact
                    className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.035]"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bloom-plum/70 via-bloom-plum/20 to-transparent p-4 pt-14 text-white sm:p-5">
                    <p className="font-display text-xl font-semibold sm:text-2xl">
                      {collection.name}
                    </p>
                    <p className="mt-1 text-[10px] font-medium tracking-[0.12em] text-white/80 uppercase sm:text-xs">
                      {collection.note}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="shop" className="border-y border-bloom-border bg-white">
          <div className="mx-auto max-w-[1440px] px-5 py-18 sm:px-8 lg:px-12 lg:py-24">
            <div className="mb-10 flex items-end justify-between gap-8">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-bloom-violet uppercase">
                  Customer favorites
                </p>
                <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.035em] text-bloom-plum sm:text-5xl">
                  Most-loved blooms
                </h2>
              </div>
              <Link
                href="/shop"
                className="hidden items-center gap-2 text-sm font-semibold text-bloom-plum transition-colors hover:text-bloom-pink sm:flex"
              >
                Shop all
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-9 md:grid-cols-4 md:gap-x-5">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        <section id="story" className="mx-auto grid max-w-[1440px] gap-10 px-5 py-18 sm:px-8 lg:grid-cols-2 lg:items-center lg:px-12 lg:py-28">
          <div className="relative">
            <BloomArtwork
              tone="violet"
              className="aspect-[5/4] w-full border border-bloom-border"
            />
            <div className="absolute -bottom-5 -right-2 hidden max-w-[220px] bg-bloom-plum p-5 text-white sm:block">
              <Sparkles className="size-5 text-[#f7c6dc]" />
              <p className="mt-3 font-display text-xl font-semibold leading-tight">
                Small details make handmade gifts feel personal.
              </p>
            </div>
          </div>

          <div className="max-w-xl lg:pl-10">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-bloom-pink uppercase">
              The CRJ story
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em] text-bloom-plum sm:text-5xl">
              Made slowly.
              <span className="block text-bloom-violet">Gifted meaningfully.</span>
            </h2>
            <p className="mt-6 text-base leading-7 text-bloom-muted">
              Every flower is shaped, stitched, and assembled by hand. No two
              blooms are perfectly identical—and that is part of what makes each
              arrangement personal.
            </p>
            <p className="mt-4 text-base leading-7 text-bloom-muted">
              These are flowers designed to stay: on desks, shelves, bedside
              tables, and in the memories attached to them.
            </p>
            <button className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-bloom-plum transition-colors hover:text-bloom-pink">
              Discover our handmade process
              <ArrowRight className="size-4" />
            </button>
          </div>
        </section>

        <section id="bouquet" className="relative isolate overflow-hidden bg-[#eee5fb]">
          <div className="absolute inset-0 -z-10 bloom-grid opacity-50" />
          <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_0.92fr] lg:items-center lg:px-12 lg:py-20">
            <div className="max-w-2xl">
              <div className="flex size-11 items-center justify-center border border-bloom-violet/20 bg-white/70 text-bloom-violet">
                <WandSparkles className="size-5" />
              </div>
              <p className="mt-7 text-[11px] font-semibold tracking-[0.18em] text-bloom-violet uppercase">
                Make it yours
              </p>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.045em] text-bloom-plum sm:text-6xl">
                Build your own bouquet.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-bloom-muted">
                Choose your flowers, colors, number of stems, wrapping, and a
                personal message. We will turn your combination into something
                made just for them.
              </p>
              <Link
                href="/build-a-bouquet"
                className="mt-8 inline-flex h-12 items-center justify-center gap-2 bg-bloom-violet px-6 text-sm font-semibold text-white transition-colors hover:bg-[#6827d5]"
              >
                Start building
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 border border-bloom-violet/15 bg-white/55 backdrop-blur-sm">
              {[
                ["01", "Choose flowers"],
                ["02", "Pick colors"],
                ["03", "Select wrapping"],
                ["04", "Add a message"],
              ].map(([step, label]) => (
                <div
                  key={step}
                  className="min-h-36 border-b border-r border-bloom-violet/15 p-5 sm:min-h-40 sm:p-6"
                >
                  <p className="text-xs font-semibold text-bloom-violet">{step}</p>
                  <p className="mt-10 font-display text-xl font-semibold text-bloom-plum sm:text-2xl">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-5 py-18 sm:px-8 lg:px-12 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-bloom-pink uppercase">
                For every moment
              </p>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em] text-bloom-plum sm:text-5xl">
                A bloom for the reason.
                <span className="block text-bloom-pink">Or no reason at all.</span>
              </h2>
              <p className="mt-5 max-w-md text-sm leading-6 text-bloom-muted">
                Browse by occasion when you know the moment, but not yet the
                bouquet.
              </p>
            </div>

            <div className="grid grid-cols-2 border-l border-t border-bloom-border sm:grid-cols-3">
              {occasions.map((occasion, index) => (
                <button
                  key={occasion}
                  className="group flex min-h-28 flex-col items-start justify-between border-b border-r border-bloom-border bg-white p-4 text-left transition-colors hover:bg-bloom-pink-soft/45 sm:min-h-32 sm:p-5"
                >
                  <span className="text-[10px] font-semibold text-bloom-muted">
                    0{index + 1}
                  </span>
                  <span className="flex w-full items-center justify-between gap-2 text-sm font-semibold text-bloom-plum">
                    {occasion}
                    <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-bloom-border bg-[#fff2f8]">
          <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-14 sm:px-8 md:grid-cols-3 lg:px-12">
            <div className="flex gap-4">
              <Gift className="mt-0.5 size-5 shrink-0 text-bloom-pink" />
              <div>
                <p className="text-sm font-semibold text-bloom-plum">Gift-ready</p>
                <p className="mt-1 text-xs leading-5 text-bloom-muted">
                  Thoughtful presentation from bloom to wrapping.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <PackageCheck className="mt-0.5 size-5 shrink-0 text-bloom-violet" />
              <div>
                <p className="text-sm font-semibold text-bloom-plum">Clear availability</p>
                <p className="mt-1 text-xs leading-5 text-bloom-muted">
                  Know what is ready now and what is made to order.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-bloom-pink" />
              <div>
                <p className="text-sm font-semibold text-bloom-plum">Made by hand</p>
                <p className="mt-1 text-xs leading-5 text-bloom-muted">
                  Each arrangement is crafted rather than mass produced.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1100px] px-5 py-20 text-center sm:px-8 lg:py-28">
          <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-bloom-pink-soft text-bloom-pink">
            <Flower2 className="size-4" />
          </div>
          <blockquote className="mx-auto mt-7 max-w-4xl font-display text-3xl leading-tight font-semibold tracking-[-0.035em] text-bloom-plum sm:text-5xl">
            “A handmade flower lasts much longer than the moment it was given.”
          </blockquote>
          <p className="mt-6 text-xs font-semibold tracking-[0.16em] text-bloom-muted uppercase">
            Handmade Blooms by CRJ
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
