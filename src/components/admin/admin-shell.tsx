import Link from "next/link";
import { NavigationLink } from "@/components/navigation/navigation-link";

import { getStoreSettings } from "@/lib/settings/store-settings";
import {
  BadgePercent,
  BarChart3,
  Boxes,
  Flower2,
  FlaskConical,
  Hammer,
  LayoutDashboard,
  Layers,
  MessageSquareText,
  PackageSearch,
  Settings2,
  ShoppingBag,
  LogOut,
  Store,
  Users,
  WandSparkles,
} from "lucide-react";

const navigation = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Flower2 },
  { label: "Collections", href: "/admin/collections", icon: Layers },
  { label: "Inventory", href: "/admin/inventory", icon: Boxes },
  { label: "Materials", href: "/admin/materials", icon: FlaskConical },
  { label: "Bouquet Options", href: "/admin/bouquet-options", icon: Flower2 },
  {
    label: "Custom Bouquets",
    href: "/admin/custom-bouquets",
    icon: WandSparkles,
  },
  { label: "Production", href: "/admin/production", icon: Hammer },
  { label: "Orders", href: "/admin/orders", icon: PackageSearch },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Reviews", href: "/admin/reviews", icon: MessageSquareText },
  { label: "Discounts", href: "/admin/discounts", icon: BadgePercent },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings2 },
];

export async function AdminShell({ children }: { children: React.ReactNode }) {
  const settings = await getStoreSettings();

  return (
    <div className="admin-workspace min-h-screen bg-background text-bloom-plum">
      <div className="border-b border-bloom-border bg-bloom-plum px-5 py-2 text-center text-xs font-medium text-white">
        {settings.businessName} · Operations
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1600px] lg:grid-cols-[230px_1fr]">
        <aside className="sticky top-0 hidden max-h-dvh self-start overflow-y-auto border-r border-bloom-border bg-white lg:flex lg:min-h-dvh lg:flex-col">
          <div className="border-b border-bloom-border px-6 py-6">
            <Link href="/admin" className="block">
              <p className="font-display text-xl font-medium tracking-[-0.03em]">
                {settings.businessName}
              </p>
              <p className="mt-1 text-xs text-bloom-pink">
                {settings.brandByline} · Admin
              </p>
            </Link>
          </div>

          <nav className="flex-1 px-3 py-4" aria-label="Admin navigation">
            {navigation.map(({ label, href, icon: Icon }) => (
              <NavigationLink
                key={href}
                href={href}
                className="flex items-center gap-3 min-h-11 px-3 py-2.5 text-sm font-medium text-bloom-muted transition-colors hover:bg-bloom-pink-soft/45 hover:text-bloom-plum"
              >
                <Icon className="size-4" />
                {label}
              </NavigationLink>
            ))}
          </nav>

          <div className="border-t border-bloom-border p-4">
            <form method="post" action="/api/auth/logout">
              <button
                className="flex min-h-11 w-full items-center gap-3 px-3 text-sm text-bloom-muted hover:bg-bloom-violet-soft"
                type="submit"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </form>
            <Link
              href="/"
              className="flex items-center gap-3 min-h-11 px-3 py-2.5 text-sm font-medium text-bloom-muted hover:text-bloom-plum"
            >
              <Store className="size-4" />
              View storefront
            </Link>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="border-b border-bloom-border bg-white lg:hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <Link href="/admin">
                <span className="font-display text-lg font-semibold">
                  Blooms Admin
                </span>
              </Link>
              <Link
                href="/"
                className="flex size-9 items-center justify-center border border-bloom-border"
                aria-label="View storefront"
              >
                <ShoppingBag className="size-4" />
              </Link>
            </div>
            <details className="border-t border-bloom-border px-5 py-2">
              <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-bloom-violet">
                Manage store
              </summary>
              <nav
                aria-label="Mobile admin navigation"
                className="grid grid-cols-2 gap-1 pb-3"
              >
                {navigation.map(({ label, href, icon: Icon }) => (
                  <NavigationLink
                    key={href}
                    href={href}
                    className="flex min-h-12 items-center gap-2 px-2 text-sm text-bloom-muted hover:bg-bloom-violet-soft"
                  >
                    <Icon className="size-4 shrink-0" />
                    {label}
                  </NavigationLink>
                ))}
              </nav>
              <form method="post" action="/api/auth/logout">
                <button
                  type="submit"
                  className="flex min-h-11 items-center gap-2 pb-2 text-sm text-bloom-muted"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </form>
            </details>
          </header>

          <main
            id="main-content"
            className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
