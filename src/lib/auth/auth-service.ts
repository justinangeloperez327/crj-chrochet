import { requireDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

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

  const existingUser = await db.user.findUnique({ where: { email } });

  if (existingUser) {
    throw new AuthError("An account already exists for this email.", "EMAIL_EXISTS");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await db.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { email } });

    const created = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: "CUSTOMER",
      },
    });

    const [firstName, ...lastNameParts] = name.split(/\s+/);
    const lastName = lastNameParts.join(" ") || null;

    const customerRecord = customer
      ? await tx.customer.update({
          where: { id: customer.id },
          data: {
            userId: created.id,
            firstName: customer.firstName || firstName || null,
            lastName: customer.lastName || lastName,
          },
        })
      : await tx.customer.create({
          data: {
            userId: created.id,
            email,
            firstName: firstName || null,
            lastName,
          },
        });

    await tx.customBouquetRequest.updateMany({
      where: {
        customerId: null,
        email,
      },
      data: {
        customerId: customerRecord.id,
      },
    });

    return created;
  });

  await createSession(user.id);
  return user;
}

export async function loginWithPassword(emailInput: string, password: string) {
  const db = requireDb();
  const email = emailInput.trim().toLowerCase();

  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    throw new AuthError("Invalid email or password.", "INVALID_CREDENTIALS");
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    throw new AuthError("Invalid email or password.", "INVALID_CREDENTIALS");
  }

  await createSession(user.id);
  return user;
}

function validateRegistration(name: string, email: string, password: string) {
  if (name.length < 2 || name.length > 120) {
    throw new AuthError("Enter your full name.", "INVALID_NAME");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
