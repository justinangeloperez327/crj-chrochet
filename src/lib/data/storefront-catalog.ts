import { cache } from "react";

import {
  getActiveStorefrontProductBySlug,
  listActiveStorefrontProducts,
} from "@/lib/data/catalog-repository";
import {
  getProductBySlug as getFallbackProductBySlug,
  products as fallbackProducts,
} from "@/lib/catalog";

export const loadStorefrontProducts = cache(async () => {
  if (!process.env.DATABASE_URL) {
    return process.env.NODE_ENV === "production" ? [] : fallbackProducts;
  }

  try {
    const databaseProducts = await listActiveStorefrontProducts();
    return databaseProducts ?? (process.env.NODE_ENV === "production" ? [] : fallbackProducts);
  } catch (error) {
    console.error("Database catalog unavailable; using static fallback.", error);
    return process.env.NODE_ENV === "production" ? [] : fallbackProducts;
  }
});

export const loadStorefrontProductBySlug = cache(async (slug: string) => {
  if (!process.env.DATABASE_URL) {
    return process.env.NODE_ENV === "production" ? undefined : getFallbackProductBySlug(slug);
  }

  try {
    const databaseProduct = await getActiveStorefrontProductBySlug(slug);

    if (databaseProduct === undefined) {
      return process.env.NODE_ENV === "production" ? undefined : getFallbackProductBySlug(slug);
    }

    return databaseProduct ?? undefined;
  } catch (error) {
    console.error(
      `Database product lookup failed for ${slug}; using static fallback.`,
      error,
    );
    return process.env.NODE_ENV === "production" ? undefined : getFallbackProductBySlug(slug);
  }
});
