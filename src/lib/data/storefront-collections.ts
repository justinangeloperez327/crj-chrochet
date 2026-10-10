import { cache } from "react";

import { products as fallbackProducts } from "@/lib/catalog";
import {
  getStorefrontCollectionBySlug,
  listStorefrontCollections,
  type StorefrontCollection,
} from "@/lib/collections/collection-repository";

const fallbackDefinitions = [
  {
    slug: "best-sellers",
    name: "Best Sellers",
    description: "Most-loved handmade blooms.",
    featured: true,
    sortOrder: 10,
    productSlugs: [
      "pink-tulip-bouquet",
      "violet-rose-bouquet",
      "peach-daisy-set",
      "sunflower-bundle",
    ],
  },
  {
    slug: "ready-to-ship",
    name: "Ready to Ship",
    description: "Finished pieces available from current stock.",
    featured: true,
    sortOrder: 20,
    productSlugs: [
      "pink-tulip-bouquet",
      "peach-daisy-set",
      "cream-rose-duo",
      "lavender-tulip-trio",
    ],
  },
  {
    slug: "gift-favorites",
    name: "Gift Favorites",
    description: "Easy gifting choices for meaningful occasions.",
    featured: true,
    sortOrder: 30,
    productSlugs: [
      "peach-daisy-set",
      "sunflower-bundle",
      "lavender-tulip-trio",
      "blush-rose-bundle",
    ],
  },
  {
    slug: "made-to-order",
    name: "Made to Order",
    description: "Bouquets made after the order is confirmed.",
    featured: false,
    sortOrder: 40,
    productSlugs: [
      "violet-rose-bouquet",
      "sunflower-bundle",
      "mini-daisy-posy",
      "blush-rose-bundle",
    ],
  },
] as const;

export const loadStorefrontCollections = cache(async () => {
  if (!process.env.DATABASE_URL) {
    return fallbackCollections();
  }

  try {
    const records = await listStorefrontCollections();
    return records ?? fallbackCollections();
  } catch (error) {
    console.error(
      "Database collections unavailable; using static fallback.",
      error,
    );
    return fallbackCollections();
  }
});

export const loadStorefrontCollectionBySlug = cache(
  async (slug: string) => {
    if (!process.env.DATABASE_URL) {
      return fallbackCollectionBySlug(slug);
    }

    try {
      const record = await getStorefrontCollectionBySlug(slug);

      if (record === undefined) {
        return fallbackCollectionBySlug(slug);
      }

      return record ?? undefined;
    } catch (error) {
      console.error(
        `Database collection lookup failed for ${slug}; using static fallback.`,
        error,
      );
      return fallbackCollectionBySlug(slug);
    }
  },
);

function fallbackCollections(): StorefrontCollection[] {
  return fallbackDefinitions.map((definition) => {
    const collectionProducts = definition.productSlugs.flatMap((slug) => {
      const product = fallbackProducts.find((item) => item.slug === slug);
      return product ? [product] : [];
    });

    return {
      id: definition.slug,
      slug: definition.slug,
      name: definition.name,
      description: definition.description,
      featured: definition.featured,
      sortOrder: definition.sortOrder,
      seoTitle: definition.name,
      seoDescription: definition.description,
      tone: collectionProducts[0]?.tone ?? "rose",
      products: collectionProducts,
    };
  });
}

function fallbackCollectionBySlug(slug: string) {
  return fallbackCollections().find(
    (collection) => collection.slug === slug,
  );
}
