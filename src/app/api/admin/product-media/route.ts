import { matchesImageType } from "@/lib/media/image-validation";
import { sameOriginForm } from "@/lib/auth/security";
import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { requireDb, runTransaction } from "@/lib/db";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_IMAGES_PER_PRODUCT = 8;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export async function POST(request: Request) {
  if (!sameOriginForm(request)) return new Response("Forbidden", { status: 403 });
  const auth = await adminSession();
  if (auth instanceof NextResponse) return auth;

  const db = requireDb();
  const formData = await request.formData();
  const productId = String(formData.get("productId") ?? "").trim();
  const altTextInput = String(formData.get("altText") ?? "").trim();
  const file = formData.get("file");

  if (!productId) {
    return NextResponse.json(
      { error: "Product is required." },
      { status: 400 },
    );
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Choose an image to upload." },
      { status: 400 },
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Use JPEG, PNG, WebP, or AVIF images." },
      { status: 415 },
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Product images must be 4 MB or smaller." },
      { status: 413 },
    );
  }

  const product = await db.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      slug: true,
      name: true,
      _count: { select: { images: true } },
    },
  });

  if (!product) {
    return NextResponse.json(
      { error: "Product not found." },
      { status: 404 },
    );
  }

  if (product._count.images >= MAX_IMAGES_PER_PRODUCT) {
    return NextResponse.json(
      { error: `A product can have up to ${MAX_IMAGES_PER_PRODUCT} images.` },
      { status: 409 },
    );
  }

  if (!matchesImageType(new Uint8Array(await file.slice(0, 32).arrayBuffer()), file.type)) {
    return NextResponse.json({ error: "Image contents do not match its declared type." }, { status: 415 });
  }

  const safeName =
    file.name
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-120) || "product-image";
  const pathname = `products/${product.slug}/${safeName}`;

  let blob: Awaited<ReturnType<typeof put>> | null = null;

  try {
    blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });

    const uploadedUrl = blob.url;
    const image = await runTransaction(async (tx) => {
      if (await tx.productImage.count({ where: { productId } }) >= MAX_IMAGES_PER_PRODUCT) throw new Error("Image limit reached.");
      const last = await tx.productImage.findFirst({ where: { productId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
      return tx.productImage.create({ data: {
        productId, url: uploadedUrl, altText: altTextInput.slice(0, 180) || product.name,
        sortOrder: (last?.sortOrder ?? -10) + 10,
      } });
    });

    revalidateProductMedia(productId, product.slug);

    return NextResponse.json(
      {
        image: {
          id: image.id,
          url: image.url,
          altText: image.altText ?? product.name,
          sortOrder: image.sortOrder,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (blob?.url) {
      await del(blob.url).catch(() => undefined);
    }

    console.error("Product image upload failed.", error);
    return NextResponse.json(
      { error: "The image could not be uploaded." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!sameOriginForm(request)) return new Response("Forbidden", { status: 403 });
  const auth = await adminSession();
  if (auth instanceof NextResponse) return auth;

  const db = requireDb();
  const body = (await request.json()) as {
    productId?: string;
    images?: Array<{ id?: string; altText?: string }>;
  };
  const productId = body.productId?.trim();
  const images = body.images;

  if (!productId || !Array.isArray(images)) {
    return NextResponse.json(
      { error: "Invalid media update." },
      { status: 400 },
    );
  }

  if (images.length > MAX_IMAGES_PER_PRODUCT) {
    return NextResponse.json(
      { error: "Too many product images." },
      { status: 400 },
    );
  }

  const ids = images.map((image) => image.id?.trim()).filter(Boolean) as string[];

  if (ids.length !== images.length || new Set(ids).size !== ids.length) {
    return NextResponse.json(
      { error: "Image ordering contains invalid or duplicate IDs." },
      { status: 400 },
    );
  }

  const [product, records] = await Promise.all([
    db.product.findUnique({
      where: { id: productId },
      select: { id: true, slug: true },
    }),
    db.productImage.findMany({
      where: { productId, id: { in: ids } },
      select: { id: true },
    }),
  ]);

  if (!product) {
    return NextResponse.json(
      { error: "Product not found." },
      { status: 404 },
    );
  }

  if (records.length !== ids.length) {
    return NextResponse.json(
      { error: "One or more images do not belong to this product." },
      { status: 400 },
    );
  }

  await db.$transaction(
    images.map((image, index) =>
      db.productImage.update({
        where: { id: image.id! },
        data: {
          altText: image.altText?.trim().slice(0, 180) || null,
          sortOrder: index * 10,
        },
      }),
    ),
  );

  revalidateProductMedia(productId, product.slug);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!sameOriginForm(request)) return new Response("Forbidden", { status: 403 });
  const auth = await adminSession();
  if (auth instanceof NextResponse) return auth;

  const db = requireDb();
  const body = (await request.json()) as {
    productId?: string;
    imageId?: string;
  };
  const productId = body.productId?.trim();
  const imageId = body.imageId?.trim();

  if (!productId || !imageId) {
    return NextResponse.json(
      { error: "Product and image are required." },
      { status: 400 },
    );
  }

  const [product, image] = await Promise.all([
    db.product.findUnique({
      where: { id: productId },
      select: { id: true, slug: true },
    }),
    db.productImage.findFirst({
      where: { id: imageId, productId },
    }),
  ]);

  if (!product || !image) {
    return NextResponse.json(
      { error: "Product image not found." },
      { status: 404 },
    );
  }

  await db.$transaction(async (tx) => {
    await tx.productImage.delete({ where: { id: image.id } });
    const remaining = await tx.productImage.findMany({
      where: { productId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    for (const [index, item] of remaining.entries()) {
      await tx.productImage.update({
        where: { id: item.id },
        data: { sortOrder: index * 10 },
      });
    }
  });

  let storageDeleted = true;
  try {
    await del(image.url);
  } catch (error) {
    storageDeleted = false;
    console.error("Blob cleanup failed after product image deletion.", error);
  }

  revalidateProductMedia(productId, product.slug);
  return NextResponse.json({ ok: true, storageDeleted });
}

async function adminSession() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin access required." },
      { status: 403 },
    );
  }

  return session;
}

function revalidateProductMedia(productId: string, slug: string) {
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/collections");
  revalidatePath("/collections/[slug]", "page");
  revalidatePath(`/products/${slug}`);
}
