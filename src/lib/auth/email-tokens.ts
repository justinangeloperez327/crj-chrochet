import { createHash, randomBytes } from "node:crypto";
import { Resend } from "resend";
import type { AuthTokenType } from "@/generated/prisma/client";
import { requireDb, runTransaction } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

export function hashAuthToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function assertAuthEmailConfigured() {
  if (!process.env.RESEND_API_KEY || !process.env.ORDER_EMAIL_FROM || !process.env.APP_URL) {
    throw new Error("Account email delivery is not configured.");
  }
  const url = new URL(process.env.APP_URL);
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("Production APP_URL must be HTTPS.");
  }
}

export async function sendAuthToken(userId: string, email: string, type: AuthTokenType) {
  assertAuthEmailConfigured();
  const db = requireDb();
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const record = await db.authToken.create({
    data: {
      userId, type, tokenHash: hashAuthToken(token),
      expiresAt: new Date(now.getTime() + (type === "EMAIL_VERIFICATION" ? 86400000 : 1800000)),
    },
  });
  const link = new URL(type === "EMAIL_VERIFICATION" ? "/verify-email" : "/reset-password", process.env.APP_URL!);
  link.searchParams.set("token", token);
  const verify = type === "EMAIL_VERIFICATION";
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    const result = await resend.emails.send({
      from: process.env.ORDER_EMAIL_FROM!,
      to: email,
      subject: verify ? "Verify your Handmade Blooms email" : "Reset your Handmade Blooms password",
      html: '<p>' + (verify ? "Verify your email to activate your account and claim guest orders." : "Reset your password.") +
        '</p><p><a href="' + link.toString() + '">' + (verify ? "Verify email" : "Reset password") +
        '</a></p><p>Link expires in ' + (verify ? "24 hours" : "30 minutes") + '.</p>',
    });
    if (result.error) throw new Error(result.error.message);
  } catch {
    await db.authToken.delete({ where: { id: record.id } }).catch(() => undefined);
    throw new Error("Unable to send account email. Please try again.");
  }
}

function validToken(token: string) { return /^[A-Za-z0-9_-]{40,100}$/.test(token); }

export async function verifyEmailToken(token: string) {
  if (!validToken(token)) return false;
  try {
    return await runTransaction(async (tx) => {
      const now = new Date();
      const entry = await tx.authToken.findUnique({
        where: { tokenHash: hashAuthToken(token) }, include: { user: true },
      });
      if (!entry || entry.type !== "EMAIL_VERIFICATION" || entry.consumedAt || entry.expiresAt <= now) return false;
      const used = await tx.authToken.updateMany({
        where: { id: entry.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (used.count !== 1) return false;
      const user = entry.user;
      const guest = await tx.customer.findUnique({ where: { email: user.email } });
      if (guest?.userId && guest.userId !== user.id) return false;
      const [firstName, ...lastName] = (user.name ?? "").trim().split(/\s+/);
      let customerId: string;
      if (guest) {
        const row = await tx.customer.update({ where: { id: guest.id }, data: { userId: user.id } });
        customerId = row.id;
      } else {
        const row = await tx.customer.create({
          data: {
            userId: user.id, email: user.email,
            firstName: firstName || null, lastName: lastName.join(" ") || null,
          },
        });
        customerId = row.id;
      }
      await tx.customBouquetRequest.updateMany({
        where: { email: user.email, customerId: null }, data: { customerId },
      });
      await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: now } });
      await tx.authToken.updateMany({
        where: { userId: user.id, type: "EMAIL_VERIFICATION", consumedAt: null },
        data: { consumedAt: now },
      });
      return true;
    });
  } catch { return false; }
}

export async function requestAuthLink(emailInput: string, type: AuthTokenType) {
  const email = emailInput.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
  const db = requireDb();
  const user = await db.user.findUnique({ where: { email } });
  if (!user || (type === "EMAIL_VERIFICATION" ? Boolean(user.emailVerifiedAt) : !user.emailVerifiedAt)) return;
  const latest = await db.authToken.findFirst({
    where: { userId: user.id, type }, orderBy: { createdAt: "desc" },
  });
  if (latest && Date.now() - latest.createdAt.getTime() < 60000) return;
  await sendAuthToken(user.id, email, type);
}

export async function resetPasswordWithToken(token: string, password: string) {
  if (password.length < 12 || password.length > 200) {
    throw new Error("Password must contain 12–200 characters.");
  }
  if (!validToken(token)) return false;
  const passwordHash = await hashPassword(password);
  return runTransaction(async (tx) => {
    const now = new Date();
    const entry = await tx.authToken.findUnique({ where: { tokenHash: hashAuthToken(token) } });
    if (!entry || entry.type !== "PASSWORD_RESET" || entry.consumedAt || entry.expiresAt <= now) return false;
    const used = await tx.authToken.updateMany({
      where: { id: entry.id, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
    if (used.count !== 1) return false;
    await tx.user.update({ where: { id: entry.userId }, data: { passwordHash } });
    await tx.authSession.deleteMany({ where: { userId: entry.userId } });
    await tx.authToken.updateMany({
      where: { userId: entry.userId, consumedAt: null }, data: { consumedAt: now },
    });
    return true;
  });
}
