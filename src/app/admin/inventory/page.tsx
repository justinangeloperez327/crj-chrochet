import Link from "next/link";
import { AlertTriangle, Boxes } from "lucide-react";

import { adjustStock } from "@/app/admin/actions";
import { DatabaseRequired } from "@/components/admin/database-required";
import { StatusBadge } from "@/components/admin/status-badge";
import { listAdminInventory } from "@/lib/data/admin-repository";

export const metadata = { title: "Inventory" };

export default async function AdminInventoryPage() {
  const data = await listAdminInventory();

  if (!data) return <DatabaseRequired />;

  const lowStock = data.variants.filter(
    (variant) =>
      variant.trackInventory &&
      (variant.fulfillmentMode === "READY_STOCK" ||
        variant.fulfillmentMode === "BOTH") &&
      variant.stockOnHand - variant.stockReserved <= variant.reorderLevel,
  );

  return (
    <div>
      <div>
        <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-pink uppercase">
          Stock control
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">
          Inventory
        </h1>
        <p className="mt-2 text-sm text-bloom-muted">
          Adjust finished stock and review the inventory audit trail.
        </p>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <Metric
          label="Active SKUs"
          value={data.variants.length}
          icon={<Boxes className="size-4" />}
        />
        <Metric
          label="Low-stock alerts"
          value={lowStock.length}
          icon={<AlertTriangle className="size-4" />}
          danger={lowStock.length > 0}
        />
        <Metric
          label="Reserved units"
          value={data.variants.reduce(
            (sum, variant) => sum + variant.stockReserved,
            0,
          )}
          icon={<Boxes className="size-4" />}
        />
      </div>

      <section className="mt-7 overflow-hidden border border-bloom-border bg-white">
        <div className="border-b border-bloom-border px-5 py-4">
          <h2 className="text-sm font-semibold">Stock by SKU</h2>
          <p className="mt-1 text-[11px] text-bloom-muted">
            Manual changes create ADJUSTMENT movements and cannot reduce stock below reserved quantity.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-xs">
            <thead className="border-b border-bloom-border bg-[#faf8fa] text-[10px] uppercase tracking-[0.08em] text-bloom-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">SKU</th>
                <th className="px-5 py-3 font-semibold">Product</th>
                <th className="px-5 py-3 font-semibold">Mode</th>
                <th className="px-5 py-3 text-right font-semibold">On hand</th>
                <th className="px-5 py-3 text-right font-semibold">Reserved</th>
                <th className="px-5 py-3 text-right font-semibold">Available</th>
                <th className="px-5 py-3 font-semibold">Adjustment</th>
              </tr>
            </thead>
            <tbody>
              {data.variants.map((variant) => {
                const available = variant.stockOnHand - variant.stockReserved;
                const low =
                  variant.trackInventory &&
                  (variant.fulfillmentMode === "READY_STOCK" ||
                    variant.fulfillmentMode === "BOTH") &&
                  available <= variant.reorderLevel;

                return (
                  <tr
                    key={variant.id}
                    className="border-b border-bloom-border align-top last:border-b-0"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold">{variant.sku}</p>
                      <p className="mt-1 text-[10px] text-bloom-muted">
                        {variant.name}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/products/${variant.product.id}`}
                        className="font-semibold hover:text-bloom-pink"
                      >
                        {variant.product.name}
                      </Link>
                      <div className="mt-2">
                        <StatusBadge value={variant.product.status} />
                      </div>
                    </td>
                    <td className="px-5 py-4 text-bloom-muted">
                      {variant.fulfillmentMode
                        .replaceAll("_", " ")
                        .toLowerCase()}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold">
                      {variant.stockOnHand}
                    </td>
                    <td className="px-5 py-4 text-right text-bloom-muted">
                      {variant.stockReserved}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span
                        className={
                          "font-semibold " +
                          (low ? "text-amber-600" : "text-bloom-plum")
                        }
                      >
                        {available}
                      </span>
                      {low ? (
                        <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-amber-600">
                          low stock
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      <form action={adjustStock} className="flex min-w-[270px] gap-2">
                        <input
                          type="hidden"
                          name="variantId"
                          value={variant.id}
                        />
                        <input
                          name="delta"
                          type="number"
                          required
                          placeholder="+ / -"
                          className="h-9 w-20 border border-bloom-border px-2 text-xs outline-none focus:border-bloom-violet"
                        />
                        <input
                          name="note"
                          placeholder="Reason"
                          className="h-9 min-w-0 flex-1 border border-bloom-border px-2 text-xs outline-none focus:border-bloom-violet"
                        />
                        <button
                          type="submit"
                          className="h-9 bg-bloom-plum px-3 text-[10px] font-semibold text-white"
                        >
                          Apply
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-7 overflow-hidden border border-bloom-border bg-white">
        <div className="border-b border-bloom-border px-5 py-4">
          <h2 className="text-sm font-semibold">Recent movements</h2>
          <p className="mt-1 text-[11px] text-bloom-muted">
            Opening stock, reservations, releases, sales, and adjustments.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[850px] w-full text-left text-xs">
            <thead className="border-b border-bloom-border bg-[#faf8fa] text-[10px] uppercase tracking-[0.08em] text-bloom-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">SKU</th>
                <th className="px-5 py-3 font-semibold">Reference</th>
                <th className="px-5 py-3 text-right font-semibold">Qty</th>
                <th className="px-5 py-3 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody>
              {data.movements.map((movement) => (
                <tr
                  key={movement.id}
                  className="border-b border-bloom-border last:border-b-0"
                >
                  <td className="px-5 py-4 text-bloom-muted">
                    {formatDateTime(movement.createdAt)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={movement.type} />
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold">{movement.variant.sku}</p>
                    <p className="mt-1 text-[10px] text-bloom-muted">
                      {movement.variant.product.name}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-bloom-muted">
                    {movement.order?.orderNumber ?? "—"}
                  </td>
                  <td
                    className={
                      "px-5 py-4 text-right font-semibold " +
                      (movement.quantity < 0
                        ? "text-red-600"
                        : "text-bloom-plum")
                    }
                  >
                    {movement.quantity > 0 ? "+" : ""}
                    {movement.quantity}
                  </td>
                  <td className="px-5 py-4 text-bloom-muted">
                    {movement.note ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  icon,
  danger = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="border border-bloom-border bg-white p-5">
      <div
        className={
          "flex size-9 items-center justify-center " +
          (danger
            ? "bg-red-50 text-red-600"
            : "bg-bloom-violet-soft text-bloom-violet")
        }
      >
        {icon}
      </div>
      <p className="mt-4 text-xs text-bloom-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
