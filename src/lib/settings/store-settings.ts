import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";

export const STORE_SETTINGS_ID = "primary";

export type StoreSettings = {
  id: string;
  businessName: string;
  brandByline: string;
  tagline: string;
  supportEmail: string | null;
  supportPhone: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  whatsappUrl: string | null;
  announcementEnabled: boolean;
  announcementText: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  defaultCurrency: string;
  giftOrdersEnabled: boolean;
  giftMessageMaxLength: number;
  orderNoteMaxLength: number;
  checkoutReservationMinutes: number;
  deliveryFlatRate: number | null;
  deliveryAbuDhabi: number | null;
  deliveryDubai: number | null;
  deliverySharjah: number | null;
  deliveryAjman: number | null;
  deliveryUmmAlQuwain: number | null;
  deliveryRasAlKhaimah: number | null;
  deliveryFujairah: number | null;
  productionDefaultPriority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  productionDefaultMinutes: number | null;
  productionDefaultAssignee: string | null;
  seoTitle: string;
  seoDescription: string;
};

export const defaultStoreSettings: StoreSettings = {
  id: STORE_SETTINGS_ID,
  businessName: "Handmade Blooms",
  brandByline: "by CRJ",
  tagline:
    "Crochet flowers made stitch by stitch for moments worth keeping.",
  supportEmail: null,
  supportPhone: null,
  instagramUrl: null,
  facebookUrl: null,
  tiktokUrl: null,
  whatsappUrl: null,
  announcementEnabled: true,
  announcementText: "Handmade slowly · Gifted meaningfully",
  maintenanceMode: false,
  maintenanceMessage:
    "We’re refreshing the flower shop. Please check back shortly.",
  defaultCurrency: "AED",
  giftOrdersEnabled: true,
  giftMessageMaxLength: 240,
  orderNoteMaxLength: 300,
  checkoutReservationMinutes: 45,
  deliveryFlatRate: null,
  deliveryAbuDhabi: null,
  deliveryDubai: null,
  deliverySharjah: null,
  deliveryAjman: null,
  deliveryUmmAlQuwain: null,
  deliveryRasAlKhaimah: null,
  deliveryFujairah: null,
  productionDefaultPriority: "NORMAL",
  productionDefaultMinutes: null,
  productionDefaultAssignee: null,
  seoTitle: "Handmade Blooms by CRJ",
  seoDescription:
    "Handmade crochet flowers and bouquets, crafted one stitch at a time.",
};


export async function getStoreSettings(): Promise<StoreSettings> {
  const db = getDb();
  if (!db) return defaultStoreSettings;

  try {
    const settings = await db.storeSettings.findUnique({
      where: { id: STORE_SETTINGS_ID },
    });

    if (!settings) return defaultStoreSettings;

    return normalizeSettings(settings);
  } catch (error) {
    console.error("Store settings unavailable; using code defaults.", error);
    return defaultStoreSettings;
  }
}

export async function getStoreSettingsFromTransaction(
  tx: Prisma.TransactionClient,
): Promise<StoreSettings> {
  const settings = await tx.storeSettings.findUnique({
    where: { id: STORE_SETTINGS_ID },
  });

  return settings ? normalizeSettings(settings) : defaultStoreSettings;
}

function normalizeSettings(
  settings: Prisma.StoreSettingsGetPayload<Record<string, never>>,
): StoreSettings {
  return {
    id: settings.id,
    businessName: settings.businessName,
    brandByline: settings.brandByline,
    tagline: settings.tagline,
    supportEmail: settings.supportEmail,
    supportPhone: settings.supportPhone,
    instagramUrl: settings.instagramUrl,
    facebookUrl: settings.facebookUrl,
    tiktokUrl: settings.tiktokUrl,
    whatsappUrl: settings.whatsappUrl,
    announcementEnabled: settings.announcementEnabled,
    announcementText: settings.announcementText,
    maintenanceMode: settings.maintenanceMode,
    maintenanceMessage: settings.maintenanceMessage,
    defaultCurrency: settings.defaultCurrency,
    giftOrdersEnabled: settings.giftOrdersEnabled,
    giftMessageMaxLength: settings.giftMessageMaxLength,
    orderNoteMaxLength: settings.orderNoteMaxLength,
    checkoutReservationMinutes:
      settings.checkoutReservationMinutes,
    deliveryFlatRate:
      settings.deliveryFlatRate === null
        ? null
        : Number(settings.deliveryFlatRate),
    deliveryAbuDhabi:
      settings.deliveryAbuDhabi === null
        ? null
        : Number(settings.deliveryAbuDhabi),
    deliveryDubai:
      settings.deliveryDubai === null
        ? null
        : Number(settings.deliveryDubai),
    deliverySharjah:
      settings.deliverySharjah === null
        ? null
        : Number(settings.deliverySharjah),
    deliveryAjman:
      settings.deliveryAjman === null
        ? null
        : Number(settings.deliveryAjman),
    deliveryUmmAlQuwain:
      settings.deliveryUmmAlQuwain === null
        ? null
        : Number(settings.deliveryUmmAlQuwain),
    deliveryRasAlKhaimah:
      settings.deliveryRasAlKhaimah === null
        ? null
        : Number(settings.deliveryRasAlKhaimah),
    deliveryFujairah:
      settings.deliveryFujairah === null
        ? null
        : Number(settings.deliveryFujairah),
    productionDefaultPriority:
      settings.productionDefaultPriority,
    productionDefaultMinutes:
      settings.productionDefaultMinutes,
    productionDefaultAssignee:
      settings.productionDefaultAssignee,
    seoTitle: settings.seoTitle,
    seoDescription: settings.seoDescription,
  };
}
