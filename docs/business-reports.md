# Business reports and analytics

Group 13 adds read-only business reporting on top of the existing operational ledger.

## Admin route

The main report route is /admin/reports.

Available date ranges are 7, 30, 90, and 365 days plus a custom range. Date boundaries use Asia/Dubai business days rather than raw UTC midnight.

Custom ranges are capped at 730 days to keep the server-side report bounded.

## Primary KPIs

### Net revenue

Net revenue is calculated from orders paid during the selected period:

gross selected order total - each selected order's current successful refunded amount.

This is a retrospective operational view. A refund completed after the selected payment period can therefore restate the historical period downward.

Gross sales, discounts, delivery revenue, refunded value, paid-order count, and average order value are shown alongside net revenue.

### Direct-cost margin estimate

This is deliberately not presented as accounting gross profit.

Cost sources are:

- ProductVariant.cost when configured, for the full ordered quantity;
- current BOM material unit cost multiplied by productionQuantity when finished-unit cost is not configured;
- frozen custom-bouquet material plan multiplied by current RawMaterial.unitCost.

The estimate excludes labor, payment processing fees, delivery cost, overhead, tax, and other indirect costs.

If only part of merchandise has complete cost data, the margin percentage is calculated only on cost-covered net merchandise revenue. Cost coverage is shown explicitly so missing cost configuration cannot silently appear as zero cost.

Known partial costs still contribute to the known direct-cost total but not to the covered-margin percentage.

## Product performance

Best sellers are ranked by gross merchandise value from OrderItem.lineTotal.

Product metrics include order count, units, returned units, and merchandise value.

Product merchandise value is intentionally pre-order-level discount and pre-refund because current discounts and refunds are stored at order level and cannot be attributed to a specific line without an allocation rule.

## Custom bouquets

Custom metrics include requests created in the selected period, quoted requests, requests that reached payment, request conversion, quote acceptance, paid custom orders, net custom revenue, and average custom order value.

A request remains a conversion if it reached payment even if it was later cancelled or refunded.

## Customer metrics

Customer identity is grouped by normalized order email.

Metrics include active paid customers in the selected period, new customers whose first paid order occurs in the period, returning customers with earlier paid history, returning share, repeat-history customers, and customer net order value.

The customer CSV exports all active customers for the selected period; the page only displays the leading rows.

## Production performance

Period-scoped production metrics use ProductionJob.completedAt.

They include completed jobs, custom jobs completed, average production cycle time, and on-time completion rate where a due date exists.

Current operational production metrics are intentionally snapshot metrics and do not change with the historical range:

- active work in progress;
- current overdue jobs;
- urgent work;
- unassigned work;
- currently planned workload minutes.

## Material consumption

Material usage comes from RawMaterialMovement records of type CONSUMPTION created during the selected period.

Usage is aggregated by material. Estimated consumption value uses current RawMaterial.unitCost. Missing unit cost is marked as incomplete rather than treated as zero cost.

## Inventory health

Inventory health is a current snapshot, not a historical period reconstruction.

It combines finished-goods variants and raw materials.

Low stock uses available quantity after reservations compared with reorder level.

Aging stock means positive available stock whose last positive inbound movement is at least 90 days old. OPENING, RECEIPT, RETURN, and positive ADJUSTMENT movements count as inbound. If there is no inbound movement, the record creation date is used as the fallback age anchor.

Known stock value uses configured ProductVariant.cost for finished goods and RawMaterial.unitCost for raw materials. The report shows the percentage of inventory records with configured cost.

## Sales trend

Trend buckets automatically change with the selected period:

- up to 45 days: daily;
- 46 to 180 days: weekly;
- more than 180 days: monthly.

Orders are bucketed by paidAt using UAE local-date semantics.

## CSV exports

CSV downloads are available for:

- summary;
- products;
- customers;
- production;
- materials;
- inventory.

The endpoint is /api/admin/reports.csv.

It requires a valid ADMIN session and returns private no-store responses.

The CSV adapter consumes the same getBusinessReport result as the admin page, preventing separate export metric definitions.

CSV exports contain all rows in the dataset. The UI may show a smaller top-N subset for readability.

## Data-model impact

Group 13 does not add Prisma models or columns.

It is intentionally read-only over the Group 8-12 commerce, refund, inventory, materials, custom bouquet, and production ledgers.

Therefore Group 13 adds no new migration requirement. The previously deferred consolidated migration is still required before runtime validation of the accumulated schema changes from earlier groups.