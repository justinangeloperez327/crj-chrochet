import { parseRefund, ziinaRequest, ZiinaError, type ZiinaRefund } from "./ziina-client";
import { randomUUID } from "node:crypto";
import type { PaymentProvider, Prisma } from "@/generated/prisma/client";
import type Stripe from "stripe";

import { requireDb, runTransaction } from "@/lib/db";
import {
  releaseCustomBouquetMaterials,
} from "@/lib/materials/material-service";
import { processNotificationOutbox } from "@/lib/notifications/notification-service";
import {
  releaseReadyStockReservationsForOrder,
} from "@/lib/orders/order-lifecycle";
import { getStripe } from "@/lib/payments/stripe";
import { syncProductionJobFromOrderStatus } from "@/lib/production/production-service";

type CreateRefundInput = {
  orderId: string;
  amount: number;
  reason: string;
  note?: string;
  initiatedByUserId: string;
  cancelOrder: boolean;
  acknowledgeProductionLoss: boolean;
};

export class RefundError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "RefundError";
  }
}

export async function createPaymentRefund(input: CreateRefundInput) {
  const db = requireDb();

  const prepared = await runTransaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: {
        refunds: true,
        paymentAttempts: {
          where: {
            status: {
              in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"],
            },
          },
          orderBy: { paidAt: "desc" },
        },
        customBouquetRequest: {
          select: {
            id: true,
            materialsConsumedAt: true,
            materialsReservedAt: true,
          },
        },
        items: {
          select: {
            materialsConsumedAt: true,
          },
        },
      },
    });

    if (!order) throw new RefundError("Order not found.", 404);

    if (
      order.paymentStatus !== "PAID" &&
      order.paymentStatus !== "PARTIALLY_REFUNDED"
    ) {
      throw new RefundError(
        "Only paid or partially refunded orders can be refunded.",
        409,
      );
    }

    if (
      order.refunds.some((refund) =>
        ["PENDING", "REQUIRES_ACTION"].includes(refund.status),
      )
    ) {
      throw new RefundError(
        "Another refund is still processing for this order.",
        409,
      );
    }

    const succeededRefunded = order.refunds
      .filter((refund) => refund.status === "SUCCEEDED")
      .reduce((sum, refund) => sum + Number(refund.amount), 0);
    const remaining = roundMoney(Number(order.total) - succeededRefunded);
    const amount = roundMoney(input.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new RefundError("Refund amount must be greater than zero.");
    }

    if (amount > remaining) {
      throw new RefundError(
        `Refund exceeds the remaining refundable amount of AED ${remaining.toFixed(2)}.`,
        409,
      );
    }

    const becomesFullyRefunded =
      roundMoney(succeededRefunded + amount) >= Number(order.total);

    if (input.cancelOrder && !becomesFullyRefunded) {
      throw new RefundError(
        "An order can only be cancelled by a full refund.",
        409,
      );
    }

    if (
      input.cancelOrder &&
      ["SHIPPED", "OUT_FOR_DELIVERY", "FULFILLED"].includes(order.status)
    ) {
      throw new RefundError(
        "Orders that have already shipped cannot be cancelled. Refund without cancellation and record any physical return separately.",
        409,
      );
    }

    const productionStarted =
      [
        "IN_PRODUCTION",
        "QUALITY_CHECK",
        "READY",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "FULFILLED",
      ].includes(order.status) ||
      Boolean(order.customBouquetRequest?.materialsConsumedAt) ||
      order.items.some((item) => Boolean(item.materialsConsumedAt));

    if (
      input.cancelOrder &&
      productionStarted &&
      !input.acknowledgeProductionLoss
    ) {
      throw new RefundError(
        "Production has already started. Confirm that consumed materials will not be restored automatically.",
        409,
      );
    }

    const attempt = order.paymentAttempts[0];

    if (!attempt) {
      throw new RefundError(
        "No successful payment attempt was found for this order.",
        409,
      );
    }

    const refund = await tx.refund.create({
      data: {
        orderId: order.id,
        paymentAttemptId: attempt.id,
        initiatedByUserId: input.initiatedByUserId,
        id: randomUUID(),
        provider: attempt.provider,
        amount,
        currency: order.currency,
        status: "PENDING",
        reason: input.reason.trim(),
        note: input.note?.trim() || null,
        cancelOrder: input.cancelOrder,
        productionLossAccepted: input.acknowledgeProductionLoss,
      },
    });

    return {
      refund,
      orderNumber: order.orderNumber,
      paymentAttempt: attempt,
    };
  }, { isolationLevel: "Serializable" });

  if (prepared.paymentAttempt.provider === "ZIINA") {
    await db.refund.update({ where: { id: prepared.refund.id }, data: { externalId: prepared.refund.id } });
    try {
      const refund = parseRefund(await ziinaRequest("/refund", {
        id: prepared.refund.id, payment_intent_id: prepared.paymentAttempt.externalId,
        amount: Math.round(Number(prepared.refund.amount) * 100), currency_code: prepared.refund.currency,
        test: prepared.paymentAttempt.testMode,
      }));
      if (refund.id !== prepared.refund.id || refund.payment_intent_id !== prepared.paymentAttempt.externalId) throw new ZiinaError("Ziina refund identity mismatch.", 503, true);
      await syncZiinaRefund(refund);
      await processNotificationOutbox(5).catch(() => undefined);
      return refund;
    } catch (error) {
      // Unknown POST outcomes stay pending for API reconciliation, not a new refund.
      await db.refund.updateMany({ where: { id: prepared.refund.id, status: "PENDING" }, data: {
        status: error instanceof ZiinaError && !error.ambiguous && error.status < 500 ? "FAILED" : "PENDING",
        errorMessage: "Ziina refund requires reconciliation.",
      } });
      throw error;
    }
  }

  let paymentIntentId: string;

  try {
    paymentIntentId = await resolvePaymentIntentId(
      prepared.paymentAttempt.id,
      prepared.paymentAttempt.externalId,
      prepared.paymentAttempt.paymentIntentId,
    );
  } catch (error) {
    await db.refund.update({
      where: { id: prepared.refund.id },
      data: {
        status: "FAILED",
        errorMessage:
          error instanceof Error
            ? error.message.slice(0, 1000)
            : "Unable to resolve the original Stripe payment.",
      },
    });

    throw error;
  }

  let stripeRefund: Stripe.Refund;

  try {
    stripeRefund = await getStripe().refunds.create(
      {
        payment_intent: paymentIntentId,
        amount: Math.round(Number(prepared.refund.amount) * 100),
        reason: "requested_by_customer",
        metadata: {
          orderId: input.orderId,
          orderNumber: prepared.orderNumber,
          refundId: prepared.refund.id,
        },
      },
      {
        idempotencyKey: prepared.refund.id,
      },
    );
  } catch (error) {
    const ambiguous =
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      (error.type === "StripeConnectionError" ||
        error.type === "StripeAPIError");

    await db.refund.update({
      where: { id: prepared.refund.id },
      data: {
        status: ambiguous ? "PENDING" : "FAILED",
        errorMessage:
          error instanceof Error
            ? error.message.slice(0, 1000)
            : "Stripe refund creation failed.",
      },
    });

    throw error;
  }

  await db.refund.update({
    where: { id: prepared.refund.id },
    data: { externalId: stripeRefund.id },
  });

  await syncStripeRefund(stripeRefund);
  await processNotificationOutbox(5).catch(() => undefined);

  return stripeRefund;
}

