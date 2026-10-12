"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guards";
import { requireDb } from "@/lib/db";

function text(form: FormData, key: string, required = true) {
  const value = form.get(key);
  if (typeof value !== "string" || value.length > 200 || (required && !value.trim())) throw new Error(`Invalid ${key}.`);
  return value.trim();
}
function amount(form: FormData, key: string) {
  const value = Number(text(form, key));
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000) throw new Error(`Invalid ${key}.`);
  return value;
}
function refresh() {
  revalidatePath("/admin/bouquet-options");
  revalidatePath("/build-a-bouquet");
}

export async function saveBouquetOption(form: FormData) {
  await requireAdmin();
  const db = requireDb();
  const kind = text(form, "kind");
  const id = text(form, "id", false);
  const slug = text(form, "slug");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error("Use a lowercase slug with hyphens.");
  const common = { slug, isActive: form.get("isActive") === "on" };
  if (kind === "stem") {
    const colorHex = text(form, "colorHex");
    if (!/^#[a-fA-F0-9]{6}$/.test(colorHex)) throw new Error("Use a six-digit hex colour.");
    const data = { ...common, flowerType: text(form, "flowerType"), colorName: text(form, "colorName"), colorHex, unitPrice: Math.round(amount(form, "price") * 100) / 100 };
    if (id) await db.bouquetStemOption.update({ where: { id }, data });
    else await db.bouquetStemOption.create({ data });
  } else if (kind === "wrap") {
    const data = { ...common, name: text(form, "name"), description: text(form, "description", false) || null, price: Math.round(amount(form, "price") * 100) / 100 };
    if (id) await db.bouquetWrapOption.update({ where: { id }, data });
    else await db.bouquetWrapOption.create({ data });
  } else throw new Error("Invalid option type.");
  refresh();
}

export async function saveBouquetRecipe(form: FormData) {
  await requireAdmin();
  const db = requireDb();
  const kind = text(form, "kind");
  const optionId = text(form, "optionId");
  const materialId = text(form, "materialId");
  const quantity = Math.round(amount(form, "quantity") * 1000) / 1000;
  if (kind === "stem") {
    const where = { stemOptionId_materialId: { stemOptionId: optionId, materialId } };
    if (quantity === 0) await db.bouquetStemMaterial.deleteMany({ where: { stemOptionId: optionId, materialId } });
    else await db.bouquetStemMaterial.upsert({ where, update: { quantity }, create: { stemOptionId: optionId, materialId, quantity } });
  } else if (kind === "wrap") {
    const where = { wrapOptionId_materialId: { wrapOptionId: optionId, materialId } };
    if (quantity === 0) await db.bouquetWrapMaterial.deleteMany({ where: { wrapOptionId: optionId, materialId } });
    else await db.bouquetWrapMaterial.upsert({ where, update: { quantity }, create: { wrapOptionId: optionId, materialId, quantity } });
  } else throw new Error("Invalid option type.");
  refresh();
}
