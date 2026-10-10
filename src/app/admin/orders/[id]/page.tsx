import Link from "next/link";
import {
  ArrowLeft,
  Gift,
  Hammer,
  MapPin,
  PackageCheck,
  RotateCcw,
  Truck,
} from "lucide-react";
import { notFound } from "next/navigation";

import {
  refundOrder,
  returnOrderItemStock,
  updateOrderDelivery,
  updateOrderWorkflow,
} from "@/app/admin/actions";
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

  const total = Number(order.total);
  const refunded = Number(order.refundedAmount);
  const remainingRefundable = Math.max(0, total - refunded);
  const canRefund =
    ["PAID", "PARTIALLY_REFUNDED"].includes(order.paymentStatus) &&
    remainingRefundable > 0;
  const canCancelWithRefund = ![
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "FULFILLED",
  ].includes(order.status);
  const productionStarted = [
    "IN_PRODUCTION",
    "QUALITY_CHECK",
    "READY",
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "FULFILLED",
  ].includes(order.status);
  const workflowLocked = [
    "SHIPPED",
    "OUT_FOR_DELIVERY",
    "FULFILLED",
    "CANCELLED",
  ].includes(order.status);
  const deliveryActive = ["READY", "SHIPPED", "OUT_FOR_DELIVERY"].includes(
    order.fulfillmentStatus,
  );

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
          <div className="mt-2 flex flex-wrap gap-3">
            {order.customBouquetRequest ? (
              <Link
                href={`/admin/custom-bouquets/${order.customBouquetRequest.id}`}
                className="inline-flex text-xs font-semibold text-bloom-violet hover:text-bloom-pink"
              >
                Custom bouquet {order.customBouquetRequest.referenceNumber}
              </Link>
            ) : null}
            {order.productionJob ? (
              <Link
                href="/admin/production"
                className="inline-flex text-xs font-semibold text-bloom-pink hover:text-bloom-violet"
              >
                Production planner
              </Link>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <StatusBadge value={order.status} />
          <StatusBadge value={order.paymentStatus} />
          <StatusBadge value={order.fulfillmentStatus} />
        </div>
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="overflow-hidden border border-bloom-border bg-white">
            <div className="border-b border-bloom-border px-5 py-4">
              <h2 className="text-sm font-semibold">Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full text-left text-xs">
                <thead className="border-b border-bloom-border bg-[#faf8fa] text-[10px] uppercase tracking-[0.08em] text-bloom-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Product</th>
                    <th className="px-5 py-3 font-semibold">SKU</th>
                    <th className="px-5 py-3 text-right font-semibold">Qty</th>
                    <th className="px-5 py-3 text-right font-semibold">From stock</th>
                    <th className="px-5 py-3 text-right font-semibold">Produce</th>
                    <th className="px-5 py-3 text-right font-semibold">Returned</th>
                    <th className="px-5 py-3 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b border-bloom-border last:border-b-0">
                      <td className="px-5 py-4">
                        <p className="font-semibold">{item.productName}</p>
                        <p className="mt-1 text-[10px] text-bloom-muted">{item.variantName}</p>
                      </td>
                      <td className="px-5 py-4 font-mono text-[10px] text-bloom-muted">{item.sku}</td>
                      <td className="px-5 py-4 text-right">{item.quantity}</td>
                      <td className="px-5 py-4 text-right">{item.reservedStockQuantity}</td>
                      <td className="px-5 py-4 text-right">{item.productionQuantity}</td>
                      <td className="px-5 py-4 text-right">{item.returnedQuantity}</td>
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
            <InfoBox
              icon={<MapPin className="size-4 text-bloom-violet" />}
              title="Delivery"
            >
              {order.shippingAddress ? (
                <div className="text-xs leading-6 text-bloom-muted">
                  <p className="font-semibold text-bloom-plum">{order.shippingAddress.recipient}</p>
                  <p>{order.shippingAddress.addressLine1}</p>
                  {order.shippingAddress.addressLine2 ? <p>{order.shippingAddress.addressLine2}</p> : null}
                  <p>{order.shippingAddress.city}, {order.shippingAddress.emirate}</p>
                  {order.shippingAddress.phone ? <p className="mt-2">{order.shippingAddress.phone}</p> : null}
                  {order.carrier || order.trackingNumber ? (
                    <div className="mt-3 border-t border-bloom-border pt-3">
                      {order.carrier ? <p>Carrier: {order.carrier}</p> : null}
                      {order.trackingNumber ? <p>Tracking: {order.trackingNumber}</p> : null}
                    </div>
                  ) : null}
                </div>
              ) : <p className="text-xs text-bloom-muted">No delivery address snapshot.</p>}
            </InfoBox>

            <InfoBox
              icon={<Gift className="size-4 text-bloom-pink" />}
              title="Customer & notes"
            >
              <div className="text-xs leading-6 text-bloom-muted">
                <p className="font-semibold text-bloom-plum">{order.customerEmail}</p>
                {order.customerPhone ? <p>{order.customerPhone}</p> : null}
                {order.giftMessage ? <p className="mt-3">{order.giftMessage}</p> : null}
                {order.orderNote ? <p className="mt-3">{order.orderNote}</p> : null}
              </div>
            </InfoBox>
          </section>

          <section className="border border-bloom-border bg-white">
            <div className="border-b border-bloom-border px-5 py-4">
              <h2 className="text-sm font-semibold">Refund history</h2>
            </div>
            {order.refunds.length > 0 ? (
              <div className="divide-y divide-bloom-border">
                {order.refunds.map((refund) => (
                  <div key={refund.id} className="grid gap-3 px-5 py-4 text-xs sm:grid-cols-[120px_1fr_100px]">
                    <StatusBadge value={refund.status} />
                    <div>
                      <p className="font-semibold">{refund.reason}</p>
                      <p className="mt-1 text-[10px] text-bloom-muted">
                        {refund.note || "No note"} · {formatDateTime(refund.createdAt)}
                        {refund.initiatedBy ? ` · ${refund.initiatedBy.name || refund.initiatedBy.email}` : ""}
                      </p>
                    </div>
                    <p className="text-right font-semibold">AED {money(Number(refund.amount))}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 py-8 text-center text-xs text-bloom-muted">No refunds.</p>
            )}
          </section>

          {order.fulfillmentStatus === "DELIVERED" ? (
            <section className="border border-bloom-border bg-white p-5">
              <div className="flex items-center gap-2">
                <RotateCcw className="size-4 text-bloom-violet" />
                <h2 className="text-sm font-semibold">Physical returns</h2>
              </div>
              <p className="mt-2 text-[11px] text-bloom-muted">
                Refunds do not automatically restock products. Record only items physically received back and safe to sell.
              </p>
              <div className="mt-5 space-y-3">
                {order.items.map((item) => {
                  const remaining = item.quantity - item.returnedQuantity;
                  const eligible =
                    item.variant &&
                    item.variant.trackInventory &&
                    ["READY_STOCK", "BOTH"].includes(item.variant.fulfillmentMode) &&
                    remaining > 0;
                  if (!eligible) return null;

                  return (
                    <form key={item.id} action={returnOrderItemStock} className="grid gap-2 border-t border-bloom-border pt-3 sm:grid-cols-[1fr_90px_1fr_auto]">
                      <input type="hidden" name="itemId" value={item.id} />
                      <p className="self-center text-xs font-semibold">{item.productName}</p>
                      <input name="quantity" type="number" min="1" max={remaining} defaultValue={1} className="h-9 border border-bloom-border px-2 text-xs" />
                      <input name="note" placeholder="Return condition / note" className="h-9 border border-bloom-border px-2 text-xs" />
                      <button type="submit" className="h-9 bg-bloom-plum px-3 text-[10px] font-semibold text-white">Restock return</button>
                    </form>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="overflow-hidden border border-bloom-border bg-white">
            <div className="border-b border-bloom-border px-5 py-4">
              <h2 className="text-sm font-semibold">Inventory movements</h2>
            </div>
            {order.inventoryMovement.length > 0 ? (
              <div className="divide-y divide-bloom-border">
                {order.inventoryMovement.map((movement) => (
                  <div key={movement.id} className="grid gap-2 px-5 py-4 text-xs sm:grid-cols-[140px_1fr_90px]">
                    <StatusBadge value={movement.type} />
                    <div>
                      <p className="font-semibold">{movement.variant.sku} · {movement.variant.name}</p>
                      <p className="mt-1 text-[10px] text-bloom-muted">{movement.note ?? "—"} · {formatDateTime(movement.createdAt)}</p>
                    </div>
                    <p className="text-right font-semibold">{movement.quantity > 0 ? "+" : ""}{movement.quantity}</p>
                  </div>
                ))}
              </div>
            ) : <p className="px-5 py-8 text-center text-xs text-bloom-muted">No inventory movements.</p>}
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-8 xl:self-start">
          {order.productionJob ? (
            <section className="border border-bloom-border bg-white p-5">
              <div className="flex items-center gap-2">
                <Hammer className="size-4 text-bloom-violet" />
                <h2 className="text-sm font-semibold">Production plan</h2>
              </div>
              <div className="mt-4 space-y-3 text-xs">
                <Row
                  label="Stage"
                  value={order.productionJob.status.replaceAll("_", " ").toLowerCase()}
                />
                <Row label="Priority" value={order.productionJob.priority.toLowerCase()} />
                <Row label="Assignee" value={order.productionJob.assignedTo || "Unassigned"} />
                <Row
                  label="Due"
                  value={order.productionJob.dueAt ? formatDateTime(order.productionJob.dueAt) : "Not planned"}
                />
                <Row
                  label="Planned time"
                  value={
                    order.productionJob.plannedMinutes
                      ? `${order.productionJob.plannedMinutes} min`
                      : "Not estimated"
                  }
                />
              </div>
              <Link
                href="/admin/production"
                className="mt-4 inline-flex h-9 items-center bg-bloom-violet px-3 text-[10px] font-semibold text-white"
              >
                Open planner
              </Link>
            </section>
          ) : null}

          {!workflowLocked ? (
            <section className="border border-bloom-border bg-white p-5">
              <div className="flex items-center gap-2">
                <PackageCheck className="size-4 text-bloom-violet" />
                <h2 className="text-sm font-semibold">Production workflow</h2>
              </div>
              <form action={updateOrderWorkflow} className="mt-5 space-y-4">
                <input type="hidden" name="orderId" value={order.id} />
                <label className="block">
                  <span className="text-xs font-semibold">Order status</span>
                  <select name="status" defaultValue={order.status} className="mt-2 h-11 w-full border border-bloom-border bg-white px-3 text-sm">
                    <option value="PENDING_PAYMENT">Pending payment</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="IN_PRODUCTION">In production</option>
                    <option value="QUALITY_CHECK">Quality check</option>
                    <option value="READY">Ready</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold">Payment status</span>
                  <select name="paymentStatus" defaultValue={order.paymentStatus} className="mt-2 h-11 w-full border border-bloom-border bg-white px-3 text-sm">
                    <option value="PENDING">Pending</option>
                    <option value="AUTHORIZED">Authorized</option>
                    <option value="PAID">Paid</option>
                    <option value="FAILED">Failed</option>
                    {order.paymentStatus === "PARTIALLY_REFUNDED" ? <option value="PARTIALLY_REFUNDED">Partially refunded</option> : null}
                    {order.paymentStatus === "REFUNDED" ? <option value="REFUNDED">Refunded</option> : null}
                  </select>
                </label>
                {order.paymentStatus === "REFUNDED" && productionStarted ? (
                  <label className="flex items-start gap-2 text-xs text-amber-700">
                    <input type="checkbox" name="acknowledgeProductionLoss" className="mt-0.5" />
                    I understand consumed production materials will not be restored automatically if I cancel this refunded order.
                  </label>
                ) : null}
                <button type="submit" className="h-11 w-full bg-bloom-plum px-4 text-sm font-semibold text-white">Update workflow</button>
              </form>
            </section>
          ) : null}

          {deliveryActive ? (
            <section className="border border-bloom-border bg-white p-5">
              <div className="flex items-center gap-2">
                <Truck className="size-4 text-bloom-violet" />
                <h2 className="text-sm font-semibold">Delivery workflow</h2>
              </div>
              <form action={updateOrderDelivery} className="mt-5 space-y-3">
                <input type="hidden" name="orderId" value={order.id} />
                <select name="deliveryStatus" defaultValue={order.fulfillmentStatus === "READY" ? "SHIPPED" : order.fulfillmentStatus === "SHIPPED" ? "OUT_FOR_DELIVERY" : "DELIVERED"} className="h-11 w-full border border-bloom-border bg-white px-3 text-sm">
                  {order.fulfillmentStatus === "READY" ? <option value="SHIPPED">Shipped</option> : null}
                  {order.fulfillmentStatus === "SHIPPED" ? <>
                    <option value="OUT_FOR_DELIVERY">Out for delivery</option>
                    <option value="DELIVERED">Delivered</option>
                  </> : null}
                  {order.fulfillmentStatus === "OUT_FOR_DELIVERY" ? <option value="DELIVERED">Delivered</option> : null}
                </select>
                <input name="carrier" defaultValue={order.carrier ?? ""} placeholder="Carrier / driver" className="h-10 w-full border border-bloom-border px-3 text-xs" />
                <input name="trackingNumber" defaultValue={order.trackingNumber ?? ""} placeholder="Tracking / delivery reference" className="h-10 w-full border border-bloom-border px-3 text-xs" />
                <button type="submit" className="h-11 w-full bg-bloom-violet px-4 text-sm font-semibold text-white">Update delivery</button>
              </form>
            </section>
          ) : null}

          {canRefund ? (
            <section className="border border-red-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-red-700">Refund</h2>
              <p className="mt-2 text-[11px] leading-5 text-bloom-muted">
                Remaining refundable: AED {money(remainingRefundable)}. Stripe is authoritative; asynchronous refunds finalize by webhook.
              </p>
              <form action={refundOrder} className="mt-5 space-y-3">
                <input type="hidden" name="orderId" value={order.id} />
                <input name="amount" type="number" min="0.01" max={remainingRefundable} step="0.01" defaultValue={remainingRefundable} required className="h-10 w-full border border-bloom-border px-3 text-xs" />
                <input name="reason" required placeholder="Refund / cancellation reason" className="h-10 w-full border border-bloom-border px-3 text-xs" />
                <textarea name="note" rows={3} placeholder="Internal note" className="w-full border border-bloom-border px-3 py-2 text-xs" />
                {canCancelWithRefund ? (
                  <label className="flex items-start gap-2 text-xs">
                    <input type="checkbox" name="cancelOrder" className="mt-0.5" />
                    Cancel order after a successful full refund
                  </label>
                ) : (
                  <p className="text-[10px] leading-4 text-bloom-muted">
                    This order has already shipped. Refunds are allowed, but cancellation and physical returns are handled separately.
                  </p>
                )}
                {canCancelWithRefund && productionStarted ? (
                  <label className="flex items-start gap-2 text-xs text-amber-700">
                    <input type="checkbox" name="acknowledgeProductionLoss" className="mt-0.5" />
                    I understand consumed materials are not restored automatically.
                  </label>
                ) : null}
                <button type="submit" className="h-10 w-full bg-red-700 px-4 text-xs font-semibold text-white">Issue Stripe refund</button>
              </form>
            </section>
          ) : null}

          <section className="border border-bloom-border bg-white p-5">
            <h2 className="text-sm font-semibold">Order totals</h2>
            <div className="mt-4 space-y-3 text-xs">
              <Row label="Subtotal" value={`AED ${money(Number(order.subtotal))}`} />
              <Row
                label={
                  order.discountCodeSnapshot
                    ? `Discount (${order.discountCodeSnapshot})`
                    : "Discount"
                }
                value={`− AED ${money(Number(order.discountAmount))}`}
              />
              <Row label="Delivery" value={`AED ${money(Number(order.deliveryAmount))}`} />
              {refunded > 0 ? <Row label="Refunded" value={`− AED ${money(refunded)}`} /> : null}
              <div className="flex items-end justify-between border-t border-bloom-border pt-4">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-semibold">{order.currency} {money(total)}</span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function InfoBox({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-bloom-border bg-white p-5">
      <div className="flex items-center gap-2">{icon}<h2 className="text-sm font-semibold">{title}</h2></div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><span className="text-bloom-muted">{label}</span><span className="font-semibold text-bloom-plum">{value}</span></div>;
}

function money(value: number) {
  return value.toLocaleString("en-AE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(date);
}
