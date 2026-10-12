import { NextResponse } from "next/server";

import { autocompleteStorefront } from "@/lib/search/store-search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json(
      { products: [], collections: [] },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  if (q.length > 100) {
    return NextResponse.json(
      { error: "Search query is too long." },
      { status: 400 },
    );
  }

  const results = await autocompleteStorefront(q);

  return NextResponse.json(results, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
