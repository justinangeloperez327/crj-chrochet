"use client";

import { useState } from "react";

import { ProductMedia } from "@/components/store/product-media";
import type {
  ProductImageAsset,
  ProductTone,
} from "@/lib/catalog";

export function ProductGallery({
  name,
  tone,
  images,
}: {
  name: string;
  tone: ProductTone;
  images: ProductImageAsset[];
}) {
  const [selected, setSelected] = useState(0);

  if (images.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <ProductMedia
          alt={name}
          tone={tone}
          className="col-span-2 aspect-[5/4] border border-bloom-border"
          sizes="(max-width: 1024px) 100vw, 55vw"
          priority
        />
        <ProductMedia
          alt={name}
          tone={tone}
          compact
          className="aspect-square border border-bloom-border"
        />
        <ProductMedia
          alt={name}
          tone={tone}
          compact
          className="aspect-square border border-bloom-border"
        />
      </div>
    );
  }

  const active = images[Math.min(selected, images.length - 1)];

  return (
    <div>
      <ProductMedia
        image={active}
        alt={name}
        tone={tone}
        className="aspect-[5/4] border border-bloom-border bg-white"
        sizes="(max-width: 1024px) 100vw, 55vw"
        priority
      />

      {images.length > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.map((image, index) => (
            <button
              key={image.id ?? image.url}
              type="button"
              onClick={() => setSelected(index)}
              aria-label={`View image ${index + 1} of ${name}`}
              className={
                "relative aspect-square overflow-hidden border bg-white " +
                (index === selected
                  ? "border-bloom-violet"
                  : "border-bloom-border")
              }
            >
              <ProductMedia
                image={image}
                alt={name}
                tone={tone}
                className="absolute inset-0"
                sizes="120px"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
