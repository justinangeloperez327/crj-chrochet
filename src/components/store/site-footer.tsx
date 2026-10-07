import Link from "next/link";
import { Instagram, Mail } from "lucide-react";

const footerGroups = [
  {
    title: "Shop",
    links: ["All Blooms", "Best Sellers", "Collections", "Build a Bouquet"],
  },
  {
    title: "Help",
    links: ["Custom Orders", "Delivery", "Care Guide", "Contact"],
  },
  {
    title: "About",
    links: ["Our Story", "Handmade Process", "FAQ", "Terms"],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-bloom-border bg-[#fbf3f8]">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-14 sm:px-8 md:grid-cols-[1.35fr_2fr] lg:px-12 lg:py-18">
        <div className="max-w-md">
          <p className="font-display text-3xl font-semibold tracking-[-0.03em] text-bloom-plum">
            Handmade Blooms
          </p>
          <p className="mt-1 text-xs font-semibold tracking-[0.2em] text-bloom-pink uppercase">
            by CRJ
          </p>
          <p className="mt-5 max-w-sm text-sm leading-6 text-bloom-muted">
            Crochet flowers made stitch by stitch for celebrations, gifts, and
            little moments worth keeping.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <button className="flex size-10 items-center justify-center border border-bloom-border bg-white text-bloom-plum transition-colors hover:border-bloom-pink hover:text-bloom-pink" aria-label="Instagram">
              <Instagram className="size-4" />
            </button>
            <button className="flex size-10 items-center justify-center border border-bloom-border bg-white text-bloom-plum transition-colors hover:border-bloom-pink hover:text-bloom-pink" aria-label="Email">
              <Mail className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {footerGroups.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold tracking-[0.16em] text-bloom-plum uppercase">
                {group.title}
              </p>
              <div className="mt-4 flex flex-col gap-3">
                {group.links.map((link) => (
                  <Link
                    key={link}
                    href="#"
                    className="text-sm text-bloom-muted transition-colors hover:text-bloom-pink"
                  >
                    {link}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-bloom-border">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 py-5 text-xs text-bloom-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <p>© 2026 Handmade Blooms by CRJ.</p>
          <p>Made with care, one stitch at a time.</p>
        </div>
      </div>
    </footer>
  );
}
