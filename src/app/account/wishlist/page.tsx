import Link from "next/link";
import { Heart } from "lucide-react";

import { ProductCard } from "@/components/store/product-card";
import { requireUser } from "@/lib/auth/guards";
import { listAccountWishlist } from "@/lib/data/account-repository";
import { loadStorefrontProducts } from "@/lib/data/storefront-catalog";

export const metadata = { title: "Wishlist" };

export default async function AccountWishlistPage() {
  const user = await requireUser();
  const [wishlist, storefrontProducts] = await Promise.all([
    listAccountWishlist(user.id),
    loadStorefrontProducts(),
  ]);

  if (!wishlist) return null;

  const wantedSlugs = new Set(wishlist.map((item) => item.product.slug));
  const products = storefrontProducts.filter((product) =>
    wantedSlugs.has(product.slug),
  );

  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-pink uppercase">
        Favorites
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-bloom-plum">
        Your wishlist
      </h1>
      <p className="mt-2 text-sm text-bloom-muted">
        Handmade blooms you saved for later.
      </p>

      {products.length > 0 ? (
        <div className="mt-7 grid grid-cols-2 gap-x-3 gap-y-9 md:grid-cols-3 xl:grid-cols-4 md:gap-x-5">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="mt-7 border border-bloom-border bg-white px-6 py-14 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-bloom-pink-soft text-bloom-pink">
            <Heart className="size-5" />
          </div>
          <p className="mt-5 font-display text-2xl font-semibold text-bloom-plum">
            Nothing saved yet.
          </p>
          <p className="mt-2 text-sm text-bloom-muted">
            Tap the heart on a bloom and it will appear here.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-flex h-11 items-center bg-bloom-plum px-5 text-sm font-semibold text-white"
          >
            Browse blooms
          </Link>
        </div>
      )}
    </div>
  );
}
