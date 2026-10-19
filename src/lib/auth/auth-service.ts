import { bootstrapAdminOnLogin } from "@/lib/auth/admin-bootstrap";
import { requireDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { assertAuthEmailConfigured, sendAuthToken } from "@/lib/auth/email-tokens";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code = "AUTH_ERROR",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function registerCustomer(input: {
  name: string;
  email: string;
  password: string;
}) {
  const db = requireDb();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  validateRegistration(name, email, input.password);

  try {
    assertAuthEmailConfigured();
  } catch {
    throw new AuthError(
      "Registration is temporarily unavailable because account verification email is not configured.",
      "EMAIL_UNAVAILABLE",
    );
  }
  const passwordHash = await hashPassword(input.password);
  const existingUser = await db.user.findUnique({ where: { email } });

  if (existingUser) {
    return;
  }

  // Email ownership must be verified before sessions or guest order claims.
  const user = await db.user.create({
    data: { email, name, passwordHash, role: "CUSTOMER" },
  });
  await sendAuthToken(user.id, user.email, "EMAIL_VERIFICATION");
  return user;
}

export async function loginWithPassword(emailInput: string, password: string) {
  const db = requireDb();
  const email = emailInput.trim().toLowerCase();

  if (password.length > 200) throw new AuthError("Invalid email or password.", "INVALID_CREDENTIALS");
  let user = await db.user.findUnique({ where: { email } });
  if (!user) user = await bootstrapAdminOnLogin(email, password) ?? await db.user.findUnique({ where: { email } });
  if (!user) {
    await verifyPassword(password, "scrypt$16384$8$1$" + "0".repeat(32) + "$" + "0".repeat(128));
    throw new AuthError("Invalid email or password.", "INVALID_CREDENTIALS");
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    throw new AuthError("Invalid email or password.", "INVALID_CREDENTIALS");
  }

  if (!user.emailVerifiedAt) {
    throw new AuthError("Verify your email before signing in. Request a new verification link if needed.", "EMAIL_UNVERIFIED");
  }
  await createSession(user.id);
  return user;
}

export function validateNewPassword(password: string) {
  if (password.length < 12 || password.length > 200) {
    throw new AuthError("Password must contain 12–200 characters.", "WEAK_PASSWORD");
  }
}

function validateRegistration(name: string, email: string, password: string) {
  if (name.length < 2 || name.length > 120) {
    throw new AuthError("Enter your full name.", "INVALID_NAME");
  }

  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AuthError("Enter a valid email address.", "INVALID_EMAIL");
  }

  if (password.length < 12) {
    throw new AuthError(
      "Use a password with at least 12 characters.",
      "WEAK_PASSWORD",
    );
  }

  if (password.length > 200) {
    throw new AuthError("Password is too long.", "WEAK_PASSWORD");
  }
}
