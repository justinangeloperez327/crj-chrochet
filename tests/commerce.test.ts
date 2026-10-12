import assert from "node:assert/strict";
import { test } from "node:test";
import { safeAccountRedirect } from "../src/lib/auth/security";
import { verifyCheckoutReturn, signCheckoutReturn } from "../src/lib/payments/stripe";
import { loadStorefrontProducts, loadStorefrontProductBySlug } from "../src/lib/data/storefront-catalog";
import { loadStorefrontCollections } from "../src/lib/data/storefront-collections";

test("login redirects reject protocol-relative, backslash, and normalized API destinations", () => {
  for (const value of ["//evil.example", "/\\evil.example", "/ /evil.example", "/x/../api/auth/logout", "https://evil.example", "/api/auth/login"]) {
    assert.equal(safeAccountRedirect(value), "/account", value);
  }
  assert.equal(safeAccountRedirect("/account/orders?tab=paid"), "/account/orders?tab=paid");
});

test("checkout cancellation signature is bound to the order", () => {
  const previous = process.env.CHECKOUT_RETURN_SECRET;
  process.env.CHECKOUT_RETURN_SECRET = "test-only-secret-not-for-production";
  try {
    const signature = signCheckoutReturn("order-a");
    assert.equal(verifyCheckoutReturn("order-a", signature), true);
    assert.equal(verifyCheckoutReturn("order-b", signature), false);
    assert.equal(verifyCheckoutReturn("order-a", "garbage"), false);
  } finally {
    if (previous === undefined) delete process.env.CHECKOUT_RETURN_SECRET;
    else process.env.CHECKOUT_RETURN_SECRET = previous;
  }
});

test("production never renders development catalogue without a database", async () => {
  const previousNode = process.env.NODE_ENV;
  const previousDb = process.env.DATABASE_URL;
  Object.assign(process.env, { NODE_ENV: "production" });
  delete process.env.DATABASE_URL;
  try {
    assert.deepEqual(await loadStorefrontProducts(), []);
    assert.equal(await loadStorefrontProductBySlug("pink-tulip-bouquet"), undefined);
    assert.deepEqual(await loadStorefrontCollections(), []);
  } finally {
    Object.assign(process.env, { NODE_ENV: previousNode });
    if (previousDb === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDb;
  }
});
