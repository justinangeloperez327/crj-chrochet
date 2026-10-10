import type { Prisma } from "@/generated/prisma/client";
import type { Product, ProductTone } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { mapDatabaseProduct } from "@/lib/data/catalog-repository";

const collectionProductInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
  variants: {
    where: { isActive: true },
    orderBy: [{ price: "asc" as const }, { name: "asc" as const }],
  },
} satisfies Prisma.ProductInclude;

type CollectionProductRecord = Prisma.ProductGetPayload<{
  include: typeof collectionProductInclude;
}>;

export type StorefrontCollection = {
  id: string;
  slug: string;
  name: string;
  description: string;
  featured: boolean;
  sortOrder: number;
  seoTitle?: string;
  seoDescription?: string;
  tone: ProductTone;
  products: Product[];
};

export async function listAdminCollections() {
  const db = getDb();
  if (!db) return null;

  return db.collection.findMany({
    include: {
      products: {
        orderBy: { sortOrder: "asc" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              status: true,
              featured: true,
            },
          },
        },
      },
      _count: {
        select: {
          products: true,
          discountRules: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getAdminCollection(id: string) {
  const db = getDb();
  if (!db) return null;

  const [collection, products] = await Promise.all([
    db.collection.findUnique({
      where: { id },
      include: {
        products: {
          orderBy: { sortOrder: "asc" },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
                featured: true,
                basePrice: true,
                flowerType: true,
              },
            },
          },
        },
        discountRules: {
          include: {
            discount: {
              select: {
                id: true,
                code: true,
                isActive: true,
                automatic: true,
              },
            },
          },
        },
      },
    }),
    db.product.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        flowerType: true,
        basePrice: true,
        featured: true,
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
  ]);

  if (!collection) return null;

  return { collection, products };
}

export async function listStorefrontCollections(): Promise<
  StorefrontCollection[] | null
> {
  const db = getDb();
  if (!db) return null;

  const records = await db.collection.findMany({
    where: { isActive: true },
    include: {
      products: {
        where: {
          product: {
            status: "ACTIVE",
          },
        },
        orderBy: { sortOrder: "asc" },
        include: {
          product: {
            include: collectionProductInclude,
          },
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return records.map(mapCollectionRecord);
}

export async function getStorefrontCollectionBySlug(
  slug: string,
): Promise<StorefrontCollection | null | undefined> {
  const db = getDb();
  if (!db) return undefined;

  const record = await db.collection.findFirst({
    where: {
      slug,
      isActive: true,
    },
    include: {
      products: {
        where: {
          product: {
            status: "ACTIVE",
          },
        },
        orderBy: { sortOrder: "asc" },
        include: {
          product: {
            include: collectionProductInclude,
          },
        },
      },
    },
  });

  return record ? mapCollectionRecord(record) : null;
}

function mapCollectionRecord(record: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  featured: boolean;
  sortOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  products: Array<{
    sortOrder: number;
    product: CollectionProductRecord;
  }>;
}): StorefrontCollection {
  const products = record.products.map((item) =>
    mapDatabaseProduct(item.product),
  );

  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    description: record.description ?? "",
    featured: record.featured,
    sortOrder: record.sortOrder,
    seoTitle: record.seoTitle ?? undefined,
    seoDescription: record.seoDescription ?? undefined,
    tone: inferCollectionTone(products),
    products,
  };
}

function inferCollectionTone(products: Product[]): ProductTone {
  const counts = new Map<ProductTone, number>();

  for (const product of products) {
    counts.set(product.tone, (counts.get(product.tone) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "rose";
}
