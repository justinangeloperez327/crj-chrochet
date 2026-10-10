import type { Prisma } from "@/generated/prisma/client";

const PAID_STATES = ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] as const;

export type DiscountLine = {
  productId: string;
  unitPrice: number;
  quantity: number;
};

export type ResolvedDiscount = {
  record: DiscountRecord | null;
  amount: number;
  eligibleSubtotal: number;
  automatic: boolean;
};

type DiscountRecord = Prisma.DiscountGetPayload<{
  include: {
    products: {
      select: { productId: true };
    };
    collections: {
      select: { collectionId: true };
    };
  };
}>;

export class DiscountValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiscountValidationError";
  }
}

export async function resolveDiscount(
  tx: Prisma.TransactionClient,
  input: {
    code?: string;
    lines: DiscountLine[];
    customerEmail?: string;
  },
): Promise<ResolvedDiscount> {
  const normalized = input.code?.trim().toUpperCase();

  if (normalized) {
    const discount = await tx.discount.findUnique({
      where: { code: normalized },
      include: {
        products: { select: { productId: true } },
        collections: { select: { collectionId: true } },
      },
    });

    if (!discount) {
      throw new DiscountValidationError("That discount code is not valid.");
    }

    const result = await evaluateDiscount(tx, discount, input, true);
    if (!result) {
      throw new DiscountValidationError("That discount code is not valid.");
    }
    return result;
  }

  const automatic = await tx.discount.findMany({
    where: {
      automatic: true,
      isActive: true,
    },
    include: {
      products: { select: { productId: true } },
      collections: { select: { collectionId: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 50,
  });

  let best: ResolvedDiscount | null = null;

  for (const discount of automatic) {
    const candidate = await evaluateDiscount(tx, discount, input, false);
    if (!candidate) continue;

    if (
      !best ||
      discount.priority > (best.record?.priority ?? 0) ||
      (discount.priority === (best.record?.priority ?? 0) &&
        candidate.amount > best.amount)
    ) {
      best = candidate;
    }
  }

  return (
    best ?? {
      record: null,
      amount: 0,
      eligibleSubtotal: 0,
      automatic: false,
    }
  );
}

export async function reserveDiscountForOrder(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    discountId: string;
    customerEmail: string;
  },
) {
  const discount = await tx.discount.findUnique({
    where: { id: input.discountId },
  });

  if (!discount) {
    throw new DiscountValidationError("The discount is no longer available.");
  }

  if (
    discount.maxRedemptions !== null &&
    discount.redemptionCount + discount.reservedRedemptions >=
      discount.maxRedemptions
  ) {
    throw new DiscountValidationError(
      "That discount code has reached its redemption limit.",
    );
  }

  if (discount.maxRedemptionsPerCustomer !== null) {
    const normalizedEmail = input.customerEmail.trim().toLowerCase();
    const [successful, reserved] = await Promise.all([
      tx.order.count({
        where: {
          discountId: discount.id,
          customerEmail: normalizedEmail,
          paymentStatus: { in: [...PAID_STATES] },
        },
      }),
      tx.order.count({
        where: {
          discountId: discount.id,
          customerEmail: normalizedEmail,
          discountReservationActive: true,
          id: { not: input.orderId },
        },
      }),
    ]);

    if (
      successful + reserved >=
      discount.maxRedemptionsPerCustomer
    ) {
      throw new DiscountValidationError(
        "This discount has reached its per-customer usage limit.",
      );
    }
  }

  await tx.discount.update({
    where: { id: discount.id },
    data: { reservedRedemptions: { increment: 1 } },
  });

  await tx.order.update({
    where: { id: input.orderId },
    data: { discountReservationActive: true },
  });
}

export async function consumeDiscountReservationForPaidOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      discountId: true,
      discountReservationActive: true,
      discountCodeSnapshot: true,
    },
  });

  if (!order?.discountId) return;

  if (order.discountReservationActive) {
    const claimed = await tx.order.updateMany({
      where: {
        id: orderId,
        discountReservationActive: true,
      },
      data: { discountReservationActive: false },
    });

    if (claimed.count === 0) return;

    const discount = await tx.discount.findUnique({
      where: { id: order.discountId },
      select: { reservedRedemptions: true },
    });

    await tx.discount.update({
      where: { id: order.discountId },
      data: {
        redemptionCount: { increment: 1 },
        ...(discount && discount.reservedRedemptions > 0
          ? { reservedRedemptions: { decrement: 1 } }
          : {}),
      },
    });

    return;
  }

  // Legacy compatibility for paid transitions created before Group 14.
  if (!order.discountCodeSnapshot) {
    await tx.discount.update({
      where: { id: order.discountId },
      data: { redemptionCount: { increment: 1 } },
    });
  }
}

export async function releaseDiscountReservationForOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      discountId: true,
      discountReservationActive: true,
    },
  });

  if (!order?.discountId || !order.discountReservationActive) return;

  const claimed = await tx.order.updateMany({
    where: {
      id: orderId,
      discountReservationActive: true,
    },
    data: { discountReservationActive: false },
  });

  if (claimed.count === 0) return;

  const discount = await tx.discount.findUnique({
    where: { id: order.discountId },
    select: { reservedRedemptions: true },
  });

  if (discount && discount.reservedRedemptions > 0) {
    await tx.discount.update({
      where: { id: order.discountId },
      data: { reservedRedemptions: { decrement: 1 } },
    });
  }
}

