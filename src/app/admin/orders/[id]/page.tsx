import Link from "next/link";
import { ArrowLeft, Gift, MapPin, PackageCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { updateOrderWorkflow } from "@/app/admin/actions";
import { DatabaseRequired } from "@/components/admin/database-required";
import { StatusBadge } from "@/components/admin/status-badge";
import { getAdminOrder } from "@/lib/data/admin-repository";

type OrderPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderPage({ params }: OrderPageProps) {
  const { id } = await params;
  const order = await getAdminOrder(id);

  if (!order) {
    if (!process.env.DATABASE_URL) return <DatabaseRequired />;
    notFound();
  }

  return (
    <div>
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-2 text-xs font-semibold text-bloom-muted hover:text-bloom-plum"
      >
        <ArrowLeft className="size-3.5" />
        Orders
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-pink uppercase">
            Order
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">
            {order.orderNumber}
          </h1>
          <p className="mt-2 text-sm text-bloom-muted">
            Created {formatDateTime(order.createdAt)} · {order.items.length} line
            {order.items.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusBadge value={order.status} />
          <StatusBadge value={order.paymentStatus} />
          <StatusBadge value={order.fulfillmentStatus} />
        </div>
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="overflow-hidden border border-bloom-border bg-white">
            <div className="border-b border-bloom-border px-5 py-4">
              <h2 className="text-sm font-semibold">Items</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-left text-xs">
                <thead className="border-b border-bloom-border bg-[#faf8fa] text-[10px] uppercase tracking-[0.08em] text-bloom-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Product</th>
                    <th className="px-5 py-3 font-semibold">SKU</th>
                    <th className="px-5 py-3 text-right font-semibold">Unit price</th>
                    <th className="px-5 py-3 text-right font-semibold">Qty</th>
                    <th className="px-5 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-bloom-border last:border-b-0"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold">{item.productName}</p>
                        <p className="mt-1 text-[10px] text-bloom-muted">
                          {item.variantName}
                        </p>
                      </td>
                      <td className="px-5 py-4 font-mono text-[10px] text-bloom-muted">
                        {item.sku}
                      </td>
                      <td className="px-5 py-4 text-right">
                        AED {money(Number(item.unitPrice))}
                      </td>
                      <td className="px-5 py-4 text-right">{item.quantity}</td>
                      <td className="px-5 py-4 text-right font-semibold">
                        AED {money(Number(item.lineTotal))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <div className="border border-bloom-border bg-white p-5">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-bloom-violet" />
                <h2 className="text-sm font-semibold">Delivery</h2>
              </div>

              {order.shippingAddress ? (
                <div className="mt-4 text-xs leading-6 text-bloom-muted">
                  <p className="font-semibold text-bloom-plum">
                    {order.shippingAddress.recipient}
                  </p>
                  <p>{order.shippingAddress.addressLine1}</p>
                  {order.shippingAddress.addressLine2 ? (
                    <p>{order.shippingAddress.addressLine2}</p>
                  ) : null}
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.emirate}
                  </p>
                  <p>{order.shippingAddress.countryCode}</p>
                  {order.shippingAddress.phone ? (
                    <p className="mt-2">{order.shippingAddress.phone}</p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-xs text-bloom-muted">
                  No delivery address snapshot.
                </p>
              )}
            </div>

            <div className="border border-bloom-border bg-white p-5">
              <div className="flex items-center gap-2">
                <Gift className="size-4 text-bloom-pink" />
                <h2 className="text-sm font-semibold">Customer & notes</h2>
              </div>

              <div className="mt-4 text-xs leading-6 text-bloom-muted">
                <p className="font-semibold text-bloom-plum">
                  {order.customer
                    ? `${order.customer.firstName ?? ""} ${order.customer.lastName ?? ""}`.trim() ||
                      order.customerEmail
                    : order.customerEmail}
                </p>
                <p>{order.customerEmail}</p>
                {order.customerPhone ? <p>{order.customerPhone}</p> : null}

                {order.isGift ? (
                  <div className="mt-4 border-t border-bloom-border pt-4">
                    <p className="font-semibold text-bloom-pink">Gift order</p>
                    <p className="mt-1">
                      {order.giftMessage || "No gift message provided."}
                    </p>
                  </div>
                ) : null}

                {order.orderNote ? (
                  <div className="mt-4 border-t border-bloom-border pt-4">
                    <p className="font-semibold text-bloom-plum">Order note</p>
                    <p className="mt-1">{order.orderNote}</p>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="overflow-hidden border border-bloom-border bg-white">
            <div className="border-b border-bloom-border px-5 py-4">
              <h2 className="text-sm font-semibold">Inventory movements</h2>
              <p className="mt-1 text-[11px] text-bloom-muted">
                Reservation, release, and sale movements tied to this order.
              </p>
            </div>

            {order.inventoryMovement.length > 0 ? (
              <div className="divide-y divide-bloom-border">
                {order.inventoryMovement.map((movement) => (
                  <div
                    key={movement.id}
                    className="grid gap-2 px-5 py-4 text-xs sm:grid-cols-[140px_1fr_90px]"
                  >
                    <div>
                      <StatusBadge value={movement.type} />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {movement.variant.sku} · {movement.variant.name}
                      </p>
                      <p className="mt-1 text-[10px] text-bloom-muted">
                        {movement.note ?? "—"} · {formatDateTime(movement.createdAt)}
                      </p>
                    </div>
                    <p className="text-right font-semibold">
                      {movement.quantity > 0 ? "+" : ""}
                      {movement.quantity}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 py-8 text-center text-xs text-bloom-muted">
                No inventory movements for this order.
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
          <section className="border border-bloom-border bg-white p-5">
            <div className="flex items-center gap-2">
              <PackageCheck className="size-4 text-bloom-violet" />
              <h2 className="text-sm font-semibold">Workflow</h2>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-bloom-muted">
              Mark payment separately from production. Fulfillment consumes reserved
              ready stock; cancellation releases outstanding reservations.
            </p>

            <form action={updateOrderWorkflow} className="mt-5 space-y-4">
              <input type="hidden" name="orderId" value={order.id} />

              <label className="block">
                <span className="text-xs font-semibold">Order status</span>
                <select
                  name="status"
                  defaultValue={order.status}
                  className="mt-2 h-11 w-full border border-bloom-border bg-white px-3 text-sm outline-none focus:border-bloom-violet"
                >
                  <option value="PENDING_PAYMENT">Pending payment</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="IN_PRODUCTION">In production</option>
                  <option value="QUALITY_CHECK">Quality check</option>
                  <option value="READY">Ready</option>
                  <option value="FULFILLED">Fulfilled</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold">Payment status</span>
                <select
                  name="paymentStatus"
                  defaultValue={order.paymentStatus}
                  className="mt-2 h-11 w-full border border-bloom-border bg-white px-3 text-sm outline-none focus:border-bloom-violet"
                >
                  <option value="PENDING">Pending</option>
                  <option value="AUTHORIZED">Authorized</option>
                  <option value="PAID">Paid</option>
                  <option value="FAILED">Failed</option>
                  <option value="REFUNDED">Refunded</option>
                  <option value="PARTIALLY_REFUNDED">Partially refunded</option>
                </select>
              </label>

              <button
                type="submit"
                className="h-11 w-full bg-bloom-plum px-4 text-sm font-semibold text-white"
              >
                Update workflow
              </button>
            </form>
          </section>

          <section className="border border-bloom-border bg-white p-5">
            <h2 className="text-sm font-semibold">Order totals</h2>
            <div className="mt-4 space-y-3 text-xs">
              <Row label="Subtotal" value={`AED ${money(Number(order.subtotal))}`} />
              <Row
                label="Discount"
                value={`− AED ${money(Number(order.discountAmount))}`}
              />
              <Row
                label="Delivery"
                value={`AED ${money(Number(order.deliveryAmount))}`}
              />
              {order.discount ? (
                <Row label="Code" value={order.discount.code} />
              ) : null}
              <div className="flex items-end justify-between border-t border-bloom-border pt-4">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-semibold">
                  {order.currency} {money(Number(order.total))}
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-bloom-muted">{label}</span>
      <span className="font-semibold text-bloom-plum">{value}</span>
    </div>
  );
}

function money(value: number) {
  return value.toLocaleString("en-AE", {
    maximumFractionDigits: 2,
  });
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
