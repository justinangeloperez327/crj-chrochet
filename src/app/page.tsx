export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, Flower2, Gift, PackageCheck } from "lucide-react";
import { ProductCard } from "@/components/store/product-card";
import { ProductMedia } from "@/components/store/product-media";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import { loadStorefrontProducts } from "@/lib/data/storefront-catalog";
import { loadStorefrontCollections } from "@/lib/data/storefront-collections";
import { getStoreSettings } from "@/lib/settings/store-settings";

export default async function Home() {
  const [products, collections, settings] = await Promise.all([
    loadStorefrontProducts(),
    loadStorefrontCollections(),
    getStoreSettings(),
  ]);
  const featured = products.filter((product) => product.featured);
  const selection = (featured.length ? featured : products).slice(0, 4);
  const hero =
    products.find((product) => product.featured && product.images?.length) ??
    products.find((product) => product.images?.length);
  const curated = collections.filter((collection) => collection.featured);
  const collectionSelection = (curated.length ? curated : collections).slice(
    0,
    3,
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main id="main-content">
        <section className="studio-hero">
          <div className="bloom-container grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-[1fr_1fr] lg:gap-16 lg:py-16">
            <div className="max-w-xl">
              <p className="studio-eyebrow">
                <Flower2 className="size-4" aria-hidden="true" /> The crochet
                flower studio
              </p>
              <h1 className="mt-6 font-display text-[clamp(2.75rem,6vw,5.5rem)] leading-[1.04] font-medium tracking-[-0.045em] text-bloom-plum">
                A little flower.
                <br />
                <span className="text-bloom-violet">A lasting feeling.</span>
              </h1>
              <p className="mt-6 max-w-md text-base leading-7 text-bloom-muted sm:text-lg">
                Handmade crochet flowers for the people and moments you want to
                keep close.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/shop" className="studio-button">
                  Find your blooms{" "}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/build-a-bouquet"
                  className="studio-button studio-button-secondary"
                >
                  Create a bouquet
                </Link>
              </div>
              <p className="mt-6 text-sm text-bloom-muted">
                Choose a ready-made arrangement or make it personal.
              </p>
            </div>
            <div className="studio-display">
              <div className="flex items-center justify-between gap-3 border-b border-bloom-border px-5 py-4 text-xs text-bloom-muted">
                <span>
                  {settings.businessName} {settings.brandByline}
                </span>
                <span className="text-bloom-violet">Made to keep</span>
              </div>
              <ProductMedia
                image={hero?.images?.[0]}
                alt={hero?.name ?? "Crochet bouquet illustration"}
                tone={hero?.tone ?? "violet"}
                priority
                className="aspect-[5/4] w-full"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <p className="text-sm text-bloom-plum">
                  {hero?.name ?? "Flowers, one stitch at a time."}
                </p>
                <Link
                  href={hero ? `/products/${hero.slug}` : "/shop"}
                  className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-bloom-violet"
                >
                  {hero ? "View bouquet" : "Explore the shop"}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="border-y border-bloom-border bg-white">
          <div className="bloom-container grid gap-4 py-5 sm:grid-cols-3">
            {[
              { icon: Flower2, label: "Handmade, stitch by stitch" },
              { icon: Gift, label: "Thoughtful gifts that last" },
              { icon: PackageCheck, label: "Clear stock & lead times" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 text-sm text-bloom-muted"
              >
                <Icon
                  className="size-4 shrink-0 text-bloom-violet"
                  aria-hidden="true"
                />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <section
          className="bloom-container studio-section"
          aria-labelledby="studio-selection"
        >
          <div className="studio-section-heading">
            <div>
              <p className="studio-eyebrow">From the studio</p>
              <h2 id="studio-selection" className="studio-heading mt-3">
                Find your forever flowers.
              </h2>
            </div>
            <Link href="/shop" className="studio-text-link">
              Shop all blooms{" "}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          {selection.length ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
              {selection.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="studio-empty">
              <Flower2
                className="mx-auto size-7 text-bloom-violet"
                aria-hidden="true"
              />
              <h3 className="mt-4 text-lg font-medium">
                The next blooms are on their way.
              </h3>
              <p className="mt-2 text-sm text-bloom-muted">
                Explore a custom bouquet while we prepare the collection.
              </p>
              <Link href="/build-a-bouquet" className="studio-text-link mt-5">
                Create a bouquet <ArrowRight className="size-4" />
              </Link>
            </div>
          )}
        </section>

        {collectionSelection.length ? (
          <section
            id="collections"
            className="border-y border-bloom-border bg-white"
          >
            <div className="bloom-container studio-section">
              <div className="studio-section-heading">
                <div>
                  <p className="studio-eyebrow">A place to start</p>
                  <h2 className="studio-heading mt-3">Meet the collections.</h2>
                </div>
                <Link href="/collections" className="studio-text-link">
                  All collections{" "}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
              <div className="grid gap-7 sm:grid-cols-3">
                {collectionSelection.map((collection) => (
                  <Link
                    key={collection.id}
                    href={`/collections/${collection.slug}`}
                    className="group"
                  >
                    <ProductMedia
                      image={collection.products[0]?.images?.[0]}
                      alt={collection.name}
                      tone={collection.tone}
                      compact
                      className="aspect-[4/3] border border-bloom-border"
                      imageClassName="transition-transform duration-200 group-hover:scale-[1.025]"
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <h3 className="font-display text-2xl text-bloom-plum">
                        {collection.name}
                      </h3>
                      <ArrowRight
                        className="size-4 text-bloom-violet"
                        aria-hidden="true"
                      />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-bloom-muted">
                      {collection.description ||
                        `${collection.products.length} handmade selections`}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section id="story" className="bloom-container studio-section">
          <div className="grid gap-8 border-l-4 border-bloom-pink bg-bloom-violet-soft p-6 sm:p-8 lg:grid-cols-[1fr_1fr] lg:gap-14 lg:p-10">
            <div>
              <p className="studio-eyebrow">A personal kind of gift</p>
              <h2 className="studio-heading mt-4">
                Made by hand.
                <br />
                Chosen by you.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-bloom-muted">
                Every stem is shaped, stitched, and assembled by hand. Choose
                the flowers, colours, and wrapping that feel like them. We’ll
                make the bouquet yours.
              </p>
              <Link href="/build-a-bouquet" className="studio-button mt-7">
                Build a bouquet{" "}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <ol className="divide-y divide-bloom-violet/20 self-center">
              {[
                ["Choose your flowers", "Pick the stems and colours you love."],
                ["Make it personal", "Select the wrapping and add a message."],
                [
                  "Review your bouquet",
                  "Send your choices for a custom quote.",
                ],
              ].map(([title, description], index) => (
                <li
                  key={title}
                  className="flex gap-4 py-5 first:pt-0 last:pb-0"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center border border-bloom-violet/30 text-sm text-bloom-violet">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-medium">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-bloom-muted">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
