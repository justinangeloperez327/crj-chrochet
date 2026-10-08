"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { clearCart } from "@/lib/commerce-store";

export function OrderConfirmationSync({
  paid,
}: {
  paid: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (paid) {
      clearCart();
      return;
    }

    let refreshes = 0;
    const interval = window.setInterval(() => {
      refreshes += 1;
      router.refresh();

      if (refreshes >= 8) {
        window.clearInterval(interval);
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [paid, router]);

  return null;
}
