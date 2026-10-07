import Link from "next/link";
import { Heart, Menu, Search, ShoppingBag, UserRound } from "lucide-react";

const navigation = [
  { label: "Shop", href: "#shop" },
  { label: "Collections", href: "#collections" },
  { label: "Build a Bouquet", href: "#bouquet" },
  { label: "Our Story", href: "#story" },
];

export function SiteHeader() {
  return (
    <>
      <div className="border-b border-bloom-border bg-bloom-plum px-4 py-2 text-center text-[11px] font-medium tracking-[0.18em] text-white/90 uppercase sm:text-xs">
        Handmade slowly · Gifted meaningfully
      </div>
      <header className="sticky top-0 z-50 border-b border-bloom-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
          <Link href="/" className="group flex items-baseline gap-2" aria-label="Handmade Blooms by CRJ home">
            <span className="font-display text-xl font-semibold tracking-[-0.02em] text-bloom-plum sm:text-[1.35rem]">
              Handmade Blooms
            </span>
            <span className="text-[10px] font-semibold tracking-[0.2em] text-bloom-pink uppercase">
              by CRJ
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-bloom-muted transition-colors hover:text-bloom-plum"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <button className="hidden size-9 items-center justify-center text-bloom-plum transition-colors hover:text-bloom-pink sm:flex" aria-label="Search">
              <Search className="size-[18px]" />
            </button>
            <button className="hidden size-9 items-center justify-center text-bloom-plum transition-colors hover:text-bloom-pink sm:flex" aria-label="Wishlist">
              <Heart className="size-[18px]" />
            </button>
            <button className="hidden size-9 items-center justify-center text-bloom-plum transition-colors hover:text-bloom-pink md:flex" aria-label="Account">
              <UserRound className="size-[18px]" />
            </button>
            <button className="relative flex size-9 items-center justify-center text-bloom-plum transition-colors hover:text-bloom-pink" aria-label="Shopping bag">
              <ShoppingBag className="size-[19px]" />
              <span className="absolute right-0 top-0 flex size-4 items-center justify-center rounded-full bg-bloom-pink text-[9px] font-bold text-white">
                0
              </span>
            </button>
            <button className="flex size-9 items-center justify-center text-bloom-plum lg:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
