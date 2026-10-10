"use server";

import { randomBytes } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/guards";
import {
  consumeDiscountReservationForPaidOrder,
  releaseDiscountReservationForOrder,
} from "@/lib/discounts/discount-service";
import { requireDb } from "@/lib/db";
import {
  consumeCustomBouquetMaterialsTx,
  consumeOrderItemMaterials,
  releaseCustomBouquetForOrder,
} from "@/lib/materials/material-service";
import { processNotificationOutbox } from "@/lib/notifications/notification-service";
import { updateDeliveryFulfillment } from "@/lib/orders/fulfillment-service";
import { createStripeRefund } from "@/lib/payments/refund-service";
import {
  isAllowedProductionTransition,
  syncEligibleProductionJobs,
  syncProductionJobFromOrderStatus,
} from "@/lib/production/production-service";

const PRODUCT_STATUSES = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
const FULFILLMENT_MODES = ["READY_STOCK", "MADE_TO_ORDER", "BOTH"] as const;
const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "READY",
  "FULFILLED",
  "CANCELLED",
] as const;
const PAYMENT_STATUSES = [
  "PENDING",
  "AUTHORIZED",
  "PAID",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const;

export async function createProduct(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const name = required(formData, "name");
  const slug = slugify(optional(formData, "slug") || name);
  const basePrice = money(formData, "basePrice");
  const flowerType = required(formData, "flowerType");
  const description = required(formData, "description");

  const existing = await db.product.findUnique({ where: { slug } });
  if (existing) {
    throw new Error("A product with that slug already exists.");
  }

  const category = await db.category.upsert({
    where: { slug: "crochet-flowers" },
    update: {},
    create: {
      slug: "crochet-flowers",
      name: "Crochet Flowers",
      description: "Handmade crochet flowers and bouquet arrangements.",
    },
  });

  const product = await db.product.create({
    data: {
      categoryId: category.id,
      name,
      slug,
      flowerType,
      description,
      basePrice,
      badge: optional(formData, "badge") || null,
      featured: formData.get("featured") === "on",
      status: "DRAFT",
    },
  });

  revalidatePath("/admin/products");
  redirect(`/admin/products/${product.id}`);
}

export async function updateProduct(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const id = required(formData, "id");
  const status = enumValue(
    required(formData, "status"),
    PRODUCT_STATUSES,
    "product status",
  );

  await db.product.update({
    where: { id },
    data: {
      name: required(formData, "name"),
      slug: slugify(required(formData, "slug")),
      flowerType: required(formData, "flowerType"),
      description: required(formData, "description"),
      basePrice: money(formData, "basePrice"),
      compareAtPrice: nullableMoney(formData, "compareAtPrice"),
      badge: optional(formData, "badge") || null,
      featured: formData.get("featured") === "on",
      status,
      seoTitle: optional(formData, "seoTitle") || null,
      seoDescription: optional(formData, "seoDescription") || null,
    },
  });

  revalidateStorefront();
  revalidatePath(`/admin/products/${id}`);
}

export async function archiveProduct(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const id = required(formData, "id");

  await db.product.update({
    where: { id },
    data: { status: "ARCHIVED" },
  });

  revalidateStorefront();
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function createVariant(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const productId = required(formData, "productId");
  const sku = required(formData, "sku").toUpperCase();
  const fulfillmentMode = enumValue(
    required(formData, "fulfillmentMode"),
    FULFILLMENT_MODES,
    "fulfillment mode",
  );
  const stockOnHand = integer(formData, "stockOnHand", 0);
  const stockReserved = 0;

  if (stockOnHand < 0) {
    throw new Error("Opening stock cannot be negative.");
  }

  await db.$transaction(async (tx) => {
    const variant = await tx.productVariant.create({
      data: {
        productId,
        sku,
        name: required(formData, "name"),
        colorName: optional(formData, "colorName") || null,
        colorHex: optional(formData, "colorHex") || null,
        sizeName: optional(formData, "sizeName") || null,
        stems: nullableInteger(formData, "stems"),
        price: money(formData, "price"),
        cost: nullableMoney(formData, "cost"),
        fulfillmentMode,
        leadTimeMinDays: nullableInteger(formData, "leadTimeMinDays"),
        leadTimeMaxDays: nullableInteger(formData, "leadTimeMaxDays"),
        trackInventory: formData.get("trackInventory") === "on",
        stockOnHand,
        stockReserved,
        reorderLevel: integer(formData, "reorderLevel", 0),
        isActive: true,
      },
    });

    if (stockOnHand > 0) {
      await tx.inventoryMovement.create({
        data: {
          variantId: variant.id,
          type: "OPENING",
          quantity: stockOnHand,
          note: "Opening stock",
        },
      });
    }
  });

  revalidateStorefront();
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/inventory");
}

export async function updateVariant(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const id = required(formData, "id");
  const productId = required(formData, "productId");
  const fulfillmentMode = enumValue(
    required(formData, "fulfillmentMode"),
    FULFILLMENT_MODES,
    "fulfillment mode",
  );

  await db.productVariant.update({
    where: { id },
    data: {
      sku: required(formData, "sku").toUpperCase(),
      name: required(formData, "name"),
      colorName: optional(formData, "colorName") || null,
      colorHex: optional(formData, "colorHex") || null,
      sizeName: optional(formData, "sizeName") || null,
      stems: nullableInteger(formData, "stems"),
      price: money(formData, "price"),
      cost: nullableMoney(formData, "cost"),
      fulfillmentMode,
      leadTimeMinDays: nullableInteger(formData, "leadTimeMinDays"),
      leadTimeMaxDays: nullableInteger(formData, "leadTimeMaxDays"),
      reorderLevel: integer(formData, "reorderLevel", 0),
      trackInventory: formData.get("trackInventory") === "on",
      isActive: formData.get("isActive") === "on",
    },
  });

  revalidateStorefront();
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/inventory");
}

export async function adjustStock(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const variantId = required(formData, "variantId");
  const delta = integer(formData, "delta");
  const note = optional(formData, "note") || "Manual stock adjustment";

  if (delta === 0) {
    throw new Error("Stock adjustment cannot be zero.");
  }

  await db.$transaction(async (tx) => {
    const variant = await tx.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) throw new Error("Variant not found.");

    const nextOnHand = variant.stockOnHand + delta;

    if (nextOnHand < 0) {
      throw new Error("Stock on hand cannot be negative.");
    }

    if (nextOnHand < variant.stockReserved) {
      throw new Error(
        "Stock on hand cannot be reduced below the quantity already reserved.",
      );
    }

    await tx.productVariant.update({
      where: { id: variantId },
      data: { stockOnHand: nextOnHand },
    });

    await tx.inventoryMovement.create({
      data: {
        variantId,
        type: "ADJUSTMENT",
        quantity: delta,
        note,
      },
    });
  });

  revalidateStorefront();
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
}

export async function updateOrderWorkflow(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const orderId = required(formData, "orderId");
  const requestedStatus = enumValue(
    required(formData, "status"),
    ORDER_STATUSES,
    "order status",
  );
  const paymentStatus = enumValue(
    required(formData, "paymentStatus"),
    PAYMENT_STATUSES,
    "payment status",
  );

  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        inventoryMovement: true,
        items: {
          select: {
            id: true,
            productionQuantity: true,
          },
        },
        productionJob: {
          select: { id: true },
        },
        customBouquetRequest: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!order) throw new Error("Order not found.");

    if (order.status === "CANCELLED" && requestedStatus !== "CANCELLED") {
      throw new Error("Cancelled orders cannot be reopened.");
    }

    if (
      ["SHIPPED", "OUT_FOR_DELIVERY", "FULFILLED"].includes(order.status)
    ) {
      throw new Error(
        "Use the delivery workflow for shipped or delivered orders.",
      );
    }

    if (requestedStatus === "FULFILLED") {
      throw new Error(
        "Use the delivery workflow to mark an order delivered.",
      );
    }

    if (
      (["REFUNDED", "PARTIALLY_REFUNDED"].includes(
        order.paymentStatus,
      ) &&
        paymentStatus !== order.paymentStatus) ||
      (["REFUNDED", "PARTIALLY_REFUNDED"].includes(paymentStatus) &&
        paymentStatus !== order.paymentStatus)
    ) {
      throw new Error(
        "Refund payment states are managed by the Stripe refund workflow.",
      );
    }

    if (
      order.paymentStatus === "PAID" &&
      paymentStatus !== "PAID"
    ) {
      throw new Error(
        "A paid order cannot be downgraded manually. Use the refund workflow.",
      );
    }

    const becomingPaid =
      paymentStatus === "PAID" && order.paymentStatus !== "PAID";
    let status = requestedStatus;

    if (paymentStatus === "PAID" && status === "PENDING_PAYMENT") {
      status = "CONFIRMED";
    }

    if (
      ["IN_PRODUCTION", "QUALITY_CHECK", "READY", "FULFILLED"].includes(
        status,
      ) &&
      paymentStatus !== "PAID" &&
      paymentStatus !== "PARTIALLY_REFUNDED"
    ) {
      throw new Error(
        "An order must be paid before production or fulfillment can begin.",
      );
    }

    if (
      order.customBouquetRequest &&
      becomingPaid &&
      ["IN_PRODUCTION", "QUALITY_CHECK", "READY", "FULFILLED"].includes(
        status,
      )
    ) {
      throw new Error(
        "Confirm custom bouquet payment first, then start production in a separate step.",
      );
    }

    const requiresProduction =
      Boolean(order.customBouquetRequest) ||
      order.items.some((item) => item.productionQuantity > 0);

    if (
      requiresProduction &&
      ["PAID", "PARTIALLY_REFUNDED"].includes(paymentStatus) &&
      !isAllowedProductionTransition(order.status, status)
    ) {
      throw new Error(
        `Invalid production transition from ${order.status} to ${status}.`,
      );
    }

    if (order.customBouquetRequest) {
      const currentCustomStatus = order.customBouquetRequest.status;

      if (
        (status === "IN_PRODUCTION" || status === "QUALITY_CHECK") &&
        !["PAID", "IN_PRODUCTION"].includes(currentCustomStatus)
      ) {
        throw new Error(
          "Custom bouquet must be paid before production starts.",
        );
      }

      if (
        status === "READY" &&
        !["IN_PRODUCTION", "READY"].includes(currentCustomStatus)
      ) {
        throw new Error(
          "Custom bouquet must enter production before it can be marked ready.",
        );
      }

      if (
        status === "FULFILLED" &&
        !["READY", "COMPLETED"].includes(currentCustomStatus)
      ) {
        throw new Error(
          "Custom bouquet must be ready before it can be completed.",
        );
      }
    }

    const outstandingReservations = getOutstandingReservations(
      order.inventoryMovement,
    );

    if (
      status === "CANCELLED" &&
      order.status !== "CANCELLED" &&
      ["PAID", "PARTIALLY_REFUNDED"].includes(order.paymentStatus)
    ) {
      throw new Error(
        "Paid orders must go through the refund workflow before cancellation.",
      );
    }

    if (
      status === "CANCELLED" &&
      order.status !== "CANCELLED" &&
      order.paymentStatus === "REFUNDED" &&
      ["IN_PRODUCTION", "QUALITY_CHECK", "READY"].includes(order.status) &&
      formData.get("acknowledgeProductionLoss") !== "on"
    ) {
      throw new Error(
        "Production already started. Confirm that consumed materials will not be restored automatically.",
      );
    }

    if (status === "CANCELLED" && order.status !== "CANCELLED") {
      for (const [variantId, quantity] of outstandingReservations) {
        if (quantity <= 0) continue;

        await tx.productVariant.update({
          where: { id: variantId },
          data: {
            stockReserved: { decrement: quantity },
          },
        });

        await tx.inventoryMovement.create({
          data: {
            variantId,
            orderId,
            type: "RELEASE",
            quantity,
            note: `Reservation released after cancelling ${order.orderNumber}`,
          },
        });
      }

      await releaseCustomBouquetForOrder(
        tx,
        orderId,
        `Custom bouquet reservation released after cancelling ${order.orderNumber}`,
      );
      await releaseDiscountReservationForOrder(tx, orderId);

      if (order.customBouquetRequest) {
        await tx.customBouquetRequest.update({
          where: { id: order.customBouquetRequest.id },
          data: { status: "CANCELLED" },
        });
      }

      await tx.notificationOutbox.create({
        data: {
          orderId,
          toEmail: order.customerEmail,
          type: "ORDER_CANCELLED",
          subject: `Order ${order.orderNumber} cancelled`,
          payload: {
            orderNumber: order.orderNumber,
            currency: order.currency,
            total: Number(order.total),
            reason: "Cancelled before payment/production",
          },
        },
      });
    }

    if (
      ["IN_PRODUCTION", "QUALITY_CHECK", "READY", "FULFILLED"].includes(
        status,
      )
    ) {
      for (const item of order.items) {
        await consumeOrderItemMaterials(tx, item.id);
      }

      if (order.customBouquetRequest) {
        await consumeCustomBouquetMaterialsTx(
          tx,
          order.customBouquetRequest.id,
        );
      }
    }

    if (status === "FULFILLED" && order.status !== "FULFILLED") {
      for (const [variantId, quantity] of outstandingReservations) {
        if (quantity <= 0) continue;

        const variant = await tx.productVariant.findUnique({
          where: { id: variantId },
        });

        if (!variant) continue;

        if (
          variant.stockOnHand < quantity ||
          variant.stockReserved < quantity
        ) {
          throw new Error(
            `Inventory for ${variant.sku} is inconsistent with the reservation.`,
          );
        }

        await tx.productVariant.update({
          where: { id: variantId },
          data: {
            stockOnHand: { decrement: quantity },
            stockReserved: { decrement: quantity },
          },
        });

        await tx.inventoryMovement.create({
          data: {
            variantId,
            orderId,
            type: "SALE",
            quantity,
            note: `Consumed stock for ${order.orderNumber}`,
          },
        });
      }
    }

    const paidAt = becomingPaid ? new Date() : order.paidAt;

    await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        paymentStatus,
        fulfillmentStatus: fulfillmentStatusFor(status),
        paidAt,
        reservationExpiresAt: becomingPaid
          ? null
          : order.reservationExpiresAt,
      },
    });

    if (order.customBouquetRequest) {
      if (becomingPaid) {
        await tx.customBouquetRequest.updateMany({
          where: {
            id: order.customBouquetRequest.id,
            status: "AWAITING_PAYMENT",
          },
          data: {
            status: "PAID",
          },
        });
      }

      const customStatus =
        status === "IN_PRODUCTION" || status === "QUALITY_CHECK"
          ? "IN_PRODUCTION"
          : status === "READY"
            ? "READY"
            : status === "FULFILLED"
              ? "COMPLETED"
              : null;

      if (customStatus) {
        await tx.customBouquetRequest.update({
          where: { id: order.customBouquetRequest.id },
          data: { status: customStatus },
        });
      }
    }

    await syncProductionJobFromOrderStatus(tx, orderId, status);

    if (becomingPaid) {
      await consumeDiscountReservationForPaidOrder(tx, orderId);
    }

    if (becomingPaid) {
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
    }
  });

  await processNotificationOutbox(5).catch(() => undefined);

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
}

