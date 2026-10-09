import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { parseMaterialPlan } from "@/lib/materials/material-service";

const UAE_OFFSET_MS = 4 * 60 * 60 * 1000;
const PAID_STATES = ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] as const;

export type ReportPeriodInput = {
  range?: string;
  from?: string;
  to?: string;
};

export type ReportPeriod = {
  key: string;
  label: string;
  from: Date;
  to: Date;
  fromInput: string;
  toInput: string;
  days: number;
};

type ReportOrder = Prisma.OrderGetPayload<{
  include: {
    customer: {
      select: {
        id: true;
        firstName: true;
        lastName: true;
        email: true;
      };
    };
    customBouquetRequest: {
      select: {
        id: true;
        referenceNumber: true;
        materialPlan: true;
      };
    };
    items: {
      include: {
        variant: {
          select: {
            id: true;
            sku: true;
            cost: true;
            fulfillmentMode: true;
            billOfMaterials: {
              include: {
                material: {
                  select: {
                    id: true;
                    sku: true;
                    unitCost: true;
                  };
                };
              };
            };
          };
        };
      };
    };
  };
}>;

export async function getBusinessReport(input: ReportPeriodInput) {
  const db = getDb();
  if (!db) return null;

  const period = resolveReportPeriod(input);

  const [
    orders,
    customRequests,
    productionJobs,
    activeProductionJobs,
    materialMovements,
    rawMaterials,
    variants,
    historicalPaidOrders,
  ] = await Promise.all([
    db.order.findMany({
      where: {
        paidAt: { gte: period.from, lte: period.to },
        paymentStatus: { in: [...PAID_STATES] },
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        customBouquetRequest: {
          select: {
            id: true,
            referenceNumber: true,
            materialPlan: true,
          },
        },
        items: {
          include: {
            variant: {
              select: {
                id: true,
                sku: true,
                cost: true,
                fulfillmentMode: true,
                billOfMaterials: {
                  include: {
                    material: {
                      select: {
                        id: true,
                        sku: true,
                        unitCost: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { paidAt: "asc" },
    }),
    db.customBouquetRequest.findMany({
      where: {
        createdAt: { gte: period.from, lte: period.to },
      },
      select: {
        id: true,
        status: true,
        estimatedTotal: true,
        finalPrice: true,
        quoteFinalizedAt: true,
        order: {
          select: {
            id: true,
            paymentStatus: true,
            total: true,
            refundedAmount: true,
            paidAt: true,
          },
        },
      },
    }),
    db.productionJob.findMany({
      where: {
        completedAt: { gte: period.from, lte: period.to },
      },
      select: {
        id: true,
        priority: true,
        dueAt: true,
        startedAt: true,
        qualityStartedAt: true,
        completedAt: true,
        plannedMinutes: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            customBouquetRequest: {
              select: { id: true },
            },
          },
        },
      },
    }),
    db.productionJob.findMany({
      where: {
        status: { in: ["QUEUED", "IN_PROGRESS", "QUALITY_CHECK"] },
      },
      select: {
        id: true,
        status: true,
        priority: true,
        dueAt: true,
        plannedMinutes: true,
        assignedTo: true,
      },
    }),
    db.rawMaterialMovement.findMany({
      where: {
        type: "CONSUMPTION",
        createdAt: { gte: period.from, lte: period.to },
      },
      select: {
        quantity: true,
        material: {
          select: {
            id: true,
            sku: true,
            name: true,
            category: true,
            unit: true,
            unitCost: true,
          },
        },
      },
    }),
    db.rawMaterial.findMany({
      select: {
        id: true,
        sku: true,
        name: true,
        category: true,
        isActive: true,
        unit: true,
        unitCost: true,
        stockOnHand: true,
        stockReserved: true,
        reorderLevel: true,
        createdAt: true,
        movements: {
          where: {
            OR: [
              { type: { in: ["OPENING", "RECEIPT", "RETURN"] } },
              {
                type: "ADJUSTMENT",
                quantity: { gt: 0 },
              },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    }),
    db.productVariant.findMany({
      where: {
        isActive: true,
        trackInventory: true,
      },
      select: {
        id: true,
        sku: true,
        name: true,
        cost: true,
        stockOnHand: true,
        stockReserved: true,
        reorderLevel: true,
        fulfillmentMode: true,
        createdAt: true,
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        inventoryMovement: {
          where: {
            OR: [
              { type: { in: ["OPENING", "RECEIPT", "RETURN"] } },
              {
                type: "ADJUSTMENT",
                quantity: { gt: 0 },
              },
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    }),
    db.order.findMany({
      where: {
        paidAt: { lte: period.to },
        paymentStatus: { in: [...PAID_STATES] },
      },
      select: {
        id: true,
        customerEmail: true,
        paidAt: true,
        total: true,
        refundedAmount: true,
      },
      orderBy: { paidAt: "asc" },
    }),
  ]);

  const rawMaterialById = new Map<
    string,
    { unitCost: Prisma.Decimal | null }
  >(
    rawMaterials.map((material) => [
      material.id,
      { unitCost: material.unitCost },
    ]),
  );

  const sales = salesMetrics(orders, rawMaterialById);
  const trend = salesTrend(orders, period);
  const products = productPerformance(orders);
  const custom = customPerformance(customRequests, orders);
  const production = productionPerformance(
    productionJobs,
    activeProductionJobs,
  );
  const materials = materialUsage(materialMovements);
  const inventory = inventoryRisk(variants, rawMaterials);
  const customers = customerMetrics(
    historicalPaidOrders,
    period,
  );

  return {
    period,
    generatedAt: new Date(),
    sales,
    trend,
    products,
    custom,
    production,
    materials,
    inventory,
    customers,
  };
}

export function resolveReportPeriod(
  input: ReportPeriodInput,
  now = new Date(),
): ReportPeriod {
  const key = input.range ?? "30d";
  const today = uaeDateString(now);

  if (
    key === "custom" &&
    validDateInput(input.from) &&
    validDateInput(input.to)
  ) {
    const from = startOfUaeDay(input.from!);
    const to = endOfUaeDay(input.to!);

    if (from <= to) {
      const maxTo = new Date(
        from.getTime() + 730 * 24 * 60 * 60 * 1000 - 1,
      );
      const boundedTo = to > maxTo ? maxTo : to;
      return {
        key: "custom",
        label: `${formatReportDate(from)} – ${formatReportDate(boundedTo)}`,
        from,
        to: boundedTo,
        fromInput: uaeDateString(from),
        toInput: uaeDateString(boundedTo),
        days: daysInclusive(from, boundedTo),
      };
    }
  }

  const days =
    key === "7d"
      ? 7
      : key === "90d"
        ? 90
        : key === "365d"
          ? 365
          : 30;
  const to = endOfUaeDay(today);
  const localTodayStart = startOfUaeDay(today);
  const from = new Date(
    localTodayStart.getTime() - (days - 1) * 24 * 60 * 60 * 1000,
  );

  return {
    key: `${days}d`,
    label: `Last ${days} days`,
    from,
    to,
    fromInput: uaeDateString(from),
    toInput: uaeDateString(to),
    days,
  };
}

function salesMetrics(
  orders: ReportOrder[],
  rawMaterialById: Map<
    string,
    {
      unitCost: Prisma.Decimal | null;
    }
  >,
) {
  let grossSales = 0;
  let refunded = 0;
  let discounts = 0;
  let deliveryRevenue = 0;
  let merchandiseNetRevenue = 0;
  let estimatedDirectCost = 0;
  let coveredDirectCost = 0;
  let coveredNetMerchandiseRevenue = 0;
  let customNetRevenue = 0;

  for (const order of orders) {
    const orderTotal = Number(order.total);
    const orderRefunded = Number(order.refundedAmount);
    const merchandiseAfterDiscount = Math.max(
      0,
      Number(order.subtotal) - Number(order.discountAmount),
    );
    const merchandiseRefundShare =
      orderTotal > 0
        ? orderRefunded *
          (merchandiseAfterDiscount / orderTotal)
        : 0;

    grossSales += orderTotal;
    refunded += orderRefunded;
    discounts += Number(order.discountAmount);
    deliveryRevenue += Number(order.deliveryAmount);
    const orderMerchandiseNet = Math.max(
      0,
      merchandiseAfterDiscount - merchandiseRefundShare,
    );
    merchandiseNetRevenue += orderMerchandiseNet;
    let orderCoveredGross = 0;
    let orderCoveredCost = 0;

    if (order.customBouquetRequest) {
      customNetRevenue += Math.max(0, orderTotal - orderRefunded);
      const customCost = costCustomBouquet(
        order.customBouquetRequest.materialPlan,
        rawMaterialById,
      );
      estimatedDirectCost += customCost.cost;
      if (customCost.complete) {
        orderCoveredGross = Number(order.subtotal);
        orderCoveredCost = customCost.cost;
      }
    } else {
      for (const item of order.items) {
        const cost = costOrderItem(item);
        estimatedDirectCost += cost.cost;
        if (cost.complete) {
          orderCoveredGross += Number(item.lineTotal);
          orderCoveredCost += cost.cost;
        }
      }
    }

    const subtotal = Number(order.subtotal);
    const coverageRatio =
      subtotal > 0
        ? Math.min(1, orderCoveredGross / subtotal)
        : 0;
    coveredNetMerchandiseRevenue +=
      orderMerchandiseNet * coverageRatio;
    coveredDirectCost += orderCoveredCost;
  }

  const netRevenue = Math.max(0, grossSales - refunded);
  const estimatedContribution =
    coveredNetMerchandiseRevenue - coveredDirectCost;

  return {
    paidOrders: orders.length,
    grossSales: roundMoney(grossSales),
    refunded: roundMoney(refunded),
    discounts: roundMoney(discounts),
    deliveryRevenue: roundMoney(deliveryRevenue),
    netRevenue: roundMoney(netRevenue),
    averageOrderValue:
      orders.length > 0
        ? roundMoney(netRevenue / orders.length)
        : 0,
    merchandiseNetRevenue: roundMoney(merchandiseNetRevenue),
    estimatedDirectCost: roundMoney(estimatedDirectCost),
    estimatedContribution: roundMoney(estimatedContribution),
    estimatedMarginPct:
      coveredNetMerchandiseRevenue > 0
        ? roundOne(
            (estimatedContribution /
              coveredNetMerchandiseRevenue) *
              100,
          )
        : null,
    costCoveragePct:
      merchandiseNetRevenue > 0
        ? roundOne(
            Math.min(
              100,
              (coveredNetMerchandiseRevenue /
                merchandiseNetRevenue) *
                100,
            ),
          )
        : 0,
    coveredNetMerchandiseRevenue: roundMoney(
      coveredNetMerchandiseRevenue,
    ),
    customNetRevenue: roundMoney(customNetRevenue),
  };
}

function costOrderItem(item: ReportOrder["items"][number]) {
  if (!item.variant) {
    return { cost: 0, complete: false };
  }

  if (item.variant.cost !== null) {
    return {
      cost: Number(item.variant.cost) * item.quantity,
      complete: true,
    };
  }

  let cost = 0;
  let complete = item.reservedStockQuantity === 0;

  if (item.productionQuantity > 0) {
    if (item.variant.billOfMaterials.length === 0) {
      complete = false;
    }

    for (const recipe of item.variant.billOfMaterials) {
      if (recipe.material.unitCost === null) {
        complete = false;
        continue;
      }
      cost +=
        Number(recipe.quantity) *
        item.productionQuantity *
        Number(recipe.material.unitCost);
    }
  }

  if (item.productionQuantity === 0) {
    complete = false;
  }

  return { cost, complete };
}

function costCustomBouquet(
  materialPlan: Prisma.JsonValue,
  rawMaterialById: Map<
    string,
    {
      unitCost: Prisma.Decimal | null;
    }
  >,
) {
  const plan = parseMaterialPlan(materialPlan);
  if (plan.length === 0) return { cost: 0, complete: false };

  let cost = 0;
  let complete = true;

  for (const item of plan) {
    const material = rawMaterialById.get(item.materialId);
    if (!material || material.unitCost === null) {
      complete = false;
      continue;
    }
    cost += item.quantity * Number(material.unitCost);
  }

  return { cost, complete };
}

function salesTrend(orders: ReportOrder[], period: ReportPeriod) {
  const bucketMode =
    period.days <= 45
      ? "day"
      : period.days <= 180
        ? "week"
        : "month";
  const map = new Map<
    string,
    { label: string; netRevenue: number; orders: number }
  >();

  for (const order of orders) {
    if (!order.paidAt) continue;
    const bucket = trendBucket(order.paidAt, bucketMode);
    const current = map.get(bucket.key) ?? {
      label: bucket.label,
      netRevenue: 0,
      orders: 0,
    };

    current.netRevenue += Math.max(
      0,
      Number(order.total) - Number(order.refundedAmount),
    );
    current.orders += 1;
    map.set(bucket.key, current);
  }

  return [...map.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => ({
      key,
      label: value.label,
      netRevenue: roundMoney(value.netRevenue),
      orders: value.orders,
    }));
}

function productPerformance(orders: ReportOrder[]) {
  const map = new Map<
    string,
    {
      productName: string;
      units: number;
      returned: number;
      merchandiseValue: number;
      orders: Set<string>;
    }
  >();

  for (const order of orders) {
    for (const item of order.items) {
      if (!item.productId) continue;
      const key = item.productId;
      const current = map.get(key) ?? {
        productName: item.productName,
        units: 0,
        returned: 0,
        merchandiseValue: 0,
        orders: new Set<string>(),
      };

      current.units += item.quantity;
      current.returned += item.returnedQuantity;
      current.merchandiseValue += Number(item.lineTotal);
      current.orders.add(order.id);
      map.set(key, current);
    }
  }

  return [...map.entries()]
    .map(([key, value]) => ({
      key,
      productName: value.productName,
      units: value.units,
      returned: value.returned,
      merchandiseValue: roundMoney(value.merchandiseValue),
      orders: value.orders.size,
    }))
    .sort((a, b) => {
      if (b.merchandiseValue !== a.merchandiseValue) {
        return b.merchandiseValue - a.merchandiseValue;
      }
      return b.units - a.units;
    });
}

function customPerformance(
  requests: Array<{
    id: string;
    status: string;
    estimatedTotal: Prisma.Decimal;
    finalPrice: Prisma.Decimal | null;
    quoteFinalizedAt: Date | null;
    order: {
      id: string;
      paymentStatus: string;
      total: Prisma.Decimal;
      refundedAmount: Prisma.Decimal;
      paidAt: Date | null;
    } | null;
  }>,
  paidOrders: ReportOrder[],
) {
  const quoted = requests.filter(
    (request) => request.quoteFinalizedAt !== null,
  );
  const converted = requests.filter(
    (request) => request.order?.paidAt !== null && request.order?.paidAt !== undefined,
  );
  const customOrders = paidOrders.filter(
    (order) => order.customBouquetRequest,
  );
  const netRevenue = customOrders.reduce(
    (sum, order) =>
      sum +
      Math.max(
        0,
        Number(order.total) - Number(order.refundedAmount),
      ),
    0,
  );

  return {
    requests: requests.length,
    quoted: quoted.length,
    converted: converted.length,
    conversionPct:
      requests.length > 0
        ? roundOne((converted.length / requests.length) * 100)
        : 0,
    quoteAcceptancePct:
      quoted.length > 0
        ? roundOne((converted.length / quoted.length) * 100)
        : 0,
    paidOrders: customOrders.length,
    netRevenue: roundMoney(netRevenue),
    averagePaidOrder:
      customOrders.length > 0
        ? roundMoney(netRevenue / customOrders.length)
        : 0,
  };
}

function productionPerformance(
  completed: Array<{
    id: string;
    dueAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
    plannedMinutes: number | null;
    order: {
      id: string;
      orderNumber: string;
      customBouquetRequest: { id: string } | null;
    };
  }>,
  active: Array<{
    id: string;
    status: string;
    priority: string;
    dueAt: Date | null;
    plannedMinutes: number | null;
    assignedTo: string | null;
  }>,
) {
  const now = new Date();
  const cycleHours = completed.flatMap((job) =>
    job.startedAt && job.completedAt
      ? [
          (job.completedAt.getTime() - job.startedAt.getTime()) /
            (60 * 60 * 1000),
        ]
      : [],
  );
  const withDueDate = completed.filter(
    (job) => job.dueAt && job.completedAt,
  );
  const onTime = withDueDate.filter(
    (job) => job.completedAt! <= job.dueAt!,
  );
  const overdue = active.filter(
    (job) => job.dueAt && job.dueAt < now,
  );
  const plannedMinutes = active.reduce(
    (sum, job) => sum + (job.plannedMinutes ?? 0),
    0,
  );

  return {
    completed: completed.length,
    averageCycleHours:
      cycleHours.length > 0
        ? roundOne(
            cycleHours.reduce((sum, value) => sum + value, 0) /
              cycleHours.length,
          )
        : null,
    onTimePct:
      withDueDate.length > 0
        ? roundOne((onTime.length / withDueDate.length) * 100)
        : null,
    activeWip: active.length,
    overdue: overdue.length,
    urgent: active.filter((job) => job.priority === "URGENT").length,
    plannedMinutes,
    unassigned: active.filter((job) => !job.assignedTo).length,
    customCompleted: completed.filter(
      (job) => job.order.customBouquetRequest,
    ).length,
  };
}

function materialUsage(
  movements: Array<{
    quantity: Prisma.Decimal;
    material: {
      id: string;
      sku: string;
      name: string;
      category: string;
      unit: string;
      unitCost: Prisma.Decimal | null;
    };
  }>,
) {
  const map = new Map<
    string,
    {
      id: string;
      sku: string;
      name: string;
      category: string;
      unit: string;
      quantity: number;
      estimatedCost: number;
      costKnown: boolean;
    }
  >();

  for (const movement of movements) {
    const quantity = Math.abs(Number(movement.quantity));
    const current = map.get(movement.material.id) ?? {
      id: movement.material.id,
      sku: movement.material.sku,
      name: movement.material.name,
      category: movement.material.category,
      unit: movement.material.unit,
      quantity: 0,
      estimatedCost: 0,
      costKnown: true,
    };

    current.quantity += quantity;
    if (movement.material.unitCost === null) {
      current.costKnown = false;
    } else {
      current.estimatedCost +=
        quantity * Number(movement.material.unitCost);
    }

    map.set(movement.material.id, current);
  }

  return [...map.values()]
    .map((item) => ({
      ...item,
      quantity: roundThree(item.quantity),
      estimatedCost: roundMoney(item.estimatedCost),
    }))
    .sort(
      (a, b) =>
        b.estimatedCost - a.estimatedCost ||
        b.quantity - a.quantity,
    );
}

function inventoryRisk(
  variants: Array<{
    id: string;
    sku: string;
    name: string;
    cost: Prisma.Decimal | null;
    stockOnHand: number;
    stockReserved: number;
    reorderLevel: number;
    fulfillmentMode: string;
    createdAt: Date;
    product: { id: string; name: string };
    inventoryMovement: Array<{ createdAt: Date }>;
  }>,
  materials: Array<{
    id: string;
    sku: string;
    name: string;
    category: string;
    isActive: boolean;
    unit: string;
    unitCost: Prisma.Decimal | null;
    stockOnHand: Prisma.Decimal;
    stockReserved: Prisma.Decimal;
    reorderLevel: Prisma.Decimal;
    createdAt: Date;
    movements: Array<{ createdAt: Date }>;
  }>,
) {
  const now = new Date();

  const finished = variants
    .filter((variant) =>
      ["READY_STOCK", "BOTH"].includes(variant.fulfillmentMode),
    )
    .map((variant) => {
      const available =
        variant.stockOnHand - variant.stockReserved;
      const lastInbound =
        variant.inventoryMovement[0]?.createdAt ?? variant.createdAt;
      const ageDays = Math.max(
        0,
        Math.floor(
          (now.getTime() - lastInbound.getTime()) /
            (24 * 60 * 60 * 1000),
        ),
      );
      return {
        id: variant.id,
        type: "FINISHED" as const,
        sku: variant.sku,
        name: `${variant.product.name} · ${variant.name}`,
        available,
        reorderLevel: variant.reorderLevel,
        ageDays,
        stockValue:
          variant.cost !== null
            ? roundMoney(
                variant.stockOnHand * Number(variant.cost),
              )
            : null,
      };
    });

  const raw = materials
    .filter((material) => material.isActive)
    .map((material) => {
      const onHand = Number(material.stockOnHand);
      const reserved = Number(material.stockReserved);
      const available = onHand - reserved;
      const lastInbound =
        material.movements[0]?.createdAt ?? material.createdAt;
      const ageDays = Math.max(
        0,
        Math.floor(
          (now.getTime() - lastInbound.getTime()) /
            (24 * 60 * 60 * 1000),
        ),
      );

      return {
      id: material.id,
      type: "MATERIAL" as const,
      sku: material.sku,
      name: material.name,
      available: roundThree(available),
      reorderLevel: Number(material.reorderLevel),
      ageDays,
      stockValue:
        material.unitCost !== null
          ? roundMoney(onHand * Number(material.unitCost))
          : null,
      };
    });

  const all = [...finished, ...raw];
  const lowStock = all
    .filter((item) => item.available <= item.reorderLevel)
    .sort((a, b) => a.available - b.available);
  const aging = all
    .filter((item) => item.available > 0 && item.ageDays >= 90)
    .sort((a, b) => b.ageDays - a.ageDays);

  return {
    lowStockCount: lowStock.length,
    agingCount: aging.length,
    knownStockValue: roundMoney(
      all.reduce(
        (sum, item) => sum + (item.stockValue ?? 0),
        0,
      ),
    ),
    valueCoveragePct:
      all.length > 0
        ? roundOne(
            (all.filter((item) => item.stockValue !== null).length /
              all.length) *
              100,
          )
        : 0,
    lowStock,
    aging,
  };
}

function customerMetrics(
  orders: Array<{
    id: string;
    customerEmail: string;
    paidAt: Date | null;
    total: Prisma.Decimal;
    refundedAmount: Prisma.Decimal;
  }>,
  period: ReportPeriod,
) {
  const byEmail = new Map<
    string,
    {
      email: string;
      firstPaidAt: Date;
      orders: number;
      ordersInPeriod: number;
      netValue: number;
      netValueInPeriod: number;
    }
  >();

  for (const order of orders) {
    if (!order.paidAt) continue;
    const email = order.customerEmail.toLowerCase();
    const net = Math.max(
      0,
      Number(order.total) - Number(order.refundedAmount),
    );
    const existing = byEmail.get(email);
    const inPeriod =
      order.paidAt >= period.from && order.paidAt <= period.to;

    if (!existing) {
      byEmail.set(email, {
        email,
        firstPaidAt: order.paidAt,
        orders: 1,
        ordersInPeriod: inPeriod ? 1 : 0,
        netValue: net,
        netValueInPeriod: inPeriod ? net : 0,
      });
      continue;
    }

    existing.orders += 1;
    existing.netValue += net;
    if (order.paidAt < existing.firstPaidAt) {
      existing.firstPaidAt = order.paidAt;
    }
    if (inPeriod) {
      existing.ordersInPeriod += 1;
      existing.netValueInPeriod += net;
    }
  }

  const periodCustomers = [...byEmail.values()].filter(
    (customer) => customer.ordersInPeriod > 0,
  );
  const newCustomers = periodCustomers.filter(
    (customer) =>
      customer.firstPaidAt >= period.from &&
      customer.firstPaidAt <= period.to,
  );
  const returningCustomers = periodCustomers.filter(
    (customer) => customer.firstPaidAt < period.from,
  );

  return {
    activeCustomers: periodCustomers.length,
    newCustomers: newCustomers.length,
    returningCustomers: returningCustomers.length,
    returningSharePct:
      periodCustomers.length > 0
        ? roundOne(
            (returningCustomers.length /
              periodCustomers.length) *
              100,
          )
        : 0,
    repeatCustomers: periodCustomers.filter(
      (customer) => customer.orders > 1,
    ).length,
    topCustomers: periodCustomers
      .sort(
        (a, b) =>
          b.netValueInPeriod - a.netValueInPeriod ||
          b.ordersInPeriod - a.ordersInPeriod,
      )
      .map((customer) => ({
        email: customer.email,
        orders: customer.ordersInPeriod,
        netValue: roundMoney(customer.netValueInPeriod),
        lifetimeOrders: customer.orders,
        lifetimeNetValue: roundMoney(customer.netValue),
      })),
  };
}

function trendBucket(
  date: Date,
  mode: "day" | "week" | "month",
) {
  const local = new Date(date.getTime() + UAE_OFFSET_MS);

  if (mode === "month") {
    const key = `${local.getUTCFullYear()}-${String(
      local.getUTCMonth() + 1,
    ).padStart(2, "0")}`;
    return {
      key,
      label: new Intl.DateTimeFormat("en-AE", {
        month: "short",
        year: "2-digit",
        timeZone: "Asia/Dubai",
      }).format(date),
    };
  }

  if (mode === "week") {
    const weekday = (local.getUTCDay() + 6) % 7;
    const monday = new Date(
      local.getTime() - weekday * 24 * 60 * 60 * 1000,
    );
    const key = monday.toISOString().slice(0, 10);
    return {
      key,
      label: `W/C ${new Intl.DateTimeFormat("en-AE", {
        day: "2-digit",
        month: "short",
        timeZone: "UTC",
      }).format(monday)}`,
    };
  }

  return {
    key: local.toISOString().slice(0, 10),
    label: new Intl.DateTimeFormat("en-AE", {
      day: "2-digit",
      month: "short",
      timeZone: "Asia/Dubai",
    }).format(date),
  };
}

function validDateInput(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function startOfUaeDay(value: string) {
  return new Date(`${value}T00:00:00+04:00`);
}

function endOfUaeDay(value: string) {
  return new Date(`${value}T23:59:59.999+04:00`);
}

function uaeDateString(date: Date) {
  const local = new Date(date.getTime() + UAE_OFFSET_MS);
  return local.toISOString().slice(0, 10);
}

function formatReportDate(date: Date) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dubai",
  }).format(date);
}

function daysInclusive(from: Date, to: Date) {
  return Math.max(
    1,
    Math.floor(
      (to.getTime() - from.getTime()) /
        (24 * 60 * 60 * 1000),
    ) + 1,
  );
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundOne(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

function roundThree(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}
