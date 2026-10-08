import Link from "next/link";
import { ArrowRight, Heart, MapPin, PackageSearch } from "lucide-react";

import { updateAccountProfile } from "@/app/account/actions";
import { requireUser } from "@/lib/auth/guards";
import { getAccountOverview } from "@/lib/data/account-repository";

export default async function AccountPage() {
  const user = await requireUser();
  const data = await getAccountOverview(user.id);

  if (!data) return null;

  const customer = data.customer;
  const latestOrder = customer?.orders[0];

  return (
    <div>
      <p className="text-[10px] font-semibold tracking-[0.16em] text-bloom-pink uppercase">
        My account
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em] text-bloom-plum">
        Welcome{data.name ? `, ${data.name.split(" ")[0]}` : ""}.
      </h1>
      <p className="mt-2 text-sm text-bloom-muted">
        Keep track of orders, favorites, and delivery details.
      </p>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <Card
          label="Orders"
          value={customer?._count.orders ?? 0}
          href="/account/orders"
          icon={<PackageSearch className="size-4" />}
        />
        <Card
          label="Wishlist"
          value={data.wishlist.length}
          href="/account/wishlist"
          icon={<Heart className="size-4" />}
        />
        <Card
          label="Addresses"
          value={customer?._count.addresses ?? 0}
          href="/account/addresses"
          icon={<MapPin className="size-4" />}
        />
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <section className="border border-bloom-border bg-white p-6">
          <h2 className="text-sm font-semibold text-bloom-plum">
            Profile
          </h2>
          <p className="mt-1 text-[11px] text-bloom-muted">
            Your name and phone are also used for future checkouts.
          </p>

          <form action={updateAccountProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="text-xs font-semibold text-bloom-plum">
                Full name
              </span>
              <input
                name="name"
                required
                defaultValue={data.name ?? ""}
                className="mt-2 h-11 w-full border border-bloom-border bg-white px-3 text-sm outline-none focus:border-bloom-violet"
              />
            </label>
            <label>
              <span className="text-xs font-semibold text-bloom-plum">
                Phone
              </span>
              <input
                name="phone"
                type="tel"
                defaultValue={customer?.phone ?? ""}
                className="mt-2 h-11 w-full border border-bloom-border bg-white px-3 text-sm outline-none focus:border-bloom-violet"
              />
            </label>

            <button
              type="submit"
              className="h-10 w-fit bg-bloom-plum px-4 text-xs font-semibold text-white sm:col-span-2"
            >
              Save profile
            </button>
          </form>
        </section>

        <section className="border border-bloom-border bg-white p-6">
          <h2 className="text-sm font-semibold text-bloom-plum">
            Latest order
          </h2>

          {latestOrder ? (
            <div className="mt-5">
              <p className="text-xs font-semibold text-bloom-plum">
                {latestOrder.orderNumber}
              </p>
              <p className="mt-2 text-[11px] text-bloom-muted">
                {latestOrder._count.items} items · {formatDate(latestOrder.createdAt)}
              </p>
              <p className="mt-4 text-xl font-semibold text-bloom-plum">
                {latestOrder.currency} {Number(latestOrder.total)}
              </p>
              <Link
                href="/account/orders"
                className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-bloom-violet"
              >
                View order history
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          ) : (
            <div className="mt-5">
              <p className="text-sm leading-6 text-bloom-muted">
                Your first handmade bloom is still waiting for you.
              </p>
              <Link
                href="/shop"
                className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-bloom-pink"
              >
                Browse the shop
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value: number;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="border border-bloom-border bg-white p-5">
      <div className="flex size-9 items-center justify-center bg-bloom-pink-soft text-bloom-pink">
        {icon}
      </div>
      <p className="mt-4 text-xs text-bloom-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-bloom-plum">{value}</p>
    </Link>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
