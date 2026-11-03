import { getDb } from "@/lib/db";

export type AuthReadiness =
  | "ready"
  | "database_not_configured"
  | "database_unavailable"
  | "migrations_required";

function errorDetails(error: unknown) {
  const codes: string[] = [];
  const messages: string[] = [];
  let current: unknown = error;
  // Prisma sometimes wraps PostgreSQL SQLSTATE codes inside meta or cause.
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth++) {
    const record = current as Record<string, unknown>;
    if (typeof record.code === "string") codes.push(record.code);
    if (typeof record.message === "string") messages.push(record.message);
    if (record.meta && typeof record.meta === "object") {
      const meta = record.meta as Record<string, unknown>;
      if (typeof meta.code === "string") codes.push(meta.code);
      if (typeof meta.message === "string") messages.push(meta.message);
    }
    current = record.cause;
  }
  return { codes, message: messages.join(" ") };
}

export function classifyAuthFailure(error: unknown): Exclude<AuthReadiness, "ready"> | "unknown" {
  const { codes, message } = errorDetails(error);
  if (message.includes("DATABASE_URL") && /not configured|required/i.test(message)) {
    return "database_not_configured";
  }
  if (codes.some((code) => ["42P01", "42703", "42704", "P2021", "P2022"].includes(code)) ||
      /relation .* does not exist|column .* does not exist|type .* does not exist/i.test(message)) {
    return "migrations_required";
  }
  if (codes.some((code) => ["P1000", "P1001", "P1002", "P1017", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND"].includes(code)) ||
      /connection (?:refused|terminated|timed out)|can't reach database|server closed the connection/i.test(message)) {
    return "database_unavailable";
  }
  return "unknown";
}

/** A read-only check of the exact database objects needed for admin login. */
export async function getAuthReadiness(): Promise<AuthReadiness> {
  const db = getDb();
  if (!db) return "database_not_configured";
  try {
    // LIMIT 0 validates relations and columns without reading customer records.
    await db.$queryRaw`
      SELECT u."emailVerifiedAt", u."role", s."tokenHash", t."attempts", a."tokenHash"
      FROM "User" u
      CROSS JOIN "AuthSession" s
      CROSS JOIN "AuthThrottle" t
      CROSS JOIN "AuthToken" a
      LIMIT 0
    `;
    return "ready";
  } catch (error) {
    const category = classifyAuthFailure(error);
    return category === "migrations_required" ? category : "database_unavailable";
  }
}

export function authSignInMessage(error: unknown): string {
  const category = classifyAuthFailure(error);
  if (category === "database_not_configured") {
    return "Sign-in is unavailable because the database is not configured.";
  }
  if (category === "migrations_required") {
    return "Sign-in is unavailable until the authentication database migrations are applied.";
  }
  if (category === "database_unavailable") {
    return "Sign-in is temporarily unavailable because the database cannot be reached.";
  }
  return "Unable to sign in. Please contact the store administrator.";
}

export function logAuthFailure(error: unknown) {
  const { codes } = errorDetails(error);
  // Never log emails, passwords, request bodies, SQL parameters or database URLs.
  console.error("Authentication failed", {
    category: classifyAuthFailure(error),
    code: codes[0] ?? "unknown",
    databaseCode: codes.find((code) => /^\d{5}$/.test(code)) ?? "unknown",
  });
}
