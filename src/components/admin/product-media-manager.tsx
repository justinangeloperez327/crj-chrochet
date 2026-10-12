"use client";

import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  LoaderCircle,
  Star,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type MediaItem = {
  id: string;
  url: string;
  altText: string;
  sortOrder: number;
};

export function ProductMediaManager({
  productId,
  productName,
  initialImages,
}: {
  productId: string;
  productName: string;
  initialImages: MediaItem[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState(initialImages);
  const [altText, setAltText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function uploadImage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = fileRef.current?.files?.[0];

    if (!file) {
      setError("Choose an image first.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const data = new FormData();
      data.set("productId", productId);
      data.set("altText", altText);
      data.set("file", file);

      const response = await fetch("/api/admin/product-media", {
        method: "POST",
        body: data,
      });
      const payload = (await response.json()) as {
        image?: MediaItem;
        error?: string;
      };

      if (!response.ok || !payload.image) {
        throw new Error(payload.error || "Upload failed.");
      }

      setImages((current) => [...current, payload.image!]);
      setAltText("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Upload failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function persist(next: MediaItem[]) {
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/admin/product-media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          images: next.map((image) => ({
            id: image.id,
            altText: image.altText,
          })),
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Media update failed.");
      }

      const normalized = next.map((image, index) => ({
        ...image,
        sortOrder: index * 10,
      }));
      setImages(normalized);
      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Media update failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;

    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    await persist(next);
  }

  async function makePrimary(index: number) {
    if (index === 0) return;
    const next = [...images];
    const [selected] = next.splice(index, 1);
    next.unshift(selected);
    await persist(next);
  }

  async function saveAlt(index: number, value: string) {
    const next = images.map((image, current) =>
      current === index ? { ...image, altText: value } : image,
    );
    setImages(next);
    await persist(next);
  }

  async function remove(image: MediaItem) {
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/admin/product-media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          imageId: image.id,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        storageDeleted?: boolean;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Image deletion failed.");
      }

      setImages((current) =>
        current
          .filter((item) => item.id !== image.id)
          .map((item, index) => ({
            ...item,
            sortOrder: index * 10,
          })),
      );
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Image deletion failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border border-bloom-border bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold">Product media</h2>
          <p className="mt-1 max-w-xl text-[11px] leading-5 text-bloom-muted">
            Upload up to 8 public storefront images. The first image is the
            primary card and social-preview image.
          </p>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
          {images.length}/8 images
        </p>
      </div>

      <form
        onSubmit={uploadImage}
        className="mt-5 grid gap-3 border border-dashed border-bloom-border bg-[#faf8fa] p-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
      >
        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
            Image
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            required
            disabled={busy || images.length >= 8}
            className="mt-2 block w-full text-xs text-bloom-muted file:mr-3 file:border-0 file:bg-bloom-plum file:px-3 file:py-2 file:text-[10px] file:font-semibold file:text-white"
          />
          <p className="mt-1 text-[9px] text-bloom-muted">
            JPEG, PNG, WebP, or AVIF · max 4 MB
          </p>
        </label>

        <label>
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
            Alt text
          </span>
          <input
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            maxLength={180}
            placeholder={productName}
            className="mt-2 h-9 w-full border border-bloom-border bg-white px-3 text-xs outline-none focus:border-bloom-violet"
          />
        </label>

        <button
          type="submit"
          disabled={busy || images.length >= 8}
          className="inline-flex h-9 items-center justify-center gap-2 bg-bloom-violet px-4 text-[10px] font-semibold text-white disabled:opacity-50"
        >
          {busy ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <ImagePlus className="size-3.5" />
          )}
          Upload
        </button>
      </form>

      {error ? (
        <p className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
          {error}
        </p>
      ) : null}

      {images.length > 0 ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {images.map((image, index) => (
            <article
              key={image.id}
              className="overflow-hidden border border-bloom-border"
            >
              <div className="relative aspect-[4/3] bg-[#faf8fa]">
                <Image
                  src={image.url}
                  alt={image.altText || productName}
                  fill
                  sizes="(max-width: 640px) 100vw, 420px"
                  className="object-cover"
                />
                {index === 0 ? (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 bg-white/95 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-bloom-violet">
                    <Star className="size-3 fill-current" />
                    Primary
                  </span>
                ) : null}
              </div>

              <div className="p-4">
                <label>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-bloom-muted">
                    Alt text
                  </span>
                  <input
                    value={image.altText}
                    maxLength={180}
                    onChange={(event) =>
                      setImages((current) =>
                        current.map((item) =>
                          item.id === image.id
                            ? { ...item, altText: event.target.value }
                            : item,
                        ),
                      )
                    }
                    onBlur={(event) =>
                      void saveAlt(index, event.target.value)
                    }
                    className="mt-2 h-9 w-full border border-bloom-border px-3 text-xs outline-none focus:border-bloom-violet"
                  />
                </label>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    onClick={() => void makePrimary(index)}
                    className="inline-flex h-8 items-center gap-1.5 border border-bloom-violet/25 px-2.5 text-[9px] font-semibold text-bloom-violet disabled:opacity-40"
                  >
                    <Star className="size-3" />
                    Primary
                  </button>
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    onClick={() => void move(index, -1)}
                    className="inline-flex size-8 items-center justify-center border border-bloom-border text-bloom-plum disabled:opacity-40"
                    aria-label="Move image earlier"
                  >
                    <ArrowLeft className="size-3" />
                  </button>
                  <button
                    type="button"
                    disabled={busy || index === images.length - 1}
                    onClick={() => void move(index, 1)}
                    className="inline-flex size-8 items-center justify-center border border-bloom-border text-bloom-plum disabled:opacity-40"
                    aria-label="Move image later"
                  >
                    <ArrowRight className="size-3" />
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(image)}
                    className="ml-auto inline-flex h-8 items-center gap-1.5 border border-red-200 px-2.5 text-[9px] font-semibold text-red-700 disabled:opacity-40"
                  >
                    <Trash2 className="size-3" />
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 border border-bloom-border bg-[#faf8fa] px-5 py-10 text-center">
          <ImagePlus className="mx-auto size-5 text-bloom-muted" />
          <p className="mt-3 text-xs font-semibold text-bloom-plum">
            No product images yet
          </p>
          <p className="mt-1 text-[10px] text-bloom-muted">
            Storefront pages will continue using the crochet artwork fallback.
          </p>
        </div>
      )}
    </section>
  );
}
