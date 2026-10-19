import type { Metadata } from "next";
import localFont from "next/font/local";

import { getStoreSettings } from "@/lib/settings/store-settings";

import "./globals.css";

const geistSans = localFont({
  src: "./fonts/geist-latin.woff2",
  display: "swap",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  display: "swap",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const fraunces = localFont({
  src: "./fonts/fraunces-latin.woff2",
  display: "swap",
  variable: "--font-fraunces",
  weight: "100 900",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getStoreSettings();
  const brand = `${settings.businessName} ${settings.brandByline}`.trim();

  return {
    title: {
      default: settings.seoTitle,
      template: `%s · ${brand}`,
    },
    description: settings.seoDescription,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} min-h-screen antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
