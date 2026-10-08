import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { DatabaseRequired } from "@/components/admin/database-required";
import { StatusBadge } from "@/components/admin/status-badge";
import { listAdminProducts } from "@/lib/data/admin-repository";

export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  const products = await listAdminProducts();

  if (!products) return <DatabaseRequired />;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-pink uppercase">
            Catalog
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">
            Products
          </h1>
          <p className="mt-2 text-sm text-bloom-muted">
            Manage storefront products and their sellable SKUs.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex h-10 items-center gap-2 bg-bloom-plum px-4 text-xs font-semibold text-white"
        >
          New product
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <section className="mt-7 overflow-hidden border border-bloom-border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-xs">
            <thead className="border-b border-bloom-border bg-[#faf8fa] text-[10px] uppercase tracking-[0.08em] text-bloom-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Product</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Variants</th>
                <th className="px-5 py-3 font-semibold">Available stock</th>
                <th className="px-5 py-3 font-semibold">Orders</th>
                <th className="px-5 py-3 text-right font-semibold">Base price</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const available = product.variants.reduce(
                  (sum, variant) =>
                    sum + Math.max(0, variant.stockOnHand - variant.stockReserved),
                  0,
                );

                return (
                  <tr
                    key={product.id}
                    className="border-b border-bloom-border last:border-b-0"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="font-semibold hover:text-bloom-pink"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-1 text-[10px] text-bloom-muted">
                        {product.flowerType} · /{product.slug}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge value={product.status} />
                    </td>
                    <td className="px-5 py-4 text-bloom-muted">
                      {product._count.variants}
                    </td>
                    <td className="px-5 py-4 font-semibold">{available}</td>
                    <td className="px-5 py-4 text-bloom-muted">
                      {product._count.orderItems}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold">
                      AED {Number(product.basePrice)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
