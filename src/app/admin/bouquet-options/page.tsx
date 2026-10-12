import { requireAdmin } from "@/lib/auth/guards";
import { requireDb } from "@/lib/db";
import { saveBouquetOption, saveBouquetRecipe } from "./actions";

export const metadata = { title: "Bouquet Options" };
const inputClass = "mt-1 h-9 w-full border border-bloom-border bg-white px-2 text-xs";

type Option = { id: string; slug: string; isActive: boolean; flowerType?: string; colorName?: string; colorHex?: string; unitPrice?: { toString(): string }; name?: string; description?: string | null; price?: { toString(): string } };
function OptionForm({ kind, option }: { kind: "stem" | "wrap"; option?: Option }) {
  return <form action={saveBouquetOption} data-testid={`${option ? "edit" : "new"}-${kind}`} className="grid gap-3 border border-bloom-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
    <input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={option?.id ?? ""} />
    <Field name="slug" label="Slug" value={option?.slug} />
    {kind === "stem" ? <><Field name="flowerType" label="Flower" value={option?.flowerType} /><Field name="colorName" label="Colour name" value={option?.colorName} /><Field name="colorHex" label="Hex colour" value={option?.colorHex ?? "#E85D9E"} /></> : <><Field name="name" label="Wrapping name" value={option?.name} /><Field name="description" label="Description" value={option?.description ?? ""} required={false} /></>}
    <Field name="price" label="Price (AED)" value={option?.unitPrice?.toString() ?? option?.price?.toString() ?? "0"} type="number" />
    <label className="flex items-center gap-2 text-xs"><input name="isActive" type="checkbox" defaultChecked={option?.isActive ?? true} />Active</label>
    <button className="h-9 bg-bloom-plum px-3 text-xs text-white" type="submit">{option ? "Save option" : "Create option"}</button>
  </form>;
}
function Field({ name, label, value, type = "text", required = true }: { name: string; label: string; value?: string; type?: string; required?: boolean }) {
  return <label className="text-xs">{label}<input className={inputClass} name={name} type={type} defaultValue={value} required={required} maxLength={200} min={type === "number" ? 0 : undefined} max={type === "number" ? 1000000 : undefined} step={type === "number" ? "0.01" : undefined} /></label>;
}

export default async function BouquetOptionsPage() {
  await requireAdmin();
  const db = requireDb();
  const [stems, wraps, materials] = await Promise.all([
    db.bouquetStemOption.findMany({ include: { materials: { include: { material: true } } }, orderBy: { sortOrder: "asc" } }),
    db.bouquetWrapOption.findMany({ include: { materials: { include: { material: true } } }, orderBy: { sortOrder: "asc" } }),
    db.rawMaterial.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  const sections = [
    { kind: "stem" as const, title: "Flower stems", options: stems },
    { kind: "wrap" as const, title: "Wrapping", options: wraps },
  ];
  return <div className="space-y-6">
    <div><h1 className="font-display text-3xl font-semibold">Bouquet options</h1><p className="mt-2 text-sm text-bloom-muted">Configure customer choices and their material recipes. Set a recipe quantity to zero to remove it.</p></div>
    {sections.map(({ kind, title, options }) => <section key={kind} className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2><OptionForm kind={kind} />
      {options.map((option) => <div key={option.id} className="space-y-2 border border-bloom-border p-3">
        <OptionForm kind={kind} option={option} />
        <ul className="text-xs text-bloom-muted">{option.materials.map((recipe) => <li key={recipe.materialId}>{recipe.material.name}: {recipe.quantity.toString()} {recipe.material.unit.toLowerCase()}</li>)}</ul>
        <form action={saveBouquetRecipe} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="kind" value={kind} /><input type="hidden" name="optionId" value={option.id} />
          <label className="text-xs">Material<select name="materialId" required className={inputClass}>{materials.map((material) => <option key={material.id} value={material.id}>{material.name} ({material.unit.toLowerCase()})</option>)}</select></label>
          <label className="text-xs">Quantity per option<input className={inputClass} name="quantity" type="number" min="0" max="1000000" step="0.001" required /></label>
          <button className="h-9 border border-bloom-border px-3 text-xs" type="submit" disabled={materials.length === 0}>Save recipe</button>
        </form>
      </div>)}
    </section>)}
  </div>;
}
