"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";

import { ProductCard } from "@/components/store/product-card";
import type { Availability, Product } from "@/lib/catalog";

type SortOption = "featured" | "newest" | "price-asc" | "price-desc";

export function ShopBrowser({
  products,
  flowers,
}: {
  products: Product[];
  flowers: string[];
}) {
  const [selectedFlowers, setSelectedFlowers] = useState<string[]>([]);
  const [availability, setAvailability] = useState<Availability | "All">("All");
  const [sort, setSort] = useState<SortOption>("featured");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const visibleProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      const matchesFlower =
        selectedFlowers.length === 0 ||
        selectedFlowers.includes(product.flower);
      const matchesAvailability =
        availability === "All" || product.availability === availability;

      return matchesFlower && matchesAvailability;
    });

    return [...filtered].sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "newest") {
        return Number(Boolean(b.badge === "New")) - Number(Boolean(a.badge === "New"));
      }

      return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
    });
  }, [availability, products, selectedFlowers, sort]);

  function toggleFlower(flower: string) {
    setSelectedFlowers((current) =>
      current.includes(flower)
        ? current.filter((item) => item !== flower)
        : [...current, flower],
    );
  }

  const filters = (
    <div className="space-y-8">
      <FilterSection title="Flower">
        <div className="space-y-3">
          {flowers.map((flower) => (
            <label
              key={flower}
              className="flex cursor-pointer items-center justify-between gap-3 text-sm text-bloom-muted"
            >
              <span>{flower}</span>
              <input
                type="checkbox"
                checked={selectedFlowers.includes(flower)}
                onChange={() => toggleFlower(flower)}
                className="size-4 accent-[#7c3aed]"
              />
            </label>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Availability">
        <div className="space-y-3">
          {(["All", "Ready to ship", "Made to order", "Out of stock"] as const).map((item) => (
            <label
              key={item}
              className="flex cursor-pointer items-center justify-between gap-3 text-sm text-bloom-muted"
            >
              <span>{item}</span>
              <input
                type="radio"
                name="availability"
                checked={availability === item}
                onChange={() => setAvailability(item)}
                className="size-4 accent-[#e85d9e]"
              />
            </label>
          ))}
        </div>
      </FilterSection>

      {(selectedFlowers.length > 0 || availability !== "All") && (
        <button
          type="button"
          onClick={() => {
            setSelectedFlowers([]);
            setAvailability("All");
          }}
          className="text-xs font-semibold text-bloom-pink hover:text-bloom-plum"
        >
          Clear filters
        </button>
      )}
    </div>
  );

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-y border-bloom-border py-4">
        <p className="text-sm text-bloom-muted">
          <span className="font-semibold text-bloom-plum">{visibleProducts.length}</span>{" "}
          blooms
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="inline-flex h-10 items-center gap-2 border border-bloom-border bg-white px-3 text-xs font-semibold text-bloom-plum lg:hidden"
          >
            <SlidersHorizontal className="size-4" />
            Filters
          </button>

          <label className="relative">
            <span className="sr-only">Sort products</span>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortOption)}
              className="h-10 appearance-none border border-bloom-border bg-white pl-3 pr-9 text-xs font-semibold text-bloom-plum outline-none transition-colors focus:border-bloom-violet"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-bloom-muted" />
          </label>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">{filters}</aside>

        <div>
          {visibleProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-9 md:grid-cols-3 xl:grid-cols-4 md:gap-x-5">
              {visibleProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="border border-bloom-border bg-white px-6 py-16 text-center">
              <p className="font-display text-2xl font-semibold text-bloom-plum">
                No blooms match those filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedFlowers([]);
                  setAvailability("All");
                }}
                className="mt-4 text-sm font-semibold text-bloom-pink"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
      </div>

      {mobileFiltersOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            className="absolute inset-0 bg-bloom-plum/30 backdrop-blur-[2px]"
            aria-label="Close filters"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto bg-background px-5 pb-8 pt-5 shadow-2xl">
            <div className="mb-7 flex items-center justify-between">
              <p className="font-display text-2xl font-semibold text-bloom-plum">
                Filters
              </p>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="flex size-9 items-center justify-center border border-bloom-border bg-white text-bloom-plum"
                aria-label="Close filters"
              >
                <X className="size-4" />
              </button>
            </div>
            {filters}
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              className="mt-8 h-12 w-full bg-bloom-plum text-sm font-semibold text-white"
            >
              Show {visibleProducts.length} blooms
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-bloom-border pb-7">
      <h2 className="mb-4 text-xs font-semibold tracking-[0.14em] text-bloom-plum uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}
