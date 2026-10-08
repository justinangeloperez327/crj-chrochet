export type ProductTone = "rose" | "violet" | "peach" | "cream" | "sun";
export type Availability = "Ready to ship" | "Made to order";
export type ProductBadge = "Best Seller" | "New" | "Limited";

export type ProductColor = {
  name: string;
  hex: string;
  tone: ProductTone;
};

export type ProductSize = {
  name: string;
  stems: number;
  price: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  flower: "Rose" | "Tulip" | "Daisy" | "Sunflower" | "Lavender";
  variant: string;
  price: number;
  availability: Availability;
  badge?: ProductBadge;
  tone: ProductTone;
  description: string;
  colors: ProductColor[];
  sizes: ProductSize[];
  rating: number;
  reviewCount: number;
  stock: number;
  leadTime?: string;
  featured?: boolean;
};

export type ProductPreview = Pick<
  Product,
  | "id"
  | "slug"
  | "name"
  | "flower"
  | "variant"
  | "price"
  | "availability"
  | "badge"
  | "tone"
>;

export const products: Product[] = [
  {
    id: "pink-tulip-bouquet",
    slug: "pink-tulip-bouquet",
    name: "Pink Tulip Bouquet",
    flower: "Tulip",
    variant: "Soft Pink · 5 stems",
    price: 125,
    availability: "Ready to ship",
    badge: "Best Seller",
    tone: "rose",
    description:
      "Five softly shaped crochet tulips arranged by hand and wrapped for gifting. A lasting bouquet for birthdays, thank-yous, or simply making a room feel warmer.",
    colors: [
      { name: "Soft Pink", hex: "#e85d9e", tone: "rose" },
      { name: "Lavender", hex: "#8b5cf6", tone: "violet" },
      { name: "Cream", hex: "#f1dfb8", tone: "cream" },
    ],
    sizes: [
      { name: "Small", stems: 3, price: 85 },
      { name: "Medium", stems: 5, price: 125 },
      { name: "Large", stems: 9, price: 195 },
    ],
    rating: 4.9,
    reviewCount: 18,
    stock: 7,
    featured: true,
  },
  {
    id: "violet-rose-bouquet",
    slug: "violet-rose-bouquet",
    name: "Violet Rose Bouquet",
    flower: "Rose",
    variant: "Lavender · 5 stems",
    price: 145,
    availability: "Made to order",
    tone: "violet",
    description:
      "A romantic five-stem rose arrangement in soft violet tones, crocheted and assembled after your order for a more personal finish.",
    colors: [
      { name: "Lavender", hex: "#8b5cf6", tone: "violet" },
      { name: "Blush", hex: "#e85d9e", tone: "rose" },
      { name: "Cream", hex: "#f1dfb8", tone: "cream" },
    ],
    sizes: [
      { name: "Small", stems: 3, price: 95 },
      { name: "Medium", stems: 5, price: 145 },
      { name: "Large", stems: 9, price: 225 },
    ],
    rating: 4.8,
    reviewCount: 12,
    stock: 0,
    leadTime: "3–5 days",
    featured: true,
  },
  {
    id: "peach-daisy-set",
    slug: "peach-daisy-set",
    name: "Peach Daisy Set",
    flower: "Daisy",
    variant: "Peach Blush · 3 stems",
    price: 90,
    availability: "Ready to ship",
    badge: "New",
    tone: "peach",
    description:
      "A bright trio of crochet daisies with a soft peach finish. Easy to display, easy to gift, and designed to bring a little color to everyday spaces.",
    colors: [
      { name: "Peach Blush", hex: "#ef8d7f", tone: "peach" },
      { name: "Cream", hex: "#f1dfb8", tone: "cream" },
      { name: "Soft Pink", hex: "#e85d9e", tone: "rose" },
    ],
    sizes: [
      { name: "Trio", stems: 3, price: 90 },
      { name: "Five", stems: 5, price: 135 },
    ],
    rating: 4.9,
    reviewCount: 9,
    stock: 11,
    featured: true,
  },
  {
    id: "sunflower-bundle",
    slug: "sunflower-bundle",
    name: "Sunflower Bundle",
    flower: "Sunflower",
    variant: "Golden Yellow · 3 stems",
    price: 105,
    availability: "Made to order",
    tone: "sun",
    description:
      "Three cheerful crochet sunflowers with textured centers and leafy stems. Made to order for graduations, celebrations, and brighter desks.",
    colors: [
      { name: "Golden Yellow", hex: "#f2c94c", tone: "sun" },
      { name: "Warm Cream", hex: "#f1dfb8", tone: "cream" },
    ],
    sizes: [
      { name: "Trio", stems: 3, price: 105 },
      { name: "Five", stems: 5, price: 155 },
      { name: "Seven", stems: 7, price: 205 },
    ],
    rating: 4.7,
    reviewCount: 7,
    stock: 0,
    leadTime: "4–6 days",
    featured: true,
  },
  {
    id: "cream-rose-duo",
    slug: "cream-rose-duo",
    name: "Cream Rose Duo",
    flower: "Rose",
    variant: "Ivory Cream · 2 stems",
    price: 68,
    availability: "Ready to ship",
    tone: "cream",
    description:
      "A minimal pair of ivory crochet roses for desks, bedside tables, or a small thoughtful gift.",
    colors: [
      { name: "Ivory Cream", hex: "#f1dfb8", tone: "cream" },
      { name: "Blush", hex: "#e85d9e", tone: "rose" },
    ],
    sizes: [
      { name: "Duo", stems: 2, price: 68 },
      { name: "Trio", stems: 3, price: 92 },
    ],
    rating: 4.8,
    reviewCount: 6,
    stock: 5,
  },
  {
    id: "lavender-tulip-trio",
    slug: "lavender-tulip-trio",
    name: "Lavender Tulip Trio",
    flower: "Tulip",
    variant: "Lavender · 3 stems",
    price: 88,
    availability: "Ready to ship",
    tone: "violet",
    description:
      "Three clean-lined tulips in lavender yarn, finished with green stems and simple wrapping.",
    colors: [
      { name: "Lavender", hex: "#8b5cf6", tone: "violet" },
      { name: "Soft Pink", hex: "#e85d9e", tone: "rose" },
    ],
    sizes: [
      { name: "Trio", stems: 3, price: 88 },
      { name: "Five", stems: 5, price: 128 },
    ],
    rating: 4.9,
    reviewCount: 11,
    stock: 8,
  },
  {
    id: "mini-daisy-posy",
    slug: "mini-daisy-posy",
    name: "Mini Daisy Posy",
    flower: "Daisy",
    variant: "Cream · 5 mini stems",
    price: 78,
    availability: "Made to order",
    badge: "Limited",
    tone: "cream",
    description:
      "A petite cluster of five miniature daisies for smaller gifts and compact arrangements.",
    colors: [
      { name: "Cream", hex: "#f1dfb8", tone: "cream" },
      { name: "Peach", hex: "#ef8d7f", tone: "peach" },
    ],
    sizes: [
      { name: "Mini", stems: 5, price: 78 },
      { name: "Full", stems: 9, price: 125 },
    ],
    rating: 4.6,
    reviewCount: 4,
    stock: 0,
    leadTime: "3–4 days",
  },
  {
    id: "blush-rose-bundle",
    slug: "blush-rose-bundle",
    name: "Blush Rose Bundle",
    flower: "Rose",
    variant: "Blush Pink · 7 stems",
    price: 185,
    availability: "Made to order",
    tone: "rose",
    description:
      "Seven crochet roses in a layered blush palette, arranged as a fuller statement bouquet for special occasions.",
    colors: [
      { name: "Blush Pink", hex: "#e85d9e", tone: "rose" },
      { name: "Lavender", hex: "#8b5cf6", tone: "violet" },
      { name: "Cream", hex: "#f1dfb8", tone: "cream" },
    ],
    sizes: [
      { name: "Five", stems: 5, price: 145 },
      { name: "Seven", stems: 7, price: 185 },
      { name: "Nine", stems: 9, price: 225 },
    ],
    rating: 5,
    reviewCount: 5,
    stock: 0,
    leadTime: "5–7 days",
  },
];

export const featuredProducts = products.filter((product) => product.featured);

export const flowerCollections = [
  { name: "Roses", tone: "rose" as const, note: "Forever romantic" },
  { name: "Tulips", tone: "violet" as const, note: "Soft & timeless" },
  { name: "Daisies", tone: "cream" as const, note: "Simple joy" },
  { name: "Sunflowers", tone: "sun" as const, note: "Bright moments" },
];

export const productFlowers = Array.from(
  new Set(products.map((product) => product.flower)),
).sort();

export function getProductBySlug(slug: string) {
  return products.find((product) => product.slug === slug);
}
