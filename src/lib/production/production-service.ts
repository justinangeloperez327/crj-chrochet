import type { Prisma } from "@/generated/prisma/client";
import { requireDb } from "@/lib/db";

type Transaction = Prisma.TransactionClient;

export async function ensureProductionJobForOrder(
  tx: Transaction,
  orderId: string,
) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    include: {
      productionJob: true,
      customBouquetRequest: {
        select: {
          id: true,
          leadTimeMaxDays: true,
        },
      },
      items: {
        include: {
          variant: {
            select: {
              leadTimeMaxDays: true,
              fulfillmentMode: true,
            },
          },
        },
      },
      inventoryMovement: {
        select: {
          variantId: true,
          type: true,
          quantity: true,
        },
      },
    },
  });

  if (!order) return null;

  if (
    !order.productionJob &&
    !["PAID", "PARTIALLY_REFUNDED"].includes(order.paymentStatus)
  ) {
    return null;
  }

  const reservationsByVariant = new Map<string, number>();

  for (const movement of order.inventoryMovement) {
    if (movement.type !== "RESERVATION") continue;
    reservationsByVariant.set(
      movement.variantId,
      (reservationsByVariant.get(movement.variantId) ?? 0) +
        movement.quantity,
    );
  }

  const allocations = new Map<
    string,
    { reservedStockQuantity: number; productionQuantity: number }
  >();

  for (const item of order.items) {
    let reservedStockQuantity = item.reservedStockQuantity;
    let productionQuantity = item.productionQuantity;

    if (
      reservedStockQuantity === 0 &&
      productionQuantity === 0 &&
      item.quantity > 0 &&
      item.variant
    ) {
      const historicalReservation = Math.min(
        item.quantity,
        reservationsByVariant.get(item.variantId ?? "") ?? 0,
      );

      if (item.variant.fulfillmentMode === "READY_STOCK") {
        reservedStockQuantity =
          historicalReservation || item.quantity;
      } else if (item.variant.fulfillmentMode === "MADE_TO_ORDER") {
        productionQuantity = item.quantity;
      } else {
        reservedStockQuantity = historicalReservation;
        productionQuantity =
          item.quantity - reservedStockQuantity;
      }

      await tx.orderItem.update({
        where: { id: item.id },
        data: {
          reservedStockQuantity,
          productionQuantity,
        },
      });
    }

    allocations.set(item.id, {
      reservedStockQuantity,
      productionQuantity,
    });
  }

  const productionItems = order.items.filter(
    (item) =>
      (allocations.get(item.id)?.productionQuantity ?? 0) > 0,
  );
  const needsProduction =
    Boolean(order.customBouquetRequest) || productionItems.length > 0;

  if (!needsProduction) return order.productionJob;

  const leadDays = [
    order.customBouquetRequest?.leadTimeMaxDays ?? null,
    ...productionItems.map(
      (item) => item.variant?.leadTimeMaxDays ?? null,
    ),
  ].filter((value): value is number => value !== null && value > 0);

  const dueAt = order.productionJob
    ? order.productionJob.dueAt
    : leadDays.length > 0
      ? addDays(
          order.paidAt ?? new Date(),
          Math.max(...leadDays),
        )
      : null;

  const mapped = mapOrderStatus(order.status);

  return tx.productionJob.upsert({
    where: { orderId: order.id },
    update: {
      status: mapped.status,
      dueAt,
      startedAt:
        mapped.started && !order.productionJob?.startedAt
          ? new Date()
          : order.productionJob?.startedAt,
      qualityStartedAt:
        mapped.quality && !order.productionJob?.qualityStartedAt
          ? new Date()
          : order.productionJob?.qualityStartedAt,
      completedAt:
        mapped.completed && !order.productionJob?.completedAt
          ? new Date()
          : order.productionJob?.completedAt,
    },
    create: {
      orderId: order.id,
      status: mapped.status,
      dueAt,
      startedAt: mapped.started ? new Date() : null,
      qualityStartedAt: mapped.quality ? new Date() : null,
      completedAt: mapped.completed ? new Date() : null,
    },
  });
}

export async function syncProductionJobFromOrderStatus(
  tx: Transaction,
  orderId: string,
  orderStatus: string,
) {
  const job =
    (await tx.productionJob.findUnique({
      where: { orderId },
    })) ?? (await ensureProductionJobForOrder(tx, orderId));

  if (!job) return null;

  const mapped = mapOrderStatus(orderStatus);
  const now = new Date();

  return tx.productionJob.update({
    where: { id: job.id },
    data: {
      status: mapped.status,
      startedAt:
        mapped.started && !job.startedAt ? now : job.startedAt,
      qualityStartedAt:
        mapped.quality && !job.qualityStartedAt
          ? now
          : job.qualityStartedAt,
      completedAt:
        mapped.completed && !job.completedAt
          ? now
          : mapped.completed
            ? job.completedAt
            : null,
    },
  });
}

export async function syncEligibleProductionJobs() {
  const db = requireDb();
  const orders = await db.order.findMany({
    where: {
      paymentStatus: {
        in: ["PAID", "PARTIALLY_REFUNDED"],
      },
      status: {
        notIn: ["CANCELLED"],
      },
    },
    select: { id: true },
  });

  let createdOrUpdated = 0;

  for (const order of orders) {
    const result = await db.$transaction((tx) =>
      ensureProductionJobForOrder(tx, order.id),
    );

    if (result) createdOrUpdated += 1;
  }

  return {
    checked: orders.length,
    createdOrUpdated,
  };
}

export function isAllowedProductionTransition(
  currentOrderStatus: string,
  nextOrderStatus: string,
) {
  if (currentOrderStatus === nextOrderStatus) return true;

  const transitions: Record<string, string[]> = {
    CONFIRMED: ["IN_PRODUCTION", "CANCELLED"],
    IN_PRODUCTION: ["QUALITY_CHECK", "CANCELLED"],
    QUALITY_CHECK: ["IN_PRODUCTION", "READY", "CANCELLED"],
    READY: [],
  };

  return transitions[currentOrderStatus]?.includes(nextOrderStatus) ?? true;
}

function mapOrderStatus(orderStatus: string) {
  if (orderStatus === "CANCELLED") {
    return {
      status: "CANCELLED" as const,
      started: false,
      quality: false,
      completed: false,
    };
  }

  if (
    orderStatus === "READY" ||
    orderStatus === "SHIPPED" ||
    orderStatus === "OUT_FOR_DELIVERY" ||
    orderStatus === "FULFILLED"
  ) {
    return {
      status: "COMPLETED" as const,
      started: true,
      quality: true,
      completed: true,
    };
  }

  if (orderStatus === "QUALITY_CHECK") {
    return {
      status: "QUALITY_CHECK" as const,
      started: true,
      quality: true,
      completed: false,
    };
  }

  if (orderStatus === "IN_PRODUCTION") {
    return {
      status: "IN_PROGRESS" as const,
      started: true,
      quality: false,
      completed: false,
    };
  }

  return {
    status: "QUEUED" as const,
    started: false,
    quality: false,
    completed: false,
  };
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
