import { randomUUID } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import { requireDb } from "@/lib/db";

export type CheckoutLineInput = {
  productId: string;
  productSlug?: string;
  variantSku?: string;
  colorName?: string;
  sizeName?: string;
  stems?: number;
  variant?: string;
  quantity: number;
};

export type CheckoutAddressInput = {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  apartment?: string;
  city: string;
  emirate: string;
};

export type CreateOrderInput = {
  email: string;
  items: CheckoutLineInput[];
  address: CheckoutAddressInput;
  discountCode?: string;
  isGift?: boolean;
  giftMessage?: string;
  orderNote?: string;
};

type VariantWithProduct = Prisma.ProductVariantGetPayload<{
  include: { product: true };
}>;

type ResolvedLine = {
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
  fulfillmentMode: "READY_STOCK" | "MADE_TO_ORDER" | "BOTH";
  stockOnHand: number;
  stockReserved: number;
};

export class OrderCreationError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "OrderCreationError";
  }
}

export async function getOrderQuote(
  items: CheckoutLineInput[],
  discountCode?: string,
) {
  const db = requireDb();

  return db.$transaction(async (tx) => {
    const lines = await resolveCart(tx, items);
    const subtotal = roundMoney(
      lines.reduce(
        (sum, line) => sum + line.unitPrice * line.quantity,
        0,
      ),
    );
    const discount = await resolveDiscount(tx, discountCode, subtotal);

    return {
      subtotal,
      discountAmount: discount.amount,
      total: roundMoney(subtotal - discount.amount),
      discountCode: discount.record?.code ?? null,
    };
  });
}

export async function createPendingOrder(input: CreateOrderInput) {
  validateOrderInput(input);
  const db = requireDb();

  return db.$transaction(
    async (tx) => {
      const lines = await resolveCart(tx, input.items);

      const subtotal = roundMoney(
        lines.reduce(
          (sum, line) => sum + line.unitPrice * line.quantity,
          0,
        ),
      );
      const discount = await resolveDiscount(
        tx,
        input.discountCode,
        subtotal,
      );

      validateAndCalculateReservations(lines);

      const email = input.email.trim().toLowerCase();
      const firstName = input.address.firstName.trim();
      const lastName = input.address.lastName.trim();
      const recipient = `${firstName} ${lastName}`.trim();
      const phone = input.address.phone.trim();

      const customer = await tx.customer.upsert({
        where: { email },
        update: {
          firstName,
          lastName,
          phone,
        },
        create: {
          email,
          firstName,
          lastName,
          phone,
        },
      });

      const addressLine1 = input.address.address.trim();
      const addressLine2 = input.address.apartment?.trim() || null;
      const city = input.address.city.trim();
      const emirate = input.address.emirate.trim();

      const savedAddress = await tx.address.findFirst({
        where: {
          customerId: customer.id,
          recipient,
          addressLine1,
          addressLine2,
          city,
          emirate,
        },
      });

      if (!savedAddress) {
        const addressCount = await tx.address.count({
          where: { customerId: customer.id },
        });

        await tx.address.create({
          data: {
            customerId: customer.id,
            label: addressCount === 0 ? "Primary" : "Checkout address",
            recipient,
            phone,
            addressLine1,
            addressLine2,
            city,
            emirate,
            countryCode: "AE",
            isDefault: addressCount === 0,
          },
        });
      }

      const discountAmount = discount.amount;
      const deliveryAmount = 0;
      const total = roundMoney(
        subtotal - discountAmount + deliveryAmount,
      );
      const orderNumber = createOrderNumber();

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          discountId: discount.record?.id,
          customerEmail: email,
          customerPhone: phone,
          status: "PENDING_PAYMENT",
          paymentStatus: "PENDING",
          fulfillmentStatus: "UNFULFILLED",
          currency: "AED",
          subtotal,
          discountAmount,
          deliveryAmount,
          total,
          isGift: Boolean(input.isGift),
          giftMessage: input.isGift
            ? input.giftMessage?.trim() || null
            : null,
          orderNote: input.orderNote?.trim() || null,
          shippingAddress: {
            create: {
              recipient,
              phone,
              addressLine1,
              addressLine2,
              city,
              emirate,
              countryCode: "AE",
            },
          },
          items: {
            create: lines.map((line) => ({
              productId: line.productId,
              variantId: line.variantId,
              productName: line.productName,
              sku: line.sku,
              variantName: line.variantName,
              unitPrice: line.unitPrice,
              quantity: line.quantity,
              lineTotal: roundMoney(line.unitPrice * line.quantity),
            })),
          },
        },
        select: {
          id: true,
          orderNumber: true,
          total: true,
          currency: true,
          status: true,
          paymentStatus: true,
        },
      });

      for (const line of lines) {
        const available = Math.max(
          0,
          line.stockOnHand - line.stockReserved,
        );
        const reserveQuantity =
          line.fulfillmentMode === "READY_STOCK"
            ? line.quantity
            : line.fulfillmentMode === "BOTH"
              ? Math.min(available, line.quantity)
              : 0;

        if (reserveQuantity === 0) continue;

        await tx.productVariant.update({
          where: { id: line.variantId },
          data: {
            stockReserved: {
              increment: reserveQuantity,
            },
          },
        });

        await tx.inventoryMovement.create({
          data: {
            variantId: line.variantId,
            orderId: order.id,
            type: "RESERVATION",
            quantity: reserveQuantity,
            note: `Reserved for ${order.orderNumber}`,
          },
        });
      }

      return {
        orderNumber: order.orderNumber,
        total: Number(order.total),
        currency: order.currency,
        status: order.status,
        paymentStatus: order.paymentStatus,
        discountAmount,
      };
    },
    {
      isolationLevel: "Serializable",
    },
  );
}

