export type ProductTone = "rose" | "violet" | "peach" | "cream" | "sun";

export type ProductPreview = {
  id: string;
  name: string;
  variant: string;
  price: number;
  availability: "Ready to ship" | "Made to order";
  badge?: "Best Seller" | "New" | "Limited";
  tone: ProductTone;
};

export const featuredProducts: ProductPreview[] = [
  {
    id: "pink-tulip-bouquet",
    name: "Pink Tulip Bouquet",
    variant: "Soft Pink · 5 stems",
    price: 125,
    availability: "Ready to ship",
    badge: "Best Seller",
    tone: "rose",
  },
  {
    id: "violet-rose-bouquet",
    name: "Violet Rose Bouquet",
    variant: "Lavender · 5 stems",
    price: 145,
    availability: "Made to order",
    tone: "violet",
  },
  {
    id: "peach-daisy-set",
    name: "Peach Daisy Set",
    variant: "Peach Blush · 3 stems",
    price: 90,
    availability: "Ready to ship",
    badge: "New",
    tone: "peach",
  },
  {
    id: "sunflower-bundle",
    name: "Sunflower Bundle",
    variant: "Golden Yellow · 3 stems",
    price: 105,
    availability: "Made to order",
    tone: "sun",
  },
];

export const flowerCollections = [
  { name: "Roses", tone: "rose" as const, note: "Forever romantic" },
  { name: "Tulips", tone: "violet" as const, note: "Soft & timeless" },
  { name: "Daisies", tone: "cream" as const, note: "Simple joy" },
  { name: "Sunflowers", tone: "sun" as const, note: "Bright moments" },
];
