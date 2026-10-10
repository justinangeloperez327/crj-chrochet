"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Gift,
  LockKeyhole,
  ShoppingBag,
} from "lucide-react";
import { useState, type FormEvent } from "react";

import { BloomArtwork } from "@/components/store/bloom-art";
import {
  useCart,
  useCartSubtotal,
  useOrderPreferences,
} from "@/lib/commerce-store";
import { products } from "@/lib/catalog";

type CheckoutStep = "information" | "delivery" | "payment";

export function CheckoutClient({
  cancelled = false,
}: {
  cancelled?: boolean;
}) {
  const cart = useCart();
  const clientSubtotal = useCartSubtotal();
  const preferences = useOrderPreferences();
  const [step, setStep] = useState<CheckoutStep>("information");
  const [email, setEmail] = useState("");
  const [delivery, setDelivery] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    apartment: "",
    city: "",
    emirate: "",
  });
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscountCode, setAppliedDiscountCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountAutomatic, setDiscountAutomatic] = useState(false);
  const [discountDescription, setDiscountDescription] = useState("");
  const [discountError, setDiscountError] = useState("");
  const [discountLoading, setDiscountLoading] = useState(false);
  const [deliveryAmount, setDeliveryAmount] = useState(0);
  const [deliveryError, setDeliveryError] = useState("");
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);

  const currentTotal = Math.max(
    0,
    clientSubtotal - discountAmount + deliveryAmount,
  );

  async function handleInformation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (appliedDiscountCode && !discountAutomatic) {
      setDiscountLoading(true);
      setDiscountError("");

      try {
        const quote = await requestDiscountQuote(appliedDiscountCode);
        applyQuote(quote);
      } catch (error) {
        clearDiscount();
        setDiscountError(
          error instanceof Error
            ? error.message
            : "The discount could not be applied.",
        );
      } finally {
        setDiscountLoading(false);
      }
    } else {
      await refreshAutomaticPromotion();
    }

    setStep("delivery");
  }

  async function handleDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeliveryLoading(true);
    setDeliveryError("");

    try {
      const response = await fetch("/api/delivery/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emirate: delivery.emirate }),
      });
      const payload = (await response.json()) as {
        quote?: { amount: number };
        error?: string;
      };

      if (!response.ok || !payload.quote) {
        throw new Error(payload.error || "Unable to calculate delivery.");
      }

      setDeliveryAmount(payload.quote.amount);
      setStep("payment");
    } catch (error) {
      setDeliveryError(
        error instanceof Error
          ? error.message
          : "Unable to calculate delivery.",
      );
    } finally {
      setDeliveryLoading(false);
    }
  }

  async function applyDiscount() {
    const code = discountCode.trim().toUpperCase();

    if (!code) {
      await refreshAutomaticPromotion();
      return;
    }

    setDiscountLoading(true);
    setDiscountError("");

    try {
      const quote = await requestDiscountQuote(code);
      applyQuote(quote);
    } catch (error) {
      clearDiscount();
      setDiscountError(
        error instanceof Error
          ? error.message
          : "The discount could not be applied.",
      );
    } finally {
      setDiscountLoading(false);
    }
  }

  async function refreshAutomaticPromotion() {
    setDiscountLoading(true);
    setDiscountError("");

    try {
      const quote = await requestDiscountQuote();
      applyQuote(quote);
    } catch {
      clearDiscount();
    } finally {
      setDiscountLoading(false);
    }
  }

  async function requestDiscountQuote(code?: string) {
    const response = await fetch("/api/discounts/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        email,
        items: toCheckoutItems(cart),
      }),
    });
    const payload = (await response.json()) as {
      quote?: {
        discountAmount: number;
        eligibleSubtotal: number;
        discountCode: string | null;
        automatic: boolean;
        description: string | null;
      };
      error?: string;
    };

    if (!response.ok || !payload.quote) {
      throw new Error(
        payload.error || "The discount could not be applied.",
      );
    }

    return payload.quote;
  }

  function applyQuote(quote: {
    discountAmount: number;
    eligibleSubtotal: number;
    discountCode: string | null;
    automatic: boolean;
    description: string | null;
  }) {
    setAppliedDiscountCode(quote.discountCode ?? "");
    setDiscountAmount(quote.discountAmount);
    setDiscountAutomatic(quote.automatic);
    setDiscountDescription(quote.description ?? "");
  }

  function clearDiscount() {
    setAppliedDiscountCode("");
    setDiscountAmount(0);
    setDiscountAutomatic(false);
    setDiscountDescription("");
  }

  async function createOrder() {
    setOrderLoading(true);
    setOrderError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          address: delivery,
          items: toCheckoutItems(cart),
          discountCode: appliedDiscountCode || undefined,
          isGift: preferences.isGift,
          giftMessage: preferences.giftMessage,
          orderNote: preferences.orderNote,
        }),
      });

      const payload = (await response.json()) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error || "Payment could not be started.");
      }

      window.location.assign(payload.checkoutUrl);
    } catch (error) {
      setOrderError(
        error instanceof Error
          ? error.message
          : "The order could not be created.",
      );
    } finally {
      setOrderLoading(false);
    }
  }

  if (cart.length === 0) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-5 text-center">
        <ShoppingBag className="size-7 text-bloom-pink" />
        <h1 className="mt-5 font-display text-4xl font-semibold text-bloom-plum">
          Nothing to check out yet.
        </h1>
        <p className="mt-3 text-sm leading-6 text-bloom-muted">
          Add a handmade bloom to your basket before continuing.
        </p>
        <Link
          href="/shop"
          className="mt-7 inline-flex h-12 items-center bg-bloom-plum px-6 text-sm font-semibold text-white"
        >
          Shop blooms
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CheckoutHeader />

      {cancelled ? (
        <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-center text-xs text-amber-800">
          Payment was cancelled. Your basket is still here and the previous stock reservation was released.
        </div>
      ) : null}

      <main className="mx-auto grid max-w-[1240px] gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_430px] lg:gap-16 lg:py-12">
        <div>
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 text-xs font-semibold text-bloom-muted hover:text-bloom-plum"
          >
            <ArrowLeft className="size-3.5" />
            Back to basket
          </Link>

          <CheckoutProgress step={step} />

          {step === "information" ? (
            <form onSubmit={handleInformation} className="mt-9">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-bloom-pink uppercase">
                Step 1
              </p>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-bloom-plum">
                Contact information
              </h1>
              <p className="mt-3 text-sm leading-6 text-bloom-muted">
                We’ll use this email for the order confirmation and status updates.
              </p>

              <div className="mt-7">
                <Field
                  label="Email address"
                  type="email"
                  required
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                className="mt-7 h-12 bg-bloom-plum px-7 text-sm font-semibold text-white"
              >
                Continue to delivery
              </button>
            </form>
          ) : null}

          {step === "delivery" ? (
            <form onSubmit={handleDelivery} className="mt-9">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-bloom-violet uppercase">
                Step 2
              </p>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-bloom-plum">
                Delivery information
              </h1>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <Field
                  label="First name"
                  required
                  value={delivery.firstName}
                  onChange={(value) =>
                    setDelivery((current) => ({ ...current, firstName: value }))
                  }
                  autoComplete="given-name"
                />
                <Field
                  label="Last name"
                  required
                  value={delivery.lastName}
                  onChange={(value) =>
                    setDelivery((current) => ({ ...current, lastName: value }))
                  }
                  autoComplete="family-name"
                />
                <div className="sm:col-span-2">
                  <Field
                    label="Phone"
                    type="tel"
                    required
                    value={delivery.phone}
                    onChange={(value) =>
                      setDelivery((current) => ({ ...current, phone: value }))
                    }
                    autoComplete="tel"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Field
                    label="Address"
                    required
                    value={delivery.address}
                    onChange={(value) =>
                      setDelivery((current) => ({ ...current, address: value }))
                    }
                    autoComplete="street-address"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Field
                    label="Apartment, suite, or landmark"
                    value={delivery.apartment}
                    onChange={(value) =>
                      setDelivery((current) => ({ ...current, apartment: value }))
                    }
                    autoComplete="address-line2"
                  />
                </div>
                <Field
                  label="City"
                  required
                  value={delivery.city}
                  onChange={(value) =>
                    setDelivery((current) => ({ ...current, city: value }))
                  }
                  autoComplete="address-level2"
                />
                <label className="block">
                  <span className="text-xs font-semibold text-bloom-plum">
                    Emirate
                  </span>
                  <select
                    required
                    value={delivery.emirate}
                    onChange={(event) => {
                      setDeliveryAmount(0);
                      setDeliveryError("");
                      setDelivery((current) => ({
                        ...current,
                        emirate: event.target.value,
                      }));
                    }}
                    className="mt-2 h-12 w-full border border-bloom-border bg-white px-3 text-sm text-bloom-plum outline-none focus:border-bloom-violet"
                  >
                    <option value="">Select emirate</option>
                    <option>Abu Dhabi</option>
                    <option>Dubai</option>
                    <option>Sharjah</option>
                    <option>Ajman</option>
                    <option>Umm Al Quwain</option>
                    <option>Ras Al Khaimah</option>
                    <option>Fujairah</option>
                  </select>
                </label>
              </div>

              <div className="mt-6 border border-bloom-border bg-white p-4">
                <p className="text-sm font-semibold text-bloom-plum">
                  Delivery charge
                </p>
                <p className="mt-1 text-xs leading-5 text-bloom-muted">
                  {deliveryAmount > 0
                    ? `AED ${deliveryAmount} for ${delivery.emirate}`
                    : "Your configured delivery rate will be calculated before payment."}
                </p>
                {deliveryError ? (
                  <p className="mt-2 text-[11px] text-red-600">{deliveryError}</p>
                ) : null}
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep("information")}
                  className="h-12 border border-bloom-border bg-white px-6 text-sm font-semibold text-bloom-plum"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={deliveryLoading}
                  className="h-12 bg-bloom-plum px-7 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {deliveryLoading ? "Calculating…" : "Continue to payment"}
                </button>
              </div>
            </form>
          ) : null}

          {step === "payment" ? (
            <section className="mt-9">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-bloom-pink uppercase">
                Step 3
              </p>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-bloom-plum">
                Review & pay
              </h1>

              <div className="mt-7 border border-bloom-violet/20 bg-bloom-violet-soft/35 p-6">
                <div className="flex size-10 items-center justify-center rounded-full bg-white text-bloom-violet">
                  <LockKeyhole className="size-4" />
                </div>
                <p className="mt-4 text-sm font-semibold text-bloom-plum">
                  Secure payment with Stripe Checkout.
                </p>
                <p className="mt-2 text-xs leading-5 text-bloom-muted">
                  We’ll validate pricing and stock, reserve your ready-stock items,
                  then redirect you to Stripe’s hosted checkout. Your order is only
                  marked paid after a verified Stripe webhook confirms payment.
                </p>
              </div>

              {orderError ? (
                <p className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
                  {orderError}
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setStep("delivery")}
                  className="h-12 border border-bloom-border bg-white px-6 text-sm font-semibold text-bloom-plum"
                >
                  Back to delivery
                </button>
                <button
                  type="button"
                  disabled={orderLoading}
                  onClick={createOrder}
                  className="h-12 bg-bloom-plum px-7 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {orderLoading ? "Starting secure checkout…" : "Pay securely"}
                </button>
              </div>
            </section>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="border border-bloom-border bg-white p-5 sm:p-6">
            <p className="font-display text-2xl font-semibold text-bloom-plum">
              Your order
            </p>

            <div className="mt-5 space-y-4">
              {cart.map((line, index) => {
                const product = products.find(
                  (item) => item.id === line.productId,
                );

                return (
                  <div
                    key={`${line.productId}-${line.variant}-${index}`}
                    className="flex gap-3"
                  >
                    <div className="relative size-16 shrink-0 overflow-hidden border border-bloom-border">
                      <BloomArtwork
                        tone={product?.tone ?? "rose"}
                        compact
                        className="absolute inset-0"
                      />
                      <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-bloom-plum text-[9px] font-bold text-white">
                        {line.quantity}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-bloom-plum">
                        {line.name}
                      </p>
                      <p className="mt-1 text-[10px] leading-4 text-bloom-muted">
                        {line.variant}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs font-semibold text-bloom-plum">
                      AED {line.unitPrice * line.quantity}
                    </p>
                  </div>
                );
              })}
            </div>

            {preferences.isGift ? (
              <div className="mt-5 border-t border-bloom-border pt-5">
                <div className="flex items-center gap-2 text-xs font-semibold text-bloom-plum">
                  <Gift className="size-3.5 text-bloom-pink" />
                  Gift order
                </div>
                {preferences.giftMessage ? (
                  <p className="mt-2 text-[11px] leading-5 text-bloom-muted">
                    “{preferences.giftMessage}”
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 border-t border-bloom-border pt-5">
              <label
                htmlFor="discount-code"
                className="text-xs font-semibold text-bloom-plum"
              >
                Discount code
              </label>
              <div className="mt-2 flex">
                <input
                  id="discount-code"
                  value={discountCode}
                  onChange={(event) => {
                    setDiscountCode(event.target.value.toUpperCase());
                    if (appliedDiscountCode) {
                      clearDiscount();
                    }
                  }}
                  placeholder="WELCOME10"
                  className="h-10 min-w-0 flex-1 border border-bloom-border bg-background px-3 text-xs text-bloom-plum outline-none focus:border-bloom-violet"
                />
                <button
                  type="button"
                  disabled={discountLoading}
                  onClick={applyDiscount}
                  className="h-10 bg-bloom-violet px-4 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {discountLoading ? "Checking…" : "Apply"}
                </button>
              </div>
              {discountError ? (
                <p className="mt-2 text-[11px] leading-4 text-red-600">
                  {discountError}
                </p>
              ) : null}
              {appliedDiscountCode ? (
                <div className="mt-2 text-[11px]">
                  <p className="font-semibold text-bloom-success">
                    {discountAutomatic ? "Automatic · " : ""}
                    {appliedDiscountCode} applied · AED {discountAmount} saved
                  </p>
                  {discountDescription ? (
                    <p className="mt-1 leading-4 text-bloom-muted">
                      {discountDescription}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-5 space-y-3 border-t border-bloom-border pt-5 text-sm">
              <div className="flex justify-between">
                <span className="text-bloom-muted">Subtotal</span>
                <span className="font-semibold text-bloom-plum">
                  AED {clientSubtotal}
                </span>
              </div>
              {discountAmount > 0 ? (
                <div className="flex justify-between">
                  <span className="text-bloom-muted">Discount</span>
                  <span className="font-semibold text-bloom-success">
                    − AED {discountAmount}
                  </span>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <span className="text-bloom-muted">Delivery</span>
                <span className="text-right text-xs font-medium text-bloom-plum">
                  AED {deliveryAmount}
                </span>
              </div>
              <div className="flex justify-between border-t border-bloom-border pt-4">
                <span className="font-semibold text-bloom-plum">
                  Current total
                </span>
                <span className="text-lg font-semibold text-bloom-plum">
                  AED {currentTotal}
                </span>
              </div>
            </div>

            <p className="mt-4 text-[10px] leading-4 text-bloom-muted">
              Final product, discount, delivery, and payment totals are recalculated on the server before Stripe Checkout starts.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}

function CheckoutHeader() {
  return (
    <header className="border-b border-bloom-border bg-white">
      <div className="mx-auto flex h-18 max-w-[1240px] items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-xl font-semibold text-bloom-plum">
            Handmade Blooms
          </span>
          <span className="text-[9px] font-semibold tracking-[0.18em] text-bloom-pink uppercase">
            by CRJ
          </span>
        </Link>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-bloom-muted">
          <LockKeyhole className="size-3.5" />
          Secure checkout
        </div>
      </div>
    </header>
  );
}

function CheckoutProgress({ step }: { step: CheckoutStep }) {
  const steps: CheckoutStep[] = ["information", "delivery", "payment"];
  const currentIndex = steps.indexOf(step);

  return (
    <div className="mt-8 flex items-center">
      {steps.map((item, index) => (
        <div key={item} className="flex flex-1 items-center last:flex-none">
          <div className="flex items-center gap-2">
            <span
              className={
                "flex size-6 items-center justify-center rounded-full text-[10px] font-bold " +
                (index <= currentIndex
                  ? "bg-bloom-plum text-white"
                  : "border border-bloom-border bg-white text-bloom-muted")
              }
            >
              {index < currentIndex ? <Check className="size-3" /> : index + 1}
            </span>
            <span
              className={
                "hidden text-[10px] font-semibold tracking-[0.08em] uppercase sm:inline " +
                (index <= currentIndex
                  ? "text-bloom-plum"
                  : "text-bloom-muted")
              }
            >
              {item}
            </span>
          </div>
          {index < steps.length - 1 ? (
            <div className="mx-3 h-px flex-1 bg-bloom-border" />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-bloom-plum">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        className="mt-2 h-12 w-full border border-bloom-border bg-white px-3 text-sm text-bloom-plum outline-none placeholder:text-bloom-muted/70 focus:border-bloom-violet"
      />
    </label>
  );
}

function toCheckoutItems(
  cart: ReturnType<typeof useCart>,
) {
  return cart.map((line) => ({
    productId: line.productId,
    productSlug: line.productSlug,
    variantSku: line.variantSku,
    colorName: line.colorName,
    sizeName: line.sizeName,
    stems: line.stems,
    variant: line.variant,
    quantity: line.quantity,
  }));
}
