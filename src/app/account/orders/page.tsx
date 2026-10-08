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
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-bloom-plum">
                    {order.currency} {Number(order.total)}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-violet">
                    {order.status.replaceAll("_", " ")}
                  </p>
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
                      AED {Number(item.lineTotal)}
                    </p>
                  </div>
                ))}
              </div>
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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}