function getOutstandingReservations(
  movements: Array<{
    variantId: string;
    type: string;
    quantity: number;
  }>,
) {
  const totals = new Map<string, number>();

  for (const movement of movements) {
    const current = totals.get(movement.variantId) ?? 0;

    if (movement.type === "RESERVATION") {
      totals.set(movement.variantId, current + movement.quantity);
    }

    if (movement.type === "RELEASE" || movement.type === "SALE") {
      totals.set(movement.variantId, current - movement.quantity);
    }
  }

  return totals;
}

function fulfillmentStatusFor(status: string) {
  if (status === "IN_PRODUCTION" || status === "QUALITY_CHECK") {
    return "IN_PRODUCTION" as const;
  }

  if (status === "READY") return "READY" as const;
  if (status === "FULFILLED") return "DELIVERED" as const;
  if (status === "CANCELLED") return "CANCELLED" as const;

  return "UNFULFILLED" as const;
}

function revalidateStorefront() {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/collections");
  revalidatePath("/collections/[slug]", "page");
  revalidatePath("/admin/products");
}

function revalidateCollectionStorefront() {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/collections");
  revalidatePath("/collections/[slug]", "page");
}

function required(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required.`);
  }
  return value.trim();
}

function optional(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function dateValue(
  formData: FormData,
  key: string,
  endOfDay: boolean,
) {
  const value = optional(formData, key);
  if (!value) return null;

  const suffix = endOfDay
    ? "T23:59:59.999Z"
    : "T00:00:00.000Z";
  const date = new Date(`${value}${suffix}`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${key} must be a valid date.`);
  }

  return date;
}

