import Link from "next/link";
import { ArrowLeft, Flower2 } from "lucide-react";
import { notFound } from "next/navigation";

import {
  finalizeCustomBouquetQuote,
  updateCustomBouquetStatus,
} from "@/app/admin/actions";
import { DatabaseRequired } from "@/components/admin/database-required";
import { StatusBadge } from "@/components/admin/status-badge";
import { getAdminCustomBouquet } from "@/lib/data/admin-repository";

type Props = {
  params: Promise<{ id: string }>;
};

type CompositionItem = {
  flowerType: string;
  colorName: string;
  colorHex: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

type MaterialPlanItem = {
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  stockOnHand: number;
  sufficient: boolean;
};

export default async function AdminCustomBouquetPage({ params }: Props) {
  const { id } = await params;
  const request = await getAdminCustomBouquet(id);

  if (!request) {
    if (!process.env.DATABASE_URL) return <DatabaseRequired />;
    notFound();
  }

  const composition = jsonArray<CompositionItem>(request.composition);
  const materials = jsonArray<MaterialPlanItem>(request.materialPlan);

  return (
    <div>
      <Link
        href="/admin/custom-bouquets"
        className="inline-flex items-center gap-2 text-xs font-semibold text-bloom-muted hover:text-bloom-plum"
      >
        <ArrowLeft className="size-3.5" />
        Custom bouquets
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-pink uppercase">
            Custom request
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">
            {request.referenceNumber}
          </h1>
          <p className="mt-2 text-sm text-bloom-muted">
            {request.customerName} · {request.email}
          </p>
        </div>
        <StatusBadge value={request.status} />
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="border border-bloom-border bg-white p-5">
            <div className="flex items-center gap-2">
              <Flower2 className="size-4 text-bloom-pink" />
              <h2 className="text-sm font-semibold">Composition</h2>
            </div>
            <div className="mt-5 divide-y divide-bloom-border">
              {composition.map((item, index) => (
                <div
                  key={`${item.flowerType}-${item.colorName}-${index}`}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="size-5 rounded-full border border-black/5"
                      style={{ backgroundColor: item.colorHex }}
                    />
                    <div>
                      <p className="text-xs font-semibold">
                        {item.quantity} × {item.flowerType}
                      </p>
                      <p className="mt-1 text-[10px] text-bloom-muted">
                        {item.colorName}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold">AED {item.lineTotal}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-bloom-border pt-4 text-xs text-bloom-muted">
              Wrapping:{" "}
              <strong className="text-bloom-plum">{request.wrapping.name}</strong>
            </div>
          </section>

          <section className="border border-bloom-border bg-white p-5">
            <h2 className="text-sm font-semibold">Material plan</h2>
            <p className="mt-1 text-[11px] text-bloom-muted">
              Frozen when the customer submitted the design.
            </p>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-[650px] w-full text-left text-xs">
                <thead className="border-b border-bloom-border text-[10px] uppercase tracking-[0.08em] text-bloom-muted">
                  <tr>
                    <th className="py-3 font-semibold">Material</th>
                    <th className="py-3 font-semibold">Unit</th>
                    <th className="py-3 text-right font-semibold">Required</th>
                    <th className="py-3 text-right font-semibold">At quote</th>
                    <th className="py-3 text-right font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((item) => (
                    <tr key={item.sku} className="border-b border-bloom-border">
                      <td className="py-3">
                        <p className="font-semibold">{item.name}</p>
                        <p className="mt-1 font-mono text-[10px] text-bloom-muted">
                          {item.sku}
                        </p>
                      </td>
                      <td className="py-3 text-bloom-muted">
                        {item.unit.toLowerCase()}
                      </td>
                      <td className="py-3 text-right font-semibold">
                        {item.quantity}
                      </td>
                      <td className="py-3 text-right text-bloom-muted">
                        {item.stockOnHand}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={
                            "text-[10px] font-semibold " +
                            (item.sufficient ? "text-emerald-700" : "text-red-600")
                          }
                        >
                          {item.sufficient ? "Sufficient" : "Short"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <InfoCard label="Recipient" value={request.recipientName || "—"} />
            <InfoCard label="From" value={request.senderName || "—"} />
            <InfoCard label="Gift message" value={request.giftMessage || "—"} />
            <InfoCard label="Notes" value={request.notes || "—"} />
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
          <section className="border border-bloom-border bg-white p-5">
            <h2 className="text-sm font-semibold">Production status</h2>
            <p className="mt-2 text-[11px] leading-5 text-bloom-muted">
              Starting production consumes the frozen raw-material plan once.
            </p>

            <form action={updateCustomBouquetStatus} className="mt-5">
              <input type="hidden" name="requestId" value={request.id} />
              <select
                name="status"
                defaultValue={request.status}
                className="h-11 w-full border border-bloom-border bg-white px-3 text-sm outline-none focus:border-bloom-violet"
              >
                <option value="SUBMITTED">Submitted</option>
                <option value="REVIEWING">Reviewing</option>
                <option value="APPROVED">Approved</option>
                <option value="AWAITING_PAYMENT" disabled>
                  Awaiting payment
                </option>
                <option value="PAID" disabled>
                  Paid
                </option>
                <option value="IN_PRODUCTION">In production</option>
                <option value="READY">Ready</option>
                <option value="COMPLETED">Completed</option>
                <option value="DECLINED">Declined</option>
              </select>
              <button
                type="submit"
                className="mt-3 h-11 w-full bg-bloom-plum px-4 text-sm font-semibold text-white"
              >
                Update status
              </button>
            </form>

            <p className="mt-3 text-[10px] text-bloom-muted">
              Materials:{" "}
              {request.materialsConsumedAt
                ? `consumed ${formatDate(request.materialsConsumedAt)}`
                : "not consumed"}
            </p>
          </section>

          <section className="border border-bloom-border bg-white p-5">
            <h2 className="text-sm font-semibold">Commercial quote</h2>

            <div className="mt-4 space-y-3 text-xs">
              <Row
                label="Original estimate"
                value={`AED ${Number(request.estimatedTotal)}`}
              />
              <Row
                label="Final bouquet price"
                value={
                  request.finalPrice !== null
                    ? `AED ${Number(request.finalPrice)}`
                    : "Not finalized"
                }
              />
              <Row
                label="Lead time"
                value={
                  request.leadTimeMinDays !== null &&
                  request.leadTimeMaxDays !== null
                    ? `${request.leadTimeMinDays}–${request.leadTimeMaxDays} days`
                    : "Not finalized"
                }
              />
              <Row
                label="Payment"
                value={request.order?.paymentStatus ?? "Not started"}
              />
              {request.order ? (
                <Row
                  label="Order"
                  value={request.order.orderNumber}
                />
              ) : null}
            </div>

            {(request.status === "APPROVED" ||
              (request.status === "AWAITING_PAYMENT" &&
                !request.order)) ? (
              <form
                action={finalizeCustomBouquetQuote}
                className="mt-5 border-t border-bloom-border pt-5"
              >
                <input type="hidden" name="requestId" value={request.id} />

                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
                    Final bouquet price (AED)
                  </span>
                  <input
                    name="finalPrice"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    defaultValue={
                      request.finalPrice !== null
                        ? Number(request.finalPrice)
                        : Number(request.estimatedTotal)
                    }
                    className="mt-2 h-10 w-full border border-bloom-border px-3 text-xs outline-none focus:border-bloom-violet"
                  />
                </label>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
                      Lead min
                    </span>
                    <input
                      name="leadTimeMinDays"
                      type="number"
                      min="1"
                      max="60"
                      required
                      defaultValue={request.leadTimeMinDays ?? 3}
                      className="mt-2 h-10 w-full border border-bloom-border px-3 text-xs outline-none focus:border-bloom-violet"
                    />
                  </label>
                  <label>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
                      Lead max
                    </span>
                    <input
                      name="leadTimeMaxDays"
                      type="number"
                      min="1"
                      max="60"
                      required
                      defaultValue={request.leadTimeMaxDays ?? 5}
                      className="mt-2 h-10 w-full border border-bloom-border px-3 text-xs outline-none focus:border-bloom-violet"
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  className="mt-4 h-10 w-full bg-bloom-violet px-4 text-xs font-semibold text-white"
                >
                  {request.status === "AWAITING_PAYMENT"
                    ? "Reissue payment quote"
                    : "Finalize & send payment quote"}
                </button>

                <p className="mt-3 text-[10px] leading-4 text-bloom-muted">
                  The payment quote is valid for 7 days. Delivery is added later
                  from the customer&apos;s selected emirate.
                </p>
              </form>
            ) : null}

            {request.quoteExpiresAt ? (
              <p className="mt-4 border-t border-bloom-border pt-4 text-[10px] text-bloom-muted">
                Quote expires {formatDate(request.quoteExpiresAt)}
              </p>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-bloom-border bg-white p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
        {label}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-bloom-plum">
        {value}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-bloom-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function jsonArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
