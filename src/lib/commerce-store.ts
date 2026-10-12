"use client";

import { useMemo, useSyncExternalStore } from "react";

const CART_KEY = "crj-blooms-cart";
const WISHLIST_KEY = "crj-blooms-wishlist";
const PREFERENCES_KEY = "crj-blooms-order-preferences";
const STORE_EVENT = "crj-blooms-store-change";
export const CART_OPEN_EVENT = "crj-blooms-cart-open";

export type CartLine = {
  productId: string;
  productSlug?: string;
  variantSku?: string;
  colorName?: string;
  sizeName?: string;
  stems?: number;
  imageUrl?: string;
  imageAlt?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  variant: string;
};

export type OrderPreferences = {
  isGift: boolean;
  giftMessage: string;
  orderNote: string;
};

const defaultPreferences: OrderPreferences = {
  isGift: false,
  giftMessage: "",
  orderNote: "",
};

function readRaw(key: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  try { return window.localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

function writeRaw(key: string, value: string) {
  window.localStorage.setItem(key, value);
  window.dispatchEvent(new Event(STORE_EVENT));
}

function readCart() {
  try {
    return parseCart(readRaw(CART_KEY, "[]"));
  } catch {
    return [];
  }
}

export function parseCart(raw: string): CartLine[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter((line): line is CartLine => line !== null && typeof line === "object" &&
      typeof line.productId === "string" && typeof line.name === "string" && typeof line.variant === "string" &&
      Number.isInteger(line.quantity) && line.quantity > 0 && line.quantity <= 99 &&
      typeof line.unitPrice === "number" && Number.isFinite(line.unitPrice) && line.unitPrice >= 0).slice(0, 100);
  } catch { return []; }
}

function subscribe(callback: () => void) {
  window.addEventListener(STORE_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(STORE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function openCart() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CART_OPEN_EVENT));
  }
}

export function addToCart(line: CartLine, options?: { open?: boolean }) {
  const cart = readCart();
  const existingIndex = cart.findIndex((item) => {
    if (line.variantSku && item.variantSku) {
      return item.variantSku === line.variantSku;
    }

    return (
      item.productId === line.productId &&
      item.variant === line.variant &&
      item.unitPrice === line.unitPrice
    );
  });

  if (existingIndex >= 0) {
    const existing = cart[existingIndex];
    cart[existingIndex] = {
      ...existing,
      ...line,
      quantity: Math.min(99, existing.quantity + line.quantity),
    };
  } else {
    cart.push(line);
  }

  writeRaw(CART_KEY, JSON.stringify(cart));

  if (options?.open !== false) {
    openCart();
  }
}

export function updateCartLineQuantity(index: number, quantity: number) {
  const cart = readCart();
  if (!cart[index]) return;

  if (quantity <= 0) {
    cart.splice(index, 1);
  } else {
    cart[index] = {
      ...cart[index],
      quantity: Math.min(99, quantity),
    };
  }

  writeRaw(CART_KEY, JSON.stringify(cart));
}

export function removeCartLine(index: number) {
  const cart = readCart();
  if (!cart[index]) return;
  cart.splice(index, 1);
  writeRaw(CART_KEY, JSON.stringify(cart));
}

export function clearCart() {
  writeRaw(CART_KEY, "[]");
}

export function toggleWishlist(productId: string) {
  let wishlist: string[] = [];

  try {
    wishlist = JSON.parse(readRaw(WISHLIST_KEY, "[]")) as string[];
  } catch {
    wishlist = [];
  }

  const wished = !wishlist.includes(productId);
  const next = wished
    ? [...wishlist, productId]
    : wishlist.filter((id) => id !== productId);

  writeRaw(WISHLIST_KEY, JSON.stringify(next));

  void fetch("/api/wishlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productSlug: productId,
      wished,
    }),
  }).catch(() => undefined);
}

export async function syncWishlistFromAccount() {
  try {
    const response = await fetch("/api/wishlist", {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) return;

    const payload = (await response.json()) as {
      productSlugs?: string[];
    };

    if (Array.isArray(payload.productSlugs)) {
      writeRaw(WISHLIST_KEY, JSON.stringify(payload.productSlugs));
    }
  } catch {
    // Guest/local wishlist remains available when account sync is unavailable.
  }
}

export function setOrderPreferences(preferences: OrderPreferences) {
  writeRaw(PREFERENCES_KEY, JSON.stringify(preferences));
}

export function useCart() {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(CART_KEY, "[]"),
    () => "[]",
  );

  return useMemo(() => {
    try {
      return parseCart(raw);
    } catch {
      return [];
    }
  }, [raw]);
}

export function useOrderPreferences() {
  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(PREFERENCES_KEY, JSON.stringify(defaultPreferences)),
    () => JSON.stringify(defaultPreferences),
  );

  return useMemo(() => {
    try {
      return { ...defaultPreferences, ...(JSON.parse(raw) as OrderPreferences) };
    } catch {
      return defaultPreferences;
    }
  }, [raw]);
}

export function useCartCount() {
  const cart = useCart();
  return cart.reduce((total, line) => total + line.quantity, 0);
}

export function useCartSubtotal() {
  const cart = useCart();
  return cart.reduce(
    (total, line) => total + line.unitPrice * line.quantity,
    0,
  );
}

export function useWishlistCount() {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return (JSON.parse(readRaw(WISHLIST_KEY, "[]")) as string[]).length;
      } catch {
        return 0;
      }
    },
    () => 0,
  );
}

export function useIsWishlisted(productId: string) {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return (JSON.parse(readRaw(WISHLIST_KEY, "[]")) as string[]).includes(
          productId,
        );
      } catch {
        return false;
      }
    },
    () => false,
  );
}