function integer(formData: FormData, key: string, fallback?: number) {
  const value = optional(formData, key);

  if (!value && fallback !== undefined) return fallback;

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${key} must be a whole number.`);
  }
  return parsed;
}

function nullableInteger(formData: FormData, key: string) {
  const value = optional(formData, key);
  return value ? integer(formData, key) : null;
}

function money(formData: FormData, key: string) {
  const value = Number(required(formData, key));
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${key} must be a valid non-negative amount.`);
  }
  return Math.round(value * 100) / 100;
}

function nullableMoney(formData: FormData, key: string) {
  return optional(formData, key) ? money(formData, key) : null;
}

function enumValue<const T extends readonly string[]>(
  value: string,
  allowed: T,
  label: string,
): T[number] {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`Invalid ${label}.`);
  }

  return value as T[number];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


export async function createCollection(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const name = required(formData, "name");
  const slug = slugify(optional(formData, "slug") || name);
  const sortOrder = integer(formData, "sortOrder", 0);
  validateCollectionFields(formData, sortOrder);

  if (!slug) {
    throw new Error("Collection slug is required.");
  }

  const existing = await db.collection.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existing) {
    throw new Error("A collection with that slug already exists.");
  }

  const collection = await db.collection.create({
    data: {
      name,
      slug,
      description: optional(formData, "description") || null,
      featured: formData.get("featured") === "on",
      isActive: formData.get("isActive") === "on",
      sortOrder,
      seoTitle: optional(formData, "seoTitle") || null,
      seoDescription: optional(formData, "seoDescription") || null,
    },
  });

  revalidateCollectionStorefront();
  revalidatePath("/admin/collections");
  redirect(`/admin/collections/${collection.id}`);
}

