import Link from "next/link";
import { BadgeCheck, MessageSquareText, Star } from "lucide-react";

import { DatabaseRequired } from "@/components/admin/database-required";
import { StatusBadge } from "@/components/admin/status-badge";
import { listAdminReviews } from "@/lib/reviews/review-repository";
import { moderateReview, returnReviewToPending } from "./actions";

export const metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  const reviews = await listAdminReviews();

  if (!reviews) {
    return <DatabaseRequired feature="review moderation" />;
  }

  const pending = reviews.filter((review) => review.status === "PENDING").length;
  const approved = reviews.filter((review) => review.status === "APPROVED").length;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-bloom-pink">
            Trust & quality
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">
            Product reviews
          </h1>
          <p className="mt-2 text-sm text-bloom-muted">
            Moderate verified-purchase reviews before they appear on the storefront.
          </p>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="border border-bloom-border bg-white px-3 py-2">
            {pending} pending
          </span>
          <span className="border border-bloom-border bg-white px-3 py-2">
            {approved} approved
          </span>
        </div>
      </div>

      <div className="mt-7 space-y-4">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <article key={review.id} className="border border-bloom-border bg-white p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={review.status} />
                    {review.verifiedPurchase ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-bloom-success">
                        <BadgeCheck className="size-3.5" />
                        Verified purchase
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex gap-1 text-[#d29a32]">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={"size-3.5 " + (star <= review.rating ? "fill-current" : "text-bloom-border")}
                      />
                    ))}
                  </div>
                  <Link
                    href={`/products/${review.product.slug}`}
                    className="mt-3 block text-sm font-semibold text-bloom-plum hover:text-bloom-pink"
                  >
                    {review.product.name}
                  </Link>
                  <p className="mt-1 text-[10px] text-bloom-muted">
                    {review.user.name || review.user.email} · {review.orderItem.order.orderNumber}
                  </p>
                </div>
                <time className="text-[10px] text-bloom-muted">
                  {formatDate(review.createdAt)}
                </time>
              </div>

              {review.title ? (
                <h2 className="mt-5 text-sm font-semibold text-bloom-plum">{review.title}</h2>
              ) : null}
              <p className="mt-2 max-w-4xl whitespace-pre-wrap text-sm leading-6 text-bloom-muted">
                {review.body}
              </p>

              <div className="mt-5 flex flex-wrap gap-2 border-t border-bloom-border pt-4">
                {review.status !== "APPROVED" ? (
                  <form action={moderateReview}>
                    <input type="hidden" name="reviewId" value={review.id} />
                    <input type="hidden" name="status" value="APPROVED" />
                    <button className="h-9 bg-bloom-success px-4 text-[10px] font-semibold text-white">
                      Approve
                    </button>
                  </form>
                ) : null}
                {review.status !== "REJECTED" ? (
                  <form action={moderateReview}>
                    <input type="hidden" name="reviewId" value={review.id} />
                    <input type="hidden" name="status" value="REJECTED" />
                    <button className="h-9 border border-red-200 px-4 text-[10px] font-semibold text-red-700">
                      Reject
                    </button>
                  </form>
                ) : null}
                {review.status !== "PENDING" ? (
                  <form action={returnReviewToPending}>
                    <input type="hidden" name="reviewId" value={review.id} />
                    <button className="h-9 border border-bloom-border px-4 text-[10px] font-semibold text-bloom-muted">
                      Return to pending
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <div className="border border-bloom-border bg-white px-6 py-14 text-center">
            <MessageSquareText className="mx-auto size-5 text-bloom-muted" />
            <p className="mt-3 text-sm font-semibold text-bloom-plum">No reviews yet</p>
            <p className="mt-1 text-xs text-bloom-muted">
              Delivered customers can submit reviews from their order history.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