async function evaluateDiscount(
  tx: Prisma.TransactionClient,
  discount: DiscountRecord,
  input: {
    lines: DiscountLine[];
    customerEmail?: string;
  },
  strict: boolean,
): Promise<ResolvedDiscount | null> {
  const fail = (message: string) => {
    if (strict) throw new DiscountValidationError(message);
    return null;
  };

  if (!discount.isActive) {
    return fail("That discount code is inactive.");
  }

  const now = new Date();

  if (discount.startsAt && discount.startsAt > now) {
    return fail("That discount code is not active yet.");
  }

  if (discount.endsAt && discount.endsAt < now) {
    return fail("That discount code has expired.");
  }

  if (
    discount.maxRedemptions !== null &&
    discount.redemptionCount + discount.reservedRedemptions >=
      discount.maxRedemptions
  ) {
    return fail("That discount code has reached its redemption limit.");
  }

  const subtotal = roundMoney(
    input.lines.reduce(
      (sum, line) => sum + line.unitPrice * line.quantity,
      0,
    ),
  );

  const minimum =
    discount.minimumOrderAmount !== null
      ? Number(discount.minimumOrderAmount)
      : 0;

  if (subtotal < minimum) {
    return fail(
      `A minimum order of AED ${money(minimum)} is required for this discount.`,
    );
  }

  const normalizedEmail = input.customerEmail?.trim().toLowerCase();
  const needsCustomer =
    discount.customerEligibility !== "ALL" ||
    discount.maxRedemptionsPerCustomer !== null;

  if (needsCustomer && !normalizedEmail) {
    return fail("Enter your email before applying this discount.");
  }

  if (normalizedEmail) {
    const paidOrders = await tx.order.count({
      where: {
        customerEmail: normalizedEmail,
        paymentStatus: { in: [...PAID_STATES] },
      },
    });

    if (
      discount.customerEligibility === "NEW_CUSTOMERS" &&
      paidOrders > 0
    ) {
      return fail("This discount is for first-time customers only.");
    }

    if (
      discount.customerEligibility === "RETURNING_CUSTOMERS" &&
      paidOrders === 0
    ) {
      return fail("This discount is for returning customers only.");
    }

    if (discount.maxRedemptionsPerCustomer !== null) {
      const [successful, reserved] = await Promise.all([
        tx.order.count({
          where: {
            discountId: discount.id,
            customerEmail: normalizedEmail,
            paymentStatus: { in: [...PAID_STATES] },
          },
        }),
        tx.order.count({
          where: {
            discountId: discount.id,
            customerEmail: normalizedEmail,
            discountReservationActive: true,
          },
        }),
      ]);

      if (
        successful + reserved >=
        discount.maxRedemptionsPerCustomer
      ) {
        return fail(
          "This discount has reached its per-customer usage limit.",
        );
      }
    }
  }

  const eligibleProductIds = await resolveEligibleProductIds(
    tx,
    discount,
    input.lines,
  );

  const eligibleSubtotal = roundMoney(
    input.lines.reduce((sum, line) => {
      if (!eligibleProductIds.has(line.productId)) return sum;
      return sum + line.unitPrice * line.quantity;
    }, 0),
  );

  if (eligibleSubtotal <= 0) {
    return fail("This discount does not apply to the items in your basket.");
  }

  const value = Number(discount.value);
  const amount =
    discount.type === "PERCENTAGE"
      ? Math.min(
          eligibleSubtotal,
          eligibleSubtotal * (value / 100),
        )
      : Math.min(eligibleSubtotal, value);

  if (amount <= 0) {
    return fail("That discount code does not produce a valid discount.");
  }

  return {
    record: discount,
    amount: roundMoney(amount),
    eligibleSubtotal,
    automatic: discount.automatic,
  };
}

async function resolveEligibleProductIds(
  tx: Prisma.TransactionClient,
  discount: DiscountRecord,
  lines: DiscountLine[],
) {
  const productIds = [...new Set(lines.map((line) => line.productId))];

  if (discount.scope === "ENTIRE_ORDER") {
    return new Set(productIds);
  }

  if (discount.scope === "PRODUCTS") {
    if (discount.products.length === 0) return new Set<string>();

    const allowed = new Set(
      discount.products.map((rule) => rule.productId),
    );
    return new Set(productIds.filter((id) => allowed.has(id)));
  }

  if (discount.collections.length === 0) return new Set<string>();

  const membership = await tx.collectionProduct.findMany({
    where: {
      collectionId: {
        in: discount.collections.map((rule) => rule.collectionId),
      },
      productId: { in: productIds },
      collection: { isActive: true },
    },
    select: { productId: true },
  });

  return new Set(membership.map((item) => item.productId));
}

function money(value: number) {
  return value.toLocaleString("en-AE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
