import Link from "next/link";
import {
  ArrowLeft,
  CircleDollarSign,
  Clock3,
  Gift,
  MapPin,
  MessageSquareText,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TicketPercent,
} from "lucide-react";
import { notFound } from "next/navigation";

import {
  createCustomerNote,
  deleteCustomerNote,
  updateCustomerProfile,
} from "@/app/admin/actions";
import { DatabaseRequired } from "@/components/admin/database-required";
import { StatusBadge } from "@/components/admin/status-badge";
import {
  getAdminCustomer,
  type CustomerSegment,
} from "@/lib/customers/customer-repository";

export const metadata = { title: "Customer Profile" };

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminCustomerPage({ params }: Props) {
  const { id } = await params;
  const data = await getAdminCustomer(id);

  if (!data) {
    if (!process.env.DATABASE_URL) return <DatabaseRequired />;
    notFound();
  }

  const { customer, metrics, promotionContext } = data;

  return (
    <div>
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-2 text-xs font-semibold text-bloom-muted hover:text-bloom-plum"
      >
        <ArrowLeft className="size-3.5" />
        Customers
      </Link>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Segment value={metrics.segment} />
            {metrics.registered ? (
              <span className="inline-flex items-center gap-1 border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
                <ShieldCheck className="size-3" />
                registered
              </span>
            ) : (
              <span className="border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                guest profile
              </span>
            )}
            {metrics.atRisk ? (
              <span className="border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                at risk
              </span>
            ) : null}
          </div>

          <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em]">
            {displayName(customer)}
          </h1>
          <p className="mt-2 text-sm text-bloom-muted">
            {customer.email}
            {customer.phone ? ` · ${customer.phone}` : ""}
          </p>
        </div>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric
          label="Lifetime net value"
          value={`AED ${money(metrics.lifetimeNetValue)}`}
          icon={<CircleDollarSign className="size-4" />}
        />
        <Metric
          label="Paid orders"
          value={metrics.paidOrderCount}
          icon={<ShoppingBag className="size-4" />}
        />
        <Metric
          label="Average order"
          value={`AED ${money(metrics.averageOrderValue)}`}
          icon={<Sparkles className="size-4" />}
        />
        <Metric
          label="Discount savings"
          value={`AED ${money(metrics.totalDiscountSavings)}`}
          icon={<TicketPercent className="size-4" />}
        />
        <Metric
          label="Last paid"
          value={metrics.lastPaidAt ? formatDate(metrics.lastPaidAt) : "Never"}
          icon={<Clock3 className="size-4" />}
        />
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="border border-bloom-border bg-white p-5">
            <h2 className="text-sm font-semibold">Customer details</h2>
            <p className="mt-1 text-[11px] leading-5 text-bloom-muted">
              Email is intentionally read-only because it anchors authentication,
              guest checkout history, and promotion usage.
            </p>

            <form
              action={updateCustomerProfile}
              className="mt-5 grid gap-4 sm:grid-cols-2"
            >
              <input type="hidden" name="customerId" value={customer.id} />
              <Field
                name="firstName"
                label="First name"
                defaultValue={customer.firstName ?? ""}
              />
              <Field
                name="lastName"
                label="Last name"
                defaultValue={customer.lastName ?? ""}
              />
              <Field
                name="phone"
                label="Phone"
                defaultValue={customer.phone ?? ""}
              />
              <label>
                <FieldLabel>Email</FieldLabel>
                <input
                  value={customer.email}
                  readOnly
                  className="mt-2 h-10 w-full border border-bloom-border bg-[#faf8fa] px-3 text-xs text-bloom-muted"
                />
              </label>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="h-10 bg-bloom-plum px-5 text-xs font-semibold text-white"
                >
                  Save customer details
                </button>
              </div>
            </form>

            <div className="mt-5 grid gap-3 border-t border-bloom-border pt-4 text-[10px] text-bloom-muted sm:grid-cols-3">
              <p>
                Customer since{" "}
                <strong className="text-bloom-plum">
                  {formatDate(customer.createdAt)}
                </strong>
              </p>
              <p>
                First paid{" "}
                <strong className="text-bloom-plum">
                  {metrics.firstPaidAt ? formatDate(metrics.firstPaidAt) : "—"}
                </strong>
              </p>
              <p>
                Account{" "}
                <strong className="text-bloom-plum">
                  {customer.user
                    ? `${customer.user.role.toLowerCase()} · ${formatDate(customer.user.createdAt)}`
                    : "not registered"}
                </strong>
              </p>
            </div>
          </section>

          <section className="overflow-hidden border border-bloom-border bg-white">
            <div className="border-b border-bloom-border px-5 py-4">
              <h2 className="text-sm font-semibold">Order history</h2>
              <p className="mt-1 text-[11px] text-bloom-muted">
                Up to the 100 most recent orders, including unpaid and cancelled
                history for service context.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[800px] w-full text-left text-xs">
                <thead className="border-b border-bloom-border bg-[#faf8fa] text-[10px] uppercase tracking-[0.08em] text-bloom-muted">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Order</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Items</th>
                    <th className="px-5 py-3 text-right font-semibold">Total</th>
                    <th className="px-5 py-3 text-right font-semibold">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.length > 0 ? (
                    customer.orders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-bloom-border last:border-b-0"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="font-semibold text-bloom-plum hover:text-bloom-pink"
                          >
                            {order.orderNumber}
                          </Link>
                          <p className="mt-1 text-[10px] text-bloom-muted">
                            {formatDateTime(order.createdAt)}
                            {order.discountCodeSnapshot
                              ? ` · ${order.discountCodeSnapshot}`
                              : ""}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            <StatusBadge value={order.status} />
                            <StatusBadge value={order.paymentStatus} />
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {order._count.items}
                        </td>
                        <td className="px-5 py-4 text-right">
                          AED {money(Number(order.total))}
                        </td>
                        <td className="px-5 py-4 text-right font-semibold">
                          AED{" "}
                          {money(
                            Math.max(
                              0,
                              Number(order.total) -
                                Number(order.refundedAmount),
                            ),
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-8 text-center text-bloom-muted"
                      >
                        No orders yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="border border-bloom-border bg-white">
            <div className="border-b border-bloom-border px-5 py-4">
              <h2 className="text-sm font-semibold">Custom bouquets</h2>
            </div>
            <div className="divide-y divide-bloom-border">
              {customer.customBouquetRequests.length > 0 ? (
                customer.customBouquetRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
                  >
                    <div>
                      <Link
                        href={`/admin/custom-bouquets/${request.id}`}
                        className="text-xs font-semibold text-bloom-plum hover:text-bloom-pink"
                      >
                        {request.referenceNumber}
                      </Link>
                      <p className="mt-1 text-[10px] text-bloom-muted">
                        {request.totalStems} stems · {request.wrapping.name} ·{" "}
                        {formatDate(request.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge value={request.status} />
                      <p className="mt-2 text-xs font-semibold">
                        AED{" "}
                        {money(
                          Number(
                            request.finalPrice ??
                              request.estimatedTotal,
                          ),
                        )}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="px-5 py-8 text-center text-xs text-bloom-muted">
                  No custom bouquet requests.
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="border border-bloom-border bg-white p-5">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-bloom-violet" />
              <h2 className="text-sm font-semibold">Saved addresses</h2>
            </div>
            <div className="mt-4 space-y-3">
              {customer.addresses.length > 0 ? (
                customer.addresses.map((address) => (
                  <div
                    key={address.id}
                    className="border border-bloom-border bg-[#faf8fa] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-semibold">
                        {address.label || address.recipient}
                      </p>
                      {address.isDefault ? (
                        <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-bloom-violet">
                          default
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[10px] leading-5 text-bloom-muted">
                      {address.recipient}
                      <br />
                      {address.addressLine1}
                      {address.addressLine2
                        ? `, ${address.addressLine2}`
                        : ""}
                      <br />
                      {address.city}, {address.emirate}
                      {address.phone ? (
                        <>
                          <br />
                          {address.phone}
                        </>
                      ) : null}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-bloom-muted">
                  No saved customer addresses.
                </p>
              )}
            </div>
          </section>

          <section className="border border-bloom-border bg-white p-5">
            <div className="flex items-center gap-2">
              <MessageSquareText className="size-4 text-bloom-pink" />
              <h2 className="text-sm font-semibold">Internal notes</h2>
            </div>
            <p className="mt-1 text-[10px] leading-5 text-bloom-muted">
              Admin-only service context. Never shown to the customer.
            </p>

            <form action={createCustomerNote} className="mt-4">
              <input type="hidden" name="customerId" value={customer.id} />
              <textarea
                name="body"
                required
                maxLength={2000}
                rows={4}
                placeholder="Add service or relationship context…"
                className="w-full border border-bloom-border px-3 py-2 text-xs leading-5 outline-none focus:border-bloom-violet"
              />
              <button
                type="submit"
                className="mt-2 h-9 bg-bloom-plum px-4 text-[10px] font-semibold text-white"
              >
                Add note
              </button>
            </form>

            <div className="mt-5 space-y-3 border-t border-bloom-border pt-4">
              {customer.notes.length > 0 ? (
                customer.notes.map((note) => (
                  <div
                    key={note.id}
                    className="border border-bloom-border bg-[#faf8fa] p-3"
                  >
                    <p className="whitespace-pre-wrap text-[11px] leading-5 text-bloom-plum">
                      {note.body}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-[9px] text-bloom-muted">
                        {note.author?.name ||
                          note.author?.email ||
                          "Former admin"}{" "}
                        · {formatDateTime(note.createdAt)}
                      </p>
                      <form action={deleteCustomerNote}>
                        <input
                          type="hidden"
                          name="customerId"
                          value={customer.id}
                        />
                        <input type="hidden" name="noteId" value={note.id} />
                        <button
                          type="submit"
                          className="text-[9px] font-semibold uppercase tracking-[0.08em] text-red-600"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-bloom-muted">
                  No internal notes yet.
                </p>
              )}
            </div>
          </section>

          <section className="border border-bloom-border bg-white p-5">
            <div className="flex items-center gap-2">
              <TicketPercent className="size-4 text-bloom-violet" />
              <h2 className="text-sm font-semibold">Promotion context</h2>
            </div>
            <p className="mt-1 text-[10px] leading-5 text-bloom-muted">
              Customer-level eligibility only. Product scope, collection scope,
              minimum order, and live capacity are still checked at checkout.
            </p>

            <div className="mt-4 space-y-3">
              {promotionContext.length > 0 ? (
                promotionContext.slice(0, 12).map((promotion) => (
                  <div
                    key={promotion.id}
                    className="border border-bloom-border p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-xs font-semibold text-bloom-plum">
                          {promotion.code}
                        </p>
                        <p className="mt-1 text-[9px] uppercase tracking-[0.08em] text-bloom-muted">
                          {promotion.scope.toLowerCase().replaceAll("_", " ")}
                          {promotion.automatic ? " · automatic" : ""}
                        </p>
                      </div>
                      <span
                        className={
                          "text-[9px] font-semibold uppercase tracking-[0.08em] " +
                          (promotion.customerEligible
                            ? "text-emerald-700"
                            : "text-slate-500")
                        }
                      >
                        {promotion.customerEligible
                          ? "customer eligible"
                          : "not available"}
                      </span>
                    </div>
                    <p className="mt-2 text-[10px] text-bloom-muted">
                      {promotion.value} · {promotion.customerUses} successful use
                      {promotion.customerUses === 1 ? "" : "s"}
                    </p>
                    <p className="mt-1 text-[10px] text-bloom-muted">
                      Saved AED {money(promotion.discountGiven)}
                      {promotion.reservedUses > 0
                        ? ` · ${promotion.reservedUses} reserved`
                        : ""}
                    </p>
                    <p className="mt-1 text-[10px] text-bloom-muted">
                      {promotion.perCustomerRemaining !== null
                        ? `${promotion.perCustomerRemaining} customer use(s) left`
                        : "Unlimited customer uses"}
                      {" · "}
                      {promotion.globalRemaining !== null
                        ? `${promotion.globalRemaining} global use(s) left`
                        : "Unlimited global uses"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-bloom-muted">
                  No currently active promotions.
                </p>
              )}
            </div>
          </section>

          <section className="border border-bloom-border bg-[#faf8fa] p-5">
            <div className="flex items-start gap-3">
              <Gift className="mt-0.5 size-4 shrink-0 text-bloom-pink" />
              <p className="text-[10px] leading-5 text-bloom-muted">
                CRM segmentation is operational, not a marketing-consent
                system. Customer notes and value metrics do not imply consent
                to promotional email or messaging.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
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
      <p className="mt-3 text-lg font-semibold text-bloom-plum">{value}</p>
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
      className={`border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] ${classes}`}
    >
      {value.replaceAll("_", " ").toLowerCase()}
    </span>
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

function displayName(customer: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  const name = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || customer.email;
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
