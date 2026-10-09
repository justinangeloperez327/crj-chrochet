import { getDeliveryRate } from "@/lib/delivery/delivery-service";
import { requireDb } from "@/lib/db";
import {
  reserveCustomBouquetMaterials,
} from "@/lib/materials/material-service";
import {
  cancelPendingOrder,
} from "@/lib/orders/order-lifecycle";
import { createOrderNumber } from "@/lib/orders/order-number";
import { createStripeCheckoutSession } from "@/lib/payments/stripe";

export type CustomBouquetDeliveryInput = {
  recipient: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  emirate: string;
  postalCode?: string;
};

export class CustomBouquetCheckoutError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "CustomBouquetCheckoutError";
  }
}

export async function startCustomBouquetCheckout(
  paymentToken: string,
  delivery: CustomBouquetDeliveryInput,
) {
  validateDelivery(delivery);

  const db = requireDb();
  const existing = await db.customBouquetRequest.findUnique({
    where: { paymentToken },
    include: {
      order: {
        include: {
          paymentAttempts: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!existing) {
    throw new CustomBouquetCheckoutError("Custom bouquet quote not found.", 404);
  }

  if (
    existing.order?.paymentStatus === "PAID"
  ) {
    throw new CustomBouquetCheckoutError(
      "This custom bouquet has already been paid.",
      409,
    );
  }

  const existingAttempt = existing.order?.paymentAttempts[0];

  if (
    existing.order?.status === "PENDING_PAYMENT" &&
    existingAttempt?.status === "PENDING" &&
    existingAttempt.checkoutUrl &&
    existingAttempt.expiresAt &&
    existingAttempt.expiresAt > new Date()
  ) {
    return {
      orderId: existing.order.id,
      orderNumber: existing.order.orderNumber,
      checkoutUrl: existingAttempt.checkoutUrl,
      reused: true,
    };
  }

  if (
    existing.order?.status === "PENDING_PAYMENT"
  ) {
    await cancelPendingOrder(
      existing.order.id,
      "Released before replacing expired custom bouquet checkout",
    );
  }

  let createdOrderId: string | null = null;

  try {
    const order = await db.$transaction(async (tx) => {
      const request = await tx.customBouquetRequest.findUnique({
        where: { paymentToken },
        include: {
          wrapping: true,
        },
      });

      if (!request) {
        throw new CustomBouquetCheckoutError(
          "Custom bouquet quote not found.",
          404,
        );
      }

      if (
        request.status !== "AWAITING_PAYMENT" ||
        request.finalPrice === null ||
        !request.quoteFinalizedAt ||
        !request.quoteExpiresAt
      ) {
        throw new CustomBouquetCheckoutError(
          "This custom bouquet is not ready for payment.",
          409,
        );
      }

      const now = new Date();

      if (request.quoteExpiresAt <= now) {
        throw new CustomBouquetCheckoutError(
          "This custom bouquet quote has expired. Please ask CRJ to refresh it.",
          410,
        );
      }

      if (request.quoteExpiresAt.getTime() - now.getTime() < 46 * 60 * 1000) {
        throw new CustomBouquetCheckoutError(
          "This quote is too close to expiry to open a full payment session. Please ask CRJ to refresh it.",
          410,
        );
      }

      if (request.orderId) {
        throw new CustomBouquetCheckoutError(
          "A payment is already being prepared for this bouquet.",
          409,
        );
      }

      let deliveryAmount: number;

      try {
        deliveryAmount = getDeliveryRate(delivery.emirate);
      } catch {
        throw new CustomBouquetCheckoutError(
          "Delivery is not configured for the selected emirate.",
          400,
        );
      }

      const subtotal = Number(request.finalPrice);
      const total = roundMoney(subtotal + deliveryAmount);
      const reservationExpiresAt = new Date(
        Math.min(
          Date.now() + 45 * 60 * 1000,
          request.quoteExpiresAt.getTime(),
        ),
      );

      let customerId = request.customerId;

      if (!customerId) {
        const name = splitName(request.customerName);
        const customer = await tx.customer.upsert({
          where: { email: request.email },
          update: {
            firstName: name.firstName,
            lastName: name.lastName,
            phone: delivery.phone.trim(),
          },
          create: {
            email: request.email,
            firstName: name.firstName,
            lastName: name.lastName,
            phone: delivery.phone.trim(),
          },
        });

        customerId = customer.id;
      } else {
        await tx.customer.update({
          where: { id: customerId },
          data: {
            phone: delivery.phone.trim(),
          },
        });
      }

      await reserveCustomBouquetMaterials(tx, request.id);

      const order = await tx.order.create({
        data: {
          orderNumber: createOrderNumber(),
          customerId,
          customerEmail: request.email,
          customerPhone: delivery.phone.trim(),
          status: "PENDING_PAYMENT",
          paymentStatus: "PENDING",
          fulfillmentStatus: "UNFULFILLED",
          currency: "AED",
          subtotal,
          discountAmount: 0,
          deliveryAmount,
          total,
          isGift: Boolean(
            request.recipientName || request.giftMessage,
          ),
          giftMessage: request.giftMessage,
          orderNote: `Custom bouquet ${request.referenceNumber}`,
          reservationExpiresAt,
          shippingAddress: {
            create: {
              recipient: delivery.recipient.trim(),
              phone: delivery.phone.trim(),
              addressLine1: delivery.addressLine1.trim(),
              addressLine2: delivery.addressLine2?.trim() || null,
              city: delivery.city.trim(),
              emirate: delivery.emirate.trim(),
              postalCode: delivery.postalCode?.trim() || null,
              countryCode: "AE",
            },
          },
          items: {
            create: {
              productName: "Custom Crochet Bouquet",
              sku: request.referenceNumber,
              variantName: `${request.totalStems} stems · ${request.wrapping.name}`,
              unitPrice: subtotal,
              quantity: 1,
              lineTotal: subtotal,
            },
          },
        },
      });

      const linked = await tx.customBouquetRequest.updateMany({
        where: {
          id: request.id,
          orderId: null,
          status: "AWAITING_PAYMENT",
        },
        data: {
          orderId: order.id,
          customerId,
        },
      });

      if (linked.count !== 1) {
        throw new CustomBouquetCheckoutError(
          "Another payment attempt already started for this bouquet.",
          409,
        );
      }

      return order;
    });

    createdOrderId = order.id;
    const checkout = await createStripeCheckoutSession(order.id);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      checkoutUrl: checkout.url,
      reused: false,
    };
  } catch (error) {
    if (createdOrderId) {
      await cancelPendingOrder(
        createdOrderId,
        "Released because custom bouquet payment session creation failed",
      ).catch(() => undefined);
    }

    if (
      error instanceof Error &&
      error.message.startsWith("Insufficient raw material")
    ) {
      throw new CustomBouquetCheckoutError(
        error.message,
        409,
      );
    }

    throw error;
  }
}

function validateDelivery(input: CustomBouquetDeliveryInput) {
  if (!input || typeof input !== "object") {
    throw new CustomBouquetCheckoutError("Invalid delivery details.");
  }

  const required = [
    input.recipient,
    input.phone,
    input.addressLine1,
    input.city,
    input.emirate,
  ];

  if (required.some((value) => !value?.trim())) {
    throw new CustomBouquetCheckoutError(
      "Complete all required delivery information.",
    );
  }

  if (input.recipient.trim().length > 120) {
    throw new CustomBouquetCheckoutError("Recipient name is too long.");
  }

  if (input.addressLine1.trim().length > 200) {
    throw new CustomBouquetCheckoutError("Address is too long.");
  }
}

function splitName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] || null,
    lastName: parts.slice(1).join(" ") || null,
  };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
