import { createHash, timingSafeEqual } from "node:crypto";
import { requireDb } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

// Called only by the rate-limited, same-origin password login flow.
// Environment credentials create a missing account; they never update one.
export async function bootstrapAdminOnLogin(emailInput: string, password: string) {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "CRJ Administrator";
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !configuredPassword || configuredPassword.length < 12 || configuredPassword.length > 200 ||
      configuredPassword === "change-this-to-a-long-random-password" || name.length > 120 ||
      emailInput.trim().toLowerCase() !== email || password.length > 200) return null;

  // Compare fixed-size digests without retaining a plaintext credential in DB.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(digest(password), digest(configuredPassword))) return null;

  const db = requireDb();
  if (await db.user.findUnique({ where: { email } })) return null;
  const passwordHash = await hashPassword(configuredPassword);
  // The unique email and ON CONFLICT DO NOTHING handle concurrent first logins
  // and a customer registration racing bootstrap without promoting that user.
  await db.user.createMany({ data: [{ email, name, passwordHash, role: "ADMIN", emailVerifiedAt: new Date() }], skipDuplicates: true });
  const user = await db.user.findUnique({ where: { email } });
  return user?.role === "ADMIN" ? user : null;
}
