import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Handmade Blooms by CRJ",
    template: "%s · Handmade Blooms by CRJ",
  },
  description:
    "Handmade crochet flowers, bouquets, and custom blooms crafted by CRJ.",
};

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
