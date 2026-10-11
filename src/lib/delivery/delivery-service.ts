import {
  getStoreSettings,
  type StoreSettings,
} from "@/lib/settings/store-settings";

const EMIRATE_ENV_KEYS: Record<string, string> = {
  "abu dhabi": "DELIVERY_RATE_ABU_DHABI_AED",
  dubai: "DELIVERY_RATE_DUBAI_AED",
  sharjah: "DELIVERY_RATE_SHARJAH_AED",
  ajman: "DELIVERY_RATE_AJMAN_AED",
  "umm al quwain": "DELIVERY_RATE_UMM_AL_QUWAIN_AED",
  "ras al khaimah": "DELIVERY_RATE_RAS_AL_KHAIMAH_AED",
  fujairah: "DELIVERY_RATE_FUJAIRAH_AED",
};

export async function getDeliveryRate(emirate: string) {
  const settings = await getStoreSettings();
  return getDeliveryRateFromSettings(emirate, settings);
}

export function getDeliveryRateFromSettings(
  emirate: string,
  settings: StoreSettings,
) {
  const normalized = emirate.trim().toLowerCase();
  const key = EMIRATE_ENV_KEYS[normalized];

  if (!key) {
    throw new Error("Unsupported delivery emirate.");
  }

  const databaseRate = databaseRateForEmirate(
    normalized,
    settings,
  );
  if (databaseRate !== null) return databaseRate;

  if (settings.deliveryFlatRate !== null) {
    return settings.deliveryFlatRate;
  }

  const specific = parseAmount(process.env[key]);
  if (specific !== null) return specific;

  return parseAmount(process.env.DELIVERY_FLAT_RATE_AED) ?? 0;
}

function databaseRateForEmirate(
  emirate: string,
  settings: StoreSettings,
) {
  const rates: Record<string, number | null> = {
    "abu dhabi": settings.deliveryAbuDhabi,
    dubai: settings.deliveryDubai,
    sharjah: settings.deliverySharjah,
    ajman: settings.deliveryAjman,
    "umm al quwain": settings.deliveryUmmAlQuwain,
    "ras al khaimah": settings.deliveryRasAlKhaimah,
    fujairah: settings.deliveryFujairah,
  };

  return rates[emirate] ?? null;
}

function parseAmount(value: string | undefined) {
  if (!value?.trim()) return null;

  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Delivery rate configuration is invalid.");
  }

  return Math.round(amount * 100) / 100;
}
