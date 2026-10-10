import Link from "next/link";
import { ArrowLeft, ExternalLink, ShieldAlert } from "lucide-react";
import { notFound } from "next/navigation";

import {
  deleteCollection,
  updateCollection,
  updateCollectionProducts,
} from "@/app/admin/actions";
import { DatabaseRequired } from "@/components/admin/database-required";
import { getAdminCollection } from "@/lib/collections/collection-repository";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata = { title: "Edit Collection" };

export default async function AdminCollectionPage({ params }: Props) {
  const { id } = await params;
  const data = await getAdminCollection(id);

  if (!data) {
    if (!process.env.DATABASE_URL) return <DatabaseRequired />;
    notFound();
  }

  const { collection, products } = data;
  const membership = new Map(
    collection.products.map((item) => [item.productId, item.sortOrder]),
  );

  return (
    <div>
      <Link
        href="/admin/collections"
        className="inline-flex items-center gap-2 text-xs font-semibold text-bloom-muted hover:text-bloom-plum"
      >
        <ArrowLeft className="size-3.5" />
        Collections
      </Link>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-violet uppercase">
            Merchandising
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">
            {collection.name}
          </h1>
          <p className="mt-2 text-sm text-bloom-muted">
            /collections/{collection.slug} · {collection.products.length} assigned
            product{collection.products.length === 1 ? "" : "s"}
          </p>
        </div>

        {collection.isActive ? (
          <Link
            href={`/collections/${collection.slug}`}
            className="inline-flex h-10 items-center gap-2 border border-bloom-border bg-white px-4 text-xs font-semibold text-bloom-plum"
          >
            View storefront
            <ExternalLink className="size-3.5" />
          </Link>
        ) : null}
      </div>

      <section className="mt-7 border border-bloom-border bg-white p-5">
        <h2 className="text-sm font-semibold">Collection details</h2>

        <form
          action={updateCollection}
          className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <input type="hidden" name="id" value={collection.id} />
          <Field
            name="name"
            label="Name"
            defaultValue={collection.name}
            required
          />
          <Field
            name="slug"
            label="Slug"
            defaultValue={collection.slug}
            required
          />
          <Field
            name="sortOrder"
            label="Collection order"
            type="number"
            defaultValue={collection.sortOrder}
          />
          <div className="grid content-end gap-2">
            <Check
              name="featured"
              label="Featured on homepage"
              defaultChecked={collection.featured}
            />
            <Check
              name="isActive"
              label="Published"
              defaultChecked={collection.isActive}
            />
          </div>

          <label className="md:col-span-2 xl:col-span-4">
            <FieldLabel>Description</FieldLabel>
            <textarea
              name="description"
              rows={3}
              defaultValue={collection.description ?? ""}
              className="mt-2 w-full border border-bloom-border px-3 py-2 text-xs outline-none focus:border-bloom-violet"
            />
          </label>

          <Field
            name="seoTitle"
            label="SEO title"
            defaultValue={collection.seoTitle ?? ""}
            className="md:col-span-2"
          />
          <Field
            name="seoDescription"
            label="SEO description"
            defaultValue={collection.seoDescription ?? ""}
            className="md:col-span-2"
          />

          <div className="md:col-span-2 xl:col-span-4">
            <button
              type="submit"
              className="h-10 bg-bloom-plum px-5 text-xs font-semibold text-white"
            >
              Save collection
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 border border-bloom-border bg-white">
        <div className="border-b border-bloom-border px-5 py-4">
          <h2 className="text-sm font-semibold">Products & manual order</h2>
          <p className="mt-1 text-[11px] leading-5 text-bloom-muted">
            Check products to include them. Lower sort-order numbers appear
            first on the storefront.
          </p>
        </div>

        <form action={updateCollectionProducts}>
          <input
            type="hidden"
            name="collectionId"
            value={collection.id}
          />

          <div className="divide-y divide-bloom-border">
            {products.map((product, index) => {
              const assignedOrder = membership.get(product.id);
              const selected = assignedOrder !== undefined;

              return (
                <div
                  key={product.id}
                  className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_170px] sm:items-center"
                >
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      name="productIds"
                      value={product.id}
                      defaultChecked={selected}
                      className="mt-1"
                    />
                    <span>
                      <span className="text-xs font-semibold text-bloom-plum">
                        {product.name}
                      </span>
                      <span className="mt-1 block text-[10px] text-bloom-muted">
                        {product.flowerType} · {product.status.toLowerCase()} · AED{" "}
                        {Number(product.basePrice)}
                      </span>
                    </span>
                  </label>

                  <label>
                    <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
                      Sort order
                    </span>
                    <input
                      type="number"
                      name={`sortOrder_${product.id}`}
                      defaultValue={assignedOrder ?? (index + 1) * 10}
                      min="-10000"
                      max="10000"
                      className="mt-1 h-9 w-full border border-bloom-border px-3 text-xs"
                    />
                  </label>
                </div>
              );
            })}
          </div>

          <div className="border-t border-bloom-border px-5 py-4">
            <button
              type="submit"
              className="h-10 bg-bloom-violet px-5 text-xs font-semibold text-white"
            >
              Save product order
            </button>
          </div>
        </form>
      </section>

      {collection.discountRules.length > 0 ? (
        <section className="mt-6 border border-amber-200 bg-amber-50 p-5">
          <div className="flex gap-3">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />
            <div>
              <h2 className="text-sm font-semibold text-amber-900">
                Promotion dependency
              </h2>
              <p className="mt-1 text-[11px] leading-5 text-amber-800">
                Changes to membership immediately change eligibility for these
                collection-scoped promotions.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {collection.discountRules.map((rule) => (
                  <Link
                    key={rule.discountId}
                    href="/admin/discounts"
                    className="border border-amber-200 bg-white px-2.5 py-1.5 font-mono text-[10px] font-semibold text-amber-900"
                  >
                    {rule.discount.code}
                    {rule.discount.isActive ? " · active" : " · inactive"}
                    {rule.discount.automatic ? " · automatic" : ""}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-6 border border-red-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-red-700">Delete collection</h2>
        {collection.discountRules.length > 0 ? (
          <p className="mt-2 text-[11px] leading-5 text-bloom-muted">
            Remove this collection from all promotion targets before deletion.
          </p>
        ) : (
          <>
            <p className="mt-2 text-[11px] leading-5 text-bloom-muted">
              Deleting a collection removes its product assignments. Products
              themselves are not deleted.
            </p>
            <form action={deleteCollection} className="mt-4">
              <input type="hidden" name="id" value={collection.id} />
              <button
                type="submit"
                className="h-9 border border-red-200 bg-red-50 px-3 text-[10px] font-semibold text-red-700"
              >
                Delete collection
              </button>
            </form>
          </>
        )}
      </section>
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
