import type { Availability, Product } from "@/lib/catalog";
import { loadStorefrontProducts } from "@/lib/data/storefront-catalog";
import type { StorefrontCollection } from "@/lib/collections/collection-repository";
import { loadStorefrontCollections } from "@/lib/data/storefront-collections";

export type SearchSort =
  | "relevance"
  | "rating"
  | "price-asc"
  | "price-desc";

export type StoreSearchFilters = {
  q?: string;
  flower?: string;
  availability?: Availability | "";
  minPrice?: number | null;
  maxPrice?: number | null;
  sort?: SearchSort;
};

export type SearchProductResult = {
  product: Product;
  score: number;
};

export async function searchStorefront(filters: StoreSearchFilters) {
  const [products, collections] = await Promise.all([
    loadStorefrontProducts(),
    loadStorefrontCollections(),
  ]);

  const query = normalize(filters.q ?? "");
  const flower = filters.flower?.trim() ?? "";
  const availability = filters.availability ?? "";
  const minPrice = validPrice(filters.minPrice);
  const maxPrice = validPrice(filters.maxPrice);

  let productResults = products
    .map((product) => ({
      product,
      score: query ? productScore(product, query) : 1,
    }))
    .filter(({ product, score }) => {
      if (query && score <= 0) return false;
      if (flower && product.flower !== flower) return false;
      if (availability && product.availability !== availability) return false;
      if (minPrice !== null && product.price < minPrice) return false;
      if (maxPrice !== null && product.price > maxPrice) return false;
      return true;
    });

  productResults = sortProducts(productResults, filters.sort ?? "relevance");

  const collectionResults = collections
    .map((collection) => ({
      collection,
      score: query ? collectionScore(collection, query) : 0,
    }))
    .filter(({ score }) => Boolean(query) && score > 0)
    .sort((a, b) => b.score - a.score || a.collection.sortOrder - b.collection.sortOrder)
    .slice(0, 8);

  return {
    query: filters.q?.trim() ?? "",
    products: productResults,
    collections: collectionResults,
    flowers: Array.from(new Set(products.map((product) => product.flower))).sort(),
    totalProducts: productResults.length,
  };
}

export async function autocompleteStorefront(queryInput: string) {
  const query = normalize(queryInput);

  if (query.length < 2) {
    return { products: [], collections: [] };
  }

  const result = await searchStorefront({ q: queryInput });

  return {
    products: result.products.slice(0, 6).map(({ product }) => ({
      slug: product.slug,
      name: product.name,
      flower: product.flower,
      price: product.price,
      availability: product.availability,
      image: product.images?.[0] ?? null,
    })),
    collections: result.collections.slice(0, 4).map(({ collection }) => ({
      slug: collection.slug,
      name: collection.name,
      description: collection.description,
    })),
  };
}

function productScore(product: Product, query: string) {
  const name = normalize(product.name);
  const slug = normalize(product.slug.replaceAll("-", " "));
  const flower = normalize(product.flower);
  const variant = normalize(product.variant);
  const description = normalize(product.description);
  const colors = normalize(product.colors.map((color) => color.name).join(" "));
  const tokens = query.split(" ").filter(Boolean);

  let score = 0;

  if (name === query || slug === query) score += 120;
  if (name.startsWith(query)) score += 70;
  if (name.includes(query)) score += 50;
  if (slug.includes(query)) score += 45;
  if (flower === query) score += 40;
  if (flower.includes(query)) score += 28;
  if (variant.includes(query)) score += 20;
  if (colors.includes(query)) score += 16;
  if (description.includes(query)) score += 10;

  for (const token of tokens) {
    if (name.includes(token)) score += 18;
    if (flower.includes(token)) score += 12;
    if (variant.includes(token)) score += 8;
    if (colors.includes(token)) score += 6;
    if (description.includes(token)) score += 3;
  }

  if (product.featured) score += 2;
  if (product.reviewCount > 0) score += Math.min(2, product.rating / 2.5);

  return score;
}

function collectionScore(collection: StorefrontCollection, query: string) {
  const name = normalize(collection.name);
  const slug = normalize(collection.slug.replaceAll("-", " "));
  const description = normalize(collection.description);
  const productNames = normalize(
    collection.products.map((product) => product.name).join(" "),
  );

  let score = 0;
  if (name === query || slug === query) score += 100;
  if (name.startsWith(query)) score += 60;
  if (name.includes(query)) score += 45;
  if (slug.includes(query)) score += 35;
  if (description.includes(query)) score += 12;
  if (productNames.includes(query)) score += 8;
  if (collection.featured) score += 2;
  return score;
}

function sortProducts(
  products: SearchProductResult[],
  sort: SearchSort,
) {
  return [...products].sort((a, b) => {
    if (sort === "price-asc") return a.product.price - b.product.price;
    if (sort === "price-desc") return b.product.price - a.product.price;
    if (sort === "rating") {
      return (
        b.product.rating - a.product.rating ||
        b.product.reviewCount - a.product.reviewCount ||
        b.score - a.score
      );
    }

    return (
      b.score - a.score ||
      Number(Boolean(b.product.featured)) - Number(Boolean(a.product.featured)) ||
      a.product.name.localeCompare(b.product.name)
    );
  });
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function validPrice(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}
