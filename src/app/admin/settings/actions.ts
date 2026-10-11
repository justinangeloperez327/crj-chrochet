"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/guards";
import { requireDb } from "@/lib/db";
import {
  STORE_SETTINGS_ID,
  defaultStoreSettings,
} from "@/lib/settings/store-settings";

export async function updateStoreSettings(formData: FormData) {
  await requireAdmin();
  const db = requireDb();

  const businessName = required(formData, "businessName", 80);
  const brandByline = required(formData, "brandByline", 40);
  const tagline = required(formData, "tagline", 240);
  const announcementText = required(
    formData,
    "announcementText",
    180,
  );
  const maintenanceMessage = required(
    formData,
    "maintenanceMessage",
    300,
  );
  const defaultCurrency = required(
    formData,
    "defaultCurrency",
    3,
  ).toUpperCase();
  const giftMessageMaxLength = boundedInteger(
    formData,
    "giftMessageMaxLength",
    0,
    1000,
  );
  const orderNoteMaxLength = boundedInteger(
    formData,
    "orderNoteMaxLength",
    0,
    2000,
  );
  const checkoutReservationMinutes = boundedInteger(
    formData,
    "checkoutReservationMinutes",
    30,
    240,
  );
  const productionDefaultMinutes = nullableBoundedInteger(
    formData,
    "productionDefaultMinutes",
    1,
    10080,
  );
  const productionDefaultPriority = enumValue(
    required(formData, "productionDefaultPriority", 20),
    ["LOW", "NORMAL", "HIGH", "URGENT"] as const,
    "production priority",
  );
  const seoTitle = required(formData, "seoTitle", 70);
  const seoDescription = required(
    formData,
    "seoDescription",
    180,
  );

  if (!/^[A-Z]{3}$/.test(defaultCurrency)) {
    throw new Error("Currency must be a 3-letter ISO-style code.");
  }

  if (defaultCurrency !== "AED") {
    throw new Error(
      "The current catalog is single-currency and supports AED only.",
    );
  }

  const data = {
    businessName,
    brandByline,
    tagline,
    supportEmail: optionalEmail(formData, "supportEmail"),
    supportPhone: optional(formData, "supportPhone", 50),
    instagramUrl: optionalUrl(formData, "instagramUrl"),
    facebookUrl: optionalUrl(formData, "facebookUrl"),
    tiktokUrl: optionalUrl(formData, "tiktokUrl"),
    whatsappUrl: optionalUrl(formData, "whatsappUrl"),
    announcementEnabled:
      formData.get("announcementEnabled") === "on",
    announcementText,
    maintenanceMode: formData.get("maintenanceMode") === "on",
    maintenanceMessage,
    defaultCurrency,
    giftOrdersEnabled: formData.get("giftOrdersEnabled") === "on",
    giftMessageMaxLength,
    orderNoteMaxLength,
    checkoutReservationMinutes,
    deliveryFlatRate: nullableAmount(formData, "deliveryFlatRate"),
    deliveryAbuDhabi: nullableAmount(formData, "deliveryAbuDhabi"),
    deliveryDubai: nullableAmount(formData, "deliveryDubai"),
    deliverySharjah: nullableAmount(formData, "deliverySharjah"),
    deliveryAjman: nullableAmount(formData, "deliveryAjman"),
    deliveryUmmAlQuwain: nullableAmount(
      formData,
      "deliveryUmmAlQuwain",
    ),
    deliveryRasAlKhaimah: nullableAmount(
      formData,
      "deliveryRasAlKhaimah",
    ),
    deliveryFujairah: nullableAmount(formData, "deliveryFujairah"),
    productionDefaultPriority,
    productionDefaultMinutes,
    productionDefaultAssignee:
      optional(formData, "productionDefaultAssignee", 120),
    seoTitle,
    seoDescription,
  };

  await db.storeSettings.upsert({
    where: { id: STORE_SETTINGS_ID },
    update: data,
    create: {
      id: STORE_SETTINGS_ID,
      ...data,
    },
  });

  revalidateStoreSettings();
}

