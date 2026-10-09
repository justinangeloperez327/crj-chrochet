export function StatusBadge({ value }: { value: string }) {
  const normalized = value.replaceAll("_", " ").toLowerCase();

  const classes =
    value.includes("CANCEL") || value.includes("FAILED")
      ? "border-red-200 bg-red-50 text-red-700"
      : value.includes("REFUND") || value.includes("RETURN")
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : value.includes("PAID") ||
          value.includes("ACTIVE") ||
          value.includes("DELIVERED") ||
          value.includes("FULFILLED") ||
          value.includes("COMPLETED") ||
          value.includes("SUCCEEDED")
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : value.includes("PRODUCTION") ||
            value.includes("QUALITY") ||
            value.includes("READY") ||
            value.includes("AUTHORIZED") ||
            value.includes("SHIPPED") ||
            value.includes("OUT_FOR_DELIVERY")
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <span
      className={
        "inline-flex border px-2 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase " +
        classes
      }
    >
      {normalized}
    </span>
  );
}
