"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/guards";
import { requireDb } from "@/lib/db";

export async function moderateReview(formData: FormData) {
  await requireAdmin();
  const db = requireDb();

  const reviewId = String(formData.get("reviewId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();

  if (!reviewId || !["APPROVED", "REJECTED"].includes(status)) {
    throw new Error("Invalid review moderation request.");
  }

  const review = await db.productReview.update({
    where: { id: reviewId },
    data: {
      status: status as "APPROVED" | "REJECTED",
      moderatedAt: new Date(),
    },
    select: {
      product: { select: { slug: true } },
    },
  });

  revalidatePath("/admin/reviews");
  revalidatePath("/shop");
  revalidatePath("/");
  revalidatePath("/collections");
  revalidatePath("/collections/[slug]", "page");
  revalidatePath(`/products/${review.product.slug}`);
}

export async function returnReviewToPending(formData: FormData) {
  await requireAdmin();
  const db = requireDb();

  const reviewId = String(formData.get("reviewId") ?? "").trim();
  if (!reviewId) throw new Error("Review is required.");

  const review = await db.productReview.update({
    where: { id: reviewId },
    data: { status: "PENDING", moderatedAt: null },
    select: {
      product: { select: { slug: true } },
    },
  });

  revalidatePath("/admin/reviews");
  revalidatePath("/shop");
  revalidatePath("/");
  revalidatePath("/collections");
  revalidatePath("/collections/[slug]", "page");
  revalidatePath(`/products/${review.product.slug}`);
}
