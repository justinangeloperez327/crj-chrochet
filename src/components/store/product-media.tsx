import Image from "next/image";

import { BloomArtwork } from "@/components/store/bloom-art";
import type { ProductImageAsset, ProductTone } from "@/lib/catalog";
import { cn } from "@/lib/utils";

type ProductMediaProps = {
  image?: ProductImageAsset;
  alt: string;
  tone: ProductTone;
  compact?: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
};

export function ProductMedia({
  image,
  alt,
  tone,
  compact = false,
  sizes = "(max-width: 768px) 50vw, 25vw",
  priority = false,
  className,
  imageClassName,
}: ProductMediaProps) {
  if (!image?.url) {
    return (
      <BloomArtwork
        tone={tone}
        compact={compact}
        className={className}
      />
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <Image
        src={image.url}
        alt={image.altText || alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", imageClassName)}
      />
    </div>
  );
}
