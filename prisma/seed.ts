import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const seedProducts = [
  {
    slug: "pink-tulip-bouquet",
    name: "Pink Tulip Bouquet",
    flowerType: "Tulip",
    description:
      "Five softly shaped crochet tulips arranged by hand and wrapped for gifting.",
    basePrice: 125,
    badge: "Best Seller",
    featured: true,
    variants: [
      ["CRJ-TUL-PNK-03", "Soft Pink · Small", "Soft Pink", "#e85d9e", "Small", 3, 85, "READY_STOCK", 6, 0, 2, null, null],
      ["CRJ-TUL-PNK-05", "Soft Pink · Medium", "Soft Pink", "#e85d9e", "Medium", 5, 125, "READY_STOCK", 7, 0, 2, null, null],
      ["CRJ-TUL-PNK-09", "Soft Pink · Large", "Soft Pink", "#e85d9e", "Large", 9, 195, "MADE_TO_ORDER", 0, 0, 0, 3, 5],
      ["CRJ-TUL-LAV-05", "Lavender · Medium", "Lavender", "#8b5cf6", "Medium", 5, 125, "BOTH", 3, 0, 1, 3, 5],
    ],
    collections: ["best-sellers", "ready-to-ship"],
  },
  {
    slug: "violet-rose-bouquet",
    name: "Violet Rose Bouquet",
    flowerType: "Rose",
    description:
      "A romantic crochet rose arrangement in soft violet tones, made for gifting.",
    basePrice: 145,
    badge: null,
    featured: true,
    variants: [
      ["CRJ-ROS-LAV-03", "Lavender · Small", "Lavender", "#8b5cf6", "Small", 3, 95, "MADE_TO_ORDER", 0, 0, 0, 3, 5],
      ["CRJ-ROS-LAV-05", "Lavender · Medium", "Lavender", "#8b5cf6", "Medium", 5, 145, "MADE_TO_ORDER", 0, 0, 0, 3, 5],
      ["CRJ-ROS-LAV-09", "Lavender · Large", "Lavender", "#8b5cf6", "Large", 9, 225, "MADE_TO_ORDER", 0, 0, 0, 5, 7],
    ],
    collections: ["best-sellers", "made-to-order"],
  },
  {
    slug: "peach-daisy-set",
    name: "Peach Daisy Set",
    flowerType: "Daisy",
    description:
      "A bright set of crochet daisies in a soft peach finish for desks and small gifts.",
    basePrice: 90,
    badge: "New",
    featured: true,
    variants: [
      ["CRJ-DAI-PCH-03", "Peach Blush · Trio", "Peach Blush", "#ef8d7f", "Trio", 3, 90, "READY_STOCK", 11, 1, 3, null, null],
      ["CRJ-DAI-PCH-05", "Peach Blush · Five", "Peach Blush", "#ef8d7f", "Five", 5, 135, "BOTH", 4, 0, 2, 2, 4],
    ],
    collections: ["ready-to-ship", "gift-favorites"],
  },
  {
    slug: "sunflower-bundle",
    name: "Sunflower Bundle",
    flowerType: "Sunflower",
    description:
      "Cheerful crochet sunflowers with textured centers and leafy stems.",
    basePrice: 105,
    badge: null,
    featured: true,
    variants: [
      ["CRJ-SUN-YEL-03", "Golden Yellow · Trio", "Golden Yellow", "#f2c94c", "Trio", 3, 105, "MADE_TO_ORDER", 0, 0, 0, 4, 6],
      ["CRJ-SUN-YEL-05", "Golden Yellow · Five", "Golden Yellow", "#f2c94c", "Five", 5, 155, "MADE_TO_ORDER", 0, 0, 0, 4, 6],
      ["CRJ-SUN-YEL-07", "Golden Yellow · Seven", "Golden Yellow", "#f2c94c", "Seven", 7, 205, "MADE_TO_ORDER", 0, 0, 0, 5, 7],
    ],
    collections: ["made-to-order", "gift-favorites"],
  },
  {
    slug: "cream-rose-duo",
    name: "Cream Rose Duo",
    flowerType: "Rose",
    description:
      "A minimal pair of ivory crochet roses for desks, bedside tables, or small gifts.",
    basePrice: 68,
    badge: null,
    featured: false,
    variants: [
      ["CRJ-ROS-CRM-02", "Ivory Cream · Duo", "Ivory Cream", "#f1dfb8", "Duo", 2, 68, "READY_STOCK", 5, 0, 2, null, null],
      ["CRJ-ROS-CRM-03", "Ivory Cream · Trio", "Ivory Cream", "#f1dfb8", "Trio", 3, 92, "READY_STOCK", 4, 0, 1, null, null],
    ],
    collections: ["ready-to-ship"],
  },
  {
    slug: "lavender-tulip-trio",
    name: "Lavender Tulip Trio",
    flowerType: "Tulip",
    description:
      "Three clean-lined tulips in lavender yarn, finished with green stems and simple wrapping.",
    basePrice: 88,
    badge: null,
    featured: false,
    variants: [
      ["CRJ-TUL-LAV-03", "Lavender · Trio", "Lavender", "#8b5cf6", "Trio", 3, 88, "READY_STOCK", 8, 0, 2, null, null],
      ["CRJ-TUL-LAV-05B", "Lavender · Five", "Lavender", "#8b5cf6", "Five", 5, 128, "BOTH", 2, 0, 1, 3, 5],
    ],
    collections: ["ready-to-ship", "gift-favorites"],
  },
  {
    slug: "mini-daisy-posy",
    name: "Mini Daisy Posy",
    flowerType: "Daisy",
    description:
      "A petite cluster of miniature crochet daisies for smaller gifts and compact arrangements.",
    basePrice: 78,
    badge: "Limited",
    featured: false,
    variants: [
      ["CRJ-DAI-CRM-05", "Cream · Mini", "Cream", "#f1dfb8", "Mini", 5, 78, "MADE_TO_ORDER", 0, 0, 0, 3, 4],
      ["CRJ-DAI-CRM-09", "Cream · Full", "Cream", "#f1dfb8", "Full", 9, 125, "MADE_TO_ORDER", 0, 0, 0, 4, 6],
    ],
    collections: ["made-to-order"],
  },
  {
    slug: "blush-rose-bundle",
    name: "Blush Rose Bundle",
    flowerType: "Rose",
    description:
      "A fuller crochet rose bouquet in layered blush tones for special occasions.",
    basePrice: 185,
    badge: null,
    featured: false,
    variants: [
      ["CRJ-ROS-BLS-05", "Blush Pink · Five", "Blush Pink", "#e85d9e", "Five", 5, 145, "MADE_TO_ORDER", 0, 0, 0, 4, 6],
      ["CRJ-ROS-BLS-07", "Blush Pink · Seven", "Blush Pink", "#e85d9e", "Seven", 7, 185, "MADE_TO_ORDER", 0, 0, 0, 5, 7],
      ["CRJ-ROS-BLS-09", "Blush Pink · Nine", "Blush Pink", "#e85d9e", "Nine", 9, 225, "MADE_TO_ORDER", 0, 0, 0, 5, 7],
    ],
    collections: ["made-to-order", "gift-favorites"],
  },
] as const;


