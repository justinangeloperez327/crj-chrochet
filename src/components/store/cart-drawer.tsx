"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, ShoppingBag, X } from "lucide-react";

import { CartLineItem } from "@/components/store/cart-line-item";
import {
  CART_OPEN_EVENT,
  useCart,
  useCartSubtotal,
} from "@/lib/commerce-store";

export function CartDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const cart = useCart();
  const subtotal = useCartSubtotal();

  useEffect(() => {
    function handleOpen() {
      onOpenChange(true);
    }

    window.addEventListener(CART_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(CART_OPEN_EVENT, handleOpen);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onOpenChange(false);
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onOpenChange, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Close shopping bag"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 bg-bloom-plum/35 backdrop-blur-[2px]"
      />

      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-background shadow-2xl">
        <div className="flex h-18 items-center justify-between border-b border-bloom-border px-5 sm:px-6">
          <div>
            <p className="font-display text-2xl font-semibold text-bloom-plum">
              Your basket
            </p>
            <p className="mt-0.5 text-[11px] text-bloom-muted">
              {cart.length === 0
                ? "Waiting for your first bloom"
                : `${cart.length} ${cart.length === 1 ? "selection" : "selections"}`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-9 items-center justify-center border border-bloom-border bg-white text-bloom-plum"
            aria-label="Close shopping bag"
          >
            <X className="size-4" />
          </button>
        </div>

        {cart.length > 0 ? (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              {cart.map((line, index) => (
                <CartLineItem
                  key={`${line.productId}-${line.variant}-${index}`}
                  line={line}
                  index={index}
                  compact
                />
              ))}
            </div>

            <div className="border-t border-bloom-border bg-white px-5 py-5 sm:px-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-bloom-muted">Subtotal</span>
                <span className="text-lg font-semibold text-bloom-plum">
                  AED {subtotal}
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-bloom-muted">
                Delivery charges are confirmed during checkout.
              </p>
              <Link
                href="/checkout"
                onClick={() => onOpenChange(false)}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 bg-bloom-plum px-5 text-sm font-semibold text-white transition-colors hover:bg-[#492847]"
              >
                Checkout
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/cart"
                onClick={() => onOpenChange(false)}
                className="mt-3 flex h-11 w-full items-center justify-center text-sm font-semibold text-bloom-violet"
              >
                View basket
              </Link>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-bloom-pink-soft text-bloom-pink">
              <ShoppingBag className="size-5" />
            </div>
            <p className="mt-5 font-display text-2xl font-semibold text-bloom-plum">
              Your basket is empty.
            </p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-bloom-muted">
              Browse handmade blooms and add something worth keeping.
            </p>
            <Link
              href="/shop"
              onClick={() => onOpenChange(false)}
              className="mt-6 inline-flex h-11 items-center justify-center bg-bloom-plum px-5 text-sm font-semibold text-white"
            >
              Shop blooms
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
