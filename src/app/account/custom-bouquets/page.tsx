import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";
import { requireUser } from "@/lib/auth/guards";
import { listAccountCustomBouquets } from "@/lib/data/account-repository";

export const metadata = { title: "Custom Bouquets" };

export default async function AccountCustomBouquetsPage() {
  const user = await requireUser();
  const requests = await listAccountCustomBouquets(user.id);

  if (!requests) return null;

  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-pink uppercase">
        Made your way
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-bloom-plum">
        Custom bouquets
      </h1>
      <p className="mt-2 text-sm text-bloom-muted">
        Track bouquet designs submitted from your account.
      </p>

      <div className="mt-7 space-y-4">
        {requests.length > 0 ? (
          requests.map((request) => (
            <article
              key={request.id}
              className="border border-bloom-border bg-white p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-bloom-plum">
                    {request.referenceNumber}
                  </p>
                  <p className="mt-1 text-[11px] text-bloom-muted">
                    {request.totalStems} stems · {request.wrapping.name} ·{" "}
                    {formatDate(request.createdAt)}
                  </p>
                </div>
                <StatusBadge value={request.status} />
              </div>

              <div className="mt-5 flex items-end justify-between border-t border-bloom-border pt-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.08em] text-bloom-muted">
                    Estimate
                  </p>
                  <p className="mt-1 text-xl font-semibold text-bloom-plum">
                    AED {Number(request.estimatedTotal)}
                  </p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="border border-bloom-border bg-white px-6 py-12 text-center">
            <p className="text-sm text-bloom-muted">
              You have not submitted a custom bouquet yet.
            </p>
            <Link
              href="/build-a-bouquet"
              className="mt-5 inline-flex h-11 items-center bg-bloom-violet px-5 text-sm font-semibold text-white"
            >
              Build a bouquet
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}
