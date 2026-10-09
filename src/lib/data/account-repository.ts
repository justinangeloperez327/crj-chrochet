import { getDb } from "@/lib/db";

export async function getAccountOverview(userId: string) {
  const db = getDb();
  if (!db) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      customer: {
        include: {
          addresses: {
            orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
          },
          orders: {
            take: 5,
            orderBy: { createdAt: "desc" },
            include: {
              _count: { select: { items: true } },
            },
          },
          _count: {
            select: {
              orders: true,
              addresses: true,
            },
          },
        },
      },
      wishlist: {
        include: {
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              basePrice: true,
              flowerType: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return user;
}

export async function listAccountOrders(userId: string) {
  const db = getDb();
  if (!db) return null;

  const customer = await db.customer.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!customer) return [];

  return db.order.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function listAccountAddresses(userId: string) {
  const db = getDb();
  if (!db) return null;

  const customer = await db.customer.findUnique({
    where: { userId },
    include: {
      addresses: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  return customer?.addresses ?? [];
}

export async function listAccountWishlist(userId: string) {
  const db = getDb();
  if (!db) return null;

  return db.wishlistItem.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          variants: {
            where: { isActive: true },
            orderBy: [{ price: "asc" }, { name: "asc" }],
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}


export async function listAccountCustomBouquets(userId: string) {
  const db = getDb();
  if (!db) return null;

  const customer = await db.customer.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!customer) return [];

  return db.customBouquetRequest.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    include: {
      wrapping: {
        select: { name: true },
      },
    },
  });
}
