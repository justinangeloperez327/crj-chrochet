import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test, mock } from "node:test";
import { requireDb } from "../src/lib/db";
import { bootstrapAdminOnLogin } from "../src/lib/auth/admin-bootstrap";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";

const password = "fixture-admin-long-password";
function configure() {
  assert.equal(new URL(process.env.DATABASE_URL!).pathname, "/crj_test", "Use disposable test database only");
  const email = "bootstrap-" + randomUUID() + "@example.invalid";
  const previous = [process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD, process.env.ADMIN_NAME];
  process.env.ADMIN_EMAIL = email.toUpperCase(); process.env.ADMIN_PASSWORD = password; process.env.ADMIN_NAME = "Vercel Admin";
  return { email, db: requireDb(), restore: () => {
    mock.restoreAll();
    ["ADMIN_EMAIL", "ADMIN_PASSWORD", "ADMIN_NAME"].forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; });
  } };
}

test("concurrent correct first logins create one verified admin with a hashed password", async () => {
  const f = configure();
  try {
    const results = await Promise.all(Array.from({ length: 4 }, () => bootstrapAdminOnLogin(f.email, password)));
    assert.equal(await f.db.user.count({ where: { email: f.email } }), 1);
    const user = await f.db.user.findUniqueOrThrow({ where: { email: f.email } });
    assert.equal(user.role, "ADMIN"); assert.ok(user.emailVerifiedAt); assert.equal(user.name, "Vercel Admin");
    assert.notEqual(user.passwordHash, password); assert.equal(await verifyPassword(password, user.passwordHash), true);
    assert.ok(results.some(Boolean));
  } finally { await f.db.user.deleteMany({ where: { email: f.email } }); f.restore(); }
});

test("incorrect or invalid environment credentials never create an account", async () => {
  const f = configure();
  try {
    assert.equal(await bootstrapAdminOnLogin(f.email, "wrong-password"), null);
    assert.equal(await bootstrapAdminOnLogin("other@example.invalid", password), null);
    for (const value of ["short", "change-this-to-a-long-random-password", "x".repeat(201), ""]) {
      process.env.ADMIN_PASSWORD = value;
      assert.equal(await bootstrapAdminOnLogin(f.email, value), null);
    }
    delete process.env.ADMIN_PASSWORD;
    assert.equal(await bootstrapAdminOnLogin(f.email, password), null);
    assert.equal(await f.db.user.count({ where: { email: f.email } }), 0);
  } finally { await f.db.user.deleteMany({ where: { email: f.email } }); f.restore(); }
});

test("existing admin passwords and sessions survive environment changes", async () => {
  const f = configure();
  try {
    await bootstrapAdminOnLogin(f.email, password);
    const before = await f.db.user.findUniqueOrThrow({ where: { email: f.email } });
    await f.db.authSession.create({ data: { userId: before.id, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 600000) } });
    process.env.ADMIN_PASSWORD = "replacement-environment-password"; process.env.ADMIN_NAME = "Changed name";
    assert.equal(await bootstrapAdminOnLogin(f.email, process.env.ADMIN_PASSWORD), null);
    const after = await f.db.user.findUniqueOrThrow({ where: { email: f.email } });
    assert.equal(after.passwordHash, before.passwordHash); assert.equal(after.name, before.name);
    assert.equal(await f.db.authSession.count({ where: { userId: before.id } }), 1);
    delete process.env.ADMIN_PASSWORD;
    assert.equal(await verifyPassword(password, after.passwordHash), true);
  } finally { await f.db.user.deleteMany({ where: { email: f.email } }); f.restore(); }
});

test("an existing customer is never promoted or verified by bootstrap", async () => {
  const f = configure();
  try {
    const hash = await hashPassword("original-customer-password");
    await f.db.user.create({ data: { email: f.email, role: "CUSTOMER", passwordHash: hash, name: "Customer" } });
    assert.equal(await bootstrapAdminOnLogin(f.email, password), null);
    const user = await f.db.user.findUniqueOrThrow({ where: { email: f.email } });
    assert.equal(user.role, "CUSTOMER"); assert.equal(user.emailVerifiedAt, null); assert.equal(user.passwordHash, hash);
  } finally { await f.db.user.deleteMany({ where: { email: f.email } }); f.restore(); }
});
