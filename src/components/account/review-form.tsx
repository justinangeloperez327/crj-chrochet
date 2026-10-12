"use client";

import { CheckCircle2, LoaderCircle, Star } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReviewForm({
  orderItemId,
  productName,
}: {
  orderItemId: string;
  productName: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderItemId, rating, title, body }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) throw new Error(payload.error || "Review could not be submitted.");

      setSubmitted(true);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Review could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <div className="mt-3 flex items-start gap-2 border border-bloom-success/20 bg-green-50 px-3 py-3 text-[11px] text-bloom-success">
        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
        <span>Your review was submitted and is waiting for moderation.</span>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 border border-bloom-border bg-[#faf8fa] p-4">
      <p className="text-xs font-semibold text-bloom-plum">Review {productName}</p>
      <div className="mt-3 flex gap-1" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
            className={value <= rating ? "text-[#d29a32]" : "text-bloom-border"}
          >
            <Star className="size-5 fill-current" />
          </button>
        ))}
      </div>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={100}
        placeholder="Short title (optional)"
        className="mt-3 h-10 w-full border border-bloom-border bg-white px-3 text-xs outline-none focus:border-bloom-violet"
      />
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        minLength={10}
        maxLength={1200}
        required
        rows={4}
        placeholder="What did you like about your handmade blooms?"
        className="mt-3 w-full resize-y border border-bloom-border bg-white px-3 py-2 text-xs leading-5 outline-none focus:border-bloom-violet"
      />
      {error ? <p className="mt-2 text-[11px] text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="mt-3 inline-flex h-9 items-center gap-2 bg-bloom-plum px-4 text-[10px] font-semibold text-white disabled:opacity-60"
      >
        {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
        Submit review
      </button>
    </form>
  );
}
