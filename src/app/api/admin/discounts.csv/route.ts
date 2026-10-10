import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { getAdminDiscountData } from "@/lib/discounts/admin-discount-repository";

export async function GET() {
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

  const data = await getAdminDiscountData();

  if (!data) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  const rows: Array<Array<string | number | null>> = [
    [
      "code",
      "status",
      "type",
      "value",
      "scope",
      "customer_eligibility",
      "automatic",
      "priority",
      "starts_at",
      "ends_at",
      "max_redemptions",
      "max_per_customer",
      "reserved_uses",
      "successful_redemptions",
      "paid_orders",
      "unique_customers",
      "discount_given_aed",
      "net_revenue_aed",
      "average_discount_aed",
    ],
    ...data.discounts.map((discount) => [
      discount.code,
      discount.status,
      discount.type,
      Number(discount.value),
      discount.scope,
      discount.customerEligibility,
      discount.automatic ? "yes" : "no",
      discount.priority,
      discount.startsAt?.toISOString() ?? "",
      discount.endsAt?.toISOString() ?? "",
      discount.maxRedemptions,
      discount.maxRedemptionsPerCustomer,
      discount.reservedRedemptions,
      discount.redemptionCount,
      discount.metrics.paidOrders,
      discount.metrics.uniqueCustomers,
      discount.metrics.discountGiven,
      discount.metrics.netRevenue,
      discount.metrics.averageDiscount,
    ]),
  ];

  const csv = "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="handmade-blooms-promotions.csv"',
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