export async function updateCollection(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const id = required(formData, "id");
  const name = required(formData, "name");
  const slug = slugify(required(formData, "slug"));
  const sortOrder = integer(formData, "sortOrder", 0);
  validateCollectionFields(formData, sortOrder);

  if (!slug) {
    throw new Error("Collection slug is required.");
  }

  const current = await db.collection.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });

  if (!current) throw new Error("Collection not found.");

  const owner = await db.collection.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (owner && owner.id !== id) {
    throw new Error("A collection with that slug already exists.");
  }

  await db.collection.update({
    where: { id },
    data: {
      name,
      slug,
      description: optional(formData, "description") || null,
      featured: formData.get("featured") === "on",
      isActive: formData.get("isActive") === "on",
      sortOrder,
      seoTitle: optional(formData, "seoTitle") || null,
      seoDescription: optional(formData, "seoDescription") || null,
    },
  });

  revalidateCollectionStorefront();
  revalidatePath(`/collections/${current.slug}`);
  revalidatePath(`/collections/${slug}`);
  revalidatePath("/admin/collections");
  revalidatePath(`/admin/collections/${id}`);
}

export async function updateCollectionProducts(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const collectionId = required(formData, "collectionId");
  const productIds = uniqueFormValues(formData, "productIds");

  await db.$transaction(async (tx) => {
    const collection = await tx.collection.findUnique({
      where: { id: collectionId },
      select: { id: true, slug: true },
    });

    if (!collection) throw new Error("Collection not found.");

    if (productIds.length > 0) {
      const validProducts = await tx.product.count({
        where: {
          id: { in: productIds },
          status: { not: "ARCHIVED" },
        },
      });

      if (validProducts !== productIds.length) {
        throw new Error(
          "One or more selected products are unavailable for merchandising.",
        );
      }
    }

    const usedSortOrders = new Set<number>();
    const assignments = productIds.map((productId, index) => {
      const raw = optional(formData, `sortOrder_${productId}`);
      const sortOrder = raw ? Number(raw) : (index + 1) * 10;

      if (
        !Number.isInteger(sortOrder) ||
        sortOrder < -10000 ||
        sortOrder > 10000
      ) {
        throw new Error(
          "Product sort order must be a whole number between -10000 and 10000.",
        );
      }

      if (usedSortOrders.has(sortOrder)) {
        throw new Error(
          "Each selected product must have a unique sort order.",
        );
      }
      usedSortOrders.add(sortOrder);

      return {
        collectionId,
        productId,
        sortOrder,
      };
    });

    await tx.collectionProduct.deleteMany({
      where: { collectionId },
    });

    if (assignments.length > 0) {
      await tx.collectionProduct.createMany({
        data: assignments,
      });
    }
  });

  revalidateCollectionStorefront();
  revalidatePath("/admin/collections");
  revalidatePath(`/admin/collections/${collectionId}`);
}

export async function deleteCollection(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const id = required(formData, "id");

  const collection = await db.collection.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          discountRules: true,
        },
      },
    },
  });

  if (!collection) return;

  if (collection._count.discountRules > 0) {
    throw new Error(
      "This collection is targeted by one or more promotions. Remove those promotion targets before deleting it.",
    );
  }

  await db.collection.delete({ where: { id } });

  revalidateCollectionStorefront();
  revalidatePath("/admin/collections");
  redirect("/admin/collections");
}