async function resolveCart(
  tx: Prisma.TransactionClient,
  items: CheckoutLineInput[],
): Promise<ResolvedLine[]> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new OrderCreationError("Your basket is empty.");
  }

  const resolved = new Map<string, ResolvedLine>();

  for (const item of items) {
    const quantity = Number(item.quantity);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new OrderCreationError("A basket quantity is invalid.");
    }

    const parsed = parseVariantLabel(item.variant);
    const productSlug =
      item.productSlug?.trim() || item.productId?.trim();

    let variant: VariantWithProduct | null = item.variantSku
      ? await tx.productVariant.findUnique({
          where: { sku: item.variantSku },
          include: { product: true },
        })
      : null;

    if (!variant && productSlug) {
      const product = await tx.product.findUnique({
        where: { slug: productSlug },
        include: {
          variants: {
            where: { isActive: true },
          },
        },
      });

      if (product?.status === "ACTIVE") {
        const colorName = item.colorName ?? parsed.colorName;
        const sizeName = item.sizeName ?? parsed.sizeName;
        const stems = item.stems ?? parsed.stems;

        const matchedVariant =
          product.variants.find(
            (candidate) =>
              (!colorName || candidate.colorName === colorName) &&
              (!sizeName || candidate.sizeName === sizeName) &&
              (!stems || candidate.stems === stems),
          ) ??
          (stems
            ? product.variants.find(
                (candidate) =>
                  (!colorName || candidate.colorName === colorName) &&
                  candidate.stems === stems,
              )
            : undefined);

        if (matchedVariant) {
          variant = { ...matchedVariant, product };
        }
      }
    }

    if (
      !variant ||
      !variant.isActive ||
      variant.product.status !== "ACTIVE"
    ) {
      throw new OrderCreationError(
        "One of the selected product variants is no longer available.",
      );
    }

    const current = resolved.get(variant.id);
    const nextQuantity = (current?.quantity ?? 0) + quantity;

    resolved.set(variant.id, {
      productId: variant.product.id,
      variantId: variant.id,
      productName: variant.product.name,
      sku: variant.sku,
      variantName: variant.name,
      unitPrice: Number(variant.price),
      quantity: nextQuantity,
      fulfillmentMode: variant.fulfillmentMode,
      stockOnHand: variant.stockOnHand,
      stockReserved: variant.stockReserved,
    });
  }

  return [...resolved.values()];
}

