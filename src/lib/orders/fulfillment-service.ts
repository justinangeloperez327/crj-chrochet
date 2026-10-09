import { requireDb } from "@/lib/db";
import { processNotificationOutbox } from "@/lib/notifications/notification-service";
import {
  consumeReadyStockReservationsForOrder,
} from "@/lib/orders/order-lifecycle";

type DeliveryStatus = "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED";

export class FulfillmentError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "FulfillmentError";
  }
}

export async function updateDeliveryFulfillment(input: {
  orderId: string;
  status: DeliveryStatus;
  carrier?: string;
  trackingNumber?: string;
}) {
  const db = requireDb();

  const order = await db.$transaction(async (tx) => {
    const current = await tx.order.findUnique({
      where: { id: input.orderId },
      include: {
        customBouquetRequest: {
          select: { id: true, status: true },
        },
      },
    });

    if (!current) throw new FulfillmentError("Order not found.", 404);

    if (
      current.paymentStatus !== "PAID" &&
      current.paymentStatus !== "PARTIALLY_REFUNDED"
    ) {
      throw new FulfillmentError(
        "Only paid orders can move through delivery.",
        409,
      );
    }

    if (current.status === "CANCELLED") {
      throw new FulfillmentError("Cancelled orders cannot be delivered.", 409);
    }

    if (current.paymentStatus === "REFUNDED") {
      throw new FulfillmentError(
        "Fully refunded orders cannot be delivered.",
        409,
      );
    }

    validateTransition(current.fulfillmentStatus, input.status);

    const now = new Date();
    const carrier = input.carrier?.trim() || current.carrier;
    const trackingNumber =
      input.trackingNumber?.trim() || current.trackingNumber;

    if (input.status === "SHIPPED") {
      await consumeReadyStockReservationsForOrder(
        tx,
        current.id,
        `Finished stock shipped for ${current.orderNumber}`,
      );

      const updated = await tx.order.update({
        where: { id: current.id },
        data: {
          status: "SHIPPED",
          fulfillmentStatus: "SHIPPED",
          carrier,
          trackingNumber,
          shippedAt: current.shippedAt ?? now,
        },
      });

      await tx.notificationOutbox.create({
        data: {
          orderId: updated.id,
          toEmail: updated.customerEmail,
          type: "ORDER_SHIPPED",
          subject: `Order ${updated.orderNumber} has shipped`,
          payload: {
            orderNumber: updated.orderNumber,
            currency: updated.currency,
            total: Number(updated.total),
            carrier,
            trackingNumber,
          },
        },
      });

      return updated;
    }

    if (input.status === "OUT_FOR_DELIVERY") {
      return tx.order.update({
        where: { id: current.id },
        data: {
          status: "OUT_FOR_DELIVERY",
          fulfillmentStatus: "OUT_FOR_DELIVERY",
          carrier,
          trackingNumber,
          outForDeliveryAt: current.outForDeliveryAt ?? now,
        },
      });
    }

    await consumeReadyStockReservationsForOrder(
      tx,
      current.id,
      `Finished stock delivered for ${current.orderNumber}`,
    );

    if (current.customBouquetRequest) {
      await tx.customBouquetRequest.update({
        where: { id: current.customBouquetRequest.id },
        data: { status: "COMPLETED" },
      });
    }

    const updated = await tx.order.update({
      where: { id: current.id },
      data: {
        status: "FULFILLED",
        fulfillmentStatus: "DELIVERED",
        carrier,
        trackingNumber,
        deliveredAt: current.deliveredAt ?? now,
      },
    });

    await tx.notificationOutbox.create({
      data: {
        orderId: updated.id,
        toEmail: updated.customerEmail,
        type: "ORDER_DELIVERED",
        subject: `Order ${updated.orderNumber} delivered`,
        payload: {
          orderNumber: updated.orderNumber,
          currency: updated.currency,
          total: Number(updated.total),
          carrier,
          trackingNumber,
        },
      },
    });

    return updated;
  });

  await processNotificationOutbox(5).catch(() => undefined);
  return order;
}

function validateTransition(
  current: string,
  next: DeliveryStatus,
) {
  if (current === next) return;

  const allowed: Record<string, DeliveryStatus[]> = {
    READY: ["SHIPPED"],
    SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED"],
    OUT_FOR_DELIVERY: ["DELIVERED"],
  };

  if (!allowed[current]?.includes(next)) {
    throw new FulfillmentError(
      `Invalid delivery transition from ${current} to ${next}.`,
      409,
    );
  }
}
