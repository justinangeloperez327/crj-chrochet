"use client";

import Link from "next/link";
import { Check, Heart, ShoppingBag } from "lucide-react";
import { useState } from "react";

import { ProductMedia } from "@/components/store/product-media";
import {
  addToCart,
  toggleWishlist,
  useIsWishlisted,
} from "@/lib/commerce-store";
import type { Product } from "@/lib/catalog";

export function ProductCard({ product }: { product: Product }) {
  const wishlisted = useIsWishlisted(product.id);
  const [added, setAdded] = useState(false);

  const quickAddUnavailable =
    product.defaultVariant?.fulfillmentMode === "READY_STOCK" &&
    product.defaultVariant.available === 0;

  function handleQuickAdd() {
    if (quickAddUnavailable) return;

    const defaultSize =
      product.sizes.find((size) => size.price === product.price) ??
      product.sizes[0];
    const defaultColor = product.colors[0];
    const defaultVariant =
      product.defaultVariant ??
      product.variants?.find(
        (variant) =>
          variant.colorName === defaultColor?.name &&
          variant.stems === defaultSize?.stems,
      );

    addToCart({
      productId: product.id,
      productSlug: product.slug,
      variantSku: defaultVariant?.sku,
      colorName: defaultVariant?.colorName ?? defaultColor?.name,
      sizeName: defaultVariant?.sizeName ?? defaultSize?.name,
      stems: defaultVariant?.stems ?? defaultSize?.stems,
      imageUrl: product.images?.[0]?.url,
      imageAlt: product.images?.[0]?.altText,
      name: product.name,
      quantity: 1,
      unitPrice: defaultVariant?.price ?? product.price,
      variant: defaultVariant
        ? `${defaultVariant.colorName} · ${defaultVariant.sizeName} · ${defaultVariant.stems} stems`
        : product.variant,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  }

  return (
    <article className="group min-w-0">
      <div className="relative aspect-[4/5] overflow-hidden border border-bloom-border bg-white">
        <Link
          href={`/products/${product.slug}`}
          className="absolute inset-0"
          aria-label={`View ${product.name}`}
        >
          <ProductMedia
            image={product.images?.[0]}
            alt={product.name}
            tone={product.tone}
            compact
            className="absolute inset-0"
            imageClassName="transition-transform duration-500 ease-out group-hover:scale-[1.025]"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </Link>

        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-label={
            wishlisted
              ? `Remove ${product.name} from wishlist`
              : `Add ${product.name} to wishlist`
          }
          className={
            "absolute right-3 top-3 z-10 flex size-11 items-center justify-center bg-white/90 backdrop-blur transition-colors " +
            (wishlisted
              ? "text-bloom-pink"
              : "text-bloom-plum hover:text-bloom-pink")
          }
        >
          <Heart className={"size-4 " + (wishlisted ? "fill-current" : "")} />
        </button>

        <button
          type="button"
          aria-label={
            quickAddUnavailable
              ? `${product.name} is out of stock`
              : `Quick add ${product.name}`
          }
          onClick={handleQuickAdd}
          disabled={quickAddUnavailable}
          className="absolute inset-x-3 bottom-3 z-10 flex min-h-11 items-center justify-center gap-2 bg-bloom-plum px-3 py-3 text-sm font-medium text-white transition-colors hover:bg-bloom-violet disabled:cursor-not-allowed disabled:bg-bloom-muted"
        >
          {added ? (
            <Check className="size-3.5" />
          ) : (
            <ShoppingBag className="size-3.5" />
          )}
          {quickAddUnavailable ? "Out of stock" : added ? "Added" : "Quick add"}
        </button>
      </div>

      <div className="pt-4">
        <div className="mb-2 min-h-4 text-xs font-medium text-bloom-violet">
          {product.badge ?? null}
        </div>
        <span role="status" className="sr-only">
          {added ? `${product.name} added to your bag` : ""}
        </span>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div>
            <Link
              href={`/products/${product.slug}`}
              className="text-base font-medium leading-6 text-bloom-plum transition-colors hover:text-bloom-pink"
            >
              {product.name}
            </Link>
            <p className="mt-1 text-xs text-bloom-muted">{product.variant}</p>
          </div>
          <p className="shrink-0 text-sm font-medium tabular-nums text-bloom-plum">
            AED {product.price}
          </p>
        </div>
        <p
          className={
            "mt-2 text-xs font-medium " +
            (product.availability === "Ready to ship"
              ? "text-bloom-success"
              : product.availability === "Out of stock"
                ? "text-red-600"
                : "text-bloom-violet")
          }
        >
          {product.availability}
        </p>
      </div>
    </article>
  );
}
