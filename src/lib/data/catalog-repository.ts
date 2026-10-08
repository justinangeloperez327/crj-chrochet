import type { PrismaClient } from "@/generated/prisma/client";
import type {
  Product,
  ProductBadge,
  ProductTone,
  ProductVariantOption,
} from "@/lib/catalog";
import { getDb } from "@/lib/db";

async function queryActiveProducts(db: PrismaClient) {
  return db.product.findMany({
    where: { status: "ACTIVE" },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: {
        where: { isActive: true },
        orderBy: [{ price: "asc" }, { name: "asc" }],
      },
    },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });
}

async function queryActiveProductBySlug(db: PrismaClient, slug: string) {
  return db.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: {
        where: { isActive: true },
        orderBy: [{ price: "asc" }, { name: "asc" }],
      },
    },
  });
}

type DatabaseProduct = Awaited<ReturnType<typeof queryActiveProducts>>[number];

export async function listActiveStorefrontProducts(): Promise<Product[] | null> {
  const db = getDb();
  if (!db) return null;

  const records = await queryActiveProducts(db);
  return records.map(mapDatabaseProduct);
}

export async function getActiveStorefrontProductBySlug(
  slug: string,
): Promise<Product | null | undefined> {
  const db = getDb();
  if (!db) return undefined;

  const record = await queryActiveProductBySlug(db, slug);
  return record ? mapDatabaseProduct(record) : null;
}

export async function listLowStockVariants() {
  const db = getDb();
  if (!db) return [];

  const variants = await db.productVariant.findMany({
    where: {
      isActive: true,
      trackInventory: true,
      fulfillmentMode: { in: ["READY_STOCK", "BOTH"] },
    },
    include: {
      product: {
        select: { id: true, name: true, slug: true },
      },
    },
    orderBy: { stockOnHand: "asc" },
  });

  return variants.filter(
    (variant) =>
      variant.stockOnHand - variant.stockReserved <= variant.reorderLevel,
  );
}

function mapDatabaseProduct(record: DatabaseProduct): Product {
  const variants: ProductVariantOption[] = record.variants.map((variant) => {
    const available = Math.max(
      0,
      variant.stockOnHand - variant.stockReserved,
    );

    return {
      id: variant.id,
      sku: variant.sku,
      colorName: variant.colorName ?? "Standard",
      colorHex: variant.colorHex ?? "#e85d9e",
      sizeName: variant.sizeName ?? variant.name,
      stems: variant.stems ?? 1,
      price: Number(variant.price),
      fulfillmentMode: variant.fulfillmentMode,
      available,
      leadTime:
        variant.leadTimeMinDays && variant.leadTimeMaxDays
          ? `${variant.leadTimeMinDays}–${variant.leadTimeMaxDays} days`
          : undefined,
    };
  });

  const defaultVariant =
    variants.find(
      (variant) => variant.price === Number(record.basePrice),
    ) ?? variants[0];

  const uniqueColors = new Map<
    string,
    { name: string; hex: string; tone: ProductTone }
  >();

  for (const variant of variants) {
    if (!uniqueColors.has(variant.colorName)) {
      uniqueColors.set(variant.colorName, {
        name: variant.colorName,
        hex: variant.colorHex,
        tone: inferTone(variant.colorName, variant.colorHex),
      });
    }
  }

  const uniqueSizes = new Map<
    string,
    { name: string; stems: number; price: number }
  >();

  for (const variant of variants) {
    const key = `${variant.sizeName}-${variant.stems}`;
    if (!uniqueSizes.has(key)) {
      uniqueSizes.set(key, {
        name: variant.sizeName,
        stems: variant.stems,
        price: variant.price,
      });
    }
  }

  const readyStock = variants.reduce((total, variant) => {
    if (
      variant.fulfillmentMode === "READY_STOCK" ||
      variant.fulfillmentMode === "BOTH"
    ) {
      return total + variant.available;
    }

    return total;
  }, 0);

  const defaultAvailability =
    defaultVariant?.fulfillmentMode === "READY_STOCK" &&
    defaultVariant.available === 0
      ? "Out of stock"
      : defaultVariant?.fulfillmentMode === "MADE_TO_ORDER" ||
          (defaultVariant?.fulfillmentMode === "BOTH" &&
            defaultVariant.available === 0)
        ? "Made to order"
        : "Ready to ship";

  return {
    id: record.slug,
    slug: record.slug,
    name: record.name,
    flower: record.flowerType,
    variant: defaultVariant
      ? `${defaultVariant.colorName} · ${defaultVariant.stems} stems`
      : "Standard",
    price: defaultVariant?.price ?? Number(record.basePrice),
    availability: defaultAvailability,
    badge: normalizeBadge(record.badge),
    tone: inferTone(
      defaultVariant?.colorName ?? record.flowerType,
      defaultVariant?.colorHex,
    ),
    description: record.description,
    colors: [...uniqueColors.values()],
    sizes: [...uniqueSizes.values()],
    variants,
    defaultVariant,
    rating: 5,
    reviewCount: 0,
    stock: readyStock,
    leadTime: defaultVariant?.leadTime,
    featured: record.featured,
  };
}

function normalizeBadge(value: string | null): ProductBadge | undefined {
  if (value === "Best Seller" || value === "New" || value === "Limited") {
    return value;
  }

  return undefined;
}

function inferTone(name: string, hex?: string): ProductTone {
  const value = `${name} ${hex ?? ""}`.toLowerCase();

  if (
    value.includes("violet") ||
    value.includes("lavender") ||
    value.includes("purple") ||
    value.includes("8b5cf6")
  ) {
    return "violet";
  }

  if (value.includes("peach") || value.includes("ef8d7f")) {
    return "peach";
  }

  if (
    value.includes("cream") ||
    value.includes("ivory") ||
    value.includes("f1dfb8")
  ) {
    return "cream";
  }

  if (
    value.includes("yellow") ||
    value.includes("sun") ||
    value.includes("f2c94c")
  ) {
    return "sun";
  }

  return "rose";
}
