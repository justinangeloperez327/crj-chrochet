import { sameOriginForm } from "@/lib/auth/security";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { createVerifiedReview } from "@/lib/reviews/review-repository";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOriginForm(request)) return new Response("Forbidden", { status: 403 });
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Sign in to submit a review." }, { status: 401 });
  }

  let payload: {
    orderItemId?: string;
    rating?: number;
    title?: string;
    body?: string;
  };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid review request." }, { status: 400 });
  }

  if (!payload.orderItemId || typeof payload.rating !== "number" || !payload.body) {
    return NextResponse.json({ error: "Rating and review text are required." }, { status: 400 });
  }

  try {
    const review = await createVerifiedReview({
      userId: session.user.id,
      orderItemId: payload.orderItemId,
      rating: payload.rating,
      title: payload.title,
      body: payload.body,
    });

    revalidatePath("/account/orders");
    revalidatePath("/admin/reviews");

    return NextResponse.json(
      { review: { id: review.id, status: review.status } },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Review could not be submitted.";
    const duplicate =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002";

    return NextResponse.json(
      { error: duplicate ? "This purchase has already been reviewed." : message },
      { status: duplicate ? 409 : 400 },
    );
  }
}
