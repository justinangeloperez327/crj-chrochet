import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { createProduct } from "@/app/admin/actions";

export const metadata = { title: "New Product" };

export default function NewProductPage() {
  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-2 text-xs font-semibold text-bloom-muted hover:text-bloom-plum"
      >
        <ArrowLeft className="size-3.5" />
        Products
      </Link>

      <div className="mt-6">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-pink uppercase">
          Catalog
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">
          New product
        </h1>
        <p className="mt-2 text-sm text-bloom-muted">
          Create the product first, then add its concrete SKU variants.
        </p>
      </div>

      <form action={createProduct} className="mt-7 border border-bloom-border bg-white p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Product name" name="name" required />
          <Field label="Slug (optional)" name="slug" placeholder="pink-tulip-bouquet" />
          <Field label="Flower type" name="flowerType" required placeholder="Tulip" />
          <Field label="Base price (AED)" name="basePrice" type="number" required step="0.01" min="0" />
          <Field label="Badge" name="badge" placeholder="Best Seller" />
          <label className="flex items-center gap-3 self-end pb-3 text-sm font-medium">
            <input type="checkbox" name="featured" className="size-4 accent-[#e85d9e]" />
            Featured product
          </label>
          <label className="sm:col-span-2">
            <span className="text-xs font-semibold">Description</span>
            <textarea
              name="description"
              required
              rows={5}
              className="mt-2 w-full border border-bloom-border bg-white px-3 py-3 text-sm outline-none focus:border-bloom-violet"
            />
          </label>
        </div>

        <button
          type="submit"
          className="mt-6 h-11 bg-bloom-plum px-5 text-sm font-semibold text-white"
        >
          Create product
        </button>
      </form>
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
