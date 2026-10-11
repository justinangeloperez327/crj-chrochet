import type { PrismaClient } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";

const PAID_STATES = ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] as const;
const DAY_MS = 24 * 60 * 60 * 1000;
const AT_RISK_DAYS = 90;
const VIP_ORDER_COUNT = 5;
const VIP_NET_VALUE = 1000;

export type CustomerSegment =
  | "PROSPECT"
  | "FIRST_ORDER"
  | "RETURNING"
  | "VIP";

export type CustomerListFilters = {
  q?: string;
  segment?: string;
  risk?: string;
};

export async function listAdminCustomers(
  filters: CustomerListFilters = {},
) {
  const db = getDb();
  if (!db) return null;

  const q = filters.q?.trim();
  const customers = await db.customer.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      user: {
        select: {
          id: true,
          role: true,
          name: true,
          createdAt: true,
        },
      },
      orders: {
        where: {
          paymentStatus: { in: [...PAID_STATES] },
        },
        select: {
          id: true,
          total: true,
          refundedAmount: true,
          discountAmount: true,
          paidAt: true,
          createdAt: true,
        },
        orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      },
      _count: {
        select: {
          orders: true,
          addresses: true,
          customBouquetRequests: true,
          notes: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const rows = customers.map((customer) =>
    customerRow(customer, now),
  );

  const segmentFilter = parseSegment(filters.segment);
  const riskFilter =
    filters.risk === "at-risk"
      ? true
      : filters.risk === "active"
        ? false
        : null;

  const filtered = rows.filter((row) => {
    if (segmentFilter && row.segment !== segmentFilter) return false;
    if (riskFilter !== null && row.atRisk !== riskFilter) return false;
    return true;
  });

  return {
    customers: filtered,
    metrics: {
      total: rows.length,
      registered: rows.filter((row) => row.registered).length,
      prospects: rows.filter((row) => row.segment === "PROSPECT").length,
      firstOrder: rows.filter((row) => row.segment === "FIRST_ORDER").length,
      returning: rows.filter((row) => row.segment === "RETURNING").length,
      vip: rows.filter((row) => row.segment === "VIP").length,
      atRisk: rows.filter((row) => row.atRisk).length,
      lifetimeNetValue: roundMoney(
        rows.reduce((sum, row) => sum + row.lifetimeNetValue, 0),
      ),
    },
    filters: {
      q: q ?? "",
      segment: segmentFilter ?? "",
      risk: filters.risk ?? "",
    },
  };
}

export async function getAdminCustomer(id: string) {
  const db = getDb();
  if (!db) return null;

  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      },
      addresses: {
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      },
      orders: {
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { items: true } },
          discount: {
            select: {
              id: true,
              code: true,
            },
          },
        },
        take: 100,
      },
      customBouquetRequests: {
        orderBy: { createdAt: "desc" },
        include: {
          wrapping: {
            select: { name: true },
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              status: true,
              paymentStatus: true,
              refundedAmount: true,
              paidAt: true,
            },
          },
        },
        take: 50,
      },
      notes: {
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        take: 100,
      },
    },
  });

  if (!customer) return null;

  const paidOrders = customer.orders.filter((order) =>
    PAID_STATES.includes(
      order.paymentStatus as (typeof PAID_STATES)[number],
    ),
  );
  const now = new Date();
  const metrics = customerMetrics(paidOrders);
  const discounts = await promotionContext(
    db,
    customer.email,
    metrics.paidOrderCount,
  );

  return {
    customer,
    metrics: {
      ...metrics,
      segment: customerSegment(
        metrics.paidOrderCount,
        metrics.lifetimeNetValue,
      ),
      atRisk: isAtRisk(metrics.lastPaidAt, now),
      averageOrderValue:
        metrics.paidOrderCount > 0
          ? roundMoney(
              metrics.lifetimeNetValue / metrics.paidOrderCount,
            )
          : 0,
      totalDiscountSavings: roundMoney(
        paidOrders.reduce(
          (sum, order) => sum + Number(order.discountAmount),
          0,
        ),
      ),
      registered: Boolean(customer.userId),
    },
    promotionContext: discounts,
  };
}

export async function customerCrmCsvRows() {
  const data = await listAdminCustomers();
  if (!data) return null;
  return data.customers;
}

function customerRow(
  customer: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    userId: string | null;
    createdAt: Date;
    orders: Array<{
      id: string;
      total: unknown;
      refundedAmount: unknown;
      discountAmount: unknown;
      paidAt: Date | null;
      createdAt: Date;
    }>;
    _count: {
      orders: number;
      addresses: number;
      customBouquetRequests: number;
      notes: number;
    };
  },
  now: Date,
) {
  const metrics = customerMetrics(customer.orders);
  const segment = customerSegment(
    metrics.paidOrderCount,
    metrics.lifetimeNetValue,
  );

  return {
    id: customer.id,
    email: customer.email,
    name: customerName(customer),
    phone: customer.phone,
    registered: Boolean(customer.userId),
    segment,
    atRisk: isAtRisk(metrics.lastPaidAt, now),
    paidOrders: metrics.paidOrderCount,
    lifetimeNetValue: metrics.lifetimeNetValue,
    grossPaidValue: metrics.grossPaidValue,
    refundedValue: metrics.refundedValue,
    lastPaidAt: metrics.lastPaidAt,
    firstPaidAt: metrics.firstPaidAt,
    totalOrders: customer._count.orders,
    addresses: customer._count.addresses,
    customBouquets: customer._count.customBouquetRequests,
    notes: customer._count.notes,
    createdAt: customer.createdAt,
  };
}

