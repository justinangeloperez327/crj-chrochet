import { getDb } from "@/lib/db";

const PAID_STATES = ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] as const;

export async function getAdminDiscountData() {
  const db = getDb();
  if (!db) return null;

  const [discounts, products, collections] = await Promise.all([
    db.discount.findMany({
      include: {
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
              },
            },
          },
        },
        collections: {
          include: {
            collection: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        _count: { select: { orders: true } },
        orders: {
          where: {
            paymentStatus: { in: [...PAID_STATES] },
          },
          select: {
            id: true,
            total: true,
            refundedAmount: true,
            discountAmount: true,
            customerEmail: true,
            paidAt: true,
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    }),
    db.product.findMany({
      where: { status: { not: "ARCHIVED" } },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
      },
      orderBy: { name: "asc" },
    }),
    db.collection.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        featured: true,
        isActive: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const now = new Date();

  const rows = discounts.map((discount) => {
    const discountGiven = discount.orders.reduce(
      (sum, order) => sum + Number(order.discountAmount),
      0,
    );
    const netRevenue = discount.orders.reduce(
      (sum, order) =>
        sum +
        Math.max(
          0,
          Number(order.total) - Number(order.refundedAmount),
        ),
      0,
    );
    const uniqueCustomers = new Set(
      discount.orders.map((order) => order.customerEmail.toLowerCase()),
    ).size;

    const status = !discount.isActive
      ? "INACTIVE"
      : discount.startsAt && discount.startsAt > now
        ? "SCHEDULED"
        : discount.endsAt && discount.endsAt < now
          ? "EXPIRED"
          : discount.maxRedemptions !== null &&
              discount.redemptionCount + discount.reservedRedemptions >=
                discount.maxRedemptions
            ? "LIMIT_REACHED"
            : "ACTIVE";

    return {
      ...discount,
      status,
      metrics: {
        paidOrders: discount.orders.length,
        uniqueCustomers,
        discountGiven: roundMoney(discountGiven),
        netRevenue: roundMoney(netRevenue),
        averageDiscount:
          discount.orders.length > 0
            ? roundMoney(discountGiven / discount.orders.length)
            : 0,
      },
    };
  });

  return {
    discounts: rows,
    products,
    collections,
    metrics: {
      total: rows.length,
      active: rows.filter((row) => row.status === "ACTIVE").length,
      scheduled: rows.filter((row) => row.status === "SCHEDULED").length,
      reserved: rows.reduce(
        (sum, row) => sum + row.reservedRedemptions,
        0,
      ),
      redemptions: rows.reduce(
        (sum, row) => sum + row.redemptionCount,
        0,
      ),
      discountGiven: roundMoney(
        rows.reduce(
          (sum, row) => sum + row.metrics.discountGiven,
          0,
        ),
      ),
      netRevenue: roundMoney(
        rows.reduce(
          (sum, row) => sum + row.metrics.netRevenue,
          0,
        ),
      ),
    },
  };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
