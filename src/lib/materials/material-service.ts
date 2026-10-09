import type { Prisma } from "@/generated/prisma/client";
import { requireDb } from "@/lib/db";

export async function consumeOrderItemMaterials(
  tx: Prisma.TransactionClient,
  orderItemId: string,
) {
  const item = await tx.orderItem.findUnique({
    where: { id: orderItemId },
    include: {
      variant: {
        include: {
          billOfMaterials: {
            include: { material: true },
          },
        },
      },
    },
  });

  if (!item || item.materialsConsumedAt || !item.variant) return false;

  if (item.variant.fulfillmentMode !== "MADE_TO_ORDER") {
    return false;
  }

  if (item.variant.billOfMaterials.length === 0) {
    return false;
  }

  const requirements = item.variant.billOfMaterials.map((recipe) => ({
    recipe,
    required: Number(recipe.quantity) * item.quantity,
  }));

  for (const { recipe, required } of requirements) {
    const available =
      Number(recipe.material.stockOnHand) -
      Number(recipe.material.stockReserved);

    if (available < required) {
      throw new Error(
        `Insufficient raw material ${recipe.material.sku} for ${item.productName}.`,
      );
    }
  }

  for (const { recipe, required } of requirements) {
    await tx.rawMaterial.update({
      where: { id: recipe.materialId },
      data: {
        stockOnHand: { decrement: required },
      },
    });

    await tx.rawMaterialMovement.create({
      data: {
        materialId: recipe.materialId,
        orderItemId: item.id,
        type: "CONSUMPTION",
        quantity: -required,
        note: `Consumed for order item ${item.productName} · ${item.sku}`,
      },
    });
  }

  await tx.orderItem.update({
    where: { id: item.id },
    data: { materialsConsumedAt: new Date() },
  });

  return true;
}

export async function reserveCustomBouquetMaterials(
  tx: Prisma.TransactionClient,
  requestId: string,
) {
  const request = await tx.customBouquetRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) throw new Error("Custom bouquet request not found.");
  if (request.materialsConsumedAt) {
    throw new Error("Custom bouquet materials were already consumed.");
  }
  if (request.materialsReservedAt) return request;

  const plan = parseMaterialPlan(request.materialPlan);

  if (plan.length === 0) {
    throw new Error("Custom bouquet has no material plan.");
  }

  const materials = await tx.rawMaterial.findMany({
    where: {
      id: { in: plan.map((item) => item.materialId) },
      isActive: true,
    },
  });
  const byId = new Map(materials.map((material) => [material.id, material]));

  for (const item of plan) {
    const material = byId.get(item.materialId);

    if (!material) {
      throw new Error(`Raw material ${item.sku} is unavailable.`);
    }

    const available =
      Number(material.stockOnHand) - Number(material.stockReserved);

    if (available < item.quantity) {
      throw new Error(
        `Insufficient raw material ${item.sku}. Available: ${available}, required: ${item.quantity}.`,
      );
    }
  }

  for (const item of plan) {
    await tx.rawMaterial.update({
      where: { id: item.materialId },
      data: {
        stockReserved: { increment: item.quantity },
      },
    });

    await tx.rawMaterialMovement.create({
      data: {
        materialId: item.materialId,
        customBouquetRequestId: request.id,
        type: "RESERVATION",
        quantity: item.quantity,
        note: `Reserved for custom bouquet ${request.referenceNumber}`,
      },
    });
  }

  return tx.customBouquetRequest.update({
    where: { id: request.id },
    data: { materialsReservedAt: new Date() },
  });
}