const seedMaterials = [
  ["YARN-PINK", "Pink Yarn", "Yarn", "Soft Pink", "GRAM", 1500, 250, 0.08],
  ["YARN-LAVENDER", "Lavender Yarn", "Yarn", "Lavender", "GRAM", 1200, 200, 0.08],
  ["YARN-CREAM", "Cream Yarn", "Yarn", "Cream", "GRAM", 1000, 180, 0.08],
  ["YARN-YELLOW", "Yellow Yarn", "Yarn", "Golden Yellow", "GRAM", 900, 180, 0.08],
  ["YARN-GREEN", "Green Yarn", "Yarn", "Leaf Green", "GRAM", 1800, 300, 0.07],
  ["WIRE-FLORAL", "Floral Wire", "Structure", null, "PIECE", 500, 100, 0.35],
  ["TAPE-FLORAL", "Floral Tape", "Structure", "Green", "METER", 180, 30, 0.45],
  ["WRAP-KRAFT", "Kraft Wrapping Sheet", "Wrapping", "Kraft", "PIECE", 120, 25, 1.5],
  ["WRAP-PINK", "Pink Wrapping Sheet", "Wrapping", "Pink", "PIECE", 100, 20, 1.8],
  ["WRAP-VIOLET", "Violet Wrapping Sheet", "Wrapping", "Violet", "PIECE", 100, 20, 1.8],
  ["WRAP-CLEAR", "Clear Floral Sleeve", "Wrapping", null, "PIECE", 100, 20, 1.2],
  ["RIBBON-SATIN", "Satin Ribbon", "Wrapping", "Neutral", "METER", 250, 40, 0.6],
] as const;

