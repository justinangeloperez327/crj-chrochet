"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

const RECENTS_KEY = "crj_recent_searches";


type SuggestionResponse = {
  products: Array<{
    slug: string;
    name: string;
    flower: string;
    price: number;
    availability: string;
  }>;
  collections: Array<{
    slug: string;
    name: string;
    description: string;
  }>;
};

const EMPTY_RESULTS: SuggestionResponse = { products: [], collections: [] };

export function StoreSearch({
  compact = false,
  initialQuery = "",
}: {
  compact?: boolean;
  initialQuery?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState<{
    query: string;
    results: SuggestionResponse;
  }>({ query: "", results: EMPTY_RESULTS });
  const [recents, setRecents] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const parsed: unknown = JSON.parse(
        window.localStorage.getItem(RECENTS_KEY) ?? "[]",
      );
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string").slice(0, 5)
        : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const result = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!result.ok) return;
        const data = (await result.json()) as SuggestionResponse;
        if (!controller.signal.aborted) {
          setResponse({ query: trimmed, results: data });
        }
      } catch {
        if (!controller.signal.aborted) {
          setResponse({ query: trimmed, results: EMPTY_RESULTS });
        }
      }
    }, 180);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  // Never show suggestions belonging to a previous search term.
  const results =
    query.trim().length >= 2 && response.query === query.trim()
      ? response.results
      : EMPTY_RESULTS;

  function remember(value: string) {
    const normalized = value.trim();
    if (!normalized) return;
    const next = [normalized, ...recents.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 5);
    setRecents(next);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    remember(value);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(value)}`);
  }

  const hasSuggestions =
    results.products.length > 0 || results.collections.length > 0;

  return (
    <div className={compact ? "relative" : "relative w-full"}>
      <form onSubmit={submit} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-bloom-muted" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          maxLength={100}
          placeholder={compact ? "Search" : "Search flowers, colors, collections…"}
          aria-label="Search store"
          className={
            compact
              ? "h-9 w-44 border border-bloom-border bg-white pl-9 pr-8 text-xs outline-none focus:border-bloom-violet"
              : "h-12 w-full border border-bloom-border bg-white pl-10 pr-10 text-sm outline-none focus:border-bloom-violet"
          }
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
            }}
            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center text-bloom-muted"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </form>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[80] max-h-[460px] overflow-y-auto border border-bloom-border bg-white shadow-xl">
          {query.trim().length >= 2 ? (
            hasSuggestions ? (
              <div>
                {results.products.length > 0 ? (
                  <section className="p-3">
                    <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-bloom-muted">
                      Products
                    </p>
                    {results.products.map((product) => (
                      <Link
                        key={product.slug}
                        href={`/products/${product.slug}`}
                        onClick={() => {
                          remember(query);
                          setOpen(false);
                        }}
                        className="flex items-center justify-between gap-3 px-2 py-3 text-xs hover:bg-[#faf8fa]"
                      >
                        <span>
                          <span className="font-semibold text-bloom-plum">{product.name}</span>
                          <span className="mt-1 block text-[10px] text-bloom-muted">
                            {product.flower} · {product.availability}
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold text-bloom-plum">
                          AED {product.price}
                        </span>
                      </Link>
                    ))}
                  </section>
                ) : null}

                {results.collections.length > 0 ? (
                  <section className="border-t border-bloom-border p-3">
                    <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-bloom-muted">
                      Collections
                    </p>
                    {results.collections.map((collection) => (
                      <Link
                        key={collection.slug}
                        href={`/collections/${collection.slug}`}
                        onClick={() => {
                          remember(query);
                          setOpen(false);
                        }}
                        className="block px-2 py-3 text-xs hover:bg-[#faf8fa]"
                      >
                        <span className="font-semibold text-bloom-plum">{collection.name}</span>
                        {collection.description ? (
                          <span className="mt-1 line-clamp-1 block text-[10px] text-bloom-muted">
                            {collection.description}
                          </span>
                        ) : null}
                      </Link>
                    ))}
                  </section>
                ) : null}

                <Link
                  href={`/search?q=${encodeURIComponent(query.trim())}`}
                  onClick={() => {
                    remember(query);
                    setOpen(false);
                  }}
                  className="block border-t border-bloom-border px-5 py-3 text-xs font-semibold text-bloom-violet"
                >
                  View all results for “{query.trim()}”
                </Link>
              </div>
            ) : (
              <div className="px-5 py-8 text-center text-xs text-bloom-muted">
                No quick matches. Press Enter to search the full catalog.
              </div>
            )
          ) : recents.length > 0 ? (
            <section className="p-3">
              <div className="flex items-center justify-between px-2 py-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-bloom-muted">
                  Recent searches
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRecents([]);
                    localStorage.removeItem(RECENTS_KEY);
                  }}
                  className="text-[9px] font-semibold text-bloom-pink"
                >
                  Clear
                </button>
              </div>
              {recents.map((recent) => (
                <button
                  key={recent}
                  type="button"
                  onClick={() => {
                    setQuery(recent);
                    setOpen(true);
                  }}
                  className="block w-full px-2 py-2.5 text-left text-xs text-bloom-plum hover:bg-[#faf8fa]"
                >
                  {recent}
                </button>
              ))}
            </section>
          ) : (
            <div className="px-5 py-7 text-center text-xs text-bloom-muted">
              Search by flower, bouquet name, color, or collection.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
