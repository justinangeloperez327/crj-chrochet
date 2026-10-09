import { randomUUID } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import { getCurrentSession } from "@/lib/auth/session";
import { requireDb } from "@/lib/db";

export type BouquetSelectionInput = {
  stemOptionId: string;
  quantity: number;
};

export type CreateBouquetRequestInput = {
  email: string;
  customerName: string;
  recipientName?: string;
  senderName?: string;
  giftMessage?: string;
  notes?: string;
  wrappingId: string;
  selections: BouquetSelectionInput[];
};

export class BouquetRequestError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "BouquetRequestError";
  }
}

export async function listBouquetBuilderOptions() {
  const db = requireDb();

  const [stems, wraps] = await Promise.all([
    db.bouquetStemOption.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { flowerType: "asc" }],
    }),
    db.bouquetWrapOption.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  return {
    stems: stems.map((stem) => ({
      id: stem.id,
      slug: stem.slug,
      flowerType: stem.flowerType,
      colorName: stem.colorName,
      colorHex: stem.colorHex,
      unitPrice: Number(stem.unitPrice),
    })),
    wraps: wraps.map((wrap) => ({
      id: wrap.id,
      slug: wrap.slug,
      name: wrap.name,
      description: wrap.description,
      price: Number(wrap.price),
    })),
  };
}

export async function quoteBouquet(
  selections: BouquetSelectionInput[],
  wrappingId: string,
) {
  const db = requireDb();

  return db.$transaction(async (tx) => {
    return calculateBouquet(tx, selections, wrappingId);
  });
}

export async function createBouquetRequest(
  input: CreateBouquetRequestInput,
) {
  validateInput(input);
  const db = requireDb();
  const session = await getCurrentSession();

  return db.$transaction(async (tx) => {
    const calculation = await calculateBouquet(
      tx,
      input.selections,
      input.wrappingId,
    );

    let customerId: string | null = null;

    if (session?.user.customer) {
      customerId = session.user.customer.id;
    } else {
      const customer = await tx.customer.findUnique({
        where: { email: input.email.trim().toLowerCase() },
        select: { id: true },
      });
      customerId = customer?.id ?? null;
    }

    const requestEmail =
      session?.user.email ?? input.email.trim().toLowerCase();

    const request = await tx.customBouquetRequest.create({
      data: {
        referenceNumber: createReferenceNumber(),
        customerId,
        email: requestEmail,
        customerName: input.customerName.trim(),
        recipientName: input.recipientName?.trim() || null,
        senderName: input.senderName?.trim() || null,
        giftMessage: input.giftMessage?.trim() || null,
        notes: input.notes?.trim() || null,
        wrappingId: input.wrappingId,
        composition: calculation.composition,
        materialPlan: calculation.materialPlan,
        totalStems: calculation.totalStems,
        estimatedSubtotal: calculation.subtotal,
        estimatedTotal: calculation.total,
      },
      include: {
        wrapping: true,
      },
    });

    return {
      id: request.id,
      referenceNumber: request.referenceNumber,
      totalStems: request.totalStems,
      estimatedSubtotal: Number(request.estimatedSubtotal),
      estimatedTotal: Number(request.estimatedTotal),
      status: request.status,
    };
  });
}

