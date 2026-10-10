import { StatusBadge } from "@/components/admin/status-badge";
import { requireUser } from "@/lib/auth/guards";
import { listAccountOrders } from "@/lib/data/account-repository";

export const metadata = { title: "Orders" };

export default async function AccountOrdersPage() {
  const user = await requireUser();
  const orders = await listAccountOrders(user.id);

  if (!orders) return null;

  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-pink uppercase">
        History
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-bloom-plum">
        Your orders
      </h1>
      <p className="mt-2 text-sm text-bloom-muted">
        Previous and in-progress Handmade Blooms orders.
      </p>

      <div className="mt-7 space-y-4">
        {orders.length > 0 ? (
          orders.map((order) => (
            <article
              key={order.id}
              className="border border-bloom-border bg-white p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-bloom-border pb-4">
                <div>
                  <p className="text-sm font-semibold text-bloom-plum">
                    {order.orderNumber}
                  </p>
                  <p className="mt-1 text-[11px] text-bloom-muted">
                    {formatDate(order.createdAt)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge value={order.status} />
                    <StatusBadge value={order.paymentStatus} />
                    <StatusBadge value={order.fulfillmentStatus} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-bloom-plum">
                    {order.currency} {money(Number(order.total))}
                  </p>
                  {Number(order.discountAmount) > 0 ? (
                    <p className="mt-1 text-[10px] font-semibold text-bloom-success">
                      {order.discountCodeSnapshot
                        ? `${order.discountCodeSnapshot} · `
                        : ""}
                      saved AED {money(Number(order.discountAmount))}
                    </p>
                  ) : null}
                  {Number(order.refundedAmount) > 0 ? (
                    <p className="mt-1 text-[10px] font-semibold text-bloom-violet">
                      Refunded {order.currency} {money(Number(order.refundedAmount))}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-bloom-plum">
                        {item.productName}
                      </p>
                      <p className="mt-1 text-[10px] text-bloom-muted">
                        {item.variantName} · Qty {item.quantity}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold text-bloom-plum">
                      AED {money(Number(item.lineTotal))}
                    </p>
                  </div>
                ))}
              </div>

              {order.refunds.length > 0 ? (
                <div className="mt-5 border-t border-bloom-border pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
                    Refunds
                  </p>
                  <div className="mt-3 space-y-2">
                    {order.refunds.map((refund) => (
                      <div
                        key={refund.id}
                        className="flex items-center justify-between gap-4 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <StatusBadge value={refund.status} />
                          <span className="text-bloom-muted">
                            {refund.reason}
                          </span>
                        </div>
                        <span className="font-semibold text-bloom-plum">
                          AED {money(Number(refund.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {order.carrier ||
              order.trackingNumber ||
              order.shippedAt ||
              order.deliveredAt ? (
                <div className="mt-5 grid gap-3 border-t border-bloom-border pt-4 text-xs sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
                      Delivery
                    </p>
                    <p className="mt-2 text-bloom-plum">
                      {order.carrier || "Delivery in progress"}
                    </p>
                    {order.trackingNumber ? (
                      <p className="mt-1 text-bloom-muted">
                        Ref: {order.trackingNumber}
                      </p>
                    ) : null}
                  </div>
                  <div className="sm:text-right">
                    {order.deliveredAt ? (
                      <p className="text-bloom-muted">
                        Delivered {formatDateTime(order.deliveredAt)}
                      </p>
                    ) : order.outForDeliveryAt ? (
                      <p className="text-bloom-muted">
                        Out for delivery {formatDateTime(order.outForDeliveryAt)}
                      </p>
                    ) : order.shippedAt ? (
                      <p className="text-bloom-muted">
                        Shipped {formatDateTime(order.shippedAt)}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {order.status === "CANCELLED" ? (
                <div className="mt-5 border-t border-red-100 pt-4 text-xs text-red-700">
                  Cancelled
                  {order.cancellationReason
                    ? ` · ${order.cancellationReason}`
                    : ""}
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <div className="border border-bloom-border bg-white px-6 py-12 text-center">
            <p className="text-sm text-bloom-muted">
              You do not have any orders yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function money(value: number) {
  return value.toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
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
