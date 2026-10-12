import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { test, mock } from "node:test";
import { parseIntent, parseRefund, verifyZiinaSignature, ziinaCheckoutUrl, ziinaRequest, ziinaTestMode, ZiinaError } from "../src/lib/payments/ziina-client";
import { checkoutProvider } from "../src/lib/payments/provider";

test("Ziina signatures authenticate the exact raw body", () => {
  const body = '{"event":"payment_intent.status.updated"}';
  const signature = createHmac("sha256", "secret").update(body).digest("hex");
  assert.equal(verifyZiinaSignature(body, signature, "secret"), true);
  assert.equal(verifyZiinaSignature(body + " ", signature, "secret"), false);
  assert.equal(verifyZiinaSignature(body, "abc", "secret"), false);
  assert.equal(verifyZiinaSignature(body, signature, "wrong"), false);
});
test("Ziina response checks reject other merchants and invalid payment states", () => {
  const previous = process.env.ZIINA_ACCOUNT_ID;
  process.env.ZIINA_ACCOUNT_ID = "merchant";
  try {
    const intent = { id: randomUUID(), account_id: "merchant", amount: 20000, currency_code: "AED", status: "completed" };
    assert.equal(parseIntent(intent).amount, 20000);
    assert.throws(() => parseIntent({ ...intent, account_id: "other" }), /merchant/);
    assert.throws(() => parseIntent({ ...intent, amount: -1 }));
    assert.throws(() => parseIntent({ ...intent, status: "made_up" }));
    assert.throws(() => parseRefund({ id: randomUUID(), payment_intent_id: intent.id, amount: -1, currency_code: "AED", status: "completed" }));
  } finally { if (previous === undefined) delete process.env.ZIINA_ACCOUNT_ID; else process.env.ZIINA_ACCOUNT_ID = previous; }
});
test("Ziina checkout URLs stay on HTTPS provider hosts", () => {
  assert.equal(ziinaCheckoutUrl("https://pay.ziina.com/payment"), "https://pay.ziina.com/payment");
  for (const url of ["http://ziina.com", "https://ziina.com.evil.example", "https://evil.example", "https://user:pass@ziina.com"]) assert.throws(() => ziinaCheckoutUrl(url));
});
test("provider configuration defaults to Stripe and Ziina defaults to test mode", () => {
  const previous = { provider: process.env.PAYMENT_PROVIDER, mode: process.env.ZIINA_TEST_MODE };
  try {
    delete process.env.PAYMENT_PROVIDER; delete process.env.ZIINA_TEST_MODE;
    assert.equal(checkoutProvider(), "STRIPE"); assert.equal(ziinaTestMode(), true);
    process.env.PAYMENT_PROVIDER = "ziina"; process.env.ZIINA_TEST_MODE = "false";
    assert.equal(checkoutProvider(), "ZIINA"); assert.equal(ziinaTestMode(), false);
    process.env.ZIINA_TEST_MODE = "invalid"; assert.throws(ziinaTestMode);
    process.env.PAYMENT_PROVIDER = "invalid"; assert.throws(checkoutProvider);
  } finally { for (const [key, value] of [["PAYMENT_PROVIDER", previous.provider], ["ZIINA_TEST_MODE", previous.mode]]) { if (value === undefined) delete process.env[key!]; else process.env[key!] = value; } }
});
test("uncertain Ziina POST outcomes are distinguished from definite rejections", async () => {
  const previous = process.env.ZIINA_ACCESS_TOKEN;
  process.env.ZIINA_ACCESS_TOKEN = "fixture-token";
  try {
    mock.method(globalThis, "fetch", async () => { throw new Error("timeout"); });
    await assert.rejects(ziinaRequest("/payment_intent", { test: true }), (e: unknown) => e instanceof ZiinaError && e.ambiguous);
    mock.restoreAll();
    mock.method(globalThis, "fetch", async () => new Response("{}", { status: 400 }));
    await assert.rejects(ziinaRequest("/payment_intent", { test: true }), (e: unknown) => e instanceof ZiinaError && !e.ambiguous && e.status === 400);
  } finally { mock.restoreAll(); if (previous === undefined) delete process.env.ZIINA_ACCESS_TOKEN; else process.env.ZIINA_ACCESS_TOKEN = previous; }
});
