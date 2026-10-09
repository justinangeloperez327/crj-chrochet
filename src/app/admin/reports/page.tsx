import {
  ArrowDownToLine,
  BarChart3,
  CircleDollarSign,
  PackageCheck,
  Users,
} from "lucide-react";

import { DatabaseRequired } from "@/components/admin/database-required";
import { getBusinessReport } from "@/lib/reports/business-report";

export const metadata = { title: "Reports" };

type Props = {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
  }>;
};

export default async function ReportsPage({ searchParams }: Props) {
  const query = await searchParams;
  const data = await getBusinessReport(query);

  if (!data) return <DatabaseRequired />;

  const maxTrendRevenue = Math.max(
    1,
    ...data.trend.map((point) => point.netRevenue),
  );
  const exportQuery = new URLSearchParams({
    range: data.period.key,
    from: data.period.fromInput,
    to: data.period.toInput,
  }).toString();

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-violet uppercase">
            Business intelligence
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">
            Reports
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-bloom-muted">
            Sales, customers, workshop performance, and inventory health from
            the operational ledger.
          </p>
        </div>

        <a
          href={`/api/admin/reports.csv?${exportQuery}&dataset=summary`}
          download
          className="inline-flex h-10 items-center gap-2 border border-bloom-border bg-white px-4 text-xs font-semibold text-bloom-plum"
        >
          <ArrowDownToLine className="size-3.5" />
          Export summary CSV
        </a>
      </div>

      <form
        method="get"
        className="mt-7 grid gap-3 border border-bloom-border bg-white p-4 sm:grid-cols-[170px_1fr_1fr_auto]"
      >
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
            Range
          </span>
          <select
            name="range"
            defaultValue={data.period.key === "custom" ? "custom" : data.period.key}
            className="mt-2 h-10 w-full border border-bloom-border bg-white px-3 text-xs"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="365d">Last 365 days</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <Field
          name="from"
          label="From"
          type="date"
          defaultValue={data.period.fromInput}
        />
        <Field
          name="to"
          label="To"
          type="date"
          defaultValue={data.period.toInput}
        />
        <button
          type="submit"
          className="h-10 self-end bg-bloom-plum px-5 text-xs font-semibold text-white"
        >
          Apply
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[10px] text-bloom-muted">
        <span>
          {data.period.label} · UAE business days · generated{" "}
          {formatDateTime(data.generatedAt)}
        </span>
        <span>
          Revenue is restated using each selected order&apos;s current successful
          refund total.
        </span>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Net revenue"
          value={`AED ${money(data.sales.netRevenue)}`}
          hint={`Gross AED ${money(data.sales.grossSales)} · refunds AED ${money(data.sales.refunded)}`}
          icon={<CircleDollarSign className="size-4" />}
        />
        <Metric
          label="Paid orders"
          value={data.sales.paidOrders}
          hint={`AOV AED ${money(data.sales.averageOrderValue)}`}
          icon={<PackageCheck className="size-4" />}
        />
        <Metric
          label="Direct-cost margin"
          value={
            data.sales.estimatedMarginPct === null
              ? "—"
              : `${data.sales.estimatedMarginPct}%`
          }
          hint={`${data.sales.costCoveragePct}% of net merchandise revenue has complete cost coverage`}
          icon={<BarChart3 className="size-4" />}
        />
        <Metric
          label="Active customers"
          value={data.customers.activeCustomers}
          hint={`${data.customers.returningSharePct}% returning`}
          icon={<Users className="size-4" />}
        />
      </section>

      <section className="mt-6 border border-bloom-border bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">Net revenue trend</h2>
            <p className="mt-1 text-[11px] text-bloom-muted">
              Orders are bucketed by payment date. Later successful refunds
              restate their order&apos;s net value.
            </p>
          </div>
          <p className="text-xs font-semibold text-bloom-plum">
            AED {money(data.sales.netRevenue)}
          </p>
        </div>

        {data.trend.length > 0 ? (
          <div className="mt-6 flex min-h-48 items-end gap-2 overflow-x-auto border-b border-bloom-border pb-2">
            {data.trend.map((point) => {
              const height = Math.max(
                4,
                Math.round((point.netRevenue / maxTrendRevenue) * 150),
              );

              return (
                <div
                  key={point.key}
                  className="flex min-w-12 flex-1 flex-col items-center justify-end gap-2"
                >
                  <p className="text-[9px] font-semibold text-bloom-plum">
                    {point.netRevenue > 0
                      ? moneyCompact(point.netRevenue)
                      : "0"}
                  </p>
                  <div
                    className="w-full max-w-12 bg-bloom-violet/70"
                    style={{ height }}
                    title={`${point.label}: AED ${money(point.netRevenue)} · ${point.orders} orders`}
                  />
                  <p className="whitespace-nowrap text-[9px] text-bloom-muted">
                    {point.label}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-8 text-center text-xs text-bloom-muted">
            No paid orders in this period.
          </p>
        )}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <ReportCard
          title="Sales economics"
          subtitle="Commercial value and current refund-adjusted order value."
        >
          <Rows
            rows={[
              ["Gross sales", `AED ${money(data.sales.grossSales)}`],
              ["Discounts", `AED ${money(data.sales.discounts)}`],
              ["Refunded", `AED ${money(data.sales.refunded)}`],
              ["Delivery revenue", `AED ${money(data.sales.deliveryRevenue)}`],
              ["Net merchandise revenue", `AED ${money(data.sales.merchandiseNetRevenue)}`],
              ["Known direct cost", `AED ${money(data.sales.estimatedDirectCost)}`],
              ["Covered net merchandise revenue", `AED ${money(data.sales.coveredNetMerchandiseRevenue)}`],
              ["Covered contribution estimate", `AED ${money(data.sales.estimatedContribution)}`],
              ["Custom bouquet net revenue", `AED ${money(data.sales.customNetRevenue)}`],
            ]}
          />
          <p className="mt-4 border-t border-bloom-border pt-4 text-[10px] leading-5 text-bloom-muted">
            Direct-cost margin is calculated only on merchandise with complete
            cost coverage. Known partial costs still contribute to the direct-cost
            total, but they do not enter the margin percentage. Labor, payment
            fees, delivery cost, overhead, and tax are excluded.
          </p>
        </ReportCard>

        <ReportCard
          title="Customer health"
          subtitle="Unique paid customers active in the selected period."
          action={
            <ExportLink
              href={`/api/admin/reports.csv?${exportQuery}&dataset=customers`}
            />
          }
        >
          <Rows
            rows={[
              ["Active customers", data.customers.activeCustomers],
              ["New customers", data.customers.newCustomers],
              ["Returning customers", data.customers.returningCustomers],
              ["Returning share", `${data.customers.returningSharePct}%`],
              ["Customers with repeat history", data.customers.repeatCustomers],
            ]}
          />
          <div className="mt-5 border-t border-bloom-border pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
              Top customers in period
            </p>
            <div className="mt-3 space-y-3">
              {data.customers.topCustomers.slice(0, 5).map((customer) => (
                <div
                  key={customer.email}
                  className="flex items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <p className="font-semibold text-bloom-plum">
                      {customer.email}
                    </p>
                    <p className="mt-1 text-[10px] text-bloom-muted">
                      {customer.orders} order
                      {customer.orders === 1 ? "" : "s"} in range ·{" "}
                      {customer.lifetimeOrders} lifetime
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold">
                    AED {money(customer.netValue)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ReportCard>
      </section>

      <section className="mt-6 border border-bloom-border bg-white">
        <SectionHeader
          title="Best sellers"
          subtitle="Ranked by gross merchandise value before order-level discounts and refunds."
          exportHref={`/api/admin/reports.csv?${exportQuery}&dataset=products`}
        />
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full text-left text-xs">
            <thead className="border-b border-bloom-border bg-[#faf8fa] text-[10px] uppercase tracking-[0.08em] text-bloom-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Product</th>
                <th className="px-5 py-3 text-right font-semibold">Orders</th>
                <th className="px-5 py-3 text-right font-semibold">Units</th>
                <th className="px-5 py-3 text-right font-semibold">Returned</th>
                <th className="px-5 py-3 text-right font-semibold">Merchandise value</th>
              </tr>
            </thead>
            <tbody>
              {data.products.length > 0 ? (
                data.products.slice(0, 12).map((product) => (
                  <tr
                    key={product.key}
                    className="border-b border-bloom-border last:border-b-0"
                  >
                    <td className="px-5 py-4 font-semibold">{product.productName}</td>
                    <td className="px-5 py-4 text-right">{product.orders}</td>
                    <td className="px-5 py-4 text-right">{product.units}</td>
                    <td className="px-5 py-4 text-right text-bloom-muted">
                      {product.returned}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold">
                      AED {money(product.merchandiseValue)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-bloom-muted">
                    No product sales in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        <ReportCard
          title="Custom bouquets"
          subtitle="Requests created during the period and paid custom orders in the period."
        >
          <Rows
            rows={[
              ["Requests", data.custom.requests],
              ["Quoted", data.custom.quoted],
              ["Converted", data.custom.converted],
              ["Request conversion", `${data.custom.conversionPct}%`],
              ["Quote acceptance", `${data.custom.quoteAcceptancePct}%`],
              ["Paid custom orders", data.custom.paidOrders],
              ["Net custom revenue", `AED ${money(data.custom.netRevenue)}`],
              ["Average custom order", `AED ${money(data.custom.averagePaidOrder)}`],
            ]}
          />
        </ReportCard>

        <ReportCard
          title="Production performance"
          subtitle="Completion metrics use jobs completed during the period; WIP is current."
          action={
            <ExportLink
              href={`/api/admin/reports.csv?${exportQuery}&dataset=production`}
            />
          }
        >
          <Rows
            rows={[
              ["Completed jobs", data.production.completed],
              ["Custom jobs completed", data.production.customCompleted],
              [
                "Average cycle",
                data.production.averageCycleHours === null
                  ? "Not enough data"
                  : `${data.production.averageCycleHours}h`,
              ],
              [
                "On-time completion",
                data.production.onTimePct === null
                  ? "No due-date sample"
                  : `${data.production.onTimePct}%`,
              ],
              ["Current WIP", data.production.activeWip],
              ["Current overdue", data.production.overdue],
              ["Urgent WIP", data.production.urgent],
              ["Unassigned WIP", data.production.unassigned],
              ["Planned WIP hours", roundOne(data.production.plannedMinutes / 60)],
            ]}
          />
        </ReportCard>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <ReportCard
          title="Material consumption"
          subtitle="Actual CONSUMPTION movements in the selected period."
          action={
            <ExportLink
              href={`/api/admin/reports.csv?${exportQuery}&dataset=materials`}
            />
          }
        >
          {data.materials.length > 0 ? (
            <div className="space-y-3">
              {data.materials.slice(0, 10).map((material) => (
                <div
                  key={material.id}
                  className="grid grid-cols-[1fr_auto] gap-4 border-b border-bloom-border pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-xs font-semibold">
                      {material.name}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-bloom-muted">
                      {material.sku} · {material.category}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-semibold">
                      {material.quantity} {material.unit.toLowerCase()}
                    </p>
                    <p className="mt-1 text-[10px] text-bloom-muted">
                      {material.costKnown
                        ? `AED ${money(material.estimatedCost)} est.`
                        : "cost incomplete"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-bloom-muted">
              No material consumption in this period.
            </p>
          )}
        </ReportCard>

        <ReportCard
          title="Inventory health"
          subtitle="Current snapshot; aging uses last positive inbound movement."
          action={
            <ExportLink
              href={`/api/admin/reports.csv?${exportQuery}&dataset=inventory`}
            />
          }
        >
          <Rows
            rows={[
              ["Low-stock SKUs/materials", data.inventory.lowStockCount],
              ["Aging 90+ days", data.inventory.agingCount],
              ["Known stock value", `AED ${money(data.inventory.knownStockValue)}`],
              ["Items with configured cost", `${data.inventory.valueCoveragePct}%`],
            ]}
          />

          <div className="mt-5 border-t border-bloom-border pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
              Oldest available stock
            </p>
            <div className="mt-3 space-y-2">
              {data.inventory.aging.slice(0, 6).map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="mt-1 font-mono text-[9px] text-bloom-muted">
                      {item.sku} · {item.type.toLowerCase()}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-amber-700">
                    {item.ageDays}d
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ReportCard>
      </section>

      <section className="mt-6 border border-bloom-border bg-[#faf8fa] p-5 text-[10px] leading-5 text-bloom-muted">
        <p className="font-semibold text-bloom-plum">Measurement notes</p>
        <p className="mt-2">
          Net revenue = selected paid-order total less each selected order&apos;s
          currently successful refunded amount. Product merchandise value is
          intentionally pre-discount/pre-refund because discounts and refunds
          exist at order level. Cost and stock-value metrics use current
          configured unit costs, so they are operational estimates rather than
          historical accounting valuation.
        </p>
      </section>
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
      <p className="mt-2 text-[10px] leading-4 text-bloom-muted">{hint}</p>
    </div>
  );
}

function ReportCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-bloom-border bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-[11px] leading-5 text-bloom-muted">
            {subtitle}
          </p>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SectionHeader({
  title,
  subtitle,
  exportHref,
}: {
  title: string;
  subtitle: string;
  exportHref: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-bloom-border px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-[11px] text-bloom-muted">{subtitle}</p>
      </div>
      <ExportLink href={exportHref} />
    </div>
  );
}

function ExportLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-violet"
    >
      <ArrowDownToLine className="size-3" />
      CSV
    </a>
  );
}

function Rows({
  rows,
}: {
  rows: Array<[string, React.ReactNode]>;
}) {
  return (
    <div className="space-y-3 text-xs">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-4">
          <span className="text-bloom-muted">{label}</span>
          <span className="text-right font-semibold text-bloom-plum">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  name,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
}) {
  return (
    <label>
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
        {label}
      </span>
      <input
        name={name}
        {...props}
        className="mt-2 h-10 w-full border border-bloom-border px-3 text-xs"
      />
    </label>
  );
}

function money(value: number) {
  return value.toLocaleString("en-AE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function moneyCompact(value: number) {
  return new Intl.NumberFormat("en-AE", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dubai",
  }).format(date);
}

function roundOne(value: number) {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}
