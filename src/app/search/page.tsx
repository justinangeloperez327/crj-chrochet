import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";

import { ProductCard } from "@/components/store/product-card";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import { StoreSearch } from "@/components/store/store-search";
import type { Availability } from "@/lib/catalog";
import {
  searchStorefront,
  type SearchSort,
} from "@/lib/search/store-search";

export const metadata: Metadata = {
  title: "Search",
  description: "Search handmade crochet flowers, bouquets, and collections.",
};

type Props = {
  searchParams: Promise<{
    q?: string;
    flower?: string;
    availability?: string;
    min?: string;
    max?: string;
    sort?: string;
  }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const availability = parseAvailability(params.availability);
  const sort = parseSort(params.sort);
  const minPrice = parsePrice(params.min);
  const maxPrice = parsePrice(params.max);

  const result = await searchStorefront({
    q: params.q,
    flower: params.flower,
    availability,
    minPrice,
    maxPrice,
    sort,
  });

  const hasQuery = Boolean(result.query);
  const hasFilters = Boolean(
    params.flower ||
      availability ||
      minPrice !== null ||
      maxPrice !== null ||
      sort !== "relevance",
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="border-b border-bloom-border bg-[#fff7fb]">
          <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-bloom-pink">
              Discover
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em] text-bloom-plum sm:text-5xl">
              Search the flower shop.
            </h1>
            <div className="mt-7 max-w-3xl">
              <StoreSearch initialQuery={result.query} />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
          <form
            method="get"
            className="grid gap-3 border border-bloom-border bg-white p-4 md:grid-cols-2 xl:grid-cols-[1fr_180px_180px_140px_140px_160px_auto]"
          >
            <label className="md:col-span-2 xl:col-span-1">
              <FieldLabel>Search</FieldLabel>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-bloom-muted" />
                <input
                  name="q"
                  defaultValue={result.query}
                  maxLength={100}
                  placeholder="Tulip, lavender, bouquet…"
                  className="h-10 w-full border border-bloom-border pl-9 pr-3 text-xs outline-none focus:border-bloom-violet"
                />
              </div>
            </label>

            <label>
              <FieldLabel>Flower</FieldLabel>
              <select
                name="flower"
                defaultValue={params.flower ?? ""}
                className="mt-2 h-10 w-full border border-bloom-border bg-white px-3 text-xs"
              >
                <option value="">All flowers</option>
                {result.flowers.map((flower) => (
                  <option key={flower} value={flower}>
                    {flower}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <FieldLabel>Availability</FieldLabel>
              <select
                name="availability"
                defaultValue={availability}
                className="mt-2 h-10 w-full border border-bloom-border bg-white px-3 text-xs"
              >
                <option value="">All</option>
                <option value="Ready to ship">Ready to ship</option>
                <option value="Made to order">Made to order</option>
                <option value="Out of stock">Out of stock</option>
              </select>
            </label>

            <label>
              <FieldLabel>Min AED</FieldLabel>
              <input
                name="min"
                type="number"
                min="0"
                step="1"
                defaultValue={minPrice ?? ""}
                className="mt-2 h-10 w-full border border-bloom-border px-3 text-xs"
              />
            </label>

            <label>
              <FieldLabel>Max AED</FieldLabel>
              <input
                name="max"
                type="number"
                min="0"
                step="1"
                defaultValue={maxPrice ?? ""}
                className="mt-2 h-10 w-full border border-bloom-border px-3 text-xs"
              />
            </label>

            <label>
              <FieldLabel>Sort</FieldLabel>
              <select
                name="sort"
                defaultValue={sort}
                className="mt-2 h-10 w-full border border-bloom-border bg-white px-3 text-xs"
              >
                <option value="relevance">Relevance</option>
                <option value="rating">Rating</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
            </label>

            <button
              type="submit"
              className="h-10 self-end bg-bloom-plum px-5 text-xs font-semibold text-white"
            >
              Search
            </button>
          </form>

          {hasQuery && result.collections.length > 0 ? (
            <section className="mt-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bloom-violet">
                    Matching collections
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-semibold text-bloom-plum">
                    Curated groups
                  </h2>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {result.collections.map(({ collection }) => (
                  <Link
                    key={collection.id}
                    href={`/collections/${collection.slug}`}
                    className="border border-bloom-border bg-white px-4 py-3 text-xs font-semibold text-bloom-plum hover:border-bloom-violet hover:text-bloom-violet"
                  >
                    {collection.name}
                    <span className="ml-2 font-normal text-bloom-muted">
                      {collection.products.length}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <div className="mt-9 flex flex-wrap items-end justify-between gap-4 border-b border-bloom-border pb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-bloom-muted">
                Products
              </p>
              <h2 className="mt-1 font-display text-3xl font-semibold tracking-[-0.03em] text-bloom-plum">
                {hasQuery
                  ? `${result.totalProducts} result${result.totalProducts === 1 ? "" : "s"} for “${result.query}”`
                  : `${result.totalProducts} blooms`}
              </h2>
            </div>
            {hasFilters ? (
              <Link
                href={result.query ? `/search?q=${encodeURIComponent(result.query)}` : "/search"}
                className="inline-flex items-center gap-2 text-xs font-semibold text-bloom-pink"
              >
                <SlidersHorizontal className="size-3.5" />
                Clear filters
              </Link>
            ) : null}
          </div>

          {result.products.length > 0 ? (
            <div className="mt-7 grid grid-cols-2 gap-x-3 gap-y-9 md:grid-cols-3 xl:grid-cols-4 md:gap-x-5">
              {result.products.map(({ product }) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="mt-7 border border-bloom-border bg-white px-6 py-16 text-center">
              <Search className="mx-auto size-6 text-bloom-violet" />
              <h2 className="mt-4 font-display text-2xl font-semibold text-bloom-plum">
                No blooms matched.
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-bloom-muted">
                Try a flower name, color, broader price range, or remove one of
                the filters.
              </p>
              <Link
                href="/shop"
                className="mt-6 inline-flex h-11 items-center bg-bloom-plum px-5 text-xs font-semibold text-white"
              >
                Browse all blooms
              </Link>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
      {children}
    </span>
  );
}

function parseAvailability(value?: string): Availability | "" {
  return value === "Ready to ship" ||
    value === "Made to order" ||
    value === "Out of stock"
    ? value
    : "";
}

function parseSort(value?: string): SearchSort {
  return value === "rating" ||
    value === "price-asc" ||
    value === "price-desc"
    ? value
    : "relevance";
}

function parsePrice(value?: string) {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
