import Link from "next/link";
import { Search } from "lucide-react";

import { DatabaseRequired } from "@/components/admin/database-required";
import { StatusBadge } from "@/components/admin/status-badge";
import { listAdminOrders } from "@/lib/data/admin-repository";

export const metadata = { title: "Orders" };

type Props = {
  searchParams: Promise<{ q?: string }>;
};

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const orders = await listAdminOrders(q);

  if (!orders) return <DatabaseRequired />;

  return (
    <div>
      <div>
        <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-pink uppercase">
          Fulfillment
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">
          Orders
        </h1>
        <p className="mt-2 text-sm text-bloom-muted">
          Move paid orders through preparation, quality check, ready, and fulfillment.
        </p>
      </div>

      <form method="get" className="mt-7 flex max-w-xl gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-bloom-muted" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Order number, customer, email, phone, tracking…"
            className="h-10 w-full border border-bloom-border bg-white pl-9 pr-3 text-xs outline-none focus:border-bloom-violet"
          />
        </div>
        <button
          type="submit"
          className="h-10 bg-bloom-plum px-4 text-xs font-semibold text-white"
        >
          Search
        </button>
        {q ? (
          <Link
            href="/admin/orders"
            className="inline-flex h-10 items-center border border-bloom-border bg-white px-4 text-xs font-semibold text-bloom-muted"
          >
            Clear
          </Link>
        ) : null}
      </form>

      <section className="mt-5 overflow-hidden border border-bloom-border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left text-xs">
            <thead className="border-b border-bloom-border bg-[#faf8fa] text-[10px] uppercase tracking-[0.08em] text-bloom-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Order</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Order status</th>
                <th className="px-5 py-3 font-semibold">Payment</th>
                <th className="px-5 py-3 font-semibold">Fulfillment</th>
                <th className="px-5 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-bloom-border last:border-b-0"
                >
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-semibold hover:text-bloom-pink"
                    >
                      {order.orderNumber}
                    </Link>
                    <p className="mt-1 text-[10px] text-bloom-muted">
                      {order._count.items} items · {formatDate(order.createdAt)}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium">
                      {order.customer
                        ? `${order.customer.firstName ?? ""} ${order.customer.lastName ?? ""}`.trim() ||
                          order.customerEmail
                        : order.customerEmail}
                    </p>
                    <p className="mt-1 text-[10px] text-bloom-muted">
                      {order.customerEmail}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={order.status} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={order.paymentStatus} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={order.fulfillmentStatus} />
                  </td>
                  <td className="px-5 py-4 text-right font-semibold">
                    {order.currency} {money(Number(order.total))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {orders.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-bloom-muted">
            {q ? "No orders match this search." : "No orders have been created yet."}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function money(value: number) {
  return value.toLocaleString("en-AE", {
    maximumFractionDigits: 2,
  });
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
