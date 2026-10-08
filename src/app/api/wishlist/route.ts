import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { requireDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const db = requireDb();
  const items = await db.wishlistItem.findMany({
    where: { userId: session.userId },
    include: {
      product: { select: { slug: true } },
    },
  });

  return NextResponse.json({
    productSlugs: items.map((item) => item.product.slug),
  });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = (await request.json()) as {
    productSlug?: string;
    wished?: boolean;
  };
  const slug = body.productSlug?.trim();

  if (!slug) {
    return NextResponse.json({ error: "Product is required." }, { status: 400 });
  }

  const db = requireDb();
  const product = await db.product.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  if (body.wished === false) {
    await db.wishlistItem.deleteMany({
      where: {
        userId: session.userId,
        productId: product.id,
      },
    });
  } else {
    await db.wishlistItem.upsert({
      where: {
        userId_productId: {
          userId: session.userId,
          productId: product.id,
        },
      },
      update: {},
      create: {
        userId: session.userId,
        productId: product.id,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const body = (await request.json()) as { productSlugs?: string[] };
  const slugs = Array.from(
    new Set(
      (body.productSlugs ?? [])
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ).slice(0, 100);

  const db = requireDb();

  if (slugs.length > 0) {
    const products = await db.product.findMany({
      where: {
        slug: { in: slugs },
        status: "ACTIVE",
      },
      select: { id: true },
    });

    await db.$transaction(
      products.map((product) =>
        db.wishlistItem.upsert({
          where: {
            userId_productId: {
              userId: session.userId,
              productId: product.id,
            },
          },
          update: {},
          create: {
            userId: session.userId,
            productId: product.id,
          },
        }),
      ),
    );
  }

  const merged = await db.wishlistItem.findMany({
    where: { userId: session.userId },
    include: {
      product: { select: { slug: true } },
    },
  });

  return NextResponse.json({
    productSlugs: merged.map((item) => item.product.slug),
  });
}
