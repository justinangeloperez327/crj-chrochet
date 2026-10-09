"use client";

import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Flower2,
  Minus,
  Plus,
  Send,
} from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

type StemOption = {
  id: string;
  slug: string;
  flowerType: string;
  colorName: string;
  colorHex: string;
  unitPrice: number;
};

type WrapOption = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
};

type SubmittedBouquet = {
  referenceNumber: string;
  totalStems: number;
  estimatedSubtotal: number;
  estimatedTotal: number;
  status: string;
};

export function BouquetBuilder({
  stems,
  wraps,
}: {
  stems: StemOption[];
  wraps: WrapOption[];
}) {
  const [step, setStep] = useState(1);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [wrappingId, setWrappingId] = useState(wraps[0]?.id ?? "");
  const [form, setForm] = useState({
    customerName: "",
    email: "",
    recipientName: "",
    senderName: "",
    giftMessage: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState<SubmittedBouquet | null>(null);

  const selected = stems
    .map((stem) => ({
      ...stem,
      quantity: quantities[stem.id] ?? 0,
    }))
    .filter((stem) => stem.quantity > 0);

  const totalStems = selected.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const wrap = wraps.find((item) => item.id === wrappingId) ?? wraps[0];

  const subtotal = useMemo(
    () =>
      selected.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      ),
    [selected],
  );
  const total = subtotal + (wrap?.price ?? 0);

  function changeQuantity(id: string, delta: number) {
    setQuantities((current) => {
      const next = Math.max(0, Math.min(30, (current[id] ?? 0) + delta));

      return {
        ...current,
        [id]: next,
      };
    });
  }

  function nextStep() {
    setError("");

    if (step === 1 && totalStems < 3) {
      setError("Choose at least 3 stems to continue.");
      return;
    }

    if (step === 1 && totalStems > 30) {
      setError("Online custom bouquets are limited to 30 stems.");
      return;
    }

    if (step === 2 && !wrappingId) {
      setError("Choose a wrapping style.");
      return;
    }

    setStep((current) => Math.min(4, current + 1));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/custom-bouquets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          wrappingId,
          selections: selected.map((item) => ({
            stemOptionId: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      const payload = (await response.json()) as {
        bouquet?: SubmittedBouquet;
        error?: string;
      };

      if (!response.ok || !payload.bouquet) {
        throw new Error(
          payload.error || "Unable to submit your bouquet request.",
        );
      }

      setSubmitted(payload.bouquet);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit your bouquet request.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="border border-bloom-border bg-white p-7 text-center sm:p-10">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-bloom-pink-soft text-bloom-pink">
          <Check className="size-5" />
        </div>
        <p className="mt-5 text-[10px] font-semibold tracking-[0.16em] text-bloom-violet uppercase">
          Request submitted
        </p>
        <h2 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-bloom-plum">
          Your custom bouquet is with CRJ.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-bloom-muted">
          Reference{" "}
          <strong className="text-bloom-plum">
            {submitted.referenceNumber}
          </strong>
          . The estimate is AED {submitted.estimatedTotal} for{" "}
          {submitted.totalStems} stems. We’ll review the design before production.
        </p>
        <Link
          href="/shop"
          className="mt-7 inline-flex h-11 items-center bg-bloom-plum px-5 text-sm font-semibold text-white"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="border border-bloom-border bg-white p-5 sm:p-7">
        <StepHeader current={step} />

        {step === 1 ? (
          <div className="mt-8">
            <p className="text-sm font-semibold text-bloom-plum">
              Choose your flowers
            </p>
            <p className="mt-1 text-xs leading-5 text-bloom-muted">
              Mix flower types and colors. Minimum 3 stems, maximum 30.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {stems.map((stem) => {
                const quantity = quantities[stem.id] ?? 0;

                return (
                  <div
                    key={stem.id}
                    className={
                      "border p-4 transition " +
                      (quantity > 0
                        ? "border-bloom-violet bg-bloom-violet-soft/25"
                        : "border-bloom-border")
                    }
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <span
                          className="mt-0.5 size-7 rounded-full border border-black/5"
                          style={{ backgroundColor: stem.colorHex }}
                        />
                        <div>
                          <p className="text-sm font-semibold text-bloom-plum">
                            {stem.flowerType}
                          </p>
                          <p className="mt-1 text-[11px] text-bloom-muted">
                            {stem.colorName} · AED {stem.unitPrice}/stem
                          </p>
                        </div>
                      </div>

                      <div className="flex h-9 items-center border border-bloom-border bg-white">
                        <button
                          type="button"
                          onClick={() => changeQuantity(stem.id, -1)}
                          className="flex size-9 items-center justify-center"
                          aria-label={`Remove one ${stem.flowerType}`}
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-semibold">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(stem.id, 1)}
                          className="flex size-9 items-center justify-center"
                          aria-label={`Add one ${stem.flowerType}`}
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-8">
            <p className="text-sm font-semibold text-bloom-plum">
              Choose wrapping
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {wraps.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setWrappingId(option.id)}
                  className={
                    "border p-4 text-left transition " +
                    (wrappingId === option.id
                      ? "border-bloom-violet bg-bloom-violet-soft/30"
                      : "border-bloom-border bg-white")
                  }
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-bloom-plum">
                        {option.name}
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-bloom-muted">
                        {option.description}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-bloom-violet">
                      + AED {option.price}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-8">
            <p className="text-sm font-semibold text-bloom-plum">
              Make it personal
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                label="To / recipient"
                value={form.recipientName}
                onChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    recipientName: value,
                  }))
                }
              />
              <Field
                label="From"
                value={form.senderName}
                onChange={(value) =>
                  setForm((current) => ({ ...current, senderName: value }))
                }
              />
              <label className="sm:col-span-2">
                <span className="text-xs font-semibold text-bloom-plum">
                  Gift message
                </span>
                <textarea
                  value={form.giftMessage}
                  maxLength={240}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      giftMessage: event.target.value,
                    }))
                  }
                  rows={5}
                  className="mt-2 w-full border border-bloom-border px-3 py-3 text-sm outline-none focus:border-bloom-violet"
                />
                <span className="mt-1 block text-right text-[10px] text-bloom-muted">
                  {form.giftMessage.length}/240
                </span>
              </label>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <form onSubmit={submit} className="mt-8">
            <p className="text-sm font-semibold text-bloom-plum">
              Contact & review
            </p>
            <p className="mt-1 text-xs leading-5 text-bloom-muted">
              This submits a custom request for review. It does not charge you.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field
                label="Your name"
                required
                value={form.customerName}
                onChange={(value) =>
                  setForm((current) => ({ ...current, customerName: value }))
                }
              />
              <Field
                label="Email"
                type="email"
                required
                value={form.email}
                onChange={(value) =>
                  setForm((current) => ({ ...current, email: value }))
                }
              />
              <label className="sm:col-span-2">
                <span className="text-xs font-semibold text-bloom-plum">
                  Notes for CRJ
                </span>
                <textarea
                  value={form.notes}
                  maxLength={500}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Special color balance, occasion, timing, or other details."
                  className="mt-2 w-full border border-bloom-border px-3 py-3 text-sm outline-none focus:border-bloom-violet"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 inline-flex h-12 items-center gap-2 bg-bloom-violet px-6 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Send className="size-4" />
              {submitting ? "Submitting…" : "Submit custom request"}
            </button>
          </form>
        ) : null}

        {error ? (
          <p className="mt-5 border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex items-center justify-between border-t border-bloom-border pt-5">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => {
              setError("");
              setStep((current) => Math.max(1, current - 1));
            }}
            className="inline-flex h-10 items-center gap-2 border border-bloom-border bg-white px-4 text-xs font-semibold text-bloom-plum disabled:opacity-40"
          >
            <ChevronLeft className="size-3.5" />
            Back
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="inline-flex h-10 items-center gap-2 bg-bloom-plum px-4 text-xs font-semibold text-white"
            >
              Continue
              <ChevronRight className="size-3.5" />
            </button>
          ) : null}
        </div>
      </section>

      <aside className="border border-bloom-border bg-[#faf8fa] p-5 lg:sticky lg:top-28 lg:self-start">
        <div className="flex size-10 items-center justify-center bg-bloom-pink-soft text-bloom-pink">
          <Flower2 className="size-4" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-semibold text-bloom-plum">
          Your bouquet
        </h2>

        <div className="mt-5 space-y-3">
          {selected.length > 0 ? (
            selected.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: item.colorHex }}
                  />
                  <span className="text-bloom-muted">
                    {item.quantity} × {item.flowerType} · {item.colorName}
                  </span>
                </div>
                <span className="font-semibold text-bloom-plum">
                  AED {item.quantity * item.unitPrice}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-bloom-muted">
              Start choosing flowers to build your arrangement.
            </p>
          )}
        </div>

        {wrap ? (
          <div className="mt-5 flex justify-between gap-4 border-t border-bloom-border pt-4 text-xs">
            <span className="text-bloom-muted">{wrap.name}</span>
            <span className="font-semibold text-bloom-plum">
              AED {wrap.price}
            </span>
          </div>
        ) : null}

        <div className="mt-5 space-y-2 border-t border-bloom-border pt-4">
          <div className="flex justify-between text-xs">
            <span className="text-bloom-muted">Stems</span>
            <span className="font-semibold text-bloom-plum">{totalStems}</span>
          </div>
          <div className="flex items-end justify-between">
            <span className="text-sm font-semibold text-bloom-plum">
              Estimated total
            </span>
            <span className="text-2xl font-semibold text-bloom-plum">
              AED {total}
            </span>
          </div>
        </div>

        <p className="mt-4 text-[10px] leading-4 text-bloom-muted">
          Final pricing and material requirements are recalculated by the server when you submit.
        </p>
      </aside>
    </div>
  );
}

function StepHeader({ current }: { current: number }) {
  const steps = ["Flowers", "Wrapping", "Message", "Review"];

  return (
    <div className="grid grid-cols-4 gap-2">
      {steps.map((label, index) => {
        const number = index + 1;

        return (
          <div key={label}>
            <div
              className={
                "h-1 " +
                (number <= current ? "bg-bloom-violet" : "bg-bloom-border")
              }
            />
            <p
              className={
                "mt-2 text-[9px] font-semibold uppercase tracking-[0.08em] " +
                (number <= current
                  ? "text-bloom-plum"
                  : "text-bloom-muted")
              }
            >
              {number}. {label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="text-xs font-semibold text-bloom-plum">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-11 w-full border border-bloom-border px-3 text-sm outline-none focus:border-bloom-violet"
      />
    </label>
  );
}
