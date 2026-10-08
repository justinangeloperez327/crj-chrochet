"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Gift, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";

import { CartLineItem } from "@/components/store/cart-line-item";
import {
  setOrderPreferences,
  useCart,
  useCartSubtotal,
  useOrderPreferences,
} from "@/lib/commerce-store";

export function CartPageClient() {
  const cart = useCart();
  const subtotal = useCartSubtotal();
  const savedPreferences = useOrderPreferences();
  const [isGift, setIsGift] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [orderNote, setOrderNote] = useState("");

  useEffect(() => {
    setIsGift(savedPreferences.isGift);
    setGiftMessage(savedPreferences.giftMessage);
    setOrderNote(savedPreferences.orderNote);
  }, [savedPreferences]);

  function persistPreferences(next?: Partial<typeof savedPreferences>) {
    setOrderPreferences({
      isGift,
      giftMessage,
      orderNote,
      ...next,
    });
  }

  if (cart.length === 0) {
    return (
      <div className="mx-auto flex min-h-[58vh] max-w-xl flex-col items-center justify-center px-5 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-bloom-pink-soft text-bloom-pink">
          <ShoppingBag className="size-6" />
        </div>
        <h1 className="mt-6 font-display text-4xl font-semibold tracking-[-0.04em] text-bloom-plum">
          Your basket is empty.
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-bloom-muted">
          Start with a ready-to-ship bloom or choose a made-to-order bouquet.
        </p>
        <Link
          href="/shop"
          className="mt-7 inline-flex h-12 items-center gap-2 bg-bloom-plum px-6 text-sm font-semibold text-white"
        >
          Browse blooms
          <ArrowRight className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
      <Link
        href="/shop"
        className="inline-flex items-center gap-2 text-xs font-semibold text-bloom-muted transition-colors hover:text-bloom-plum"
      >
        <ArrowLeft className="size-3.5" />
        Continue shopping
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-14">
        <section>
          <div className="flex items-end justify-between border-b border-bloom-border pb-5">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.18em] text-bloom-pink uppercase">
                Your selection
              </p>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-bloom-plum sm:text-5xl">
                Shopping basket
              </h1>
            </div>
            <p className="text-sm text-bloom-muted">
              {cart.reduce((total, line) => total + line.quantity, 0)} items
            </p>
          </div>

          <div className="mt-6">
            {cart.map((line, index) => (
              <CartLineItem
                key={`${line.productId}-${line.variant}-${index}`}
                line={line}
                index={index}
              />
            ))}
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <section className="border border-bloom-border bg-white p-5">
              <div className="flex items-center gap-3">
                <Gift className="size-4 text-bloom-pink" />
                <label
                  htmlFor="gift-order"
                  className="text-sm font-semibold text-bloom-plum"
                >
                  This is a gift
                </label>
                <input
                  id="gift-order"
                  type="checkbox"
                  checked={isGift}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    setIsGift(checked);
                    persistPreferences({
                      isGift: checked,
                      giftMessage: checked ? giftMessage : "",
                    });
                  }}
                  className="ml-auto size-4 accent-[#e85d9e]"
                />
              </div>

              {isGift ? (
                <div className="mt-5">
                  <label
                    htmlFor="gift-message"
                    className="text-xs font-semibold text-bloom-plum"
                  >
                    Gift message
                  </label>
                  <textarea
                    id="gift-message"
                    rows={4}
                    maxLength={240}
                    value={giftMessage}
                    onChange={(event) => setGiftMessage(event.target.value)}
                    onBlur={() => persistPreferences()}
                    placeholder="Write a short message to include with the bouquet."
                    className="mt-2 w-full resize-none border border-bloom-border bg-background px-3 py-3 text-sm text-bloom-plum outline-none placeholder:text-bloom-muted/70 focus:border-bloom-violet"
                  />
                  <p className="mt-1 text-right text-[10px] text-bloom-muted">
                    {giftMessage.length}/240
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-xs leading-5 text-bloom-muted">
                  We can include a short handwritten-style message with the order.
                </p>
              )}
            </section>

            <section className="border border-bloom-border bg-white p-5">
              <label
                htmlFor="order-note"
                className="text-sm font-semibold text-bloom-plum"
              >
                Order note
              </label>
              <p className="mt-2 text-xs leading-5 text-bloom-muted">
                Add any request we should know before preparing the order.
              </p>
              <textarea
                id="order-note"
                rows={4}
                maxLength={300}
                value={orderNote}
                onChange={(event) => setOrderNote(event.target.value)}
                onBlur={() => persistPreferences()}
                placeholder="Optional preparation note"
                className="mt-3 w-full resize-none border border-bloom-border bg-background px-3 py-3 text-sm text-bloom-plum outline-none placeholder:text-bloom-muted/70 focus:border-bloom-violet"
              />
            </section>
          </div>
        </section>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="border border-bloom-border bg-white p-6">
            <p className="font-display text-2xl font-semibold text-bloom-plum">
              Order summary
            </p>

            <div className="mt-6 space-y-3 border-b border-bloom-border pb-5 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-bloom-muted">Subtotal</span>
                <span className="font-semibold text-bloom-plum">
                  AED {subtotal}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-bloom-muted">Delivery</span>
                <span className="text-right text-xs font-medium text-bloom-plum">
                  Confirmed at checkout
                </span>
              </div>
            </div>

            <div className="flex items-end justify-between gap-4 py-5">
              <span className="text-sm font-semibold text-bloom-plum">
                Current total
              </span>
              <span className="text-2xl font-semibold text-bloom-plum">
                AED {subtotal}
              </span>
            </div>

            <Link
              href="/checkout"
              onClick={() => persistPreferences()}
              className="flex h-12 w-full items-center justify-center gap-2 bg-bloom-plum px-5 text-sm font-semibold text-white transition-colors hover:bg-[#492847]"
            >
              Continue to checkout
              <ArrowRight className="size-4" />
            </Link>

            <p className="mt-4 text-center text-[10px] leading-4 text-bloom-muted">
              Delivery charges and payment are not applied until the next checkout steps.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
