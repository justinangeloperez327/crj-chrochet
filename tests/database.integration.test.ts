import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { test } from "node:test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashAuthToken, resetPasswordWithToken, verifyEmailToken } from "../src/lib/auth/email-tokens";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";

test("migrations, guest claim, one-time verification, and reset", async () => {
  const connectionString = process.env.DATABASE_URL;
  assert.ok(connectionString?.includes("crj_test"), "Use disposable CI database only");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const email = "guest-" + randomBytes(8).toString("hex") + "@example.invalid";
  let userId: string | undefined;
  let customerId: string | undefined;
  try {
    const legacy = await db.customer.create({ data: { email } });
    customerId = legacy.id;
    const user = await db.user.create({
      data: { email, name: "Verified Test Customer", passwordHash: await hashPassword("old password for integration") },
    });
    userId = user.id;
    assert.equal(user.emailVerifiedAt, null);
    const token = randomBytes(32).toString("base64url");
    await db.authToken.create({
      data: {
        userId, tokenHash: hashAuthToken(token), type: "EMAIL_VERIFICATION",
        expiresAt: new Date(Date.now() + 600_000),
      },
    });
    assert.equal(await verifyEmailToken(token), true);
    assert.equal(await verifyEmailToken(token), false);
    const claimed = await db.customer.findUniqueOrThrow({ where: { id: legacy.id } });
    assert.equal(claimed.userId, userId);
    assert.ok((await db.user.findUniqueOrThrow({ where: { id: userId } })).emailVerifiedAt);
    const reset = randomBytes(32).toString("base64url");
    await db.authToken.create({
      data: { userId, tokenHash: hashAuthToken(reset), type: "PASSWORD_RESET",
        expiresAt: new Date(Date.now() + 600_000) },
    });
    await db.authSession.create({
      data: { userId, tokenHash: hashAuthToken(randomBytes(32).toString("base64url")),
        expiresAt: new Date(Date.now() + 600_000) },
    });
    const newPassword = "a new secure password for integration";
    assert.equal(await resetPasswordWithToken(reset, newPassword), true);
    assert.equal(await resetPasswordWithToken(reset, newPassword), false);
    const updated = await db.user.findUniqueOrThrow({ where: { id: userId } });
    assert.equal(await verifyPassword(newPassword, updated.passwordHash), true);
    assert.equal(await db.authSession.count({ where: { userId } }), 0);
  } finally {
    if (userId) await db.user.delete({ where: { id: userId } }).catch(() => undefined);
    if (customerId) await db.customer.delete({ where: { id: customerId } }).catch(() => undefined);
    await db.$disconnect();
  }
});
