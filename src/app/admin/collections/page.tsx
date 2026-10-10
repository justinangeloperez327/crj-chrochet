import Link from "next/link";
import { ArrowRight, Layers, PackageSearch } from "lucide-react";

import { createCollection } from "@/app/admin/actions";
import { DatabaseRequired } from "@/components/admin/database-required";
import { listAdminCollections } from "@/lib/collections/collection-repository";

export const metadata = { title: "Collections" };

export default async function AdminCollectionsPage() {
  const collections = await listAdminCollections();

  if (!collections) return <DatabaseRequired />;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-violet uppercase">
            Merchandising
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">
            Collections
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-bloom-muted">
            Curate product groups, control storefront visibility, and set the
            manual order customers see inside each collection.
          </p>
        </div>
      </div>

      <details
        className="mt-7 border border-bloom-border bg-white"
        open={collections.length === 0}
      >
        <summary className="cursor-pointer list-none px-5 py-4">
          <p className="text-sm font-semibold">Create collection</p>
          <p className="mt-1 text-[11px] text-bloom-muted">
            Create the collection first, then assign and rank products in its editor.
          </p>
        </summary>
        <form
          action={createCollection}
          className="grid gap-4 border-t border-bloom-border p-5 md:grid-cols-2 xl:grid-cols-4"
        >
          <Field name="name" label="Name" required placeholder="Best Sellers" />
          <Field name="slug" label="Slug" placeholder="best-sellers" />
          <Field
            name="sortOrder"
            label="Collection order"
            type="number"
            defaultValue="0"
          />
          <div className="grid content-end gap-2">
            <Check name="featured" label="Featured on homepage" />
            <Check name="isActive" label="Published" defaultChecked />
          </div>
          <label className="md:col-span-2 xl:col-span-4">
            <FieldLabel>Description</FieldLabel>
            <textarea
              name="description"
              rows={3}
              className="mt-2 w-full border border-bloom-border px-3 py-2 text-xs outline-none focus:border-bloom-violet"
              placeholder="What this collection is for."
            />
          </label>
          <Field
            name="seoTitle"
            label="SEO title"
            placeholder="Best Sellers · Handmade Blooms by CRJ"
            className="md:col-span-2"
          />
          <Field
            name="seoDescription"
            label="SEO description"
            placeholder="Shop the most-loved handmade crochet blooms."
            className="md:col-span-2"
          />
          <div className="md:col-span-2 xl:col-span-4">
            <button
              type="submit"
              className="h-10 bg-bloom-plum px-5 text-xs font-semibold text-white"
            >
              Create collection
            </button>
          </div>
        </form>
      </details>

      <section className="mt-7 overflow-hidden border border-bloom-border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-xs">
            <thead className="border-b border-bloom-border bg-[#faf8fa] text-[10px] uppercase tracking-[0.08em] text-bloom-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Collection</th>
                <th className="px-5 py-3 font-semibold">Storefront</th>
                <th className="px-5 py-3 text-right font-semibold">Order</th>
                <th className="px-5 py-3 text-right font-semibold">Products</th>
                <th className="px-5 py-3 text-right font-semibold">Promotion targets</th>
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {collections.length > 0 ? (
                collections.map((collection) => (
                  <tr
                    key={collection.id}
                    className="border-b border-bloom-border last:border-b-0"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/collections/${collection.id}`}
                        className="font-semibold text-bloom-plum hover:text-bloom-pink"
                      >
                        {collection.name}
                      </Link>
                      <p className="mt-1 text-[10px] text-bloom-muted">
                        /collections/{collection.slug}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <State active={collection.isActive}>
                          {collection.isActive ? "Published" : "Hidden"}
                        </State>
                        {collection.featured ? (
                          <State active>Featured</State>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-semibold">
                      {collection.sortOrder}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {collection._count.products}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {collection._count.discountRules}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/collections/${collection.id}`}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-violet"
                      >
                        Edit
                        <ArrowRight className="size-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-bloom-muted"
                  >
                    <Layers className="mx-auto size-5" />
                    <p className="mt-3">No collections yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-5 flex items-start gap-3 border border-bloom-border bg-[#faf8fa] p-4 text-[10px] leading-5 text-bloom-muted">
        <PackageSearch className="mt-0.5 size-4 shrink-0 text-bloom-violet" />
        <p>
          Product availability and price are not copied into collections. The
          storefront resolves the current active product/variant state when the
          collection is viewed.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  className?: string;
}) {
  return (
    <label className={className}>
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

function Check({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-xs">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
      <span className="font-medium text-bloom-plum">{label}</span>
    </label>
  );
}

function State({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={
        "border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] " +
        (active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-50 text-slate-600")
      }
    >
      {children}
    </span>
  );
}
