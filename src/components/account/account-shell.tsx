import Link from "next/link";
import { NavigationLink } from "@/components/navigation/navigation-link";
import { AccountWishlistSync } from "@/components/account/account-wishlist-sync";

import {
  Heart,
  Home,
  LogOut,
  MapPin,
  PackageSearch,
  UserRound,
  WandSparkles,
} from "lucide-react";

const navigation = [
  { label: "Overview", href: "/account", icon: Home },
  { label: "Orders", href: "/account/orders", icon: PackageSearch },
  { label: "Wishlist", href: "/account/wishlist", icon: Heart },
  {
    label: "Custom Bouquets",
    href: "/account/custom-bouquets",
    icon: WandSparkles,
  },
  { label: "Addresses", href: "/account/addresses", icon: MapPin },
];

export function AccountShell({
  children,
  name,
  email,
}: {
  children: React.ReactNode;
  name: string | null;
  email: string;
}) {
  return (
    <div className="min-h-screen bg-background">
      <AccountWishlistSync />
      <header className="border-b border-bloom-border bg-white">
        <div className="mx-auto flex min-h-20 gap-4 max-w-[1280px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex min-w-0 flex-col gap-1 py-3">
            <span className="font-display text-xl font-medium text-bloom-plum">
              Handmade Blooms
            </span>
            <span className="text-xs text-bloom-pink uppercase">by CRJ</span>
          </Link>

          <form method="post" action="/api/auth/logout">
            <button
              type="submit"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-semibold text-bloom-muted hover:text-bloom-plum"
            >
              <LogOut className="size-3.5" />
              Sign out
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1280px] gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[220px_1fr] lg:py-10">
        <aside>
          <div className="border border-bloom-border bg-white p-5">
            <div className="flex size-10 items-center justify-center rounded-full bg-bloom-pink-soft text-bloom-pink">
              <UserRound className="size-4" />
            </div>
            <p className="mt-4 text-sm font-semibold text-bloom-plum">
              {name || "Your account"}
            </p>
            <p className="mt-1 break-all text-[11px] text-bloom-muted">
              {email}
            </p>
          </div>

          <nav
            aria-label="Account navigation"
            className="mt-4 grid grid-cols-2 border border-bloom-border bg-white p-2 sm:grid-cols-3 lg:grid-cols-1"
          >
            {navigation.map(({ label, href, icon: Icon }) => (
              <NavigationLink
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-bloom-muted transition-colors hover:bg-bloom-pink-soft/40 hover:text-bloom-plum"
              >
                <Icon className="size-4" />
                {label}
              </NavigationLink>
            ))}
          </nav>
        </aside>

        <main id="main-content" className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
