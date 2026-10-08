import { db } from "@/lib/db";

export async function listActiveProducts() {
  return db.product.findMany({
    where: {
      status: "ACTIVE",
    },
    include: {
      category: true,
      collections: {
        include: {
          collection: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
      images: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      variants: {
        where: {
          isActive: true,
        },
        orderBy: [
          {
            price: "asc",
          },
          {
            name: "asc",
          },
        ],
      },
    },
    orderBy: [
      {
        featured: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });
}

export async function getActiveProductBySlug(slug: string) {
  return db.product.findFirst({
    where: {
      slug,
      status: "ACTIVE",
    },
    include: {
      category: true,
      collections: {
        include: {
          collection: true,
        },
      },
      images: {
        orderBy: {
          sortOrder: "asc",
        },
      },
      variants: {
        where: {
          isActive: true,
        },
        orderBy: {
          price: "asc",
        },
      },
    },
  });
}

export async function listLowStockVariants() {
  const variants = await db.productVariant.findMany({
    where: {
      isActive: true,
      trackInventory: true,
      fulfillmentMode: {
        in: ["READY_STOCK", "BOTH"],
      },
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: {
      stockOnHand: "asc",
    },
  });

  return variants.filter(
    (variant) =>
      variant.stockOnHand - variant.stockReserved <= variant.reorderLevel,
  );
}
