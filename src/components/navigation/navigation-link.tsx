"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function NavigationLink({
  href,
  className,
  children,
  ...props
}: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const path = String(href);
  const active =
    !path.includes("#") &&
    (pathname === path ||
      (!["/", "/admin", "/account"].includes(path) &&
        pathname.startsWith(path + "/")));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        className,
        "aria-[current=page]:bg-bloom-violet-soft aria-[current=page]:text-bloom-violet aria-[current=page]:shadow-[inset_3px_0_var(--bloom-violet)]",
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
