import Link from "next/link";
import { ArrowLeft, FlaskConical, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";

import {
  removeVariantMaterial,
  setVariantMaterial,
} from "@/app/admin/actions";
import { DatabaseRequired } from "@/components/admin/database-required";
import {
  getAdminProduct,
  listRawMaterialsForBom,
} from "@/lib/data/admin-repository";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProductBomPage({ params }: Props) {
  const { id } = await params;
  const [product, materials] = await Promise.all([
    getAdminProduct(id),
    listRawMaterialsForBom(),
  ]);

  if (!product || !materials) {
    if (!process.env.DATABASE_URL) return <DatabaseRequired />;
    notFound();
  }

  return (
    <div>
      <Link
        href={`/admin/products/${product.id}`}
        className="inline-flex items-center gap-2 text-xs font-semibold text-bloom-muted hover:text-bloom-plum"
      >
        <ArrowLeft className="size-3.5" />
        {product.name}
      </Link>

      <div className="mt-6">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-violet uppercase">
          Production recipe
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">
          Bill of materials
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-bloom-muted">
          Quantities are stored per sellable SKU. Made-to-order SKUs consume these materials once when production starts.
        </p>
      </div>

      <div className="mt-7 space-y-5">
        {product.variants.map((variant) => (
          <section
            key={variant.id}
            className="border border-bloom-border bg-white"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-bloom-border px-5 py-4">
              <div>
                <p className="text-sm font-semibold">{variant.name}</p>
                <p className="mt-1 font-mono text-[10px] text-bloom-muted">
                  {variant.sku} · {variant.fulfillmentMode.replaceAll("_", " ").toLowerCase()}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
                <FlaskConical className="size-3.5 text-bloom-violet" />
                {variant.billOfMaterials.length} materials
              </div>
            </div>

            <div className="p-5">
              {variant.billOfMaterials.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-[650px] w-full text-left text-xs">
                    <thead className="border-b border-bloom-border text-[10px] uppercase tracking-[0.08em] text-bloom-muted">
                      <tr>
                        <th className="py-3 font-semibold">Material</th>
                        <th className="py-3 font-semibold">Unit</th>
                        <th className="py-3 text-right font-semibold">Per SKU</th>
                        <th className="py-3 text-right font-semibold">On hand</th>
                        <th className="py-3 text-right font-semibold"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {variant.billOfMaterials.map((recipe) => (
                        <tr
                          key={recipe.materialId}
                          className="border-b border-bloom-border last:border-b-0"
                        >
                          <td className="py-3">
                            <p className="font-semibold">{recipe.material.name}</p>
                            <p className="mt-1 font-mono text-[10px] text-bloom-muted">
                              {recipe.material.sku}
                            </p>
                          </td>
                          <td className="py-3 text-bloom-muted">
                            {recipe.material.unit.toLowerCase()}
                          </td>
                          <td className="py-3 text-right font-semibold">
                            {Number(recipe.quantity)}
                          </td>
                          <td className="py-3 text-right text-bloom-muted">
                            {Number(recipe.material.stockOnHand)}
                          </td>
                          <td className="py-3 text-right">
                            <form action={removeVariantMaterial}>
                              <input type="hidden" name="productId" value={product.id} />
                              <input type="hidden" name="variantId" value={variant.id} />
                              <input type="hidden" name="materialId" value={recipe.materialId} />
                              <button
                                type="submit"
                                className="inline-flex size-8 items-center justify-center border border-red-200 text-red-600"
                                aria-label={`Remove ${recipe.material.name}`}
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-bloom-muted">
                  No raw-material recipe has been configured for this SKU.
                </p>
              )}

              <form
                action={setVariantMaterial}
                className="mt-5 grid gap-3 border-t border-bloom-border pt-5 sm:grid-cols-[1fr_150px_auto]"
              >
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="variantId" value={variant.id} />
                <label>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
                    Material
                  </span>
                  <select
                    name="materialId"
                    required
                    className="mt-2 h-10 w-full border border-bloom-border bg-white px-3 text-xs"
                  >
                    <option value="">Choose material</option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.id}>
                        {material.sku} · {material.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
                    Quantity
                  </span>
                  <input
                    name="quantity"
                    type="number"
                    min="0.001"
                    step="0.001"
                    required
                    className="mt-2 h-10 w-full border border-bloom-border px-3 text-xs"
                  />
                </label>
                <button
                  type="submit"
                  className="h-10 self-end bg-bloom-violet px-4 text-xs font-semibold text-white"
                >
                  Add / update
                </button>
              </form>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
