import {
  ArrowDownToLine,
  BadgePercent,
  CalendarClock,
  CircleDollarSign,
  Ticket,
  Users,
} from "lucide-react";

import {
  createDiscount,
  deleteDiscount,
  updateDiscount,
} from "@/app/admin/actions";
import { DatabaseRequired } from "@/components/admin/database-required";
import { getAdminDiscountData } from "@/lib/discounts/admin-discount-repository";

export const metadata = { title: "Discounts" };

export default async function AdminDiscountsPage() {
  const data = await getAdminDiscountData();

  if (!data) return <DatabaseRequired />;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-violet uppercase">
            Promotions
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">
            Discounts
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-bloom-muted">
            Control promotion eligibility, product scope, schedules, and
            redemption limits from one operational view.
          </p>
        </div>
        <a
          href="/api/admin/discounts.csv"
          download
          className="inline-flex h-10 items-center gap-2 border border-bloom-border bg-white px-4 text-xs font-semibold text-bloom-plum"
        >
          <ArrowDownToLine className="size-3.5" />
          Export CSV
        </a>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Metric
          label="Active"
          value={data.metrics.active}
          icon={<BadgePercent className="size-4" />}
        />
        <Metric
          label="Scheduled"
          value={data.metrics.scheduled}
          icon={<CalendarClock className="size-4" />}
        />
        <Metric
          label="Reserved uses"
          value={data.metrics.reserved}
          icon={<Ticket className="size-4" />}
        />
        <Metric
          label="Redemptions"
          value={data.metrics.redemptions}
          icon={<Users className="size-4" />}
        />
        <Metric
          label="Discount given"
          value={`AED ${money(data.metrics.discountGiven)}`}
          icon={<CircleDollarSign className="size-4" />}
        />
        <Metric
          label="Net revenue"
          value={`AED ${money(data.metrics.netRevenue)}`}
          icon={<CircleDollarSign className="size-4" />}
        />
      </section>

      <details className="mt-6 border border-bloom-border bg-white" open={data.discounts.length === 0}>
        <summary className="cursor-pointer list-none px-5 py-4">
          <p className="text-sm font-semibold">Create promotion</p>
          <p className="mt-1 text-[11px] text-bloom-muted">
            Manual codes and automatic promotions use the same eligibility engine.
          </p>
        </summary>
        <div className="border-t border-bloom-border p-5">
          <DiscountForm
            action={createDiscount}
            products={data.products}
            collections={data.collections}
          />
        </div>
      </details>

      <section className="mt-7 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Promotion library</h2>
          <p className="mt-1 text-[11px] text-bloom-muted">
            Reserved uses are pending checkouts holding a limited redemption slot.
          </p>
        </div>

        {data.discounts.length > 0 ? (
          data.discounts.map((discount) => (
            <article
              key={discount.id}
              className="border border-bloom-border bg-white"
            >
              <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <PromotionStatus value={discount.status} />
                    {discount.automatic ? (
                      <span className="border border-bloom-violet/20 bg-bloom-violet-soft/45 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-violet">
                        automatic
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 font-mono text-base font-semibold text-bloom-plum">
                    {discount.code}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-bloom-muted">
                    {discount.description || "No description"}
                  </p>
                  <p className="mt-2 text-[10px] text-bloom-muted">
                    {discount.type === "PERCENTAGE"
                      ? `${money(Number(discount.value))}% off`
                      : `AED ${money(Number(discount.value))} off`}
                    {" · "}
                    {scopeLabel(discount.scope)}
                    {" · "}
                    {eligibilityLabel(discount.customerEligibility)}
                  </p>
                </div>

                <StatBlock
                  label="Usage"
                  value={`${discount.redemptionCount}${discount.maxRedemptions !== null ? ` / ${discount.maxRedemptions}` : ""}`}
                  hint={
                    discount.reservedRedemptions > 0
                      ? `${discount.reservedRedemptions} currently reserved`
                      : "No pending reservations"
                  }
                />

                <StatBlock
                  label="Discount given"
                  value={`AED ${money(discount.metrics.discountGiven)}`}
                  hint={`${discount.metrics.paidOrders} paid order${discount.metrics.paidOrders === 1 ? "" : "s"}`}
                />

                <StatBlock
                  label="Net revenue"
                  value={`AED ${money(discount.metrics.netRevenue)}`}
                  hint={`${discount.metrics.uniqueCustomers} customer${discount.metrics.uniqueCustomers === 1 ? "" : "s"}`}
                />
              </div>

              <div className="grid gap-3 border-t border-bloom-border bg-[#faf8fa] px-5 py-3 text-[10px] text-bloom-muted sm:grid-cols-3">
                <p>
                  Window:{" "}
                  <span className="font-semibold text-bloom-plum">
                    {promotionWindow(discount.startsAt, discount.endsAt)}
                  </span>
                </p>
                <p>
                  Minimum:{" "}
                  <span className="font-semibold text-bloom-plum">
                    {discount.minimumOrderAmount !== null
                      ? `AED ${money(Number(discount.minimumOrderAmount))}`
                      : "None"}
                  </span>
                </p>
                <p>
                  Per customer:{" "}
                  <span className="font-semibold text-bloom-plum">
                    {discount.maxRedemptionsPerCustomer ?? "Unlimited"}
                  </span>
                </p>
              </div>

              <details className="border-t border-bloom-border">
                <summary className="cursor-pointer list-none px-5 py-3 text-[11px] font-semibold text-bloom-violet">
                  Edit promotion
                </summary>
                <div className="border-t border-bloom-border p-5">
                  <DiscountForm
                    action={updateDiscount}
                    id={discount.id}
                    products={data.products}
                    collections={data.collections}
                    initial={{
                      code: discount.code,
                      description: discount.description ?? "",
                      type: discount.type,
                      scope: discount.scope,
                      customerEligibility: discount.customerEligibility,
                      value: Number(discount.value),
                      minimumOrderAmount:
                        discount.minimumOrderAmount !== null
                          ? Number(discount.minimumOrderAmount)
                          : "",
                      startsAt: dateInput(discount.startsAt),
                      endsAt: dateInput(discount.endsAt),
                      maxRedemptions: discount.maxRedemptions ?? "",
                      maxRedemptionsPerCustomer:
                        discount.maxRedemptionsPerCustomer ?? "",
                      automatic: discount.automatic,
                      priority: discount.priority,
                      isActive: discount.isActive,
                      productIds: discount.products.map(
                        (rule) => rule.productId,
                      ),
                      collectionIds: discount.collections.map(
                        (rule) => rule.collectionId,
                      ),
                    }}
                  />

                  {discount._count.orders === 0 &&
                  discount.redemptionCount === 0 &&
                  discount.reservedRedemptions === 0 ? (
                    <form
                      action={deleteDiscount}
                      className="mt-5 border-t border-red-100 pt-4"
                    >
                      <input type="hidden" name="id" value={discount.id} />
                      <button
                        type="submit"
                        className="h-9 border border-red-200 bg-red-50 px-3 text-[10px] font-semibold text-red-700"
                      >
                        Delete unused promotion
                      </button>
                    </form>
                  ) : (
                    <p className="mt-5 border-t border-bloom-border pt-4 text-[10px] leading-5 text-bloom-muted">
                      This promotion has order history or reserved usage. Keep
                      the audit trail and deactivate it instead of deleting it.
                    </p>
                  )}
                </div>
              </details>
            </article>
          ))
        ) : (
          <div className="border border-bloom-border bg-white px-6 py-12 text-center">
            <p className="text-sm text-bloom-muted">
              No promotions configured yet.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

type ProductOption = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

type CollectionOption = {
  id: string;
  name: string;
  slug: string;
  featured: boolean;
};

type DiscountInitial = {
  code: string;
  description: string;
  type: "PERCENTAGE" | "FIXED_AMOUNT";
  scope: "ENTIRE_ORDER" | "PRODUCTS" | "COLLECTIONS";
  customerEligibility:
    | "ALL"
    | "NEW_CUSTOMERS"
    | "RETURNING_CUSTOMERS";
  value: number | string;
  minimumOrderAmount: number | string;
  startsAt: string;
  endsAt: string;
  maxRedemptions: number | string;
  maxRedemptionsPerCustomer: number | string;
  automatic: boolean;
  priority: number;
  isActive: boolean;
  productIds: string[];
  collectionIds: string[];
};

function DiscountForm({
  action,
  id,
  products,
  collections,
  initial = {
    code: "",
    description: "",
    type: "PERCENTAGE",
    scope: "ENTIRE_ORDER",
    customerEligibility: "ALL",
    value: 10,
    minimumOrderAmount: "",
    startsAt: "",
    endsAt: "",
    maxRedemptions: "",
    maxRedemptionsPerCustomer: "",
    automatic: false,
    priority: 0,
    isActive: true,
    productIds: [],
    collectionIds: [],
  },
}: {
  action: (formData: FormData) => void | Promise<void>;
  id?: string;
  products: ProductOption[];
  collections: CollectionOption[];
  initial?: DiscountInitial;
}) {
  const productIds = new Set(initial.productIds);
  const collectionIds = new Set(initial.collectionIds);

  return (
    <form action={action} className="space-y-6">
      {id ? <input type="hidden" name="id" value={id} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field
          name="code"
          label="Code"
          defaultValue={initial.code}
          placeholder="WELCOME10"
          required
        />
        <label>
          <FieldLabel>Type</FieldLabel>
          <select
            name="type"
            defaultValue={initial.type}
            className="mt-2 h-10 w-full border border-bloom-border bg-white px-3 text-xs"
          >
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED_AMOUNT">Fixed amount</option>
          </select>
        </label>
        <Field
          name="value"
          label="Value"
          type="number"
          min="0.01"
          step="0.01"
          defaultValue={initial.value}
          required
        />
        <Field
          name="minimumOrderAmount"
          label="Minimum order AED"
          type="number"
          min="0"
          step="0.01"
          defaultValue={initial.minimumOrderAmount}
        />
      </div>

      <label className="block">
        <FieldLabel>Description</FieldLabel>
        <textarea
          name="description"
          rows={2}
          defaultValue={initial.description}
          placeholder="Internal/customer-facing promotion description"
          className="mt-2 w-full border border-bloom-border px-3 py-2 text-xs outline-none focus:border-bloom-violet"
        />
      </label>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label>
          <FieldLabel>Applies to</FieldLabel>
          <select
            name="scope"
            defaultValue={initial.scope}
            className="mt-2 h-10 w-full border border-bloom-border bg-white px-3 text-xs"
          >
            <option value="ENTIRE_ORDER">Entire order</option>
            <option value="PRODUCTS">Selected products</option>
            <option value="COLLECTIONS">Selected collections</option>
          </select>
        </label>
        <label>
          <FieldLabel>Customer eligibility</FieldLabel>
          <select
            name="customerEligibility"
            defaultValue={initial.customerEligibility}
            className="mt-2 h-10 w-full border border-bloom-border bg-white px-3 text-xs"
          >
            <option value="ALL">All customers</option>
            <option value="NEW_CUSTOMERS">First order only</option>
            <option value="RETURNING_CUSTOMERS">Returning customers</option>
          </select>
        </label>
        <Field
          name="startsAt"
          label="Starts"
          type="date"
          defaultValue={initial.startsAt}
        />
        <Field
          name="endsAt"
          label="Ends"
          type="date"
          defaultValue={initial.endsAt}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field
          name="maxRedemptions"
          label="Global usage limit"
          type="number"
          min="1"
          defaultValue={initial.maxRedemptions}
          placeholder="Unlimited"
        />
        <Field
          name="maxRedemptionsPerCustomer"
          label="Per-customer limit"
          type="number"
          min="1"
          defaultValue={initial.maxRedemptionsPerCustomer}
          placeholder="Unlimited"
        />
        <Field
          name="priority"
          label="Automatic priority"
          type="number"
          min="-1000"
          max="1000"
          defaultValue={initial.priority}
        />
        <div className="grid content-end gap-2">
          <Check
            name="automatic"
            label="Automatic promotion"
            defaultChecked={initial.automatic}
          />
          <Check
            name="isActive"
            label="Active"
            defaultChecked={initial.isActive}
          />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <TargetBox
          title="Product targets"
          hint="Used only when Applies to = Selected products."
        >
          {products.length > 0 ? (
            products.map((product) => (
              <Check
                key={product.id}
                name="productIds"
                value={product.id}
                label={product.name}
                hint={product.status.toLowerCase()}
                defaultChecked={productIds.has(product.id)}
              />
            ))
          ) : (
            <p className="text-xs text-bloom-muted">No products available.</p>
          )}
        </TargetBox>

        <TargetBox
          title="Collection targets"
          hint="Used only when Applies to = Selected collections."
        >
          {collections.length > 0 ? (
            collections.map((collection) => (
              <Check
                key={collection.id}
                name="collectionIds"
                value={collection.id}
                label={collection.name}
                hint={collection.featured ? "featured" : undefined}
                defaultChecked={collectionIds.has(collection.id)}
              />
            ))
          ) : (
            <p className="text-xs text-bloom-muted">No collections available.</p>
          )}
        </TargetBox>
      </div>

      <p className="text-[10px] leading-5 text-bloom-muted">
        Automatic promotions are selected by highest priority, then highest
        customer saving within the same priority. A manually entered code
        always takes precedence. Limited uses are
        reserved during pending checkout and released if checkout expires.
      </p>

      <button
        type="submit"
        className="h-10 bg-bloom-plum px-5 text-xs font-semibold text-white"
      >
        {id ? "Save promotion" : "Create promotion"}
      </button>
    </form>
  );
}

function TargetBox({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-bloom-border bg-[#faf8fa] p-4">
      <p className="text-xs font-semibold text-bloom-plum">{title}</p>
      <p className="mt-1 text-[10px] text-bloom-muted">{hint}</p>
      <div className="mt-4 grid max-h-52 gap-2 overflow-y-auto sm:grid-cols-2">
        {children}
      </div>
    </div>
  );
}

function Check({
  name,
  value,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  value?: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-start gap-2 text-xs">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-0.5"
      />
      <span>
        <span className="font-medium text-bloom-plum">{label}</span>
        {hint ? (
          <span className="ml-1 text-[9px] text-bloom-muted">· {hint}</span>
        ) : null}
      </span>
    </label>
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
      <FieldLabel>{label}</FieldLabel>
      <input
        name={name}
        {...props}
        className="mt-2 h-10 w-full border border-bloom-border px-3 text-xs outline-none focus:border-bloom-violet"
      />
    </label>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
      {children}
    </span>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="border border-bloom-border bg-white p-4">
      <div className="flex items-center justify-between text-bloom-muted">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em]">
          {label}
        </p>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-semibold text-bloom-plum">{value}</p>
    </div>
  );
}

function StatBlock({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-bloom-plum">{value}</p>
      <p className="mt-1 text-[10px] text-bloom-muted">{hint}</p>
    </div>
  );
}

function PromotionStatus({ value }: { value: string }) {
  const classes =
    value === "ACTIVE"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : value === "SCHEDULED"
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : value === "LIMIT_REACHED"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={`border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${classes}`}
    >
      {value.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}

function scopeLabel(value: string) {
  if (value === "PRODUCTS") return "selected products";
  if (value === "COLLECTIONS") return "selected collections";
  return "entire order";
}

function eligibilityLabel(value: string) {
  if (value === "NEW_CUSTOMERS") return "first-order customers";
  if (value === "RETURNING_CUSTOMERS") return "returning customers";
  return "all customers";
}

function promotionWindow(startsAt: Date | null, endsAt: Date | null) {
  if (!startsAt && !endsAt) return "Always";
  if (startsAt && endsAt) {
    return `${formatDate(startsAt)} – ${formatDate(endsAt)}`;
  }
  if (startsAt) return `From ${formatDate(startsAt)}`;
  return `Until ${formatDate(endsAt!)}`;
}

function dateInput(date: Date | null) {
  if (!date) return "";
  const local = new Date(date.getTime() + 4 * 60 * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dubai",
  }).format(date);
}

function money(value: number) {
  return value.toLocaleString("en-AE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}
