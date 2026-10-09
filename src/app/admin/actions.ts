"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/auth/guards";
import { requireDb } from "@/lib/db";
import {
  consumeCustomBouquetMaterials,
  consumeOrderItemMaterials,
} from "@/lib/materials/material-service";

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
          select: { id: true },
        },
      },
    });

    if (!order) throw new Error("Order not found.");

    if (order.status === "CANCELLED" && requestedStatus !== "CANCELLED") {
      throw new Error("Cancelled orders cannot be reopened.");
    }

    if (order.status === "FULFILLED" && requestedStatus !== "FULFILLED") {
      throw new Error("Fulfilled orders cannot be moved backwards.");
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
      paymentStatus !== "PAID"
    ) {
      throw new Error(
        "An order must be paid before production or fulfillment can begin.",
      );
    }

    const outstandingReservations = getOutstandingReservations(
      order.inventoryMovement,
    );

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
    }

    if (
      ["IN_PRODUCTION", "QUALITY_CHECK", "READY", "FULFILLED"].includes(
        status,
      )
    ) {
      for (const item of order.items) {
        await consumeOrderItemMaterials(tx, item.id);
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

    if (becomingPaid && order.discountId) {
      await tx.discount.update({
        where: { id: order.discountId },
        data: { redemptionCount: { increment: 1 } },
      });
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
  revalidatePath("/admin/products");
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

    if (next < 0) {
      throw new Error("Raw-material stock cannot be negative.");
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
      "IN_PRODUCTION",
      "READY",
      "COMPLETED",
      "DECLINED",
    ] as const,
    "custom bouquet status",
  );

  const request = await db.customBouquetRequest.findUnique({
    where: { id: requestId },
    select: {
      status: true,
      materialsConsumedAt: true,
    },
  });

  if (!request) throw new Error("Custom bouquet request not found.");

  if (!isValidCustomBouquetTransition(request.status, status)) {
    throw new Error(
      `Invalid custom bouquet transition from ${request.status} to ${status}.`,
    );
  }

  if (
    ["IN_PRODUCTION", "READY", "COMPLETED"].includes(status) &&
    !request.materialsConsumedAt
  ) {
    await consumeCustomBouquetMaterials(requestId);
  }

  await db.customBouquetRequest.update({
    where: { id: requestId },
    data: { status },
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
    APPROVED: ["IN_PRODUCTION", "DECLINED"],
    IN_PRODUCTION: ["READY"],
    READY: ["COMPLETED"],
    COMPLETED: [],
    DECLINED: [],
  };

  return transitions[current]?.includes(next) ?? false;
}
