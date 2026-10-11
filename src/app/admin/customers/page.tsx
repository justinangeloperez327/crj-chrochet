import Link from "next/link";
import {
  CircleDollarSign,
  Clock3,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { DatabaseRequired } from "@/components/admin/database-required";
import {
  listAdminCustomers,
  type CustomerSegment,
} from "@/lib/customers/customer-repository";

export const metadata = { title: "Customers" };

type Props = {
  searchParams: Promise<{
    q?: string;
    segment?: string;
    risk?: string;
  }>;
};

export default async function AdminCustomersPage({ searchParams }: Props) {
  const query = await searchParams;
  const data = await listAdminCustomers(query);

  if (!data) return <DatabaseRequired />;

  const exportQuery = new URLSearchParams();
  if (data.filters.q) exportQuery.set("q", data.filters.q);
  if (data.filters.segment) exportQuery.set("segment", data.filters.segment);
  if (data.filters.risk) exportQuery.set("risk", data.filters.risk);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-violet uppercase">
            Customer relationship management
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">
            Customers
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-bloom-muted">
            Customer value, repeat behavior, saved account context, and service
            notes from one operational view.
          </p>
        </div>

        <a
          href={`/api/admin/customers.csv?${exportQuery.toString()}`}
          download
          className="inline-flex h-10 items-center border border-bloom-border bg-white px-4 text-xs font-semibold text-bloom-plum"
        >
          Export CSV
        </a>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Customers"
          value={data.metrics.total}
          hint={`${data.metrics.registered} registered accounts`}
          icon={<Users className="size-4" />}
        />
        <Metric
          label="Returning + VIP"
          value={data.metrics.returning + data.metrics.vip}
          hint={`${data.metrics.vip} VIP customers`}
          icon={<Sparkles className="size-4" />}
        />
        <Metric
          label="At risk"
          value={data.metrics.atRisk}
          hint="No paid order in 90+ days"
          icon={<Clock3 className="size-4" />}
        />
        <Metric
          label="Lifetime net value"
          value={`AED ${money(data.metrics.lifetimeNetValue)}`}
          hint="Refund-adjusted paid revenue"
          icon={<CircleDollarSign className="size-4" />}
        />
      </section>

      <form
        method="get"
        className="mt-6 grid gap-3 border border-bloom-border bg-white p-4 lg:grid-cols-[1fr_190px_170px_auto]"
      >
        <label>
          <FieldLabel>Search</FieldLabel>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-bloom-muted" />
            <input
              name="q"
              defaultValue={data.filters.q}
              placeholder="Email, name, or phone"
              className="h-10 w-full border border-bloom-border pl-9 pr-3 text-xs outline-none focus:border-bloom-violet"
            />
          </div>
        </label>

        <label>
          <FieldLabel>Segment</FieldLabel>
          <select
            name="segment"
            defaultValue={data.filters.segment}
            className="mt-2 h-10 w-full border border-bloom-border bg-white px-3 text-xs"
          >
            <option value="">All segments</option>
            <option value="PROSPECT">Prospect</option>
            <option value="FIRST_ORDER">First-order</option>
            <option value="RETURNING">Returning</option>
            <option value="VIP">VIP</option>
          </select>
        </label>

        <label>
          <FieldLabel>Activity</FieldLabel>
          <select
            name="risk"
            defaultValue={data.filters.risk}
            className="mt-2 h-10 w-full border border-bloom-border bg-white px-3 text-xs"
          >
            <option value="">All activity</option>
            <option value="active">Active</option>
            <option value="at-risk">At risk</option>
          </select>
        </label>

        <button
          type="submit"
          className="h-10 self-end bg-bloom-plum px-5 text-xs font-semibold text-white"
        >
          Apply
        </button>
      </form>

      <section className="mt-6 overflow-hidden border border-bloom-border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left text-xs">
            <thead className="border-b border-bloom-border bg-[#faf8fa] text-[10px] uppercase tracking-[0.08em] text-bloom-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Segment</th>
                <th className="px-5 py-3 text-right font-semibold">Paid orders</th>
                <th className="px-5 py-3 text-right font-semibold">Net value</th>
                <th className="px-5 py-3 font-semibold">Last paid</th>
                <th className="px-5 py-3 text-right font-semibold">Notes</th>
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.customers.length > 0 ? (
                data.customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-bloom-border last:border-b-0"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="font-semibold text-bloom-plum hover:text-bloom-pink"
                      >
                        {customer.name}
                      </Link>
                      <p className="mt-1 text-[10px] text-bloom-muted">
                        {customer.email}
                        {customer.phone ? ` · ${customer.phone}` : ""}
                      </p>
                      <div className="mt-2 flex gap-2">
                        {customer.registered ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                            <ShieldCheck className="size-3" />
                            account
                          </span>
                        ) : (
                          <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
                            guest profile
                          </span>
                        )}
                        {customer.atRisk ? (
                          <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                            at risk
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Segment value={customer.segment} />
                    </td>
                    <td className="px-5 py-4 text-right font-semibold">
                      {customer.paidOrders}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold">
                      AED {money(customer.lifetimeNetValue)}
                    </td>
                    <td className="px-5 py-4 text-bloom-muted">
                      {customer.lastPaidAt
                        ? formatDate(customer.lastPaidAt)
                        : "Never"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {customer.notes}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-violet"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-bloom-muted"
                  >
                    No customers match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-4 text-[10px] leading-5 text-bloom-muted">
        Segments are recalculated from paid history: Prospect = no paid orders,
        First-order = one, Returning = two or more, and VIP = five or more paid
        orders or AED 1,000+ lifetime net value.
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="border border-bloom-border bg-white p-5">
      <div className="flex items-center justify-between text-bloom-muted">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em]">
          {label}
        </p>
        {icon}
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-bloom-plum">
        {value}
      </p>
      <p className="mt-2 text-[10px] text-bloom-muted">{hint}</p>
    </div>
  );
}

function Segment({ value }: { value: CustomerSegment }) {
  const classes =
    value === "VIP"
      ? "border-bloom-violet/20 bg-bloom-violet-soft/55 text-bloom-violet"
      : value === "RETURNING"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : value === "FIRST_ORDER"
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={`inline-flex border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] ${classes}`}
    >
      {value.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
      {children}
    </span>
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
    year: "numeric",
    timeZone: "Asia/Dubai",
  }).format(date);
}
