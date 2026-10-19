"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { NavigationLink } from "@/components/navigation/navigation-link";
import { CartDrawer } from "@/components/store/cart-drawer";
import {
  syncWishlistFromAccount,
  useCartCount,
  useWishlistCount,
} from "@/lib/commerce-store";

const navigation = [
  { label: "Shop", href: "/shop" },
  { label: "Collections", href: "/collections" },
  { label: "Build a bouquet", href: "/build-a-bouquet" },
  { label: "Our story", href: "/#story" },
];

export function SiteHeaderClient({
  businessName,
  brandByline,
  announcementEnabled,
  announcementText,
}: {
  businessName: string;
  brandByline: string;
  announcementEnabled: boolean;
  announcementText: string;
}) {
  const cartCount = useCartCount();
  const wishlistCount = useWishlistCount();
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);

  useEffect(() => {
    void syncWishlistFromAccount();
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    }
    function onPointer(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !header.current?.contains(event.target)
      )
        setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-[100] bg-white p-3 text-bloom-violet focus:not-sr-only"
      >
        Skip to content
      </a>
      {announcementEnabled ? (
        <div className="bg-bloom-plum px-5 py-2 text-center text-xs leading-5 text-white">
          {announcementText}
        </div>
      ) : null}
      <header
        ref={header}
        className="sticky top-0 z-50 border-b border-bloom-border bg-background"
      >
        <div className="bloom-container flex min-h-20 items-center justify-between gap-3 py-3">
          <Link
            href="/"
            aria-label={`${businessName} ${brandByline} home`}
            className="min-w-0 max-w-[55%] sm:max-w-none"
          >
            <span className="block font-display text-lg leading-tight font-medium tracking-[-0.03em] text-bloom-plum sm:text-2xl">
              {businessName}
            </span>
            <span className="mt-1 block text-xs text-bloom-pink">
              {brandByline}
            </span>
          </Link>
          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Main navigation"
          >
            {navigation.map((item) => (
              <NavigationLink
                key={item.href}
                href={item.href}
                className="flex min-h-11 items-center px-3 text-sm text-bloom-muted transition-colors hover:bg-bloom-violet-soft hover:text-bloom-violet"
              >
                {item.label}
              </NavigationLink>
            ))}
          </nav>
          <div className="flex shrink-0 items-center">
            <Link
              href="/search"
              className="flex size-11 items-center justify-center text-bloom-plum hover:bg-bloom-violet-soft"
              aria-label="Search products"
            >
              <Search className="size-[19px]" />
            </Link>
            <Link
              href="/account/wishlist"
              className="relative hidden size-11 items-center justify-center text-bloom-plum hover:bg-bloom-violet-soft sm:flex"
              aria-label={`Wishlist with ${wishlistCount} items`}
            >
              <Heart className="size-[19px]" />
              {wishlistCount > 0 ? (
                <span className="absolute right-0 top-0 bg-bloom-violet px-1 text-[10px] text-white">
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </span>
              ) : null}
            </Link>
            <Link
              href="/account"
              className="hidden size-11 items-center justify-center text-bloom-plum hover:bg-bloom-violet-soft lg:flex"
              aria-label="Account"
            >
              <UserRound className="size-[19px]" />
            </Link>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setCartOpen(true);
              }}
              className="relative flex size-11 items-center justify-center text-bloom-plum hover:bg-bloom-violet-soft"
              aria-label={`Shopping bag with ${cartCount} items`}
            >
              <ShoppingBag className="size-5" />
              {cartCount > 0 ? (
                <span className="absolute right-0 top-0 bg-bloom-pink px-1 text-[10px] text-white">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              ) : null}
            </button>
            <button
              ref={menuButton}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex size-11 items-center justify-center text-bloom-plum hover:bg-bloom-violet-soft lg:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls={menuId}
            >
              {menuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </button>
          </div>
        </div>
        {menuOpen ? (
          <nav
            id={menuId}
            aria-label="Mobile navigation"
            className="absolute inset-x-0 top-full max-h-[70dvh] overflow-y-auto border-b border-bloom-border bg-background px-5 py-4 shadow-lg lg:hidden"
          >
            {[
              ...navigation,
              { label: "Your account", href: "/account" },
              { label: "Your wishlist", href: "/account/wishlist" },
            ].map((item) => (
              <NavigationLink
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-12 items-center border-b border-bloom-border px-3 text-base text-bloom-plum hover:bg-bloom-violet-soft"
              >
                {item.label}
              </NavigationLink>
            ))}
          </nav>
        ) : null}
      </header>
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </>
  );
}