type ProviderRefund = { id: string; amount: number; currency: string; status: string | null; metadata?: { refundId?: string; orderId?: string } | null; failure_reason?: string | null };
export function syncStripeRefund(refund: Stripe.Refund) { return syncProviderRefund(refund, "STRIPE"); }
export async function syncZiinaRefund(refund: ZiinaRefund) {
  const local = await requireDb().refund.findUnique({ where: { externalId: refund.id }, include: { paymentAttempt: true } });
  if (!local || local.provider !== "ZIINA") return null;
  if (!local.paymentAttempt || local.paymentAttempt.externalId !== refund.payment_intent_id) throw new RefundError("Ziina refund payment identity mismatch.", 409);
  return syncProviderRefund({ id: refund.id, amount: refund.amount, currency: refund.currency_code.toLowerCase(),
    status: refund.status === "completed" ? "succeeded" : refund.status,
    metadata: { refundId: local.id },
  }, "ZIINA");
}
async function syncProviderRefund(stripeRefund: ProviderRefund, provider: PaymentProvider) {
  return runTransaction(async (tx) => {
    const refundId = stripeRefund.metadata?.refundId;


    const local = refundId
      ? await tx.refund.findUnique({ where: { id: refundId } })
      : await tx.refund.findFirst({
          where: {
            externalId: stripeRefund.id,
          },
          orderBy: { createdAt: "desc" },
        });

    if (!local || local.provider !== provider) return null;

    if (local.externalId && local.externalId !== stripeRefund.id) throw new RefundError("Refund provider identity mismatch.", 409);
    if (Math.round(Number(local.amount) * 100) !== stripeRefund.amount || local.currency.toLowerCase() !== stripeRefund.currency) throw new RefundError("Refund amount or currency mismatch.", 409);
    if (["SUCCEEDED", "FAILED", "CANCELED"].includes(local.status) && local.status !== mapStripeRefundStatus(stripeRefund.status)) return local;

    const mappedStatus = mapStripeRefundStatus(stripeRefund.status);

    if (
      local.status === mappedStatus &&
      ["SUCCEEDED", "FAILED", "CANCELED"].includes(mappedStatus)
    ) {
      return local;
    }

    const claimed = await tx.refund.updateMany({
      where: {
        id: local.id,
        status: local.status,
      },
      data: {
        externalId: stripeRefund.id,
        status: mappedStatus,
        errorMessage:
          mappedStatus === "FAILED"
            ? stripeRefund.failure_reason || "Payment provider refund failed."
            : null,
        completedAt:
          mappedStatus === "SUCCEEDED" ? new Date() : local.completedAt,
      },
    });

    if (claimed.count === 0) {
      return tx.refund.findUnique({ where: { id: local.id } });
    }

    const updated = await tx.refund.findUnique({
      where: { id: local.id },
    });

    if (!updated) return null;

    if (mappedStatus === "SUCCEEDED") {
      await finalizeSuccessfulRefund(tx, updated.id);
    } else if (
      mappedStatus === "PENDING" ||
      mappedStatus === "REQUIRES_ACTION"
    ) {
      await queueRefundStartedNotification(tx, updated.id);
    } else if (
      mappedStatus === "FAILED" ||
      mappedStatus === "CANCELED"
    ) {
      await reconcileFailedRefund(tx, updated.id);
    }

    return updated;
  }, { isolationLevel: "Serializable" });
}

