import Link from "next/link";
import { ArrowRight, Boxes, Flower2, ShoppingBag, Users } from "lucide-react";

import { DatabaseRequired } from "@/components/admin/database-required";
import { StatusBadge } from "@/components/admin/status-badge";
import { getAdminDashboardData } from "@/lib/data/admin-repository";

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  if (!data) return <DatabaseRequired />;

  const cards = [
    {
      label: "30-day revenue",
      value: `AED ${money(data.metrics.revenue30Days)}`,
      icon: ShoppingBag,
    },
    {
      label: "Open orders",
      value: data.metrics.pendingOrders,
      icon: ShoppingBag,
    },
    {
      label: "Active products",
      value: data.metrics.activeProducts,
      icon: Flower2,
    },
    {
      label: "Customers",
      value: data.metrics.customers,
      icon: Users,
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-pink uppercase">
            Operations
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-bloom-muted">
            Orders, stock, and product health at a glance.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex h-10 items-center gap-2 bg-bloom-plum px-4 text-xs font-semibold text-white"
        >
          Add product
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <section key={label} className="border border-bloom-border bg-white p-5">
            <div className="flex size-9 items-center justify-center bg-bloom-pink-soft text-bloom-pink">
              <Icon className="size-4" />
            </div>
            <p className="mt-5 text-xs text-bloom-muted">{label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-[-0.03em]">
              {value}
            </p>
          </section>
        ))}
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="border border-bloom-border bg-white">
          <div className="flex items-center justify-between border-b border-bloom-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Recent orders</h2>
              <p className="mt-1 text-[11px] text-bloom-muted">
                Latest customer activity
              </p>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-semibold text-bloom-violet"
            >
              View all
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-bloom-border bg-[#faf8fa] text-[10px] uppercase tracking-[0.08em] text-bloom-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Order</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-bloom-border last:border-b-0">
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-semibold text-bloom-plum hover:text-bloom-pink"
                      >
                        {order.orderNumber}
                      </Link>
                      <p className="mt-1 text-[10px] text-bloom-muted">
                        {order._count.items} items · {formatDate(order.createdAt)}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-bloom-muted">
                      {order.customer
                        ? `${order.customer.firstName ?? ""} ${order.customer.lastName ?? ""}`.trim() ||
                          order.customerEmail
                        : order.customerEmail}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge value={order.status} />
                    </td>
                    <td className="px-5 py-4 text-right font-semibold">
                      AED {money(Number(order.total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border border-bloom-border bg-white">
          <div className="flex items-center justify-between border-b border-bloom-border px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Low stock</h2>
              <p className="mt-1 text-[11px] text-bloom-muted">
                Variants at or below reorder level
              </p>
            </div>
            <Boxes className="size-4 text-bloom-violet" />
          </div>

          <div className="divide-y divide-bloom-border">
            {data.lowStock.length > 0 ? (
              data.lowStock.map((variant) => {
                const available = variant.stockOnHand - variant.stockReserved;

                return (
                  <div key={variant.id} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div>
                      <p className="text-xs font-semibold">{variant.product.name}</p>
                      <p className="mt-1 text-[10px] text-bloom-muted">
                        {variant.sku} · {variant.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${available <= 0 ? "text-red-600" : "text-amber-600"}`}>
                        {available}
                      </p>
                      <p className="text-[9px] uppercase tracking-[0.08em] text-bloom-muted">
                        available
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="px-5 py-8 text-center text-xs text-bloom-muted">
                No low-stock alerts.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function money(value: number) {
  return value.toLocaleString("en-AE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
  }).format(date);
}
