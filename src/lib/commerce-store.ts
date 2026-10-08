"use client";

import { useSyncExternalStore } from "react";

const CART_KEY = "crj-blooms-cart";
const WISHLIST_KEY = "crj-blooms-wishlist";
const STORE_EVENT = "crj-blooms-store-change";

export type CartLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  variant: string;
};

function readArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T[]) : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, value: T[]) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(STORE_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(STORE_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(STORE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function addToCart(line: CartLine) {
  const cart = readArray<CartLine>(CART_KEY);
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
      quantity: existing.quantity + line.quantity,
    };
  } else {
    cart.push(line);
  }

  writeArray(CART_KEY, cart);
}

export function toggleWishlist(productId: string) {
  const wishlist = readArray<string>(WISHLIST_KEY);
  const next = wishlist.includes(productId)
    ? wishlist.filter((id) => id !== productId)
    : [...wishlist, productId];

  writeArray(WISHLIST_KEY, next);
}

export function useCartCount() {
  return useSyncExternalStore(
    subscribe,
    () =>
      readArray<CartLine>(CART_KEY).reduce(
        (total, line) => total + line.quantity,
        0,
      ),
    () => 0,
  );
}

export function useWishlistCount() {
  return useSyncExternalStore(
    subscribe,
    () => readArray<string>(WISHLIST_KEY).length,
    () => 0,
  );
}

export function useIsWishlisted(productId: string) {
  return useSyncExternalStore(
    subscribe,
    () => readArray<string>(WISHLIST_KEY).includes(productId),
    () => false,
  );
}
