import { Heart } from "lucide-react";

import { BloomArtwork } from "@/components/store/bloom-art";
import type { ProductPreview } from "@/lib/catalog";

export function ProductCard({ product }: { product: ProductPreview }) {
  return (
    <article className="group">
      <div className="relative aspect-[4/5] overflow-hidden border border-bloom-border bg-white">
        <BloomArtwork
          tone={product.tone}
          compact
          className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.025]"
        />
        {product.badge ? (
          <span className="absolute left-3 top-3 border border-white/70 bg-white/90 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-bloom-plum uppercase backdrop-blur">
            {product.badge}
          </span>
        ) : null}
        <button
          type="button"
          aria-label={`Add ${product.name} to wishlist`}
          className="absolute right-3 top-3 flex size-8 items-center justify-center bg-white/85 text-bloom-plum backdrop-blur transition-colors hover:text-bloom-pink"
        >
          <Heart className="size-4" />
        </button>
        <button
          type="button"
          className="absolute inset-x-3 bottom-3 translate-y-2 bg-bloom-plum px-4 py-3 text-xs font-semibold tracking-[0.08em] text-white opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100"
        >
          Quick add
        </button>
      </div>

      <div className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-bloom-plum">{product.name}</h3>
            <p className="mt-1 text-xs text-bloom-muted">{product.variant}</p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-bloom-plum">
            AED {product.price}
          </p>
        </div>
        <p className="mt-2 text-[11px] font-medium text-bloom-success">
          {product.availability}
        </p>
      </div>
    </article>
  );
}
