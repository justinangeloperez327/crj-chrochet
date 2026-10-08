import type { Metadata } from "next";

import { AccountShell } from "@/components/account/account-shell";
import { requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: {
    default: "My Account",
    template: "%s · Handmade Blooms",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AccountLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  return (
    <AccountShell name={user.name} email={user.email}>
      {children}
    </AccountShell>
  );
}