async function calculateBouquet(
  tx: Prisma.TransactionClient,
  selections: BouquetSelectionInput[],
  wrappingId: string,
) {
  const normalized = normalizeSelections(selections);

  if (normalized.length === 0) {
    throw new BouquetRequestError("Choose at least one flower.");
  }

  const totalStems = normalized.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  if (totalStems < 3) {
    throw new BouquetRequestError(
      "Custom bouquets require at least 3 stems.",
    );
  }

  if (totalStems > 30) {
    throw new BouquetRequestError(
      "Custom bouquets are limited to 30 stems online.",
    );
  }

  const [stems, wrap] = await Promise.all([
    tx.bouquetStemOption.findMany({
      where: {
        id: { in: normalized.map((item) => item.stemOptionId) },
        isActive: true,
      },
      include: {
        materials: {
          include: { material: true },
        },
      },
    }),
    tx.bouquetWrapOption.findFirst({
      where: { id: wrappingId, isActive: true },
      include: {
        materials: {
          include: { material: true },
        },
      },
    }),
  ]);

  if (stems.length !== normalized.length) {
    throw new BouquetRequestError(
      "One of the selected flowers is no longer available.",
    );
  }

  if (!wrap) {
    throw new BouquetRequestError(
      "The selected wrapping option is no longer available.",
    );
  }

  if (
    stems.some(
      (stem) =>
        stem.materials.length === 0 ||
        stem.materials.some((recipe) => !recipe.material.isActive),
    ) ||
    wrap.materials.length === 0 ||
    wrap.materials.some((recipe) => !recipe.material.isActive)
  ) {
    throw new BouquetRequestError(
      "One of the selected options is temporarily unavailable for production.",
      409,
    );
  }

  const quantities = new Map(
    normalized.map((item) => [item.stemOptionId, item.quantity]),
  );
  const materialTotals = new Map<
    string,
    {
      materialId: string;
      sku: string;
      name: string;
      unit: string;
      quantity: number;
      stockOnHand: number;
    }
  >();

  let subtotal = 0;

  const composition = stems.map((stem) => {
    const quantity = quantities.get(stem.id) ?? 0;
    const lineTotal = Number(stem.unitPrice) * quantity;
    subtotal += lineTotal;

    for (const recipe of stem.materials) {
      addMaterial(
        materialTotals,
        recipe.material,
        Number(recipe.quantity) * quantity,
      );
    }

    return {
      stemOptionId: stem.id,
      flowerType: stem.flowerType,
      colorName: stem.colorName,
      colorHex: stem.colorHex,
      unitPrice: Number(stem.unitPrice),
      quantity,
      lineTotal: roundMoney(lineTotal),
    };
  });

  for (const recipe of wrap.materials) {
    addMaterial(
      materialTotals,
      recipe.material,
      Number(recipe.quantity),
    );
  }

  const wrapPrice = Number(wrap.price);
  const total = roundMoney(subtotal + wrapPrice);

  return {
    composition,
    materialPlan: [...materialTotals.values()].map((item) => ({
      ...item,
      quantity: roundQuantity(item.quantity),
      sufficient: item.stockOnHand >= item.quantity,
    })),
    totalStems,
    subtotal: roundMoney(subtotal),
    wrap: {
      id: wrap.id,
      name: wrap.name,
      price: wrapPrice,
    },
    total,
  };
}

function addMaterial(
  totals: Map<
    string,
    {
      materialId: string;
      sku: string;
      name: string;
      unit: string;
      quantity: number;
      stockOnHand: number;
    }
  >,
  material: {
    id: string;
    sku: string;
    name: string;
    unit: string;
    stockOnHand: { toString(): string };
  },
  quantity: number,
) {
  const existing = totals.get(material.id);

  if (existing) {
    existing.quantity += quantity;
    return;
  }

  totals.set(material.id, {
    materialId: material.id,
    sku: material.sku,
    name: material.name,
    unit: material.unit,
    quantity,
    stockOnHand: Number(material.stockOnHand),
  });
}

function normalizeSelections(selections: BouquetSelectionInput[]) {
  if (!Array.isArray(selections)) return [];

  const merged = new Map<string, number>();

  for (const selection of selections) {
    const id = selection.stemOptionId?.trim();
    const quantity = Number(selection.quantity);

    if (!id || !Number.isInteger(quantity) || quantity < 1 || quantity > 30) {
      throw new BouquetRequestError("A flower quantity is invalid.");
    }

    merged.set(id, (merged.get(id) ?? 0) + quantity);
  }

  return [...merged].map(([stemOptionId, quantity]) => ({
    stemOptionId,
    quantity,
  }));
}

function validateInput(input: CreateBouquetRequestInput) {
  if (!input || typeof input !== "object") {
    throw new BouquetRequestError("Invalid bouquet request.");
  }

  if (
    !input.email?.trim() ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())
  ) {
    throw new BouquetRequestError("Enter a valid email address.");
  }

  if (
    !input.customerName?.trim() ||
    input.customerName.trim().length > 120
  ) {
    throw new BouquetRequestError("Enter your name.");
  }

  if (input.giftMessage && input.giftMessage.length > 240) {
    throw new BouquetRequestError(
      "Gift messages must be 240 characters or fewer.",
    );
  }

  if (input.notes && input.notes.length > 500) {
    throw new BouquetRequestError(
      "Custom notes must be 500 characters or fewer.",
    );
  }
}

function createReferenceNumber() {
  const date = new Date();
  const datePart = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");
  const suffix = randomUUID()
    .replaceAll("-", "")
    .slice(0, 6)
    .toUpperCase();

  return `CB-${datePart}-${suffix}`;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundQuantity(value: number) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}