function validateCollectionFields(
  formData: FormData,
  sortOrder: number,
) {
  if (sortOrder < -10000 || sortOrder > 10000) {
    throw new Error(
      "Collection sort order must be between -10000 and 10000.",
    );
  }

  const description = optional(formData, "description");
  const seoTitle = optional(formData, "seoTitle");
  const seoDescription = optional(formData, "seoDescription");

  if (description.length > 600) {
    throw new Error("Collection description must be 600 characters or fewer.");
  }

  if (seoTitle.length > 70) {
    throw new Error("SEO title must be 70 characters or fewer.");
  }

  if (seoDescription.length > 180) {
    throw new Error("SEO description must be 180 characters or fewer.");
  }
}

export async function createDiscount(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const input = discountFormInput(formData);

  await db.$transaction(async (tx) => {
    const existing = await tx.discount.findUnique({
      where: { code: input.code },
      select: { id: true },
    });

    if (existing) {
      throw new Error("A discount with that code already exists.");
    }

    await validateDiscountTargets(
      tx,
      input.scope,
      input.productIds,
      input.collectionIds,
    );

    const discount = await tx.discount.create({
      data: {
        code: input.code,
        description: input.description,
        type: input.type,
        scope: input.scope,
        customerEligibility: input.customerEligibility,
        value: input.value,
        minimumOrderAmount: input.minimumOrderAmount,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        maxRedemptions: input.maxRedemptions,
        maxRedemptionsPerCustomer: input.maxRedemptionsPerCustomer,
        automatic: input.automatic,
        priority: input.priority,
        isActive: input.isActive,
      },
    });

    await replaceDiscountTargets(
      tx,
      discount.id,
      input.scope,
      input.productIds,
      input.collectionIds,
    );
  });

  revalidatePath("/admin/discounts");
}

export async function updateDiscount(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const id = required(formData, "id");
  const input = discountFormInput(formData);

  await db.$transaction(async (tx) => {
    const current = await tx.discount.findUnique({
      where: { id },
    });

    if (!current) throw new Error("Discount not found.");

    if (
      input.maxRedemptions !== null &&
      input.maxRedemptions <
        current.redemptionCount + current.reservedRedemptions
    ) {
      throw new Error(
        "The redemption limit cannot be lower than successful plus currently reserved uses.",
      );
    }

    const codeOwner = await tx.discount.findUnique({
      where: { code: input.code },
      select: { id: true },
    });

    if (codeOwner && codeOwner.id !== id) {
      throw new Error("A discount with that code already exists.");
    }

    await validateDiscountTargets(
      tx,
      input.scope,
      input.productIds,
      input.collectionIds,
    );

    await tx.discount.update({
      where: { id },
      data: {
        code: input.code,
        description: input.description,
        type: input.type,
        scope: input.scope,
        customerEligibility: input.customerEligibility,
        value: input.value,
        minimumOrderAmount: input.minimumOrderAmount,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        maxRedemptions: input.maxRedemptions,
        maxRedemptionsPerCustomer: input.maxRedemptionsPerCustomer,
        automatic: input.automatic,
        priority: input.priority,
        isActive: input.isActive,
      },
    });

    await replaceDiscountTargets(
      tx,
      id,
      input.scope,
      input.productIds,
      input.collectionIds,
    );
  });

  revalidatePath("/admin/discounts");
}

export async function deleteDiscount(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const id = required(formData, "id");

  await db.$transaction(async (tx) => {
    const discount = await tx.discount.findUnique({
      where: { id },
      include: {
        _count: { select: { orders: true } },
      },
    });

    if (!discount) return;

    if (
      discount._count.orders > 0 ||
      discount.redemptionCount > 0 ||
      discount.reservedRedemptions > 0
    ) {
      throw new Error(
        "Discounts with order history or reserved uses cannot be deleted. Deactivate the promotion instead.",
      );
    }

    await tx.discount.delete({ where: { id } });
  });

  revalidatePath("/admin/discounts");
}

type DiscountFormInput = {
  code: string;
  description: string | null;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  scope: "ENTIRE_ORDER" | "PRODUCTS" | "COLLECTIONS";
  customerEligibility:
    | "ALL"
    | "NEW_CUSTOMERS"
    | "RETURNING_CUSTOMERS";
  value: number;
  minimumOrderAmount: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  maxRedemptions: number | null;
  maxRedemptionsPerCustomer: number | null;
  automatic: boolean;
  priority: number;
  isActive: boolean;
  productIds: string[];
  collectionIds: string[];
};

