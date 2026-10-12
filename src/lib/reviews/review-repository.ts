import { getDb, requireDb } from "@/lib/db";

export async function getProductReviewSummary(productId: string) {
  const db = getDb();
  if (!db) return { rating: 0, count: 0 };

  const result = await db.productReview.aggregate({
    where: { productId, status: "APPROVED" },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return {
    rating: result._avg.rating ?? 0,
    count: result._count.rating,
  };
}

export async function listApprovedProductReviewsBySlug(slug: string) {
  const db = getDb();
  if (!db) return [];

  return db.productReview.findMany({
    where: { product: { slug }, status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      verifiedPurchase: true,
      createdAt: true,
      user: {
        select: { name: true },
      },
    },
  });
}

export async function listAdminReviews() {
  const db = getDb();
  if (!db) return null;

  return db.productReview.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      product: { select: { name: true, slug: true } },
      user: { select: { name: true, email: true } },
      orderItem: {
        select: {
          order: { select: { orderNumber: true } },
        },
      },
    },
  });
}

export async function createVerifiedReview(input: {
  userId: string;
  orderItemId: string;
  rating: number;
  title?: string;
  body: string;
}) {
  const db = requireDb();

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new Error("Rating must be between 1 and 5.");
  }

  const body = input.body.trim();
  const title = input.title?.trim();

  if (body.length < 10 || body.length > 1200) {
    throw new Error("Review must be between 10 and 1,200 characters.");
  }

  if (title && title.length > 100) {
    throw new Error("Review title must be 100 characters or fewer.");
  }

  const orderItem = await db.orderItem.findFirst({
    where: {
      id: input.orderItemId,
      productId: { not: null },
      order: {
        customer: { userId: input.userId },
        paymentStatus: "PAID",
        status: "FULFILLED",
        fulfillmentStatus: "DELIVERED",
      },
    },
    select: {
      id: true,
      productId: true,
    },
  });

  if (!orderItem?.productId) {
    throw new Error("Only delivered purchases can be reviewed.");
  }

  return db.productReview.create({
    data: {
      productId: orderItem.productId,
      userId: input.userId,
      orderItemId: orderItem.id,
      rating: input.rating,
      title: title || null,
      body,
      status: "PENDING",
      verifiedPurchase: true,
    },
  });
}
