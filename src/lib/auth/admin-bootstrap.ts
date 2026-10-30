import { createHash, timingSafeEqual } from "node:crypto";
import { requireDb, runTransaction } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

// Only called from the rate-limited, same-origin login flow.
// The environment credentials can create a missing ADMIN or recover the
// password of that exact ADMIN. They never promote an existing customer.
export async function bootstrapAdminOnLogin(emailInput: string, password: string) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "CRJ Administrator";
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !configuredPassword || configuredPassword.length < 12 || configuredPassword.length > 200 ||
      configuredPassword === "change-this-to-a-long-random-password" || name.length > 120 ||
      emailInput.trim().toLowerCase() !== email || password.length > 200) return null;

  // Both digests are constant size, so password comparison never leaks
  // differences in the supplied secret through an early character mismatch.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(digest(password), digest(configuredPassword))) return null;

  const db = requireDb();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.role !== "ADMIN") return null;
    if (await verifyPassword(configuredPassword, existing.passwordHash)) return existing;

    // Recover a previously created administrator after ADMIN_PASSWORD changes.
    // This is restricted to the exact configured ADMIN_EMAIL and ADMIN role;
    // concurrent recoveries are serialized and never revoke a fresh session
    // unless they actually rotate the password.
    const passwordHash = await hashPassword(configuredPassword);
    await runTransaction(async (tx) => {
      const result = await tx.user.updateMany({
        where: { id: existing.id, email, role: "ADMIN", passwordHash: existing.passwordHash },
        data: { passwordHash },
      });
      if (result.count !== 1) return;
      await tx.authSession.deleteMany({ where: { userId: existing.id } });
      await tx.authToken.deleteMany({ where: { userId: existing.id } });
    });
    const current = await db.user.findUnique({ where: { email } });
    return current?.role === "ADMIN" && await verifyPassword(configuredPassword, current.passwordHash)
      ? current : null;
  }

  const passwordHash = await hashPassword(configuredPassword);
  // A concurrent customer registration cannot be promoted into ADMIN.
  await db.user.createMany({
    data: [{ email, name, passwordHash, role: "ADMIN", emailVerifiedAt: new Date() }],
    skipDuplicates: true,
  });
  const user = await db.user.findUnique({ where: { email } });
  return user?.role === "ADMIN" && await verifyPassword(configuredPassword, user.passwordHash)
    ? user : null;
}
