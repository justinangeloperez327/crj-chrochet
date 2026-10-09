import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { BouquetBuilder } from "@/components/store/bouquet-builder";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import { listBouquetBuilderOptions } from "@/lib/bouquets/bouquet-service";

export const metadata: Metadata = {
  title: "Build a Bouquet",
  description:
    "Design a custom crochet bouquet with your own flower mix, colors, wrapping, and gift message.",
};

export default async function BuildABouquetPage() {
  let options: Awaited<ReturnType<typeof listBouquetBuilderOptions>> | null =
    null;

  if (process.env.DATABASE_URL) {
    try {
      options = await listBouquetBuilderOptions();
    } catch (error) {
      console.error("Bouquet builder options unavailable.", error);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main>
        <section className="border-b border-bloom-border bg-[#eee5fb]">
          <div className="mx-auto max-w-[1280px] px-5 py-12 sm:px-8 lg:py-16">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-bloom-muted hover:text-bloom-plum"
            >
              <ArrowLeft className="size-3.5" />
              Home
            </Link>
            <p className="mt-8 text-[10px] font-semibold tracking-[0.18em] text-bloom-violet uppercase">
              Designed by you · handmade by CRJ
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-5xl font-semibold tracking-[-0.05em] text-bloom-plum sm:text-6xl">
              Build your own bouquet.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-bloom-muted">
              Choose each stem, mix colors, select wrapping, and add a personal message. Your design is priced and planned from CRJ’s current workshop recipes.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-5 py-10 sm:px-8 lg:py-14">
          {options && options.stems.length > 0 && options.wraps.length > 0 ? (
            <BouquetBuilder stems={options.stems} wraps={options.wraps} />
          ) : (
            <div className="border border-bloom-border bg-white p-8 sm:p-10">
              <h2 className="font-display text-3xl font-semibold text-bloom-plum">
                Custom bouquet builder is being prepared.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-bloom-muted">
                The builder needs the PostgreSQL bouquet catalog and recipes. Configure the database and run the latest seed to activate it.
              </p>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