async function finalizeSuccessfulRefund(tx: Prisma.TransactionClient, refundId: string) {

    const refund = await tx.refund.findUnique({
      where: { id: refundId },
      include: {
        order: {
          include: {
            refunds: true,
            customBouquetRequest: true,
          },
        },
        paymentAttempt: true,
      },
    });

    if (!refund) return;

    const succeeded = refund.order.refunds
      .filter(
        (entry) =>
          entry.id === refund.id || entry.status === "SUCCEEDED",
      )
      .reduce((sum, entry) => sum + Number(entry.amount), 0);

    const total = Number(refund.order.total);
    const refundedAmount = roundMoney(Math.min(succeeded, total));
    const fullyRefunded = refundedAmount >= total;
    const paymentStatus = fullyRefunded
      ? "REFUNDED"
      : "PARTIALLY_REFUNDED";

    await tx.order.update({
      where: { id: refund.orderId },
      data: {
        refundedAmount,
        paymentStatus,
      },
    });

    if (refund.paymentAttemptId) {
      await tx.paymentAttempt.update({
        where: { id: refund.paymentAttemptId },
        data: {
          status: fullyRefunded
            ? "REFUNDED"
            : "PARTIALLY_REFUNDED",
        },
      });
    }

    if (
      refund.cancelOrder &&
      fullyRefunded &&
      refund.order.status !== "FULFILLED"
    ) {
      await releaseReadyStockReservationsForOrder(
        tx,
        refund.orderId,
        `Reservation released after refunding ${refund.order.orderNumber}`,
      );

      if (refund.order.customBouquetRequest) {
        await releaseCustomBouquetMaterials(
          tx,
          refund.order.customBouquetRequest.id,
          `Material reservation released after refunding ${refund.order.orderNumber}`,
        );

        await tx.customBouquetRequest.update({
          where: { id: refund.order.customBouquetRequest.id },
          data: {
            status: "CANCELLED",
          },
        });
      }

      await tx.order.update({
        where: { id: refund.orderId },
        data: {
          status: "CANCELLED",
          fulfillmentStatus: "CANCELLED",
          cancelledAt: new Date(),
          cancellationReason: refund.reason,
        },
      });

      await syncProductionJobFromOrderStatus(
        tx,
        refund.orderId,
        "CANCELLED",
      );
    }

    await tx.notificationOutbox.create({
      data: {
        orderId: refund.orderId,
        toEmail: refund.order.customerEmail,
        type: fullyRefunded
          ? "ORDER_REFUNDED"
          : "ORDER_PARTIALLY_REFUNDED",
        subject: fullyRefunded
          ? `Refund completed for ${refund.order.orderNumber}`
          : `Partial refund completed for ${refund.order.orderNumber}`,
        payload: {
          orderNumber: refund.order.orderNumber,
          currency: refund.order.currency,
          total: total,
          refundAmount: Number(refund.amount),
          refundedTotal: refundedAmount,
          reason: refund.reason,
        },
      },
    });

    if (
      refund.cancelOrder &&
      fullyRefunded &&
      refund.order.status !== "FULFILLED"
    ) {
      await tx.notificationOutbox.create({
        data: {
          orderId: refund.orderId,
          toEmail: refund.order.customerEmail,
          type: "ORDER_CANCELLED",
          subject: `Order ${refund.order.orderNumber} cancelled`,
          payload: {
            orderNumber: refund.order.orderNumber,
            currency: refund.order.currency,
            total,
            refundAmount: Number(refund.amount),
            refundedTotal: refundedAmount,
            reason: refund.reason,
          },
        },
      });
    }

}