function discountFormInput(formData: FormData): DiscountFormInput {
  const code = required(formData, "code").trim().toUpperCase();

  if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code)) {
    throw new Error(
      "Discount code must be 3–32 characters using letters, numbers, hyphens, or underscores.",
    );
  }

  const type = enumValue(
    required(formData, "type"),
    ["PERCENTAGE", "FIXED_AMOUNT"] as const,
    "discount type",
  );
  const scope = enumValue(
    required(formData, "scope"),
    ["ENTIRE_ORDER", "PRODUCTS", "COLLECTIONS"] as const,
    "discount scope",
  );
  const customerEligibility = enumValue(
    required(formData, "customerEligibility"),
    ["ALL", "NEW_CUSTOMERS", "RETURNING_CUSTOMERS"] as const,
    "customer eligibility",
  );
  const value = money(formData, "value");
  const minimumOrderAmount = nullableMoney(
    formData,
    "minimumOrderAmount",
  );
  const startsAt = promotionDateValue(formData, "startsAt", false);
  const endsAt = promotionDateValue(formData, "endsAt", true);
  const maxRedemptions = nullableInteger(formData, "maxRedemptions");
  const maxRedemptionsPerCustomer = nullableInteger(
    formData,
    "maxRedemptionsPerCustomer",
  );
  const priority = integer(formData, "priority", 0);

  if (value <= 0) {
    throw new Error("Discount value must be greater than zero.");
  }

  if (type === "PERCENTAGE" && value > 100) {
    throw new Error("Percentage discounts cannot exceed 100%.");
  }

  if (minimumOrderAmount !== null && minimumOrderAmount < 0) {
    throw new Error("Minimum order amount cannot be negative.");
  }

  if (startsAt && endsAt && startsAt > endsAt) {
    throw new Error("Promotion start date must be before its end date.");
  }

  if (maxRedemptions !== null && maxRedemptions < 1) {
    throw new Error("Maximum redemptions must be at least 1.");
  }

  if (
    maxRedemptionsPerCustomer !== null &&
    maxRedemptionsPerCustomer < 1
  ) {
    throw new Error("Per-customer limit must be at least 1.");
  }

  if (priority < -1000 || priority > 1000) {
    throw new Error("Promotion priority must be between -1000 and 1000.");
  }

  const productIds = uniqueFormValues(formData, "productIds");
  const collectionIds = uniqueFormValues(formData, "collectionIds");

  if (scope === "PRODUCTS" && productIds.length === 0) {
    throw new Error("Select at least one product for a product promotion.");
  }

  if (scope === "COLLECTIONS" && collectionIds.length === 0) {
    throw new Error(
      "Select at least one collection for a collection promotion.",
    );
  }

  return {
    code,
    description: optional(formData, "description") || null,
    type,
    scope,
    customerEligibility,
    value,
    minimumOrderAmount,
    startsAt,
    endsAt,
    maxRedemptions,
    maxRedemptionsPerCustomer,
    automatic: formData.get("automatic") === "on",
    priority,
    isActive: formData.get("isActive") === "on",
    productIds,
    collectionIds,
  };
}

async function validateDiscountTargets(
  tx: Prisma.TransactionClient,
  scope: "ENTIRE_ORDER" | "PRODUCTS" | "COLLECTIONS",
  productIds: string[],
  collectionIds: string[],
) {
  if (scope === "PRODUCTS") {
    const count = await tx.product.count({
      where: { id: { in: productIds }, status: { not: "ARCHIVED" } },
    });

    if (count !== productIds.length) {
      throw new Error("One or more selected products are unavailable.");
    }
  }

  if (scope === "COLLECTIONS") {
    const count = await tx.collection.count({
      where: { id: { in: collectionIds } },
    });

    if (count !== collectionIds.length) {
      throw new Error("One or more selected collections are unavailable.");
    }
  }
}

async function replaceDiscountTargets(
  tx: Prisma.TransactionClient,
  discountId: string,
  scope: "ENTIRE_ORDER" | "PRODUCTS" | "COLLECTIONS",
  productIds: string[],
  collectionIds: string[],
) {
  await Promise.all([
    tx.discountProduct.deleteMany({ where: { discountId } }),
    tx.discountCollection.deleteMany({ where: { discountId } }),
  ]);

  if (scope === "PRODUCTS" && productIds.length > 0) {
    await tx.discountProduct.createMany({
      data: productIds.map((productId) => ({
        discountId,
        productId,
      })),
    });
  }

  if (scope === "COLLECTIONS" && collectionIds.length > 0) {
    await tx.discountCollection.createMany({
      data: collectionIds.map((collectionId) => ({
        discountId,
        collectionId,
      })),
    });
  }
}

