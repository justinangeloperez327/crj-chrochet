import type { Prisma } from "@/generated/prisma/client";
import { requireDb } from "@/lib/db";

export async function markOrderPaidFromStripe(externalId: string) {
  const db = requireDb();

  return db.$transaction(async (tx) => {
    const attempt = await tx.paymentAttempt.findUnique({
      where: { externalId },
      include: { order: true },
    });

    if (!attempt) return null;

    if (attempt.order.paymentStatus === "PAID") {
      if (attempt.status !== "PAID") {
        await tx.paymentAttempt.update({
          where: { id: attempt.id },
          data: { status: "PAID", paidAt: new Date() },
        });
      }

      return attempt.order;
    }

    const paidAt = new Date();
    const nextStatus =
      attempt.order.status === "PENDING_PAYMENT"
        ? "CONFIRMED"
        : attempt.order.status;

    const order = await tx.order.update({
      where: { id: attempt.orderId },
      data: {
        status: nextStatus,
        paymentStatus: "PAID",
        paidAt,
        reservationExpiresAt: null,
      },
    });

    await tx.paymentAttempt.update({
      where: { id: attempt.id },
      data: { status: "PAID", paidAt },
    });

    if (order.discountId) {
      await tx.discount.update({
        where: { id: order.discountId },
        data: { redemptionCount: { increment: 1 } },
      });
    }

    await tx.notificationOutbox.create({
      data: {
        orderId: order.id,
        toEmail: order.customerEmail,
        type: "ORDER_CONFIRMED",
        subject: `Order ${order.orderNumber} confirmed`,
        payload: {
          orderNumber: order.orderNumber,
          total: Number(order.total),
          currency: order.currency,
        },
      },
    });

    return order;
  });
}

export async function markStripePaymentFailed(externalId: string) {
  const db = requireDb();

  return db.$transaction(async (tx) => {
    const attempt = await tx.paymentAttempt.findUnique({
      where: { externalId },
      include: { order: true },
    });

    if (!attempt || attempt.order.paymentStatus === "PAID") return null;

    if (
      attempt.status === "FAILED" ||
      attempt.order.paymentStatus === "FAILED"
    ) {
      return attempt.order;
    }

    await tx.paymentAttempt.update({
      where: { id: attempt.id },
      data: { status: "FAILED" },
    });

    const order = await tx.order.update({
      where: { id: attempt.orderId },
      data: { paymentStatus: "FAILED" },
    });

    await tx.notificationOutbox.create({
      data: {
        orderId: order.id,
        toEmail: order.customerEmail,
        type: "PAYMENT_FAILED",
        subject: `Payment issue for ${order.orderNumber}`,
        payload: {
          orderNumber: order.orderNumber,
          total: Number(order.total),
          currency: order.currency,
        },
      },
    });

    return order;
  });
}

export async function expireStripeCheckout(externalId: string) {
  const db = requireDb();

  return db.$transaction(async (tx) => {
    const attempt = await tx.paymentAttempt.findUnique({
      where: { externalId },
      include: { order: true },
    });

    if (!attempt) return null;

    await tx.paymentAttempt.update({
      where: { id: attempt.id },
      data: { status: "EXPIRED" },
    });

    if (
      attempt.order.paymentStatus === "PAID" ||
      attempt.order.status !== "PENDING_PAYMENT"
    ) {
      return attempt.order;
    }

    await releaseReservationsForOrder(
      tx,
      attempt.orderId,
      `Released after payment session expired for ${attempt.order.orderNumber}`,
    );

    return tx.order.update({
      where: { id: attempt.orderId },
      data: {
        status: "CANCELLED",
        fulfillmentStatus: "CANCELLED",
        reservationExpiresAt: null,
      },
    });
  });
}

export async function cancelPendingOrder(
  orderId: string,
  note = "Pending order cancelled",
) {
  const db = requireDb();

  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });

    if (!order || order.status !== "PENDING_PAYMENT") return order;

    await releaseReservationsForOrder(tx, orderId, note);

    await tx.paymentAttempt.updateMany({
      where: {
        orderId,
        status: { in: ["CREATED", "PENDING"] },
      },
      data: { status: "EXPIRED" },
    });

    return tx.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        fulfillmentStatus: "CANCELLED",
        reservationExpiresAt: null,
      },
    });
  });
}

export async function releaseExpiredReservations(limit = 50) {
  const db = requireDb();
  const expired = await db.order.findMany({
    where: {
      status: "PENDING_PAYMENT",
      paymentStatus: { not: "PAID" },
      reservationExpiresAt: { lte: new Date() },
    },
    select: { id: true },
    take: limit,
    orderBy: { reservationExpiresAt: "asc" },
  });

  let released = 0;

  for (const { id } of expired) {
    const result = await cancelPendingOrder(
      id,
      "Released by reservation-expiry maintenance",
    );
    if (result?.status === "CANCELLED") released += 1;
  }

  return { checked: expired.length, released };
}

async function releaseReservationsForOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  note: string,
) {
  const movements = await tx.inventoryMovement.findMany({
    where: { orderId },
    select: {
      variantId: true,
      type: true,
      quantity: true,
    },
  });

  const outstanding = new Map<string, number>();

  for (const movement of movements) {
    const current = outstanding.get(movement.variantId) ?? 0;

    if (movement.type === "RESERVATION") {
      outstanding.set(movement.variantId, current + movement.quantity);
    }

    if (movement.type === "RELEASE" || movement.type === "SALE") {
      outstanding.set(movement.variantId, current - movement.quantity);
    }
  }

  for (const [variantId, quantity] of outstanding) {
    if (quantity <= 0) continue;

    const variant = await tx.productVariant.findUnique({
      where: { id: variantId },
      select: { stockReserved: true },
    });

    if (!variant) continue;

    const releaseQuantity = Math.min(quantity, variant.stockReserved);
    if (releaseQuantity <= 0) continue;

    await tx.productVariant.update({
      where: { id: variantId },
      data: {
        stockReserved: { decrement: releaseQuantity },
      },
    });

    await tx.inventoryMovement.create({
      data: {
        variantId,
        orderId,
        type: "RELEASE",
        quantity: releaseQuantity,
        note,
      },
    });
  }
}
