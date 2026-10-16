import Link from "next/link";
import { Flower2, Mail, Phone } from "lucide-react";
import { redirect } from "next/navigation";

import { getStoreSettings } from "@/lib/settings/store-settings";

export const metadata = {
  title: "Store maintenance",
  robots: { index: false, follow: false },
};

export default async function MaintenancePage() {
  const settings = await getStoreSettings();

  if (!settings.maintenanceMode) {
    redirect("/");
  }

  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center bg-[#fff7fb] px-5 py-16">
      <div className="w-full max-w-2xl border border-bloom-border bg-white p-8 text-center sm:p-12">
        <div className="mx-auto flex size-12 items-center justify-center bg-bloom-pink-soft text-bloom-pink">
          <Flower2 className="size-5" />
        </div>
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-bloom-violet">
          {settings.businessName} {settings.brandByline}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em] text-bloom-plum sm:text-5xl">
          The flower shop is being refreshed.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-bloom-muted">
          {settings.maintenanceMessage}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {settings.supportEmail ? (
            <a
              href={`mailto:${settings.supportEmail}`}
              className="inline-flex h-10 items-center gap-2 border border-bloom-border px-4 text-xs font-semibold text-bloom-plum"
            >
              <Mail className="size-3.5" />
              Email support
            </a>
          ) : null}
          {settings.supportPhone ? (
            <a
              href={`tel:${settings.supportPhone.replace(/\s+/g, "")}`}
              className="inline-flex h-10 items-center gap-2 border border-bloom-border px-4 text-xs font-semibold text-bloom-plum"
            >
              <Phone className="size-3.5" />
              Call support
            </a>
          ) : null}
          <Link
            href="/login"
            className="inline-flex h-10 items-center bg-bloom-plum px-4 text-xs font-semibold text-white"
          >
            Customer sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
