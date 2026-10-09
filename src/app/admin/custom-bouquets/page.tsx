import Link from "next/link";

import { DatabaseRequired } from "@/components/admin/database-required";
import { StatusBadge } from "@/components/admin/status-badge";
import { listAdminCustomBouquets } from "@/lib/data/admin-repository";

export const metadata = { title: "Custom Bouquets" };

export default async function AdminCustomBouquetsPage() {
  const requests = await listAdminCustomBouquets();

  if (!requests) return <DatabaseRequired />;

  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-pink uppercase">
        Handmade requests
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">
        Custom bouquets
      </h1>
      <p className="mt-2 text-sm text-bloom-muted">
        Review customer-designed bouquets and move approved designs into production.
      </p>

      <section className="mt-7 overflow-hidden border border-bloom-border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full text-left text-xs">
            <thead className="border-b border-bloom-border bg-[#faf8fa] text-[10px] uppercase tracking-[0.08em] text-bloom-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Reference</th>
                <th className="px-5 py-3 font-semibold">Customer</th>
                <th className="px-5 py-3 font-semibold">Stems</th>
                <th className="px-5 py-3 font-semibold">Wrapping</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 text-right font-semibold">Estimate</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request.id} className="border-b border-bloom-border last:border-b-0">
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/custom-bouquets/${request.id}`}
                      className="font-semibold hover:text-bloom-pink"
                    >
                      {request.referenceNumber}
                    </Link>
                    <p className="mt-1 text-[10px] text-bloom-muted">
                      {formatDate(request.createdAt)}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-medium">{request.customerName}</p>
                    <p className="mt-1 text-[10px] text-bloom-muted">{request.email}</p>
                  </td>
                  <td className="px-5 py-4 font-semibold">{request.totalStems}</td>
                  <td className="px-5 py-4 text-bloom-muted">{request.wrapping.name}</td>
                  <td className="px-5 py-4"><StatusBadge value={request.status} /></td>
                  <td className="px-5 py-4 text-right font-semibold">
                    AED {Number(request.estimatedTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {requests.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-bloom-muted">
            No custom bouquet requests yet.
          </p>
        ) : null}
      </section>
    </div>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
