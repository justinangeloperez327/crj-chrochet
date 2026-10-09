import Link from "next/link";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Hammer,
  RefreshCw,
  UserRound,
  Wrench,
} from "lucide-react";

import {
  syncProductionQueue,
  updateOrderWorkflow,
  updateProductionPlan,
} from "@/app/admin/actions";
import { DatabaseRequired } from "@/components/admin/database-required";
import { StatusBadge } from "@/components/admin/status-badge";
import { getProductionPlannerData } from "@/lib/production/production-planner";

export const metadata = { title: "Production" };

export default async function ProductionPage() {
  const data = await getProductionPlannerData();

  if (!data) return <DatabaseRequired />;

  const active = data.jobs.filter(
    (job) => !["COMPLETED", "CANCELLED"].includes(job.status),
  );
  const recentlyCompleted = data.jobs
    .filter((job) => job.status === "COMPLETED")
    .slice(0, 12);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-violet uppercase">
            Workshop
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">
            Production planner
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-bloom-muted">
            Prioritize paid made-to-order work, assign the workshop load, and
            catch material shortages before production starts.
          </p>
        </div>

        <form action={syncProductionQueue}>
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-2 border border-bloom-border bg-white px-4 text-xs font-semibold text-bloom-plum"
          >
            <RefreshCw className="size-3.5" />
            Sync paid orders
            {data.metrics.unplanned > 0 ? (
              <span className="bg-bloom-pink-soft px-2 py-0.5 text-[10px] text-bloom-pink">
                {data.metrics.unplanned}
              </span>
            ) : null}
          </button>
        </form>
      </div>

      <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <Metric label="Queued" value={data.metrics.queued} icon={<Clock3 className="size-4" />} />
        <Metric label="Ready to start" value={data.metrics.readyToStart} icon={<CheckCircle2 className="size-4" />} />
        <Metric label="In production" value={data.metrics.inProgress} icon={<Hammer className="size-4" />} />
        <Metric label="Quality check" value={data.metrics.qualityCheck} icon={<Wrench className="size-4" />} />
        <Metric label="Material blocked" value={data.metrics.blocked} icon={<AlertTriangle className="size-4" />} />
        <Metric label="Overdue" value={data.metrics.overdue} icon={<CalendarClock className="size-4" />} />
        <Metric label="Ready for delivery" value={data.metrics.readyForDelivery} icon={<CheckCircle2 className="size-4" />} />
      </section>

      <section className="mt-6 border border-bloom-border bg-white">
        <div className="border-b border-bloom-border px-5 py-4">
          <h2 className="text-sm font-semibold">Workshop workload</h2>
          <p className="mt-1 text-[11px] text-bloom-muted">
            Planned minutes are manual estimates. Unestimated jobs still count
            toward each assignee&apos;s queue.
          </p>
        </div>

        {data.workloads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-[720px] w-full text-left text-xs">
              <thead className="border-b border-bloom-border bg-[#faf8fa] text-[10px] uppercase tracking-[0.08em] text-bloom-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Assignee</th>
                  <th className="px-5 py-3 text-right font-semibold">Jobs</th>
                  <th className="px-5 py-3 text-right font-semibold">Planned</th>
                  <th className="px-5 py-3 text-right font-semibold">Urgent</th>
                  <th className="px-5 py-3 text-right font-semibold">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {data.workloads.map((workload) => (
                  <tr
                    key={workload.assignee}
                    className="border-b border-bloom-border last:border-b-0"
                  >
                    <td className="px-5 py-4 font-semibold">
                      <span className="inline-flex items-center gap-2">
                        <UserRound className="size-3.5 text-bloom-violet" />
                        {workload.assignee}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">{workload.jobs}</td>
                    <td className="px-5 py-4 text-right">
                      {formatMinutes(workload.plannedMinutes)}
                    </td>
                    <td className="px-5 py-4 text-right">{workload.urgent}</td>
                    <td className="px-5 py-4 text-right">
                      <span className={workload.overdue > 0 ? "font-semibold text-red-700" : ""}>
                        {workload.overdue}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-5 py-8 text-center text-xs text-bloom-muted">
            No active production jobs.
          </p>
        )}
      </section>

      <section className="mt-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Production queue</h2>
          <p className="mt-1 text-[11px] text-bloom-muted">
            Queue order respects active stage, priority, due date, then creation time.
          </p>
        </div>

        {active.length > 0 ? (
          active.map((job) => {
            const productionLines = job.order.items.filter(
              (item) => item.productionQuantity > 0,
            );
            const next = nextStage(job.status);

            return (
              <article
                key={job.id}
                className={
                  "border bg-white " +
                  (job.overdue
                    ? "border-red-200"
                    : job.readiness.state === "BLOCKED"
                      ? "border-amber-200"
                      : "border-bloom-border")
                }
              >
                <div className="grid gap-5 p-5 xl:grid-cols-[1.25fr_0.75fr_0.7fr_0.8fr_auto] xl:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <PriorityBadge value={job.priority} />
                      <StatusBadge value={job.status} />
                      <ReadinessBadge value={job.readiness.state} />
                      {job.overdue ? (
                        <span className="border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-red-700">
                          overdue
                        </span>
                      ) : null}
                    </div>

                    <Link
                      href={`/admin/orders/${job.order.id}`}
                      className="mt-3 block text-base font-semibold text-bloom-plum hover:text-bloom-pink"
                    >
                      {job.order.orderNumber}
                    </Link>
                    <p className="mt-1 text-[11px] text-bloom-muted">
                      {job.source.type === "CUSTOM"
                        ? `Custom bouquet · ${job.source.label}`
                        : productionLines.length > 0
                          ? `${productionLines.length} production line${productionLines.length === 1 ? "" : "s"}`
                          : "Production order"}
                    </p>

                    {productionLines.length > 0 ? (
                      <div className="mt-3 space-y-1">
                        {productionLines.map((item) => (
                          <p key={item.id} className="text-[11px] text-bloom-muted">
                            <span className="font-semibold text-bloom-plum">
                              {item.productName}
                            </span>{" "}
                            · {item.sku} · produce {item.productionQuantity}
                            {item.reservedStockQuantity > 0
                              ? ` · stock ${item.reservedStockQuantity}`
                              : ""}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="text-xs">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
                      Due / start
                    </p>
                    <p className={`mt-2 font-semibold ${job.overdue ? "text-red-700" : "text-bloom-plum"}`}>
                      {job.dueAt ? formatDate(job.dueAt) : "No due date"}
                    </p>
                    <p className="mt-1 text-bloom-muted">
                      {job.plannedStartAt
                        ? `Start ${formatDate(job.plannedStartAt)}`
                        : "Start not planned"}
                    </p>
                  </div>

                  <div className="text-xs">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
                      Assignment
                    </p>
                    <p className="mt-2 font-semibold text-bloom-plum">
                      {job.assignedTo || "Unassigned"}
                    </p>
                    <p className="mt-1 text-bloom-muted">
                      {job.plannedMinutes
                        ? formatMinutes(job.plannedMinutes)
                        : "No time estimate"}
                    </p>
                  </div>

                  <div className="text-xs">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
                      Materials
                    </p>
                    <p className="mt-2 font-semibold text-bloom-plum">
                      {materialLabel(job.readiness.state)}
                    </p>
                    {job.readiness.shortages.length > 0 ? (
                      <p className="mt-1 text-amber-700">
                        {job.readiness.shortages.length} shortage
                        {job.readiness.shortages.length === 1 ? "" : "s"}
                      </p>
                    ) : null}
                    {job.readiness.issues.length > 0 ? (
                      <p className="mt-1 text-amber-700">
                        {job.readiness.issues.length} setup issue
                        {job.readiness.issues.length === 1 ? "" : "s"}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    {next && canMove(job.status, job.readiness.state) ? (
                      <form action={updateOrderWorkflow}>
                        <input type="hidden" name="orderId" value={job.order.id} />
                        <input type="hidden" name="paymentStatus" value={job.order.paymentStatus} />
                        <input type="hidden" name="status" value={next.orderStatus} />
                        <button
                          type="submit"
                          className="h-9 bg-bloom-violet px-3 text-[10px] font-semibold text-white"
                        >
                          {next.label}
                        </button>
                      </form>
                    ) : null}
                    <Link
                      href={`/admin/orders/${job.order.id}`}
                      className="inline-flex h-9 items-center border border-bloom-border px-3 text-[10px] font-semibold text-bloom-plum"
                    >
                      Order
                    </Link>
                  </div>
                </div>

                {(job.readiness.shortages.length > 0 ||
                  job.readiness.issues.length > 0 ||
                  job.notes) ? (
                  <details className="border-t border-bloom-border">
                    <summary className="cursor-pointer list-none px-5 py-3 text-[11px] font-semibold text-bloom-muted">
                      Planning details
                    </summary>
                    <div className="grid gap-5 border-t border-bloom-border px-5 py-4 md:grid-cols-2">
                      <div className="text-xs">
                        {job.readiness.issues.map((issue) => (
                          <p key={issue} className="mb-2 text-amber-700">
                            {issue}
                          </p>
                        ))}
                        {job.readiness.shortages.map((shortage) => (
                          <div
                            key={shortage.materialId}
                            className="mb-2 flex justify-between gap-4 border-b border-bloom-border pb-2"
                          >
                            <span>
                              {shortage.sku} · {shortage.name}
                            </span>
                            <span className="text-right text-amber-700">
                              need {round(shortage.required)} / available {round(shortage.available)}
                            </span>
                          </div>
                        ))}
                        {job.notes ? (
                          <p className="mt-3 leading-5 text-bloom-muted">
                            {job.notes}
                          </p>
                        ) : null}
                      </div>

                      <ProductionPlanForm job={job} />
                    </div>
                  </details>
                ) : (
                  <details className="border-t border-bloom-border">
                    <summary className="cursor-pointer list-none px-5 py-3 text-[11px] font-semibold text-bloom-muted">
                      Edit production plan
                    </summary>
                    <div className="border-t border-bloom-border px-5 py-4">
                      <ProductionPlanForm job={job} />
                    </div>
                  </details>
                )}
              </article>
            );
          })
        ) : (
          <div className="border border-bloom-border bg-white px-6 py-12 text-center">
            <p className="text-sm text-bloom-muted">
              No active production jobs. Sync paid orders if you have existing made-to-order work.
            </p>
          </div>
        )}
      </section>

      {recentlyCompleted.length > 0 ? (
        <section className="mt-8 border border-bloom-border bg-white">
          <div className="border-b border-bloom-border px-5 py-4">
            <h2 className="text-sm font-semibold">Recently completed production</h2>
          </div>
          <div className="divide-y divide-bloom-border">
            {recentlyCompleted.map((job) => (
              <div
                key={job.id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 text-xs"
              >
                <div>
                  <Link
                    href={`/admin/orders/${job.order.id}`}
                    className="font-semibold text-bloom-plum hover:text-bloom-pink"
                  >
                    {job.order.orderNumber}
                  </Link>
                  <p className="mt-1 text-[10px] text-bloom-muted">
                    {job.assignedTo || "Unassigned"} · completed{" "}
                    {job.completedAt ? formatDate(job.completedAt) : "—"} ·{" "}
                    {job.order.fulfillmentStatus.replaceAll("_", " ").toLowerCase()}
                  </p>
                </div>
                <StatusBadge value="COMPLETED" />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function ProductionPlanForm({
  job,
}: {
  job: {
    id: string;
    priority: string;
    assignedTo: string | null;
    plannedMinutes: number | null;
    plannedStartAt: Date | null;
    dueAt: Date | null;
    notes: string | null;
  };
}) {
  return (
    <form
      action={updateProductionPlan}
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      <input type="hidden" name="jobId" value={job.id} />
      <label>
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
          Priority
        </span>
        <select
          name="priority"
          defaultValue={job.priority}
          className="mt-2 h-9 w-full border border-bloom-border bg-white px-2 text-xs"
        >
          <option value="LOW">Low</option>
          <option value="NORMAL">Normal</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </label>
      <Field
        name="assignedTo"
        label="Assignee"
        defaultValue={job.assignedTo ?? ""}
        placeholder="Crochet artist / team"
      />
      <Field
        name="plannedMinutes"
        label="Planned minutes"
        type="number"
        min="1"
        defaultValue={job.plannedMinutes ?? ""}
      />
      <Field
        name="plannedStartAt"
        label="Planned start"
        type="date"
        defaultValue={dateInput(job.plannedStartAt)}
      />
      <Field
        name="dueAt"
        label="Due date"
        type="date"
        defaultValue={dateInput(job.dueAt)}
      />
      <label className="sm:col-span-2 xl:col-span-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
          Workshop notes
        </span>
        <textarea
          name="notes"
          rows={3}
          defaultValue={job.notes ?? ""}
          className="mt-2 w-full border border-bloom-border px-3 py-2 text-xs outline-none focus:border-bloom-violet"
        />
      </label>
      <button
        type="submit"
        className="h-9 w-fit bg-bloom-plum px-4 text-[10px] font-semibold text-white"
      >
        Save plan
      </button>
    </form>
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
        className="mt-2 h-9 w-full border border-bloom-border px-2 text-xs outline-none focus:border-bloom-violet"
      />
    </label>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
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

function PriorityBadge({ value }: { value: string }) {
  const classes =
    value === "URGENT"
      ? "border-red-200 bg-red-50 text-red-700"
      : value === "HIGH"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : value === "LOW"
          ? "border-slate-200 bg-slate-50 text-slate-600"
          : "border-bloom-border bg-white text-bloom-muted";

  return (
    <span className={`border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${classes}`}>
      {value.toLowerCase()}
    </span>
  );
}

function ReadinessBadge({ value }: { value: string }) {
  const classes =
    value === "BLOCKED"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : value === "READY" || value === "RESERVED"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-bloom-border bg-[#faf8fa] text-bloom-muted";

  return (
    <span className={`border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${classes}`}>
      {value.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}

function nextStage(status: string) {
  if (status === "QUEUED") {
    return { orderStatus: "IN_PRODUCTION", label: "Start production" };
  }
  if (status === "IN_PROGRESS") {
    return { orderStatus: "QUALITY_CHECK", label: "Send to QC" };
  }
  if (status === "QUALITY_CHECK") {
    return { orderStatus: "READY", label: "Mark ready" };
  }
  return null;
}

function canMove(status: string, readiness: string) {
  if (status !== "QUEUED") return true;
  return readiness === "READY" || readiness === "RESERVED";
}

function materialLabel(value: string) {
  if (value === "READY") return "Available";
  if (value === "RESERVED") return "Reserved";
  if (value === "CONSUMED") return "Consumed";
  if (value === "BLOCKED") return "Blocked";
  return "Not required";
}

function formatMinutes(minutes: number) {
  if (minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function dateInput(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

function round(value: number) {
  return Number(value.toFixed(3));
}
