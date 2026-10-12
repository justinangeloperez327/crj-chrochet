import { BadgeCheck, Star } from "lucide-react";

type Review = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  verifiedPurchase: boolean;
  createdAt: Date;
  user: { name: string | null };
};

export function ProductReviews({
  rating,
  reviewCount,
  reviews,
}: {
  rating: number;
  reviewCount: number;
  reviews: Review[];
}) {
  return (
    <section className="border-t border-bloom-border bg-white">
      <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-bloom-violet">
              Customer reviews
            </p>
            {reviewCount > 0 ? (
              <>
                <p className="mt-3 font-display text-5xl font-semibold text-bloom-plum">
                  {rating.toFixed(1)}
                </p>
                <div className="mt-2 flex items-center gap-1 text-[#d29a32]">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={
                        "size-4 " +
                        (star <= Math.round(rating) ? "fill-current" : "")
                      }
                    />
                  ))}
                </div>
                <p className="mt-2 text-xs text-bloom-muted">
                  Based on {reviewCount} approved review{reviewCount === 1 ? "" : "s"}
                </p>
              </>
            ) : (
              <>
                <h2 className="mt-3 font-display text-3xl font-semibold text-bloom-plum">
                  No reviews yet.
                </h2>
                <p className="mt-3 text-sm leading-6 text-bloom-muted">
                  Verified customers can review a product after their order is delivered.
                </p>
              </>
            )}
          </div>

          <div className="space-y-4">
            {reviews.map((review) => (
              <article key={review.id} className="border border-bloom-border p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex gap-1 text-[#d29a32]" aria-label={`${review.rating} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={"size-3.5 " + (star <= review.rating ? "fill-current" : "text-bloom-border")}
                        />
                      ))}
                    </div>
                    {review.title ? (
                      <h3 className="mt-3 text-sm font-semibold text-bloom-plum">{review.title}</h3>
                    ) : null}
                  </div>
                  <time className="text-[10px] text-bloom-muted">
                    {new Intl.DateTimeFormat("en-AE", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }).format(review.createdAt)}
                  </time>
                </div>
                <p className="mt-3 text-sm leading-6 text-bloom-muted">{review.body}</p>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-semibold text-bloom-muted">
                  <span>{displayName(review.user.name)}</span>
                  {review.verifiedPurchase ? (
                    <span className="inline-flex items-center gap-1 text-bloom-success">
                      <BadgeCheck className="size-3.5" />
                      Verified purchase
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function displayName(name: string | null) {
  if (!name?.trim()) return "Verified customer";
  const first = name.trim().split(/\s+/)[0];
  return first.length > 1 ? `${first[0]}***` : "Customer";
}