function customerMetrics(
  orders: Array<{
    total: unknown;
    refundedAmount: unknown;
    paidAt: Date | null;
    createdAt: Date;
  }>,
) {
  const paidOrderCount = orders.length;
  const grossPaidValue = roundMoney(
    orders.reduce((sum, order) => sum + Number(order.total), 0),
  );
  const refundedValue = roundMoney(
    orders.reduce(
      (sum, order) => sum + Number(order.refundedAmount),
      0,
    ),
  );
  const lifetimeNetValue = roundMoney(
    Math.max(0, grossPaidValue - refundedValue),
  );

  const paidDates = orders
    .map((order) => order.paidAt ?? order.createdAt)
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    paidOrderCount,
    grossPaidValue,
    refundedValue,
    lifetimeNetValue,
    firstPaidAt: paidDates[0] ?? null,
    lastPaidAt: paidDates[paidDates.length - 1] ?? null,
  };
}

export function customerSegment(
  paidOrderCount: number,
  lifetimeNetValue: number,
): CustomerSegment {
  if (paidOrderCount === 0) return "PROSPECT";
  if (
    paidOrderCount >= VIP_ORDER_COUNT ||
    lifetimeNetValue >= VIP_NET_VALUE
  ) {
    return "VIP";
  }
  if (paidOrderCount >= 2) return "RETURNING";
  return "FIRST_ORDER";
}

function isAtRisk(lastPaidAt: Date | null, now: Date) {
  if (!lastPaidAt) return false;
  return (
    now.getTime() - lastPaidAt.getTime() >=
    AT_RISK_DAYS * DAY_MS
  );
}

async function promotionContext(
  db: PrismaClient,
  email: string,
  paidOrderCount: number,
) {
  const now = new Date();

  const discounts = await db.discount.findMany({
    where: {
      isActive: true,
      AND: [
        {
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        },
        {
          OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        },
      ],
    },
    include: {
      orders: {
        where: {
          customerEmail: email.toLowerCase(),
          OR: [
            { paymentStatus: { in: [...PAID_STATES] } },
            { discountReservationActive: true },
          ],
        },
        select: {
          id: true,
          paymentStatus: true,
          discountReservationActive: true,
          discountAmount: true,
        },
      },
    },
    orderBy: [{ automatic: "desc" }, { priority: "desc" }, { code: "asc" }],
  });

  return discounts.map((discount) => {
    const successfulOrders = discount.orders.filter((order) =>
      PAID_STATES.includes(
        order.paymentStatus as (typeof PAID_STATES)[number],
      ),
    );
    const reservedUses = discount.orders.filter(
      (order) =>
        order.discountReservationActive &&
        !PAID_STATES.includes(
          order.paymentStatus as (typeof PAID_STATES)[number],
        ),
    ).length;
    const customerUses = successfulOrders.length;
    const perCustomerRemaining =
      discount.maxRedemptionsPerCustomer === null
        ? null
        : Math.max(
            0,
            discount.maxRedemptionsPerCustomer -
              customerUses -
              reservedUses,
          );
    const globalRemaining =
      discount.maxRedemptions === null
        ? null
        : Math.max(
            0,
            discount.maxRedemptions -
              discount.redemptionCount -
              discount.reservedRedemptions,
          );
    const segmentEligible =
      discount.customerEligibility === "ALL" ||
      (discount.customerEligibility === "NEW_CUSTOMERS" &&
        paidOrderCount === 0) ||
      (discount.customerEligibility === "RETURNING_CUSTOMERS" &&
        paidOrderCount > 0);
    const customerEligible =
      segmentEligible &&
      perCustomerRemaining !== 0 &&
      globalRemaining !== 0;

    return {
      id: discount.id,
      code: discount.code,
      description: discount.description,
      automatic: discount.automatic,
      priority: discount.priority,
      scope: discount.scope,
      customerEligibility: discount.customerEligibility,
      customerEligible,
      customerUses,
      reservedUses,
      perCustomerRemaining,
      globalRemaining,
      discountGiven: roundMoney(
        successfulOrders.reduce(
          (sum, order) => sum + Number(order.discountAmount),
          0,
        ),
      ),
      value:
        discount.type === "PERCENTAGE"
          ? `${Number(discount.value)}%`
          : `AED ${Number(discount.value)}`,
    };
  });
}

function parseSegment(value?: string): CustomerSegment | null {
  if (
    value === "PROSPECT" ||
    value === "FIRST_ORDER" ||
    value === "RETURNING" ||
    value === "VIP"
  ) {
    return value;
  }

  return null;
}

function customerName(customer: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  const name = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || customer.email;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
