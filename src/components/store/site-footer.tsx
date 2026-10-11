import Link from "next/link";
import {
  Instagram,
  Mail,
  MessageCircle,
  Phone,
} from "lucide-react";

import { getStoreSettings } from "@/lib/settings/store-settings";

const footerGroups = [
  {
    title: "Shop",
    links: [
      { label: "All Blooms", href: "/shop" },
      { label: "Best Sellers", href: "/collections/best-sellers" },
      { label: "Collections", href: "/collections" },
      { label: "Build a Bouquet", href: "/build-a-bouquet" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Custom Orders", href: "/build-a-bouquet" },
      { label: "Delivery", href: "/checkout" },
      { label: "Contact", href: "/#story" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "Our Story", href: "/#story" },
      { label: "Handmade Process", href: "/#story" },
      { label: "Collections", href: "/collections" },
    ],
  },
];

export async function SiteFooter() {
  const settings = await getStoreSettings();
  const socialLinks = [
    settings.instagramUrl
      ? {
          label: "Instagram",
          href: settings.instagramUrl,
          icon: Instagram,
        }
      : null,
    settings.whatsappUrl
      ? {
          label: "WhatsApp",
          href: settings.whatsappUrl,
          icon: MessageCircle,
        }
      : null,
    settings.supportEmail
      ? {
          label: "Email",
          href: `mailto:${settings.supportEmail}`,
          icon: Mail,
        }
      : null,
    settings.supportPhone
      ? {
          label: "Phone",
          href: `tel:${settings.supportPhone.replace(/\s+/g, "")}`,
          icon: Phone,
        }
      : null,
  ].filter(
    (
      item,
    ): item is {
      label: string;
      href: string;
      icon: typeof Instagram;
    } => Boolean(item),
  );

  const textSocialLinks = [
    settings.facebookUrl
      ? { label: "Facebook", href: settings.facebookUrl }
      : null,
    settings.tiktokUrl
      ? { label: "TikTok", href: settings.tiktokUrl }
      : null,
  ].filter(
    (item): item is { label: string; href: string } => Boolean(item),
  );

  return (
    <footer className="border-t border-bloom-border bg-[#fbf3f8]">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-5 py-14 sm:px-8 md:grid-cols-[1.35fr_2fr] lg:px-12 lg:py-18">
        <div className="max-w-md">
          <p className="font-display text-3xl font-semibold tracking-[-0.03em] text-bloom-plum">
            {settings.businessName}
          </p>
          <p className="mt-1 text-xs font-semibold tracking-[0.2em] text-bloom-pink uppercase">
            {settings.brandByline}
          </p>
          <p className="mt-5 max-w-sm text-sm leading-6 text-bloom-muted">
            {settings.tagline}
          </p>

          {socialLinks.length > 0 ? (
            <div className="mt-6 flex items-center gap-3">
              {socialLinks.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={
                    href.startsWith("http")
                      ? "noreferrer"
                      : undefined
                  }
                  className="flex size-10 items-center justify-center border border-bloom-border bg-white text-bloom-plum transition-colors hover:border-bloom-pink hover:text-bloom-pink"
                  aria-label={label}
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          ) : null}

          {textSocialLinks.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              {textSocialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-bloom-muted hover:text-bloom-pink"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
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
                    key={link.label}
                    href={link.href}
                    className="text-sm text-bloom-muted transition-colors hover:text-bloom-pink"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-bloom-border">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-5 py-5 text-xs text-bloom-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <p>
            © {new Date().getFullYear()} {settings.businessName}{" "}
            {settings.brandByline}.
          </p>
          <p>Made with care, one stitch at a time.</p>
        </div>
      </div>
    </footer>
  );
}
