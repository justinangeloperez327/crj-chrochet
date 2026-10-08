"use client";

import { useMemo, useState } from "react";
import { Check, Heart, Minus, Plus, ShoppingBag } from "lucide-react";

import { addToCart, toggleWishlist, useIsWishlisted } from "@/lib/commerce-store";
import type { Product } from "@/lib/catalog";

export function ProductPurchasePanel({ product }: { product: Product }) {
  const [colorIndex, setColorIndex] = useState(0);
  const [sizeIndex, setSizeIndex] = useState(
    Math.max(
      0,
      product.sizes.findIndex((size) => size.price === product.price),
    ),
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const wishlisted = useIsWishlisted(product.id);

  const selectedColor = product.colors[colorIndex];
  const selectedSize = product.sizes[sizeIndex];
  const total = selectedSize.price * quantity;

  const variantLabel = useMemo(
    () => `${selectedColor.name} · ${selectedSize.name} · ${selectedSize.stems} stems`,
    [selectedColor, selectedSize],
  );

  function handleAddToCart() {
    addToCart({
      productId: product.id,
      name: product.name,
      quantity,
      unitPrice: selectedSize.price,
      variant: variantLabel,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[#d29a32]">★★★★★</span>
        <span className="font-semibold text-bloom-plum">{product.rating}</span>
        <span className="text-bloom-muted">· {product.reviewCount} reviews</span>
      </div>

      <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.04em] text-bloom-plum sm:text-5xl">
        {product.name}
      </h1>
      <p className="mt-4 text-2xl font-semibold text-bloom-plum">
        AED {selectedSize.price}
      </p>
      <p className="mt-5 max-w-xl text-sm leading-6 text-bloom-muted">
        {product.description}
      </p>

      <div className="mt-7 flex items-center gap-2">
        <span
          className={
            product.availability === "Ready to ship"
              ? "size-2 rounded-full bg-bloom-success"
              : "size-2 rounded-full bg-bloom-violet"
          }
        />
        <p className="text-xs font-semibold text-bloom-plum">
          {product.availability}
          {product.leadTime ? ` · ${product.leadTime}` : ""}
        </p>
      </div>

      <div className="mt-9 border-t border-bloom-border pt-7">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-bloom-plum">Color</p>
          <p className="text-xs text-bloom-muted">{selectedColor.name}</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          {product.colors.map((color, index) => (
            <button
              key={color.name}
              type="button"
              onClick={() => setColorIndex(index)}
              aria-label={`Choose ${color.name}`}
              className={
                "flex size-10 items-center justify-center rounded-full border transition " +
                (colorIndex === index
                  ? "border-bloom-plum"
                  : "border-transparent hover:border-bloom-border")
              }
            >
              <span
                className="flex size-7 items-center justify-center rounded-full border border-black/5"
                style={{ backgroundColor: color.hex }}
              >
                {colorIndex === index ? (
                  <Check className="size-3.5 text-white drop-shadow" />
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-7">
        <p className="text-sm font-semibold text-bloom-plum">Bouquet size</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {product.sizes.map((size, index) => (
            <button
              key={size.name}
              type="button"
              onClick={() => setSizeIndex(index)}
              className={
                "border px-4 py-3 text-left transition-colors " +
                (sizeIndex === index
                  ? "border-bloom-violet bg-bloom-violet-soft/45"
                  : "border-bloom-border bg-white hover:border-bloom-violet/40")
              }
            >
              <span className="block text-xs font-semibold text-bloom-plum">
                {size.name}
              </span>
              <span className="mt-1 block text-[11px] text-bloom-muted">
                {size.stems} stems · AED {size.price}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <div className="flex h-12 items-center border border-bloom-border bg-white">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
            className="flex size-11 items-center justify-center text-bloom-plum"
          >
            <Minus className="size-3.5" />
          </button>
          <span className="w-7 text-center text-sm font-semibold text-bloom-plum">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQuantity((current) => Math.min(9, current + 1))}
            className="flex size-11 items-center justify-center text-bloom-plum"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          className="flex h-12 flex-1 items-center justify-center gap-2 bg-bloom-plum px-5 text-sm font-semibold text-white transition-colors hover:bg-[#492847]"
        >
          <ShoppingBag className="size-4" />
          {added ? "Added to bag" : `Add · AED ${total}`}
        </button>

        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className={
            "flex size-12 items-center justify-center border transition-colors " +
            (wishlisted
              ? "border-bloom-pink bg-bloom-pink-soft text-bloom-pink"
              : "border-bloom-border bg-white text-bloom-plum hover:border-bloom-pink")
          }
        >
          <Heart className={"size-4 " + (wishlisted ? "fill-current" : "")} />
        </button>
      </div>

      <div className="mt-7 grid grid-cols-3 divide-x divide-bloom-border border-y border-bloom-border py-4 text-center">
        <div className="px-2">
          <p className="text-[11px] font-semibold text-bloom-plum">Handmade</p>
        </div>
        <div className="px-2">
          <p className="text-[11px] font-semibold text-bloom-plum">Gift ready</p>
        </div>
        <div className="px-2">
          <p className="text-[11px] font-semibold text-bloom-plum">Secure checkout</p>
        </div>
      </div>
    </div>
  );
}