function uniqueFormValues(formData: FormData, key: string) {
  return [
    ...new Set(
      formData
        .getAll(key)
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

function promotionDateValue(
  formData: FormData,
  key: string,
  endOfDay: boolean,
) {
  const value = optional(formData, key);
  if (!value) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${key} must be a valid date.`);
  }

  const suffix = endOfDay
    ? "T23:59:59.999+04:00"
    : "T00:00:00.000+04:00";
  const date = new Date(`${value}${suffix}`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${key} must be a valid date.`);
  }

  return date;
}

export async function refundOrder(formData: FormData) {
  const admin = await requireAdmin();
  const orderId = required(formData, "orderId");
  const amount = money(formData, "amount");
  const reason = required(formData, "reason");
  const note = optional(formData, "note");

  await createStripeRefund({
    orderId,
    amount,
    reason,
    note,
    initiatedByUserId: admin.id,
    cancelOrder: formData.get("cancelOrder") === "on",
    acknowledgeProductionLoss:
      formData.get("acknowledgeProductionLoss") === "on",
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export async function updateOrderDelivery(formData: FormData) {
  await requireAdmin();
  const orderId = required(formData, "orderId");
  const status = enumValue(
    required(formData, "deliveryStatus"),
    ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"] as const,
    "delivery status",
  );

  await updateDeliveryFulfillment({
    orderId,
    status,
    carrier: optional(formData, "carrier"),
    trackingNumber: optional(formData, "trackingNumber"),
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

export async function returnOrderItemStock(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const itemId = required(formData, "itemId");
  const quantity = integer(formData, "quantity");
  const note =
    optional(formData, "note") || "Customer return received into stock";

  if (quantity <= 0) {
    throw new Error("Return quantity must be greater than zero.");
  }

  const orderId = await db.$transaction(async (tx) => {
    const item = await tx.orderItem.findUnique({
      where: { id: itemId },
      include: {
        order: true,
        variant: true,
      },
    });

    if (!item) throw new Error("Order item not found.");
    if (item.order.fulfillmentStatus !== "DELIVERED") {
      throw new Error(
        "Finished stock can only be returned after the order is delivered.",
      );
    }
    if (
      !item.variant ||
      !item.variant.trackInventory ||
      !["READY_STOCK", "BOTH"].includes(item.variant.fulfillmentMode)
    ) {
      throw new Error(
        "This line is not eligible for finished-stock return.",
      );
    }

    const remaining = item.quantity - item.returnedQuantity;
    if (quantity > remaining) {
      throw new Error(
        `Return quantity exceeds the remaining returnable quantity of ${remaining}.`,
      );
    }

    await tx.productVariant.update({
      where: { id: item.variant.id },
      data: { stockOnHand: { increment: quantity } },
    });

    await tx.orderItem.update({
      where: { id: item.id },
      data: { returnedQuantity: { increment: quantity } },
    });

    await tx.inventoryMovement.create({
      data: {
        variantId: item.variant.id,
        orderId: item.orderId,
        type: "RETURN",
        quantity,
        note,
      },
    });

    return item.orderId;
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/inventory");
  revalidatePath("/admin");
  revalidateStorefront();
}

export async function updateProductionPlan(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const jobId = required(formData, "jobId");
  const priority = enumValue(
    required(formData, "priority"),
    ["LOW", "NORMAL", "HIGH", "URGENT"] as const,
    "production priority",
  );
  const assignedTo = optional(formData, "assignedTo") || null;
  const plannedMinutes = optional(formData, "plannedMinutes")
    ? integer(formData, "plannedMinutes")
    : null;
  const plannedStartAt = dateValue(formData, "plannedStartAt", false);
  const dueAt = dateValue(formData, "dueAt", true);
  const notes = optional(formData, "notes") || null;

  if (plannedMinutes !== null && plannedMinutes <= 0) {
    throw new Error("Planned minutes must be greater than zero.");
  }

  await db.productionJob.update({
    where: { id: jobId },
    data: {
      priority,
      assignedTo,
      plannedMinutes,
      plannedStartAt,
      dueAt,
      notes,
    },
  });

  revalidatePath("/admin/production");
}

export async function syncProductionQueue() {
  await requireAdmin();
  await syncEligibleProductionJobs();
  revalidatePath("/admin/production");
}

export async function createRawMaterial(formData: FormData) {
  await requireAdmin();
  const db = requireDb();

  const sku = required(formData, "sku").toUpperCase();
  const stockOnHand = decimal(formData, "stockOnHand", 0);
  const reorderLevel = decimal(formData, "reorderLevel", 0);

  if (stockOnHand < 0 || reorderLevel < 0) {
    throw new Error("Material quantities cannot be negative.");
  }

  await db.$transaction(async (tx) => {
    const material = await tx.rawMaterial.create({
      data: {
        sku,
        name: required(formData, "name"),
        category: required(formData, "category"),
        colorName: optional(formData, "colorName") || null,
        unit: enumValue(
          required(formData, "unit"),
          ["GRAM", "METER", "PIECE", "ROLL", "PACK"] as const,
          "material unit",
        ),
        stockOnHand,
        reorderLevel,
        unitCost: optional(formData, "unitCost")
          ? decimal(formData, "unitCost")
          : null,
        isActive: true,
      },
    });

    if (stockOnHand > 0) {
      await tx.rawMaterialMovement.create({
        data: {
          materialId: material.id,
          type: "OPENING",
          quantity: stockOnHand,
          note: "Opening raw-material stock",
        },
      });
    }
  });

  revalidatePath("/admin/materials");
}

export async function adjustRawMaterialStock(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const materialId = required(formData, "materialId");
  const delta = decimal(formData, "delta");
  const note = optional(formData, "note") || "Manual raw-material adjustment";

  if (delta === 0) throw new Error("Adjustment cannot be zero.");

  await db.$transaction(async (tx) => {
    const material = await tx.rawMaterial.findUnique({
      where: { id: materialId },
    });

    if (!material) throw new Error("Raw material not found.");

    const next = Number(material.stockOnHand) + delta;
    const reserved = Number(material.stockReserved);

    if (next < 0) {
      throw new Error("Raw-material stock cannot be negative.");
    }

    if (next < reserved) {
      throw new Error(
        "Raw-material stock cannot be reduced below the quantity already reserved.",
      );
    }

    await tx.rawMaterial.update({
      where: { id: materialId },
      data: { stockOnHand: next },
    });

    await tx.rawMaterialMovement.create({
      data: {
        materialId,
        type: "ADJUSTMENT",
        quantity: delta,
        note,
      },
    });
  });

  revalidatePath("/admin/materials");
}

export async function setVariantMaterial(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const variantId = required(formData, "variantId");
  const materialId = required(formData, "materialId");
  const productId = required(formData, "productId");
  const quantity = decimal(formData, "quantity");

  if (quantity <= 0) {
    throw new Error("BOM quantity must be greater than zero.");
  }

  await db.variantMaterial.upsert({
    where: {
      variantId_materialId: {
        variantId,
        materialId,
      },
    },
    update: { quantity },
    create: {
      variantId,
      materialId,
      quantity,
    },
  });

  revalidatePath(`/admin/products/${productId}/bom`);
}

export async function removeVariantMaterial(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const variantId = required(formData, "variantId");
  const materialId = required(formData, "materialId");
  const productId = required(formData, "productId");

  await db.variantMaterial.deleteMany({
    where: { variantId, materialId },
  });

  revalidatePath(`/admin/products/${productId}/bom`);
}

export async function finalizeCustomBouquetQuote(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const requestId = required(formData, "requestId");
  const finalPrice = money(formData, "finalPrice");
  const leadTimeMinDays = integer(formData, "leadTimeMinDays");
  const leadTimeMaxDays = integer(formData, "leadTimeMaxDays");

  if (finalPrice <= 0) {
    throw new Error("Final custom bouquet price must be greater than zero.");
  }

  if (
    leadTimeMinDays < 1 ||
    leadTimeMaxDays < leadTimeMinDays ||
    leadTimeMaxDays > 60
  ) {
    throw new Error("Enter a valid production lead-time range.");
  }

  const appUrl = process.env.APP_URL?.replace(/\/$/, "");

  if (!appUrl) {
    throw new Error("APP_URL is required to issue a custom bouquet quote.");
  }

  const paymentToken = randomBytes(32).toString("base64url");
  const now = new Date();
  const quoteExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const request = await db.$transaction(async (tx) => {
    const current = await tx.customBouquetRequest.findUnique({
      where: { id: requestId },
      include: {
        order: {
          select: {
            id: true,
            paymentStatus: true,
          },
        },
      },
    });

    if (!current) throw new Error("Custom bouquet request not found.");

    if (
      current.status !== "APPROVED" &&
      !(
        current.status === "AWAITING_PAYMENT" &&
        current.orderId === null
      )
    ) {
      throw new Error(
        "Only approved or expired unpaid custom bouquets can be quoted.",
      );
    }

    if (current.order?.paymentStatus === "PAID") {
      throw new Error("Paid custom bouquet quotes cannot be changed.");
    }

    const updated = await tx.customBouquetRequest.update({
      where: { id: requestId },
      data: {
        finalPrice,
        leadTimeMinDays,
        leadTimeMaxDays,
        quoteFinalizedAt: now,
        quoteExpiresAt,
        paymentToken,
        status: "AWAITING_PAYMENT",
      },
    });

    await tx.notificationOutbox.deleteMany({
      where: {
        customBouquetRequestId: updated.id,
        type: "CUSTOM_BOUQUET_QUOTE_READY",
        status: { in: ["PENDING", "FAILED"] },
      },
    });

    await tx.notificationOutbox.create({
      data: {
        customBouquetRequestId: updated.id,
        toEmail: updated.email,
        type: "CUSTOM_BOUQUET_QUOTE_READY",
        subject: `Your custom bouquet ${updated.referenceNumber} is ready`,
        payload: {
          referenceNumber: updated.referenceNumber,
          finalPrice,
          currency: "AED",
          leadTimeMinDays,
          leadTimeMaxDays,
          paymentUrl: `${appUrl}/custom-bouquets/pay/${paymentToken}`,
          quoteExpiresAt: quoteExpiresAt.toISOString(),
        },
      },
    });

    return updated;
  });

  await processNotificationOutbox(5).catch(() => undefined);

  revalidatePath("/admin/custom-bouquets");
  revalidatePath(`/admin/custom-bouquets/${request.id}`);
}

export async function updateCustomBouquetStatus(formData: FormData) {
  await requireAdmin();
  const db = requireDb();
  const requestId = required(formData, "requestId");
  const status = enumValue(
    required(formData, "status"),
    [
      "SUBMITTED",
      "REVIEWING",
      "APPROVED",
      "AWAITING_PAYMENT",
      "PAID",
      "IN_PRODUCTION",
      "READY",
      "COMPLETED",
      "DECLINED",
    ] as const,
    "custom bouquet status",
  );

  await db.$transaction(async (tx) => {
    const request = await tx.customBouquetRequest.findUnique({
      where: { id: requestId },
      include: {
        order: {
          select: {
            id: true,
            paymentStatus: true,
          },
        },
      },
    });

    if (!request) throw new Error("Custom bouquet request not found.");

    if (!isValidCustomBouquetTransition(request.status, status)) {
      throw new Error(
        `Invalid custom bouquet transition from ${request.status} to ${status}.`,
      );
    }

    if (status === "IN_PRODUCTION") {
      if (
        request.order?.paymentStatus !== "PAID" &&
        request.order?.paymentStatus !== "PARTIALLY_REFUNDED"
      ) {
        throw new Error(
          "Custom bouquet must be paid before production can begin.",
        );
      }

      await consumeCustomBouquetMaterialsTx(tx, requestId);
    }

    await tx.customBouquetRequest.update({
      where: { id: requestId },
      data: { status },
    });

    if (request.order) {
      const orderState =
        status === "IN_PRODUCTION"
          ? {
              status: "IN_PRODUCTION" as const,
              fulfillmentStatus: "IN_PRODUCTION" as const,
            }
          : status === "READY"
            ? {
                status: "READY" as const,
                fulfillmentStatus: "READY" as const,
              }
            : null;

      if (orderState) {
        await tx.order.update({
          where: { id: request.order.id },
          data: orderState,
        });

        await syncProductionJobFromOrderStatus(
          tx,
          request.order.id,
          orderState.status,
        );
      }
    }
  });

  revalidatePath("/admin/custom-bouquets");
  revalidatePath(`/admin/custom-bouquets/${requestId}`);
  revalidatePath("/admin/materials");
}

function decimal(formData: FormData, key: string, fallback?: number) {
  const value = optional(formData, key);

  if (!value && fallback !== undefined) return fallback;

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${key} must be a valid number.`);
  }

  return Math.round(parsed * 1000) / 1000;
}


function isValidCustomBouquetTransition(
  current: string,
  next: string,
) {
  if (current === next) return true;

  const transitions: Record<string, string[]> = {
    SUBMITTED: ["REVIEWING", "DECLINED"],
    REVIEWING: ["APPROVED", "DECLINED"],
    APPROVED: ["DECLINED"],
    AWAITING_PAYMENT: [],
    PAID: [],
    IN_PRODUCTION: [],
    READY: [],
    COMPLETED: [],
    DECLINED: [],
  };

  return transitions[current]?.includes(next) ?? false;
}