function validateAndCalculateReservations(lines: ResolvedLine[]) {
  for (const line of lines) {
    if (line.fulfillmentMode !== "READY_STOCK") continue;

    const available = Math.max(
      0,
      line.stockOnHand - line.stockReserved,
    );

    if (line.quantity > available) {
      throw new OrderCreationError(
        `${line.productName} only has ${available} ready-to-ship item${available === 1 ? "" : "s"} available.`,
        409,
      );
    }
  }
}

async function resolveDiscount(
  tx: Prisma.TransactionClient,
  code: string | undefined,
  subtotal: number,
) {
  const normalized = code?.trim().toUpperCase();

  if (!normalized) {
    return { record: null, amount: 0 };
  }

  const discount = await tx.discount.findUnique({
    where: { code: normalized },
  });

  if (!discount || !discount.isActive) {
    throw new OrderCreationError("That discount code is not valid.");
  }

  const now = new Date();

  if (discount.startsAt && discount.startsAt > now) {
    throw new OrderCreationError("That discount code is not active yet.");
  }

  if (discount.endsAt && discount.endsAt < now) {
    throw new OrderCreationError("That discount code has expired.");
  }

  if (
    discount.maxRedemptions !== null &&
    discount.redemptionCount >= discount.maxRedemptions
  ) {
    throw new OrderCreationError(
      "That discount code has reached its redemption limit.",
    );
  }

  const minimum = discount.minimumOrderAmount
    ? Number(discount.minimumOrderAmount)
    : 0;

  if (subtotal < minimum) {
    throw new OrderCreationError(
      `A minimum order of AED ${minimum} is required for this discount.`,
    );
  }

  const value = Number(discount.value);
  const amount =
    discount.type === "PERCENTAGE"
      ? Math.min(subtotal, subtotal * (value / 100))
      : Math.min(subtotal, value);

  return {
    record: discount,
    amount: roundMoney(amount),
  };
}

function validateOrderInput(input: CreateOrderInput) {
  if (!input || typeof input !== "object") {
    throw new OrderCreationError("Invalid checkout request.");
  }

  const email = input.email?.trim();

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new OrderCreationError("Enter a valid email address.");
  }

  const requiredAddressFields = [
    input.address?.firstName,
    input.address?.lastName,
    input.address?.phone,
    input.address?.address,
    input.address?.city,
    input.address?.emirate,
  ];

  if (requiredAddressFields.some((value) => !value?.trim())) {
    throw new OrderCreationError(
      "Complete all required delivery information.",
    );
  }

  if (input.giftMessage && input.giftMessage.length > 240) {
    throw new OrderCreationError(
      "Gift messages must be 240 characters or fewer.",
    );
  }

  if (input.orderNote && input.orderNote.length > 300) {
    throw new OrderCreationError(
      "Order notes must be 300 characters or fewer.",
    );
  }
}

function parseVariantLabel(value?: string) {
  const parts = value
    ?.split("·")
    .map((part) => part.trim())
    .filter(Boolean);

  const stemsMatch = value?.match(/(\d+)\s*(?:mini\s*)?stems?/i);

  return {
    colorName: parts?.[0],
    sizeName: parts && parts.length >= 3 ? parts[1] : undefined,
    stems: stemsMatch ? Number(stemsMatch[1]) : undefined,
  };
}

function createOrderNumber() {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const suffix = randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase();

  return `CRJ-${year}${month}${day}-${suffix}`;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
