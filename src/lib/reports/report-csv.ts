import type { getBusinessReport } from "@/lib/reports/business-report";

type BusinessReport = NonNullable<
  Awaited<ReturnType<typeof getBusinessReport>>
>;

export type ReportDataset =
  | "summary"
  | "products"
  | "customers"
  | "production"
  | "materials"
  | "inventory";

export function reportToCsv(
  report: BusinessReport,
  dataset: ReportDataset,
) {
  switch (dataset) {
    case "products":
      return rowsToCsv([
        [
          "product",
          "orders",
          "units",
          "returned_units",
          "merchandise_value_aed",
        ],
        ...report.products.map((product) => [
          product.productName,
          product.orders,
          product.units,
          product.returned,
          product.merchandiseValue,
        ]),
      ]);

    case "customers":
      return rowsToCsv([
        [
          "customer_email",
          "orders_in_period",
          "net_value_in_period_aed",
          "lifetime_orders",
          "lifetime_net_value_aed",
        ],
        ...report.customers.topCustomers.map((customer) => [
          customer.email,
          customer.orders,
          customer.netValue,
          customer.lifetimeOrders,
          customer.lifetimeNetValue,
        ]),
      ]);

    case "production":
      return rowsToCsv([
        ["metric", "value"],
        ["completed_jobs", report.production.completed],
        ["custom_jobs_completed", report.production.customCompleted],
        [
          "average_cycle_hours",
          report.production.averageCycleHours ?? "",
        ],
        ["on_time_pct", report.production.onTimePct ?? ""],
        ["current_wip", report.production.activeWip],
        ["current_overdue", report.production.overdue],
        ["urgent_wip", report.production.urgent],
        ["unassigned_wip", report.production.unassigned],
        ["planned_wip_minutes", report.production.plannedMinutes],
      ]);

    case "materials":
      return rowsToCsv([
        [
          "sku",
          "material",
          "category",
          "unit",
          "consumed_quantity",
          "estimated_cost_aed",
          "cost_complete",
        ],
        ...report.materials.map((material) => [
          material.sku,
          material.name,
          material.category,
          material.unit,
          material.quantity,
          material.estimatedCost,
          material.costKnown ? "yes" : "no",
        ]),
      ]);

    case "inventory":
      return rowsToCsv([
        [
          "risk",
          "type",
          "sku",
          "name",
          "available",
          "reorder_level",
          "age_days",
          "known_stock_value_aed",
        ],
        ...report.inventory.lowStock.map((item) => [
          "low_stock",
          item.type,
          item.sku,
          item.name,
          item.available,
          item.reorderLevel,
          item.ageDays,
          item.stockValue ?? "",
        ]),
        ...report.inventory.aging.map((item) => [
          "aging_90_plus",
          item.type,
          item.sku,
          item.name,
          item.available,
          item.reorderLevel,
          item.ageDays,
          item.stockValue ?? "",
        ]),
      ]);

    default:
      return rowsToCsv([
        ["section", "metric", "value"],
        ["period", "from", report.period.fromInput],
        ["period", "to", report.period.toInput],
        ["sales", "paid_orders", report.sales.paidOrders],
        ["sales", "gross_sales_aed", report.sales.grossSales],
        ["sales", "refunds_aed", report.sales.refunded],
        ["sales", "discounts_aed", report.sales.discounts],
        ["sales", "delivery_revenue_aed", report.sales.deliveryRevenue],
        ["sales", "net_revenue_aed", report.sales.netRevenue],
        [
          "sales",
          "average_order_value_aed",
          report.sales.averageOrderValue,
        ],
        [
          "sales",
          "estimated_direct_cost_aed",
          report.sales.estimatedDirectCost,
        ],
        [
          "sales",
          "estimated_contribution_aed",
          report.sales.estimatedContribution,
        ],
        [
          "sales",
          "estimated_direct_cost_margin_pct",
          report.sales.estimatedMarginPct,
        ],
        [
          "sales",
          "cost_coverage_pct",
          report.sales.costCoveragePct,
        ],
        [
          "custom",
          "custom_net_revenue_aed",
          report.custom.netRevenue,
        ],
        ["custom", "requests", report.custom.requests],
        ["custom", "quoted", report.custom.quoted],
        ["custom", "converted", report.custom.converted],
        [
          "custom",
          "request_conversion_pct",
          report.custom.conversionPct,
        ],
        [
          "customer",
          "active_customers",
          report.customers.activeCustomers,
        ],
        [
          "customer",
          "new_customers",
          report.customers.newCustomers,
        ],
        [
          "customer",
          "returning_customers",
          report.customers.returningCustomers,
        ],
        [
          "customer",
          "returning_share_pct",
          report.customers.returningSharePct,
        ],
        [
          "production",
          "completed_jobs",
          report.production.completed,
        ],
        [
          "production",
          "average_cycle_hours",
          report.production.averageCycleHours ?? "",
        ],
        [
          "production",
          "on_time_pct",
          report.production.onTimePct ?? "",
        ],
        [
          "inventory",
          "low_stock_count",
          report.inventory.lowStockCount,
        ],
        [
          "inventory",
          "aging_90_plus_count",
          report.inventory.agingCount,
        ],
        [
          "inventory",
          "known_stock_value_aed",
          report.inventory.knownStockValue,
        ],
        [
          "inventory",
          "stock_value_coverage_pct",
          report.inventory.valueCoveragePct,
        ],
      ]);
  }
}

export function reportFilename(
  report: BusinessReport,
  dataset: ReportDataset,
) {
  return `handmade-blooms-${dataset}-${report.period.fromInput}-to-${report.period.toInput}.csv`;
}

export function isReportDataset(
  value: string | null,
): value is ReportDataset {
  return [
    "summary",
    "products",
    "customers",
    "production",
    "materials",
    "inventory",
  ].includes(value ?? "");
}

function rowsToCsv(
  rows: Array<Array<string | number | null | undefined>>,
) {
  return rows
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
}

function csvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  const safe =
    typeof value === "string" &&
    /^[=+\-@]/.test(text.trimStart())
      ? `'${text}`
      : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