const seedStemOptions = [
  ["tulip-soft-pink", "Tulip", "Soft Pink", "#e85d9e", 15, 10],
  ["tulip-lavender", "Tulip", "Lavender", "#8b5cf6", 15, 20],
  ["rose-blush-pink", "Rose", "Blush Pink", "#e85d9e", 18, 30],
  ["rose-lavender", "Rose", "Lavender", "#8b5cf6", 18, 40],
  ["daisy-cream", "Daisy", "Cream", "#f1dfb8", 14, 50],
  ["daisy-peach", "Daisy", "Peach Blush", "#ef8d7f", 14, 60],
  ["sunflower-golden", "Sunflower", "Golden Yellow", "#f2c94c", 20, 70],
] as const;

const seedWrapOptions = [
  ["classic", "Classic Wrap", "Simple clear sleeve with satin ribbon.", 8, 10],
  ["kraft", "Kraft Wrap", "Warm kraft paper with satin ribbon.", 10, 20],
  ["pink", "Pink Wrap", "Soft pink wrapping with satin ribbon.", 12, 30],
  ["violet", "Violet Wrap", "Violet wrapping with satin ribbon.", 12, 40],
  ["premium", "Premium Layered Wrap", "Layered colored wrap, clear sleeve, and ribbon.", 22, 50],
] as const;