export async function releaseCustomBouquetMaterials(
  tx: Prisma.TransactionClient,
  requestId: string,
  note = "Custom bouquet reservation released",
) {
  const request = await tx.customBouquetRequest.findUnique({
    where: { id: requestId },
  });

  if (!request || !request.materialsReservedAt || request.materialsConsumedAt) {
    return false;
  }

  const movements = await tx.rawMaterialMovement.findMany({
    where: { customBouquetRequestId: request.id },
    select: {
      materialId: true,
      type: true,
      quantity: true,
    },
  });

  const outstanding = new Map<string, number>();

  for (const movement of movements) {
    const current = outstanding.get(movement.materialId) ?? 0;
    const quantity = Math.abs(Number(movement.quantity));

    if (movement.type === "RESERVATION") {
      outstanding.set(movement.materialId, current + quantity);
    }

    if (
      movement.type === "RELEASE" ||
      movement.type === "CONSUMPTION"
    ) {
      outstanding.set(movement.materialId, current - quantity);
    }
  }

  for (const [materialId, quantity] of outstanding) {
    if (quantity <= 0) continue;

    const material = await tx.rawMaterial.findUnique({
      where: { id: materialId },
      select: { stockReserved: true },
    });

    if (!material) continue;

    const releaseQuantity = Math.min(
      quantity,
      Number(material.stockReserved),
    );

    if (releaseQuantity <= 0) continue;

    await tx.rawMaterial.update({
      where: { id: materialId },
      data: {
        stockReserved: { decrement: releaseQuantity },
      },
    });

    await tx.rawMaterialMovement.create({
      data: {
        materialId,
        customBouquetRequestId: request.id,
        type: "RELEASE",
        quantity: releaseQuantity,
        note,
      },
    });
  }

  await tx.customBouquetRequest.update({
    where: { id: request.id },
    data: { materialsReservedAt: null },
  });

  return true;
}

export async function releaseCustomBouquetForOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  note: string,
) {
  const request = await tx.customBouquetRequest.findUnique({
    where: { orderId },
  });

  if (!request) return false;

  await releaseCustomBouquetMaterials(tx, request.id, note);

  await tx.customBouquetRequest.update({
    where: { id: request.id },
    data: {
      orderId: null,
    },
  });

  return true;
}

export async function consumeCustomBouquetMaterialsTx(
  tx: Prisma.TransactionClient,
  requestId: string,
) {
  const request = await tx.customBouquetRequest.findUnique({
    where: { id: requestId },
    include: {
      order: {
        select: {
          paymentStatus: true,
        },
      },
    },
  });

  if (!request) throw new Error("Custom bouquet request not found.");
  if (request.materialsConsumedAt) return request;

  if (
    request.order?.paymentStatus !== "PAID" &&
    request.order?.paymentStatus !== "PARTIALLY_REFUNDED"
  ) {
    throw new Error(
      "Custom bouquet must be paid before materials can be consumed.",
    );
  }

  if (!request.materialsReservedAt) {
    throw new Error(
      "Custom bouquet materials are not reserved for production.",
    );
  }

  const plan = parseMaterialPlan(request.materialPlan);

  for (const item of plan) {
    const material = await tx.rawMaterial.findUnique({
      where: { id: item.materialId },
    });

    if (!material) {
      throw new Error(`Raw material ${item.sku} no longer exists.`);
    }

    if (
      Number(material.stockOnHand) < item.quantity ||
      Number(material.stockReserved) < item.quantity
    ) {
      throw new Error(
        `Reserved raw material ${item.sku} is inconsistent with the custom bouquet plan.`,
      );
    }
  }

  for (const item of plan) {
    await tx.rawMaterial.update({
      where: { id: item.materialId },
      data: {
        stockOnHand: { decrement: item.quantity },
        stockReserved: { decrement: item.quantity },
      },
    });

    await tx.rawMaterialMovement.create({
      data: {
        materialId: item.materialId,
        customBouquetRequestId: request.id,
        type: "CONSUMPTION",
        quantity: -item.quantity,
        note: `Consumed for custom bouquet ${request.referenceNumber}`,
      },
    });
  }

  return tx.customBouquetRequest.update({
    where: { id: requestId },
    data: {
      materialsReservedAt: null,
      materialsConsumedAt: new Date(),
    },
  });
}

export async function consumeCustomBouquetMaterials(requestId: string) {
  const db = requireDb();

  return db.$transaction((tx) =>
    consumeCustomBouquetMaterialsTx(tx, requestId),
  );
}

type MaterialPlanItem = {
  materialId: string;
  sku: string;
  quantity: number;
};

export function parseMaterialPlan(
  value: Prisma.JsonValue,
): MaterialPlanItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      typeof item.materialId !== "string" ||
      typeof item.sku !== "string" ||
      typeof item.quantity !== "number" ||
      item.quantity <= 0
    ) {
      return [];
    }

    return [
      {
        materialId: item.materialId,
        sku: item.sku,
        quantity: item.quantity,
      },
    ];
  });
}
