import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { getBusinessReport } from "@/lib/reports/business-report";
import {
  isReportDataset,
  reportFilename,
  reportToCsv,
} from "@/lib/reports/report-csv";

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
  const datasetParam = url.searchParams.get("dataset");
  const dataset = isReportDataset(datasetParam)
    ? datasetParam
    : "summary";

  const report = await getBusinessReport({
    range: url.searchParams.get("range") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  if (!report) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  const csv = "\uFEFF" + reportToCsv(report, dataset);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${reportFilename(report, dataset)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