async function queueRefundStartedNotification(tx: Prisma.TransactionClient, refundId: string) {
    const refund = await tx.refund.findUnique({
      where: { id: refundId },
      include: { order: true },
    });

    if (!refund || refund.startedNotifiedAt) return;

    await tx.notificationOutbox.create({
      data: {
        orderId: refund.orderId,
        toEmail: refund.order.customerEmail,
        type: "ORDER_REFUND_STARTED",
        subject: `Refund started for ${refund.order.orderNumber}`,
        payload: {
          refundId: refund.id,
          orderNumber: refund.order.orderNumber,
          currency: refund.order.currency,
          total: Number(refund.order.total),
          refundAmount: Number(refund.amount),
          reason: refund.reason,
        },
      },
    });

    await tx.refund.update({
      where: { id: refund.id },
      data: { startedNotifiedAt: new Date() },
    });

}

async function resolvePaymentIntentId(
  paymentAttemptId: string,
  checkoutSessionId: string,
  currentPaymentIntentId: string | null,
) {
  if (currentPaymentIntentId) return currentPaymentIntentId;

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(
    checkoutSessionId,
  );
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!paymentIntent) {
    throw new RefundError(
      "Stripe payment intent is not available for this order.",
      409,
    );
  }

  const db = requireDb();
  await db.paymentAttempt.update({
    where: { id: paymentAttemptId },
    data: { paymentIntentId: paymentIntent },
  });

  return paymentIntent;
}

function mapStripeRefundStatus(
  status: string | null,
):
  | "PENDING"
  | "REQUIRES_ACTION"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED" {
  switch (status) {
    case "succeeded":
      return "SUCCEEDED";
    case "failed":
      return "FAILED";
    case "canceled":
      return "CANCELED";
    case "requires_action":
      return "REQUIRES_ACTION";
    default:
      return "PENDING";
  }
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}


async function reconcileFailedRefund(tx: Prisma.TransactionClient, refundId: string) {

    const refund = await tx.refund.findUnique({
      where: { id: refundId },
      include: {
        order: {
          include: {
            refunds: true,
            paymentAttempts: true,
          },
        },
      },
    });

    if (!refund) return;

    const succeededTotal = refund.order.refunds
      .filter(
        (entry) =>
          entry.status === "SUCCEEDED" &&
          entry.id !== refund.id,
      )
      .reduce((sum, entry) => sum + Number(entry.amount), 0);

    const orderTotal = Number(refund.order.total);
    const refundedAmount = roundMoney(
      Math.min(succeededTotal, orderTotal),
    );
    const paymentStatus =
      refundedAmount <= 0
        ? "PAID"
        : refundedAmount >= orderTotal
          ? "REFUNDED"
          : "PARTIALLY_REFUNDED";

    await tx.order.update({
      where: { id: refund.orderId },
      data: {
        refundedAmount,
        paymentStatus,
        cancellationReason:
          refund.order.status === "CANCELLED"
            ? `${refund.order.cancellationReason ?? "Cancelled"} · Refund failed — manual review required`
            : refund.order.cancellationReason,
      },
    });

    if (refund.paymentAttemptId) {
      await tx.paymentAttempt.update({
        where: { id: refund.paymentAttemptId },
        data: {
          status:
            paymentStatus === "REFUNDED"
              ? "REFUNDED"
              : paymentStatus === "PARTIALLY_REFUNDED"
                ? "PARTIALLY_REFUNDED"
                : "PAID",
        },
      });
    }

    await tx.notificationOutbox.create({
      data: {
        orderId: refund.orderId,
        toEmail: refund.order.customerEmail,
        type: "ORDER_REFUND_FAILED",
        subject: `Refund issue for ${refund.order.orderNumber}`,
        payload: {
          orderNumber: refund.order.orderNumber,
          currency: refund.order.currency,
          total: orderTotal,
          refundAmount: Number(refund.amount),
          refundedTotal: refundedAmount,
          reason:
            refund.errorMessage ??
            "The refund did not complete successfully.",
        },
      },
    });

}
