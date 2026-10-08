import { getDb } from "@/lib/db";

export async function getAdminDashboardData() {
  const db = getDb();
  if (!db) return null;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    activeProducts,
    totalOrders,
    pendingOrders,
    customers,
    paidOrders,
    recentOrders,
    inventoryVariants,
  ] = await Promise.all([
    db.product.count({ where: { status: "ACTIVE" } }),
    db.order.count(),
    db.order.count({
      where: {
        status: {
          in: [
            "PENDING_PAYMENT",
            "CONFIRMED",
            "IN_PRODUCTION",
            "QUALITY_CHECK",
            "READY",
          ],
        },
      },
    }),
    db.customer.count(),
    db.order.findMany({
      where: {
        paymentStatus: "PAID",
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { total: true },
    }),
    db.order.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          select: { firstName: true, lastName: true },
        },
        _count: { select: { items: true } },
      },
    }),
    db.productVariant.findMany({
      where: {
        isActive: true,
        trackInventory: true,
        fulfillmentMode: { in: ["READY_STOCK", "BOTH"] },
      },
      include: {
        product: { select: { name: true, slug: true } },
      },
      orderBy: { stockOnHand: "asc" },
    }),
  ]);

  const lowStock = inventoryVariants
    .filter(
      (variant) =>
        variant.stockOnHand - variant.stockReserved <= variant.reorderLevel,
    )
    .slice(0, 8);

  return {
    metrics: {
      activeProducts,
      totalOrders,
      pendingOrders,
      customers,
      revenue30Days: paidOrders.reduce(
        (sum, order) => sum + Number(order.total),
        0,
      ),
      lowStockCount: lowStock.length,
    },
    recentOrders,
    lowStock,
  };
}

export async function listAdminProducts() {
  const db = getDb();
  if (!db) return null;

  return db.product.findMany({
    include: {
      category: { select: { name: true } },
      _count: { select: { variants: true, orderItems: true } },
      variants: {
        where: { isActive: true },
        select: {
          stockOnHand: true,
          stockReserved: true,
          fulfillmentMode: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
}

export async function getAdminProduct(id: string) {
  const db = getDb();
  if (!db) return null;

  return db.product.findUnique({
    where: { id },
    include: {
      category: true,
      variants: {
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        include: {
          inventoryMovement: {
            take: 8,
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });
}

export async function listAdminInventory() {
  const db = getDb();
  if (!db) return null;

  const [variants, movements] = await Promise.all([
    db.productVariant.findMany({
      where: { isActive: true },
      include: {
        product: {
          select: { id: true, name: true, slug: true, status: true },
        },
      },
      orderBy: [{ stockOnHand: "asc" }, { sku: "asc" }],
    }),
    db.inventoryMovement.findMany({
      take: 30,
      orderBy: { createdAt: "desc" },
      include: {
        variant: {
          select: {
            sku: true,
            name: true,
            product: { select: { name: true } },
          },
        },
        order: { select: { orderNumber: true } },
      },
    }),
  ]);

  return { variants, movements };
}

export async function listAdminOrders() {
  const db = getDb();
  if (!db) return null;

  return db.order.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: {
      customer: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      _count: { select: { items: true } },
    },
  });
}

export async function getAdminOrder(id: string) {
  const db = getDb();
  if (!db) return null;

  return db.order.findUnique({
    where: { id },
    include: {
      customer: true,
      shippingAddress: true,
      discount: true,
      items: {
        orderBy: { createdAt: "asc" },
      },
      inventoryMovement: {
        orderBy: { createdAt: "asc" },
        include: {
          variant: {
            select: {
              sku: true,
              name: true,
            },
          },
        },
      },
    },
  });
}
