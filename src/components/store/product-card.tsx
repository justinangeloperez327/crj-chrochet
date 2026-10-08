"use client";

import Link from "next/link";
import { Check, Heart, ShoppingBag } from "lucide-react";
import { useState } from "react";

import { BloomArtwork } from "@/components/store/bloom-art";
import {
  addToCart,
  toggleWishlist,
  useIsWishlisted,
} from "@/lib/commerce-store";
import type { ProductPreview } from "@/lib/catalog";

export function ProductCard({ product }: { product: ProductPreview }) {
  const wishlisted = useIsWishlisted(product.id);
  const [added, setAdded] = useState(false);

  function handleQuickAdd() {
    addToCart({
      productId: product.id,
      name: product.name,
      quantity: 1,
      unitPrice: product.price,
      variant: product.variant,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  }

  return (
    <article className="group">
      <div className="relative aspect-[4/5] overflow-hidden border border-bloom-border bg-white">
        <Link
          href={`/products/${product.slug}`}
          className="absolute inset-0"
          aria-label={`View ${product.name}`}
        >
          <BloomArtwork
            tone={product.tone}
            compact
            className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.025]"
          />
        </Link>

        {product.badge ? (
          <span className="pointer-events-none absolute left-3 top-3 border border-white/70 bg-white/90 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-bloom-plum uppercase backdrop-blur">
            {product.badge}
          </span>
        ) : null}

        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          className={
            "absolute right-3 top-3 z-10 flex size-8 items-center justify-center bg-white/90 backdrop-blur transition-colors " +
            (wishlisted
              ? "text-bloom-pink"
              : "text-bloom-plum hover:text-bloom-pink")
          }
        >
          <Heart className={"size-4 " + (wishlisted ? "fill-current" : "")} />
        </button>

        <button
          type="button"
          onClick={handleQuickAdd}
          className="absolute inset-x-3 bottom-3 z-10 flex translate-y-2 items-center justify-center gap-2 bg-bloom-plum px-4 py-3 text-xs font-semibold tracking-[0.04em] text-white opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 focus:translate-y-0 focus:opacity-100"
        >
          {added ? <Check className="size-3.5" /> : <ShoppingBag className="size-3.5" />}
          {added ? "Added" : "Quick add"}
        </button>
      </div>

      <div className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href={`/products/${product.slug}`}
              className="text-sm font-semibold text-bloom-plum transition-colors hover:text-bloom-pink"
            >
              {product.name}
            </Link>
            <p className="mt-1 text-xs text-bloom-muted">{product.variant}</p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-bloom-plum">
            AED {product.price}
          </p>
        </div>
        <p
          className={
            "mt-2 text-[11px] font-medium " +
            (product.availability === "Ready to ship"
              ? "text-bloom-success"
              : "text-bloom-violet")
          }
        >
          {product.availability}
        </p>
      </div>
    </article>
  );
}
