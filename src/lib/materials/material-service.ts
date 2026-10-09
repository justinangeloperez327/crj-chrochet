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
    if (Number(recipe.material.stockOnHand) < required) {
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

export async function consumeCustomBouquetMaterials(requestId: string) {
  const db = requireDb();

  return db.$transaction(async (tx) => {
    const request = await tx.customBouquetRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new Error("Custom bouquet request not found.");
    if (request.materialsConsumedAt) return request;

    const plan = parseMaterialPlan(request.materialPlan);

    for (const item of plan) {
      const material = await tx.rawMaterial.findUnique({
        where: { id: item.materialId },
      });

      if (!material) {
        throw new Error(`Raw material ${item.sku} no longer exists.`);
      }

      if (Number(material.stockOnHand) < item.quantity) {
        throw new Error(
          `Insufficient raw material ${item.sku} for this custom bouquet.`,
        );
      }
    }

    for (const item of plan) {
      await tx.rawMaterial.update({
        where: { id: item.materialId },
        data: { stockOnHand: { decrement: item.quantity } },
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
        materialsConsumedAt: new Date(),
        status:
          request.status === "APPROVED"
            ? "IN_PRODUCTION"
            : request.status,
      },
    });
  });
}

type MaterialPlanItem = {
  materialId: string;
  sku: string;
  quantity: number;
};

function parseMaterialPlan(value: Prisma.JsonValue): MaterialPlanItem[] {
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
