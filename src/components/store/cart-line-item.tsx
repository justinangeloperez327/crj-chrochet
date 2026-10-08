"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";

import { BloomArtwork } from "@/components/store/bloom-art";
import {
  removeCartLine,
  updateCartLineQuantity,
  type CartLine,
} from "@/lib/commerce-store";
import { products } from "@/lib/catalog";

export function CartLineItem({
  line,
  index,
  compact = false,
}: {
  line: CartLine;
  index: number;
  compact?: boolean;
}) {
  const product = products.find((item) => item.id === line.productId);

  return (
    <div className="flex gap-4 border-b border-bloom-border py-5 first:pt-0">
      <Link
        href={product ? `/products/${product.slug}` : "/shop"}
        className={
          "relative shrink-0 overflow-hidden border border-bloom-border bg-white " +
          (compact ? "size-20" : "size-24 sm:size-28")
        }
      >
        <BloomArtwork
          tone={product?.tone ?? "rose"}
          compact
          className="absolute inset-0"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link
              href={product ? `/products/${product.slug}` : "/shop"}
              className="text-sm font-semibold text-bloom-plum hover:text-bloom-pink"
            >
              {line.name}
            </Link>
            <p className="mt-1 text-[11px] leading-4 text-bloom-muted">
              {line.variant}
            </p>
          </div>
          <button
            type="button"
            onClick={() => removeCartLine(index)}
            aria-label={`Remove ${line.name}`}
            className="flex size-8 shrink-0 items-center justify-center text-bloom-muted transition-colors hover:text-red-600"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>

        <div className="mt-4 flex items-end justify-between gap-4">
          <div className="flex h-9 items-center border border-bloom-border bg-white">
            <button
              type="button"
              onClick={() =>
                updateCartLineQuantity(index, Math.max(0, line.quantity - 1))
              }
              aria-label="Decrease quantity"
              className="flex size-8 items-center justify-center text-bloom-plum"
            >
              <Minus className="size-3" />
            </button>
            <span className="w-7 text-center text-xs font-semibold text-bloom-plum">
              {line.quantity}
            </span>
            <button
              type="button"
              onClick={() =>
                updateCartLineQuantity(index, line.quantity + 1)
              }
              aria-label="Increase quantity"
              className="flex size-8 items-center justify-center text-bloom-plum"
            >
              <Plus className="size-3" />
            </button>
          </div>

          <p className="text-sm font-semibold text-bloom-plum">
            AED {line.unitPrice * line.quantity}
          </p>
        </div>
      </div>
    </div>
  );
}
