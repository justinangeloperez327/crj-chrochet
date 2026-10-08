"use client";

import { useEffect } from "react";

import { syncWishlistFromAccount } from "@/lib/commerce-store";

export function AccountWishlistSync() {
  useEffect(() => {
    void syncWishlistFromAccount();
  }, []);

  return null;
}
