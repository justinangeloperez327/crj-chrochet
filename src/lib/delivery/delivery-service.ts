const EMIRATE_ENV_KEYS: Record<string, string> = {
  "abu dhabi": "DELIVERY_RATE_ABU_DHABI_AED",
  dubai: "DELIVERY_RATE_DUBAI_AED",
  sharjah: "DELIVERY_RATE_SHARJAH_AED",
  ajman: "DELIVERY_RATE_AJMAN_AED",
  "umm al quwain": "DELIVERY_RATE_UMM_AL_QUWAIN_AED",
  "ras al khaimah": "DELIVERY_RATE_RAS_AL_KHAIMAH_AED",
  fujairah: "DELIVERY_RATE_FUJAIRAH_AED",
};

export function getDeliveryRate(emirate: string) {
  const normalized = emirate.trim().toLowerCase();
  const key = EMIRATE_ENV_KEYS[normalized];

  if (!key) {
    throw new Error("Unsupported delivery emirate.");
  }

  const specific = parseAmount(process.env[key]);

  if (specific !== null) return specific;

  return parseAmount(process.env.DELIVERY_FLAT_RATE_AED) ?? 0;
}

function parseAmount(value: string | undefined) {
  if (!value?.trim()) return null;

  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Delivery rate configuration is invalid.");
  }

  return Math.round(amount * 100) / 100;
}
