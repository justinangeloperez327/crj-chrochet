import { Plus } from "lucide-react";

import {
  adjustRawMaterialStock,
  createRawMaterial,
} from "@/app/admin/actions";
import { DatabaseRequired } from "@/components/admin/database-required";
import { StatusBadge } from "@/components/admin/status-badge";
import { listAdminMaterials } from "@/lib/data/admin-repository";

export const metadata = { title: "Raw Materials" };

export default async function AdminMaterialsPage() {
  const data = await listAdminMaterials();

  if (!data) return <DatabaseRequired />;

  const lowStock = data.materials.filter(
    (material) =>
      Number(material.stockOnHand) - Number(material.stockReserved) <=
      Number(material.reorderLevel),
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-pink uppercase">
            Workshop inventory
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">
            Raw materials
          </h1>
          <p className="mt-2 text-sm text-bloom-muted">
            Yarn, structure, and wrapping stock used by production recipes.
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold">{lowStock.length}</p>
          <p className="text-[10px] uppercase tracking-[0.08em] text-bloom-muted">
            low-stock materials
          </p>
        </div>
      </div>

      <section className="mt-7 overflow-hidden border border-bloom-border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[1250px] w-full text-left text-xs">
            <thead className="border-b border-bloom-border bg-[#faf8fa] text-[10px] uppercase tracking-[0.08em] text-bloom-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Material</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Unit</th>
                <th className="px-5 py-3 text-right font-semibold">On hand</th>
                <th className="px-5 py-3 text-right font-semibold">Reserved</th>
                <th className="px-5 py-3 text-right font-semibold">Available</th>
                <th className="px-5 py-3 text-right font-semibold">Reorder</th>
                <th className="px-5 py-3 font-semibold">Adjustment</th>
              </tr>
            </thead>
            <tbody>
              {data.materials.map((material) => {
                const onHand = Number(material.stockOnHand);
                const reserved = Number(material.stockReserved);
                const available = onHand - reserved;
                const reorder = Number(material.reorderLevel);
                const low = available <= reorder;

                return (
                  <tr
                    key={material.id}
                    className="border-b border-bloom-border last:border-b-0"
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold">{material.name}</p>
                      <p className="mt-1 font-mono text-[10px] text-bloom-muted">
                        {material.sku}
                        {material.colorName ? ` · ${material.colorName}` : ""}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-bloom-muted">
                      {material.category}
                    </td>
                    <td className="px-5 py-4 text-bloom-muted">
                      {material.unit.toLowerCase()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span
                        className={
                          "font-semibold " +
                          (low ? "text-amber-600" : "text-bloom-plum")
                        }
                      >
                        {onHand}
                      </span>
                      {low ? (
                        <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-amber-600">
                          low
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4 text-right text-bloom-muted">
                      {reserved}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-bloom-plum">
                      {available}
                    </td>
                    <td className="px-5 py-4 text-right text-bloom-muted">
                      {reorder}
                    </td>
                    <td className="px-5 py-4">
                      <form
                        action={adjustRawMaterialStock}
                        className="flex min-w-[280px] gap-2"
                      >
                        <input type="hidden" name="materialId" value={material.id} />
                        <input
                          name="delta"
                          type="number"
                          step="0.001"
                          required
                          placeholder="+ / -"
                          className="h-9 w-24 border border-bloom-border px-2 text-xs outline-none focus:border-bloom-violet"
                        />
                        <input
                          name="note"
                          placeholder="Reason"
                          className="h-9 min-w-0 flex-1 border border-bloom-border px-2 text-xs outline-none focus:border-bloom-violet"
                        />
                        <button
                          type="submit"
                          className="h-9 bg-bloom-plum px-3 text-[10px] font-semibold text-white"
                        >
                          Apply
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <details className="mt-6 border border-bloom-border bg-white">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-semibold">
          <Plus className="size-4 text-bloom-pink" />
          Add raw material
        </summary>
        <form
          action={createRawMaterial}
          className="grid gap-4 border-t border-bloom-border p-5 sm:grid-cols-2 xl:grid-cols-4"
        >
          <Field name="sku" label="SKU" required placeholder="YARN-BLUE" />
          <Field name="name" label="Name" required placeholder="Blue Yarn" />
          <Field name="category" label="Category" required placeholder="Yarn" />
          <Field name="colorName" label="Color" placeholder="Ocean Blue" />
          <label>
            <span className="text-xs font-semibold">Unit</span>
            <select
              name="unit"
              defaultValue="GRAM"
              className="mt-2 h-10 w-full border border-bloom-border bg-white px-3 text-xs"
            >
              <option value="GRAM">Gram</option>
              <option value="METER">Meter</option>
              <option value="PIECE">Piece</option>
              <option value="ROLL">Roll</option>
              <option value="PACK">Pack</option>
            </select>
          </label>
          <Field name="stockOnHand" label="Opening stock" type="number" step="0.001" min="0" defaultValue={0} />
          <Field name="reorderLevel" label="Reorder level" type="number" step="0.001" min="0" defaultValue={0} />
          <Field name="unitCost" label="Unit cost" type="number" step="0.0001" min="0" />
          <button
            type="submit"
            className="h-10 w-fit bg-bloom-violet px-4 text-xs font-semibold text-white"
          >
            Create material
          </button>
        </form>
      </details>

      <section className="mt-6 overflow-hidden border border-bloom-border bg-white">
        <div className="border-b border-bloom-border px-5 py-4">
          <h2 className="text-sm font-semibold">Recent material movements</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-xs">
            <thead className="border-b border-bloom-border bg-[#faf8fa] text-[10px] uppercase tracking-[0.08em] text-bloom-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Material</th>
                <th className="px-5 py-3 font-semibold">Reference</th>
                <th className="px-5 py-3 text-right font-semibold">Qty</th>
                <th className="px-5 py-3 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody>
              {data.movements.map((movement) => (
                <tr
                  key={movement.id}
                  className="border-b border-bloom-border last:border-b-0"
                >
                  <td className="px-5 py-4 text-bloom-muted">
                    {formatDate(movement.createdAt)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge value={movement.type} />
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold">{movement.material.name}</p>
                    <p className="mt-1 font-mono text-[10px] text-bloom-muted">
                      {movement.material.sku}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-bloom-muted">
                    {movement.orderItem?.order.orderNumber ??
                      movement.customBouquetRequest?.referenceNumber ??
                      "—"}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold">
                    {Number(movement.quantity) > 0 ? "+" : ""}
                    {Number(movement.quantity)}
                  </td>
                  <td className="px-5 py-4 text-bloom-muted">
                    {movement.note ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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
        className="mt-2 h-10 w-full border border-bloom-border px-3 text-xs outline-none focus:border-bloom-violet"
      />
    </label>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
