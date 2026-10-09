import Link from "next/link";
import {
  Boxes,
  Flower2,
  FlaskConical,
  Hammer,
  LayoutDashboard,
  PackageSearch,
  ShoppingBag,
  Store,
  WandSparkles,
} from "lucide-react";

const navigation = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Products", href: "/admin/products", icon: Flower2 },
  { label: "Inventory", href: "/admin/inventory", icon: Boxes },
  { label: "Materials", href: "/admin/materials", icon: FlaskConical },
  { label: "Custom Bouquets", href: "/admin/custom-bouquets", icon: WandSparkles },
  { label: "Production", href: "/admin/production", icon: Hammer },
  { label: "Orders", href: "/admin/orders", icon: PackageSearch },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f4f6] text-bloom-plum">
      <div className="border-b border-bloom-border bg-bloom-plum px-5 py-2 text-center text-[10px] font-semibold tracking-[0.16em] text-white/80 uppercase">
        Handmade Blooms · Operations
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1600px] lg:grid-cols-[230px_1fr]">
        <aside className="hidden border-r border-bloom-border bg-white lg:flex lg:flex-col">
          <div className="border-b border-bloom-border px-6 py-6">
            <Link href="/admin" className="block">
              <p className="font-display text-xl font-semibold tracking-[-0.03em]">
                Handmade Blooms
              </p>
              <p className="mt-1 text-[10px] font-semibold tracking-[0.16em] text-bloom-pink uppercase">
                Admin
              </p>
            </Link>
          </div>

          <nav className="flex-1 px-3 py-4" aria-label="Admin navigation">
            {navigation.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-bloom-muted transition-colors hover:bg-bloom-pink-soft/45 hover:text-bloom-plum"
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="border-t border-bloom-border p-4">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-3 text-sm font-medium text-bloom-muted hover:text-bloom-plum"
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
            <nav className="flex overflow-x-auto border-t border-bloom-border px-3 py-2">
              {navigation.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  className="shrink-0 px-3 py-2 text-xs font-semibold text-bloom-muted"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </header>

          <main className="px-5 py-6 sm:px-8 lg:px-10 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
