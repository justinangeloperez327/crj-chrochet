"use client";

import { useMemo, useSyncExternalStore } from "react";

const CART_KEY = "crj-blooms-cart";
const WISHLIST_KEY = "crj-blooms-wishlist";
const PREFERENCES_KEY = "crj-blooms-order-preferences";
const STORE_EVENT = "crj-blooms-store-change";
export const CART_OPEN_EVENT = "crj-blooms-cart-open";

export type CartLine = {
  productId: string;
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
  return window.localStorage.getItem(key) ?? fallback;
}

function writeRaw(key: string, value: string) {
  window.localStorage.setItem(key, value);
  window.dispatchEvent(new Event(STORE_EVENT));
}

function readCart() {
  try {
    return JSON.parse(readRaw(CART_KEY, "[]")) as CartLine[];
  } catch {
    return [];
  }
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
  const existingIndex = cart.findIndex(
    (item) =>
      item.productId === line.productId &&
      item.variant === line.variant &&
      item.unitPrice === line.unitPrice,
  );

  if (existingIndex >= 0) {
    const existing = cart[existingIndex];
    cart[existingIndex] = {
      ...existing,
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

  const next = wishlist.includes(productId)
    ? wishlist.filter((id) => id !== productId)
    : [...wishlist, productId];

  writeRaw(WISHLIST_KEY, JSON.stringify(next));
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
      return JSON.parse(raw) as CartLine[];
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