async function main() {
  const category = await prisma.category.upsert({
    where: { slug: "crochet-flowers" },
    update: {
      name: "Crochet Flowers",
      description: "Handmade crochet flowers, stems, and bouquet arrangements.",
    },
    create: {
      slug: "crochet-flowers",
      name: "Crochet Flowers",
      description: "Handmade crochet flowers, stems, and bouquet arrangements.",
    },
  });

  const collectionDefinitions = [
    ["best-sellers", "Best Sellers", "Most-loved handmade blooms.", true],
    ["ready-to-ship", "Ready to Ship", "Finished pieces available from current stock.", true],
    ["made-to-order", "Made to Order", "Bouquets made after the order is confirmed.", false],
    ["gift-favorites", "Gift Favorites", "Easy gifting choices for meaningful occasions.", true],
  ] as const;

  const collections = new Map<string, string>();

  for (const [slug, name, description, featured] of collectionDefinitions) {
    const collection = await prisma.collection.upsert({
      where: { slug },
      update: { name, description, featured },
      create: { slug, name, description, featured },
    });

    collections.set(slug, collection.id);
  }

  for (const productData of seedProducts) {
    const product = await prisma.product.upsert({
      where: { slug: productData.slug },
      update: {
        categoryId: category.id,
        name: productData.name,
        description: productData.description,
        flowerType: productData.flowerType,
        status: "ACTIVE",
        badge: productData.badge,
        featured: productData.featured,
        basePrice: productData.basePrice,
      },
      create: {
        categoryId: category.id,
        slug: productData.slug,
        name: productData.name,
        description: productData.description,
        flowerType: productData.flowerType,
        status: "ACTIVE",
        badge: productData.badge,
        featured: productData.featured,
        basePrice: productData.basePrice,
      },
    });

    for (const variantData of productData.variants) {
      const [
        sku,
        name,
        colorName,
        colorHex,
        sizeName,
        stems,
        price,
        fulfillmentMode,
        stockOnHand,
        stockReserved,
        reorderLevel,
        leadTimeMinDays,
        leadTimeMaxDays,
      ] = variantData;

      await prisma.productVariant.upsert({
        where: { sku },
        update: {
          productId: product.id,
          name,
          colorName,
          colorHex,
          sizeName,
          stems,
          price,
          fulfillmentMode,
          stockOnHand,
          stockReserved,
          reorderLevel,
          leadTimeMinDays,
          leadTimeMaxDays,
          isActive: true,
        },
        create: {
          productId: product.id,
          sku,
          name,
          colorName,
          colorHex,
          sizeName,
          stems,
          price,
          fulfillmentMode,
          stockOnHand,
          stockReserved,
          reorderLevel,
          leadTimeMinDays,
          leadTimeMaxDays,
          isActive: true,
        },
      });
    }

    for (const collectionSlug of productData.collections) {
      const collectionId = collections.get(collectionSlug);
      if (!collectionId) continue;

      await prisma.collectionProduct.upsert({
        where: {
          collectionId_productId: {
            collectionId,
            productId: product.id,
          },
        },
        update: {},
        create: {
          collectionId,
          productId: product.id,
        },
      });
    }
  }


  const materialIds = new Map<string, string>();

  for (const [
    sku,
    name,
    categoryName,
    colorName,
    unit,
    stockOnHand,
    reorderLevel,
    unitCost,
  ] of seedMaterials) {
    const material = await prisma.rawMaterial.upsert({
      where: { sku },
      update: {
        name,
        category: categoryName,
        colorName,
        unit,
        reorderLevel,
        unitCost,
        isActive: true,
      },
      create: {
        sku,
        name,
        category: categoryName,
        colorName,
        unit,
        stockOnHand,
        reorderLevel,
        unitCost,
        isActive: true,
      },
    });

    materialIds.set(sku, material.id);

    const movementCount = await prisma.rawMaterialMovement.count({
      where: {
        materialId: material.id,
        type: "OPENING",
      },
    });

    if (movementCount === 0 && Number(material.stockOnHand) > 0) {
      await prisma.rawMaterialMovement.create({
        data: {
          materialId: material.id,
          type: "OPENING",
          quantity: material.stockOnHand,
          note: "Opening raw-material stock",
        },
      });
    }
  }

  const stemIds = new Map<string, string>();

  for (const [
    slug,
    flowerType,
    colorName,
    colorHex,
    unitPrice,
    sortOrder,
  ] of seedStemOptions) {
    const stem = await prisma.bouquetStemOption.upsert({
      where: { slug },
      update: {
        flowerType,
        colorName,
        colorHex,
        unitPrice,
        sortOrder,
        isActive: true,
      },
      create: {
        slug,
        flowerType,
        colorName,
        colorHex,
        unitPrice,
        sortOrder,
        isActive: true,
      },
    });

    stemIds.set(slug, stem.id);
  }

  const stemRecipes: Record<string, Array<[string, number]>> = {
    "tulip-soft-pink": [
      ["YARN-PINK", 8],
      ["YARN-GREEN", 3],
      ["WIRE-FLORAL", 1],
      ["TAPE-FLORAL", 0.25],
    ],
    "tulip-lavender": [
      ["YARN-LAVENDER", 8],
      ["YARN-GREEN", 3],
      ["WIRE-FLORAL", 1],
      ["TAPE-FLORAL", 0.25],
    ],
    "rose-blush-pink": [
      ["YARN-PINK", 10],
      ["YARN-GREEN", 3],
      ["WIRE-FLORAL", 1],
      ["TAPE-FLORAL", 0.3],
    ],
    "rose-lavender": [
      ["YARN-LAVENDER", 10],
      ["YARN-GREEN", 3],
      ["WIRE-FLORAL", 1],
      ["TAPE-FLORAL", 0.3],
    ],
    "daisy-cream": [
      ["YARN-CREAM", 7],
      ["YARN-GREEN", 2.5],
      ["WIRE-FLORAL", 1],
      ["TAPE-FLORAL", 0.22],
    ],
    "daisy-peach": [
      ["YARN-PINK", 7],
      ["YARN-GREEN", 2.5],
      ["WIRE-FLORAL", 1],
      ["TAPE-FLORAL", 0.22],
    ],
    "sunflower-golden": [
      ["YARN-YELLOW", 12],
      ["YARN-GREEN", 4],
      ["WIRE-FLORAL", 1],
      ["TAPE-FLORAL", 0.35],
    ],
  };

  for (const [slug, recipes] of Object.entries(stemRecipes)) {
    const stemOptionId = stemIds.get(slug);
    if (!stemOptionId) continue;

    for (const [materialSku, quantity] of recipes) {
      const materialId = materialIds.get(materialSku);
      if (!materialId) continue;

      await prisma.bouquetStemMaterial.upsert({
        where: {
          stemOptionId_materialId: {
            stemOptionId,
            materialId,
          },
        },
        update: { quantity },
        create: {
          stemOptionId,
          materialId,
          quantity,
        },
      });
    }
  }

  const wrapIds = new Map<string, string>();

  for (const [slug, name, description, price, sortOrder] of seedWrapOptions) {
    const wrap = await prisma.bouquetWrapOption.upsert({
      where: { slug },
      update: {
        name,
        description,
        price,
        sortOrder,
        isActive: true,
      },
      create: {
        slug,
        name,
        description,
        price,
        sortOrder,
        isActive: true,
      },
    });

    wrapIds.set(slug, wrap.id);
  }

  const wrapRecipes: Record<string, Array<[string, number]>> = {
    classic: [
      ["WRAP-CLEAR", 1],
      ["RIBBON-SATIN", 0.8],
    ],
    kraft: [
      ["WRAP-KRAFT", 1],
      ["RIBBON-SATIN", 1],
    ],
    pink: [
      ["WRAP-PINK", 1],
      ["RIBBON-SATIN", 1],
    ],
    violet: [
      ["WRAP-VIOLET", 1],
      ["RIBBON-SATIN", 1],
    ],
    premium: [
      ["WRAP-PINK", 1],
      ["WRAP-CLEAR", 1],
      ["RIBBON-SATIN", 1.5],
    ],
  };

  for (const [slug, recipes] of Object.entries(wrapRecipes)) {
    const wrapOptionId = wrapIds.get(slug);
    if (!wrapOptionId) continue;

    for (const [materialSku, quantity] of recipes) {
      const materialId = materialIds.get(materialSku);
      if (!materialId) continue;

      await prisma.bouquetWrapMaterial.upsert({
        where: {
          wrapOptionId_materialId: {
            wrapOptionId,
            materialId,
          },
        },
        update: { quantity },
        create: {
          wrapOptionId,
          materialId,
          quantity,
        },
      });
    }
  }

  const variantBomRules: Record<string, Array<[string, number]>> = {
    Tulip: [
      ["YARN-GREEN", 3],
      ["WIRE-FLORAL", 1],
      ["TAPE-FLORAL", 0.25],
    ],
    Rose: [
      ["YARN-GREEN", 3],
      ["WIRE-FLORAL", 1],
      ["TAPE-FLORAL", 0.3],
    ],
    Daisy: [
      ["YARN-GREEN", 2.5],
      ["WIRE-FLORAL", 1],
      ["TAPE-FLORAL", 0.22],
    ],
    Sunflower: [
      ["YARN-GREEN", 4],
      ["WIRE-FLORAL", 1],
      ["TAPE-FLORAL", 0.35],
    ],
  };

  const variantsForBom = await prisma.productVariant.findMany({
    include: { product: true },
  });

  for (const variant of variantsForBom) {
    if (!variant.stems || variant.fulfillmentMode !== "MADE_TO_ORDER") {
      continue;
    }

    const baseRecipes = variantBomRules[variant.product.flowerType] ?? [];
    const colorMaterialSku =
      variant.colorName?.toLowerCase().includes("lavender") ||
      variant.colorName?.toLowerCase().includes("violet")
        ? "YARN-LAVENDER"
        : variant.colorName?.toLowerCase().includes("cream") ||
            variant.colorName?.toLowerCase().includes("ivory")
          ? "YARN-CREAM"
          : variant.colorName?.toLowerCase().includes("yellow") ||
              variant.colorName?.toLowerCase().includes("golden")
            ? "YARN-YELLOW"
            : "YARN-PINK";

    const coloredYarnPerStem =
      variant.product.flowerType === "Sunflower"
        ? 12
        : variant.product.flowerType === "Rose"
          ? 10
          : variant.product.flowerType === "Daisy"
            ? 7
            : 8;

    const completeRecipes: Array<[string, number]> = [
      [colorMaterialSku, coloredYarnPerStem],
      ...baseRecipes,
    ];

    for (const [materialSku, quantityPerStem] of completeRecipes) {
      const materialId = materialIds.get(materialSku);
      if (!materialId) continue;

      await prisma.variantMaterial.upsert({
        where: {
          variantId_materialId: {
            variantId: variant.id,
            materialId,
          },
        },
        update: {
          quantity: quantityPerStem * variant.stems,
        },
        create: {
          variantId: variant.id,
          materialId,
          quantity: quantityPerStem * variant.stems,
        },
      });
    }
  }

  await prisma.discount.upsert({
    where: { code: "WELCOME10" },
    update: {
      description: "10% welcome discount on orders of AED 100 or more.",
      type: "PERCENTAGE",
      value: 10,
      scope: "ENTIRE_ORDER",
      customerEligibility: "NEW_CUSTOMERS",
      minimumOrderAmount: 100,
      maxRedemptionsPerCustomer: 1,
      automatic: false,
      priority: 0,
      isActive: true,
    },
    create: {
      code: "WELCOME10",
      description: "10% welcome discount on orders of AED 100 or more.",
      type: "PERCENTAGE",
      scope: "ENTIRE_ORDER",
      customerEligibility: "NEW_CUSTOMERS",
      value: 10,
      minimumOrderAmount: 100,
      maxRedemptionsPerCustomer: 1,
      automatic: false,
      priority: 0,
      isActive: true,
    },
  });

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME?.trim() || "CRJ Administrator";

  if (adminEmail && adminPassword) {
    if (adminPassword.length < 12) {
      throw new Error("ADMIN_PASSWORD must contain at least 12 characters.");
    }

    const passwordHash = await hashPassword(adminPassword);

    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        name: adminName,
        passwordHash,
        role: "ADMIN",
      },
      create: {
        email: adminEmail,
        name: adminName,
        passwordHash,
        role: "ADMIN",
      },
    });
  }

  const demoCustomer = await prisma.customer.upsert({
    where: { email: "demo.customer@example.com" },
    update: {
      firstName: "Demo",
      lastName: "Customer",
      phone: "+971500000000",
    },
    create: {
      email: "demo.customer@example.com",
      firstName: "Demo",
      lastName: "Customer",
      phone: "+971500000000",
    },
  });

  await prisma.address.deleteMany({
    where: {
      customerId: demoCustomer.id,
      label: "Seed address",
    },
  });

  await prisma.address.create({
    data: {
      customerId: demoCustomer.id,
      label: "Seed address",
      recipient: "Demo Customer",
      phone: "+971500000000",
      addressLine1: "Example Street",
      city: "Abu Dhabi",
      emirate: "Abu Dhabi",
      countryCode: "AE",
      isDefault: true,
    },
  });

  console.log(
    `Seeded ${seedProducts.length} products, collections, finished inventory, raw materials, bouquet recipes, discount, demo customer${adminEmail && adminPassword ? ", and admin account" : ""}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
