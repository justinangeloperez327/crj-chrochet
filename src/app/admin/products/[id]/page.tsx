import Link from "next/link";
import { ArrowLeft, Archive, Boxes, Plus } from "lucide-react";
import { notFound } from "next/navigation";

import {
  archiveProduct,
  createVariant,
  updateProduct,
  updateVariant,
} from "@/app/admin/actions";
import { DatabaseRequired } from "@/components/admin/database-required";
import { StatusBadge } from "@/components/admin/status-badge";
import { getAdminProduct } from "@/lib/data/admin-repository";

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await getAdminProduct(id);

  if (!product) {
    if (!process.env.DATABASE_URL) return <DatabaseRequired />;
    notFound();
  }

  return (
    <div>
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-2 text-xs font-semibold text-bloom-muted hover:text-bloom-plum"
      >
        <ArrowLeft className="size-3.5" />
        Products
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-pink uppercase">
              Product
            </p>
            <StatusBadge value={product.status} />
          </div>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">
            {product.name}
          </h1>
          <p className="mt-2 text-sm text-bloom-muted">
            {product.variants.length} SKU{product.variants.length === 1 ? "" : "s"} · /{product.slug}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/products/${product.id}/bom`}
            className="inline-flex h-10 items-center gap-2 border border-bloom-violet/30 bg-white px-4 text-xs font-semibold text-bloom-violet"
          >
            <Boxes className="size-3.5" />
            BOM
          </Link>
          {product.status !== "ARCHIVED" ? (
          <form action={archiveProduct}>
            <input type="hidden" name="id" value={product.id} />
            <button
              type="submit"
              className="inline-flex h-10 items-center gap-2 border border-red-200 bg-white px-4 text-xs font-semibold text-red-700"
            >
              <Archive className="size-3.5" />
              Archive
            </button>
          </form>
          ) : null}
        </div>
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="border border-bloom-border bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">Product details</h2>
              <p className="mt-1 text-[11px] text-bloom-muted">
                Storefront identity, status, and base pricing.
              </p>
            </div>
          </div>

          <form action={updateProduct} className="mt-6">
            <input type="hidden" name="id" value={product.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="name" label="Name" defaultValue={product.name} required />
              <Field name="slug" label="Slug" defaultValue={product.slug} required />
              <Field
                name="flowerType"
                label="Flower type"
                defaultValue={product.flowerType}
                required
              />
              <Field
                name="basePrice"
                label="Base price (AED)"
                type="number"
                step="0.01"
                min="0"
                defaultValue={Number(product.basePrice)}
                required
              />
              <Field
                name="compareAtPrice"
                label="Compare-at price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={
                  product.compareAtPrice ? Number(product.compareAtPrice) : ""
                }
              />
              <Field
                name="badge"
                label="Badge"
                defaultValue={product.badge ?? ""}
                placeholder="Best Seller"
              />

              <label>
                <span className="text-xs font-semibold">Status</span>
                <select
                  name="status"
                  defaultValue={product.status}
                  className="mt-2 h-11 w-full border border-bloom-border bg-white px-3 text-sm outline-none focus:border-bloom-violet"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </label>

              <label className="flex items-center gap-3 self-end pb-3 text-sm font-medium">
                <input
                  type="checkbox"
                  name="featured"
                  defaultChecked={product.featured}
                  className="size-4 accent-[#e85d9e]"
                />
                Featured
              </label>

              <label className="sm:col-span-2">
                <span className="text-xs font-semibold">Description</span>
                <textarea
                  name="description"
                  defaultValue={product.description}
                  required
                  rows={5}
                  className="mt-2 w-full border border-bloom-border bg-white px-3 py-3 text-sm outline-none focus:border-bloom-violet"
                />
              </label>

              <Field
                name="seoTitle"
                label="SEO title"
                defaultValue={product.seoTitle ?? ""}
              />
              <Field
                name="seoDescription"
                label="SEO description"
                defaultValue={product.seoDescription ?? ""}
              />
            </div>

            <button
              type="submit"
              className="mt-6 h-11 bg-bloom-plum px-5 text-sm font-semibold text-white"
            >
              Save product
            </button>
          </form>
        </section>

        <section>
          <div className="border border-bloom-border bg-white">
            <div className="flex items-center justify-between border-b border-bloom-border px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold">SKU variants</h2>
                <p className="mt-1 text-[11px] text-bloom-muted">
                  Pricing, options, fulfillment, and reorder settings.
                </p>
              </div>
              <Boxes className="size-4 text-bloom-violet" />
            </div>

            <div className="divide-y divide-bloom-border">
              {product.variants.length > 0 ? (
                product.variants.map((variant) => {
                  const available = variant.stockOnHand - variant.stockReserved;

                  return (
                    <details key={variant.id} className="group">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold">{variant.name}</p>
                            {!variant.isActive ? (
                              <span className="text-[9px] font-semibold uppercase text-bloom-muted">
                                inactive
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-[10px] text-bloom-muted">
                            {variant.sku} · {variant.fulfillmentMode.replaceAll("_", " ").toLowerCase()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${available <= variant.reorderLevel ? "text-amber-600" : "text-bloom-plum"}`}>
                            {available}
                          </p>
                          <p className="text-[9px] uppercase tracking-[0.08em] text-bloom-muted">
                            available
                          </p>
                        </div>
                      </summary>

                      <form
                        action={updateVariant}
                        className="border-t border-bloom-border bg-[#faf8fa] px-5 py-5"
                      >
                        <input type="hidden" name="id" value={variant.id} />
                        <input type="hidden" name="productId" value={product.id} />

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                          <Field name="sku" label="SKU" defaultValue={variant.sku} required />
                          <Field name="name" label="Variant name" defaultValue={variant.name} required />
                          <Field name="colorName" label="Color" defaultValue={variant.colorName ?? ""} />
                          <Field name="colorHex" label="Color hex" defaultValue={variant.colorHex ?? ""} placeholder="#E85D9E" />
                          <Field name="sizeName" label="Size" defaultValue={variant.sizeName ?? ""} />
                          <Field
                            name="stems"
                            label="Stems"
                            type="number"
                            min="1"
                            defaultValue={variant.stems ?? ""}
                          />
                          <Field
                            name="price"
                            label="Price (AED)"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={Number(variant.price)}
                            required
                          />
                          <Field
                            name="cost"
                            label="Cost (AED)"
                            type="number"
                            min="0"
                            step="0.01"
                            defaultValue={variant.cost ? Number(variant.cost) : ""}
                          />

                          <label>
                            <span className="text-xs font-semibold">Fulfillment</span>
                            <select
                              name="fulfillmentMode"
                              defaultValue={variant.fulfillmentMode}
                              className="mt-2 h-11 w-full border border-bloom-border bg-white px-3 text-sm outline-none focus:border-bloom-violet"
                            >
                              <option value="READY_STOCK">Ready stock</option>
                              <option value="MADE_TO_ORDER">Made to order</option>
                              <option value="BOTH">Both</option>
                            </select>
                          </label>

                          <Field
                            name="leadTimeMinDays"
                            label="Lead time min (days)"
                            type="number"
                            min="0"
                            defaultValue={variant.leadTimeMinDays ?? ""}
                          />
                          <Field
                            name="leadTimeMaxDays"
                            label="Lead time max (days)"
                            type="number"
                            min="0"
                            defaultValue={variant.leadTimeMaxDays ?? ""}
                          />
                          <Field
                            name="reorderLevel"
                            label="Reorder level"
                            type="number"
                            min="0"
                            defaultValue={variant.reorderLevel}
                          />

                          <label className="flex items-center gap-3 self-end pb-3 text-xs font-medium">
                            <input
                              type="checkbox"
                              name="trackInventory"
                              defaultChecked={variant.trackInventory}
                              className="size-4 accent-[#7c3aed]"
                            />
                            Track inventory
                          </label>
                          <label className="flex items-center gap-3 self-end pb-3 text-xs font-medium">
                            <input
                              type="checkbox"
                              name="isActive"
                              defaultChecked={variant.isActive}
                              className="size-4 accent-[#e85d9e]"
                            />
                            Active SKU
                          </label>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                          <p className="text-[11px] text-bloom-muted">
                            On hand {variant.stockOnHand} · Reserved {variant.stockReserved} · Available {available}
                          </p>
                          <button
                            type="submit"
                            className="h-10 bg-bloom-plum px-4 text-xs font-semibold text-white"
                          >
                            Save SKU
                          </button>
                        </div>
                      </form>
                    </details>
                  );
                })
              ) : (
                <p className="px-5 py-8 text-center text-xs text-bloom-muted">
                  No variants yet. Add the first sellable SKU below.
                </p>
              )}
            </div>
          </div>

          <details className="mt-5 border border-bloom-border bg-white" open={product.variants.length === 0}>
            <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-semibold">
              <Plus className="size-4 text-bloom-pink" />
              Add SKU variant
            </summary>

            <form action={createVariant} className="border-t border-bloom-border px-5 py-5">
              <input type="hidden" name="productId" value={product.id} />

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Field name="sku" label="SKU" required placeholder="CRJ-TUL-PNK-05" />
                <Field name="name" label="Variant name" required placeholder="Soft Pink · Medium" />
                <Field name="colorName" label="Color" placeholder="Soft Pink" />
                <Field name="colorHex" label="Color hex" placeholder="#E85D9E" />
                <Field name="sizeName" label="Size" placeholder="Medium" />
                <Field name="stems" label="Stems" type="number" min="1" />
                <Field name="price" label="Price (AED)" type="number" min="0" step="0.01" required />
                <Field name="cost" label="Cost (AED)" type="number" min="0" step="0.01" />
                <label>
                  <span className="text-xs font-semibold">Fulfillment</span>
                  <select
                    name="fulfillmentMode"
                    defaultValue="READY_STOCK"
                    className="mt-2 h-11 w-full border border-bloom-border bg-white px-3 text-sm outline-none focus:border-bloom-violet"
                  >
                    <option value="READY_STOCK">Ready stock</option>
                    <option value="MADE_TO_ORDER">Made to order</option>
                    <option value="BOTH">Both</option>
                  </select>
                </label>
                <Field name="leadTimeMinDays" label="Lead time min (days)" type="number" min="0" />
                <Field name="leadTimeMaxDays" label="Lead time max (days)" type="number" min="0" />
                <Field name="reorderLevel" label="Reorder level" type="number" min="0" defaultValue={0} />
                <Field name="stockOnHand" label="Opening stock" type="number" min="0" defaultValue={0} />
                <label className="flex items-center gap-3 self-end pb-3 text-xs font-medium">
                  <input
                    type="checkbox"
                    name="trackInventory"
                    defaultChecked
                    className="size-4 accent-[#7c3aed]"
                  />
                  Track inventory
                </label>
              </div>

              <button
                type="submit"
                className="mt-6 h-10 bg-bloom-violet px-4 text-xs font-semibold text-white"
              >
                Create SKU
              </button>
            </form>
          </details>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
}) {
  return (
    <label>
      <span className="text-xs font-semibold">{label}</span>
      <input
        name={name}
        type={type}
        {...props}
        className="mt-2 h-11 w-full border border-bloom-border bg-white px-3 text-sm outline-none focus:border-bloom-violet"
      />
    </label>
  );
}
