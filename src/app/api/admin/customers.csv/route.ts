import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { listAdminCustomers } from "@/lib/customers/customer-repository";

export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const data = await listAdminCustomers({
    q: url.searchParams.get("q") ?? undefined,
    segment: url.searchParams.get("segment") ?? undefined,
    risk: url.searchParams.get("risk") ?? undefined,
  });

  if (!data) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  const rows: Array<Array<string | number | null>> = [
    [
      "customer_id",
      "name",
      "email",
      "phone",
      "account_status",
      "segment",
      "at_risk",
      "paid_orders",
      "total_orders",
      "lifetime_net_value_aed",
      "gross_paid_value_aed",
      "refunded_value_aed",
      "first_paid_at",
      "last_paid_at",
      "saved_addresses",
      "custom_bouquets",
      "internal_notes",
      "customer_since",
    ],
    ...data.customers.map((customer) => [
      customer.id,
      customer.name,
      customer.email,
      customer.phone ?? "",
      customer.registered ? "registered" : "guest",
      customer.segment,
      customer.atRisk ? "yes" : "no",
      customer.paidOrders,
      customer.totalOrders,
      customer.lifetimeNetValue,
      customer.grossPaidValue,
      customer.refundedValue,
      customer.firstPaidAt?.toISOString() ?? "",
      customer.lastPaidAt?.toISOString() ?? "",
      customer.addresses,
      customer.customBouquets,
      customer.notes,
      customer.createdAt.toISOString(),
    ]),
  ];

  const csv =
    "\uFEFF" +
    rows.map((row) => row.map(csvCell).join(",")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="handmade-blooms-customers.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}

function csvCell(value: string | number | null) {
  const text = value === null ? "" : String(value);
  const safe =
    typeof value === "string" &&
    /^[=+\-@]/.test(text.trimStart())
      ? `'${text}`
      : text;

  return `"${safe.replaceAll('"', '""')}"`;
}
