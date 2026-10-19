import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { proxy } from "../src/proxy";
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

test("malformed password hashes fail closed without expensive invalid parameters", async () => {
  for (const hash of ["bad", "scrypt$0$8$1$bad$" + "a".repeat(128), "scrypt$1073741824$8$1$" + "a".repeat(32) + "$" + "a".repeat(128)]) {
    assert.equal(await verifyPassword("password", hash), false);
  }
});


test("auth pages on deployment aliases redirect to the canonical host", () => {
  const previous = process.env.APP_URL;
  process.env.APP_URL = "https://handmade-blooms.vercel.app";
  try {
    const response = proxy(new NextRequest("https://handmade-blooms-alias.vercel.app/login?next=%2Fadmin"));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), "https://handmade-blooms.vercel.app/login?next=%2Fadmin");

    const canonical = proxy(new NextRequest("https://handmade-blooms.vercel.app/register"));
    assert.equal(canonical.status, 200);
    assert.equal(canonical.headers.get("location"), null);
  } finally {
    if (previous === undefined) delete process.env.APP_URL; else process.env.APP_URL = previous;
  }
});

test("accepts same-origin Vercel deployment aliases with a configured production origin", () => {
  const previous = process.env.APP_URL;
  process.env.APP_URL = "https://handmade-blooms.vercel.app";
  try {
    const alias = "https://handmade-blooms-example-team.vercel.app/api/auth/login";
    assert.equal(sameOriginForm(new Request(alias, { method: "POST", headers: {
      origin: "https://handmade-blooms-example-team.vercel.app",
    } })), true);
    assert.equal(sameOriginForm(new Request(alias, { method: "POST", headers: {
      origin: "https://attacker.example",
    } })), false);
    assert.equal(sameOriginForm(new Request(alias, { method: "POST", headers: {
      origin: "null",
    } })), false);
    assert.equal(sameOriginForm(new Request(alias, { method: "POST" })), false);
  } finally {
    if (previous === undefined) delete process.env.APP_URL; else process.env.APP_URL = previous;
  }
});

test("origin checks use configured public URL behind a proxy", () => {
  const previous = process.env.APP_URL;
  process.env.APP_URL = "https://store.example";
  try {
    assert.equal(sameOriginForm(new Request("http://localhost:3000/api/auth/login", { headers: { origin: "https://store.example" } })), true);
    assert.equal(sameOriginForm(new Request("http://localhost:3000/api/auth/login", { headers: { origin: "https://attacker.example" } })), false);
  } finally {
    if (previous === undefined) delete process.env.APP_URL; else process.env.APP_URL = previous;
  }
});
