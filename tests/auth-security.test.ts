import assert from "node:assert/strict";
import { test } from "node:test";
import { hashAuthToken } from "../src/lib/auth/email-tokens";
import { sameOriginForm } from "../src/lib/auth/security";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";

test("hashed tokens never preserve the raw secret", () => {
  const secret = "f".repeat(43);
  assert.notEqual(hashAuthToken(secret), secret);
  assert.equal(hashAuthToken(secret), hashAuthToken(secret));
  assert.notEqual(hashAuthToken(secret), hashAuthToken("g".repeat(43)));
});

test("unsafe form posts require a same-origin header", () => {
  const url = "https://handmade.example/api/auth/login";
  assert.equal(sameOriginForm(new Request(url, { method: "POST" })), false);
  assert.equal(sameOriginForm(new Request(url, { method: "POST", headers: { origin: "https://bad.example" } })), false);
  assert.equal(sameOriginForm(new Request(url, { method: "POST", headers: { origin: "https://handmade.example" } })), true);
});

test("password hashes are salted and reject incorrect passwords", async () => {
  const password = "a long valid password for CRJ 2026";
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword("different password", first), false);
});
