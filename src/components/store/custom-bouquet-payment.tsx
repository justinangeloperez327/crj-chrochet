"use client";

import { ArrowRight, CheckCircle2, Clock3 } from "lucide-react";
import { useState, type FormEvent } from "react";

type PaymentQuote = {
  token: string;
  referenceNumber: string;
  customerName: string;
  email: string;
  recipientName: string | null;
  totalStems: number;
  wrappingName: string;
  finalPrice: number;
  leadTimeMinDays: number;
  leadTimeMaxDays: number;
  quoteExpiresAt: string;
  paid: boolean;
  existingCheckoutUrl: string | null;
  cancelled: boolean;
};

export function CustomBouquetPayment({
  quote,
}: {
  quote: PaymentQuote;
}) {
  const [delivery, setDelivery] = useState({
    recipient: quote.recipientName || quote.customerName,
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    emirate: "Abu Dhabi",
    postalCode: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const expired = new Date(quote.quoteExpiresAt) <= new Date();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/custom-bouquets/pay/${encodeURIComponent(quote.token)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(delivery),
        },
      );

      const payload = (await response.json()) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(
          payload.error || "Unable to start secure payment.",
        );
      }

      window.location.assign(payload.checkoutUrl);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to start secure payment.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (quote.paid) {
    return (
      <div className="border border-bloom-border bg-white p-7 text-center sm:p-10">
        <CheckCircle2 className="mx-auto size-10 text-emerald-700" />
        <p className="mt-5 text-[10px] font-semibold tracking-[0.16em] text-emerald-700 uppercase">
          Payment confirmed
        </p>
        <h2 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-bloom-plum">
          Your custom bouquet is confirmed.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-bloom-muted">
          Reference <strong>{quote.referenceNumber}</strong>. CRJ can now move
          the bouquet into production according to the approved design.
        </p>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="border border-bloom-border bg-white p-7 text-center sm:p-10">
        <Clock3 className="mx-auto size-10 text-amber-600" />
        <p className="mt-5 text-[10px] font-semibold tracking-[0.16em] text-amber-700 uppercase">
          Quote expired
        </p>
        <h2 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-bloom-plum">
          This payment link needs to be refreshed.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-bloom-muted">
          Ask CRJ to reissue the quote for {quote.referenceNumber}. No payment
          has been taken.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <form
        onSubmit={submit}
        className="border border-bloom-border bg-white p-5 sm:p-7"
      >
        <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-violet uppercase">
          Delivery details
        </p>
        <h2 className="mt-2 font-display text-3xl font-semibold text-bloom-plum">
          Where should we send the bouquet?
        </h2>

        {quote.cancelled ? (
          <p className="mt-5 border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
            The previous payment was cancelled. Its material reservation was
            released; you can start a fresh secure payment below.
          </p>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field
            label="Recipient"
            value={delivery.recipient}
            required
            onChange={(value) =>
              setDelivery((current) => ({
                ...current,
                recipient: value,
              }))
            }
          />
          <Field
            label="Mobile"
            value={delivery.phone}
            required
            onChange={(value) =>
              setDelivery((current) => ({ ...current, phone: value }))
            }
          />
          <div className="sm:col-span-2">
            <Field
              label="Address"
              value={delivery.addressLine1}
              required
              onChange={(value) =>
                setDelivery((current) => ({
                  ...current,
                  addressLine1: value,
                }))
              }
            />
          </div>
          <div className="sm:col-span-2">
            <Field
              label="Apartment / landmark"
              value={delivery.addressLine2}
              onChange={(value) =>
                setDelivery((current) => ({
                  ...current,
                  addressLine2: value,
                }))
              }
            />
          </div>
          <Field
            label="City"
            value={delivery.city}
            required
            onChange={(value) =>
              setDelivery((current) => ({ ...current, city: value }))
            }
          />
          <label>
            <span className="text-xs font-semibold text-bloom-plum">
              Emirate
            </span>
            <select
              required
              value={delivery.emirate}
              onChange={(event) =>
                setDelivery((current) => ({
                  ...current,
                  emirate: event.target.value,
                }))
              }
              className="mt-2 h-11 w-full border border-bloom-border bg-white px-3 text-sm outline-none focus:border-bloom-violet"
            >
              <option>Abu Dhabi</option>
              <option>Dubai</option>
              <option>Sharjah</option>
              <option>Ajman</option>
              <option>Umm Al Quwain</option>
              <option>Ras Al Khaimah</option>
              <option>Fujairah</option>
            </select>
          </label>
          <Field
            label="Postal code (optional)"
            value={delivery.postalCode}
            onChange={(value) =>
              setDelivery((current) => ({
                ...current,
                postalCode: value,
              }))
            }
          />
        </div>

        <div className="mt-6 border-t border-bloom-border pt-5">
          <p className="text-xs leading-5 text-bloom-muted">
            Delivery is calculated on the server from the selected emirate.
            Raw materials are reserved for 45 minutes only after secure
            checkout starts.
          </p>

          {error ? (
            <p className="mt-3 border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {error}
            </p>
          ) : null}

          {quote.existingCheckoutUrl ? (
            <a
              href={quote.existingCheckoutUrl}
              className="mt-5 inline-flex h-12 items-center gap-2 bg-bloom-violet px-6 text-sm font-semibold text-white"
            >
              Continue existing payment
              <ArrowRight className="size-4" />
            </a>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="mt-5 inline-flex h-12 items-center gap-2 bg-bloom-violet px-6 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Preparing secure payment…" : "Continue to Stripe"}
              <ArrowRight className="size-4" />
            </button>
          )}
        </div>
      </form>

      <aside className="border border-bloom-border bg-[#faf8fa] p-5 lg:sticky lg:top-8 lg:self-start">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-bloom-pink uppercase">
          Approved custom bouquet
        </p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-bloom-plum">
          {quote.referenceNumber}
        </h2>
        <p className="mt-2 text-xs text-bloom-muted">
          {quote.totalStems} stems · {quote.wrappingName}
        </p>

        <div className="mt-6 space-y-3 border-t border-bloom-border pt-5 text-xs">
          <Row label="Bouquet" value={`AED ${quote.finalPrice}`} />
          <Row label="Delivery" value="Calculated next" />
          <Row
            label="Lead time"
            value={`${quote.leadTimeMinDays}–${quote.leadTimeMaxDays} days`}
          />
          <Row
            label="Quote valid until"
            value={formatDate(quote.quoteExpiresAt)}
          />
        </div>

        <p className="mt-5 text-[10px] leading-4 text-bloom-muted">
          Payment is handled by Stripe. The bouquet enters production only
          after payment is verified.
        </p>
      </aside>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label>
      <span className="text-xs font-semibold text-bloom-plum">{label}</span>
      <input
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full border border-bloom-border px-3 text-sm outline-none focus:border-bloom-violet"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-bloom-muted">{label}</span>
      <span className="text-right font-semibold text-bloom-plum">{value}</span>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