export async function resetStoreSettings() {
  await requireAdmin();
  const db = requireDb();

  await db.storeSettings.upsert({
    where: { id: STORE_SETTINGS_ID },
    update: {
      businessName: defaultStoreSettings.businessName,
      brandByline: defaultStoreSettings.brandByline,
      tagline: defaultStoreSettings.tagline,
      supportEmail: null,
      supportPhone: null,
      instagramUrl: null,
      facebookUrl: null,
      tiktokUrl: null,
      whatsappUrl: null,
      announcementEnabled:
        defaultStoreSettings.announcementEnabled,
      announcementText: defaultStoreSettings.announcementText,
      maintenanceMode: false,
      maintenanceMessage:
        defaultStoreSettings.maintenanceMessage,
      defaultCurrency: defaultStoreSettings.defaultCurrency,
      giftOrdersEnabled:
        defaultStoreSettings.giftOrdersEnabled,
      giftMessageMaxLength:
        defaultStoreSettings.giftMessageMaxLength,
      orderNoteMaxLength:
        defaultStoreSettings.orderNoteMaxLength,
      checkoutReservationMinutes:
        defaultStoreSettings.checkoutReservationMinutes,
      deliveryFlatRate: null,
      deliveryAbuDhabi: null,
      deliveryDubai: null,
      deliverySharjah: null,
      deliveryAjman: null,
      deliveryUmmAlQuwain: null,
      deliveryRasAlKhaimah: null,
      deliveryFujairah: null,
      productionDefaultPriority:
        defaultStoreSettings.productionDefaultPriority,
      productionDefaultMinutes: null,
      productionDefaultAssignee: null,
      seoTitle: defaultStoreSettings.seoTitle,
      seoDescription: defaultStoreSettings.seoDescription,
    },
    create: {
      ...defaultStoreSettings,
    },
  });

  revalidateStoreSettings();
}

function revalidateStoreSettings() {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/collections");
  revalidatePath("/collections/[slug]", "page");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/build-a-bouquet");
  revalidatePath("/admin/settings");
}

function required(
  formData: FormData,
  key: string,
  maxLength: number,
) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required.`);
  if (value.length > maxLength) {
    throw new Error(
      `${key} must be ${maxLength} characters or fewer.`,
    );
  }
  return value;
}

function optional(
  formData: FormData,
  key: string,
  maxLength: number,
) {
  const value = String(formData.get(key) ?? "").trim();
  if (value.length > maxLength) {
    throw new Error(
      `${key} must be ${maxLength} characters or fewer.`,
    );
  }
  return value || null;
}

function optionalEmail(formData: FormData, key: string) {
  const value = optional(formData, key, 254);
  if (!value) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error("Support email is invalid.");
  }
  return value.toLowerCase();
}

function optionalUrl(formData: FormData, key: string) {
  const value = optional(formData, key, 500);
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${key} must be a valid URL.`);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`${key} must use http or https.`);
  }

  return url.toString();
}

function boundedInteger(
  formData: FormData,
  key: string,
  min: number,
  max: number,
) {
  const value = Number(formData.get(key));
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(
      `${key} must be a whole number between ${min} and ${max}.`,
    );
  }
  return value;
}

function nullableBoundedInteger(
  formData: FormData,
  key: string,
  min: number,
  max: number,
) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(
      `${key} must be a whole number between ${min} and ${max}.`,
    );
  }
  return value;
}

function nullableAmount(formData: FormData, key: string) {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 10000) {
    throw new Error(
      `${key} must be between AED 0 and AED 10,000.`,
    );
  }
  return Math.round(value * 100) / 100;
}

function enumValue<const T extends readonly string[]>(
  value: string,
  allowed: T,
  label: string,
): T[number] {
  if (!allowed.includes(value)) {
    throw new Error(`Invalid ${label}.`);
  }
  return value as T[number];
}
