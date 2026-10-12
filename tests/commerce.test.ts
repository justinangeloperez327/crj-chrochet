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

import { parseCart } from "../src/lib/commerce-store";

test("corrupt persisted carts fail closed", () => {
  for (const raw of ["null", "{}", "invalid", "[null]", '[{"productId":"x","name":"x","variant":"x","quantity":-1,"unitPrice":10}]']) assert.deepEqual(parseCart(raw), []);
});

import { matchesImageType } from "../src/lib/media/image-validation";

test("upload signatures reject executable content disguised as images", () => {
  const html = Buffer.from("<svg onload=alert(1)></svg>");
  for (const type of ["image/jpeg", "image/png", "image/webp", "image/avif"]) assert.equal(matchesImageType(html, type), false);
  assert.equal(matchesImageType(Buffer.from([0xff, 0xd8, 0xff, 0]), "image/jpeg"), true);
  assert.equal(matchesImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png"), true);
  assert.equal(matchesImageType(Buffer.from("RIFF0000WEBP"), "image/webp"), true);
});
