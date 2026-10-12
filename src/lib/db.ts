import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

// One Prisma/pg pool per warm server process, including production.
// Creating a new pool for each request can exhaust Postgres connections
// in serverless environments.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: 5, connectionTimeoutMillis: 5000 }),
    transactionOptions: { isolationLevel: "Serializable", maxWait: 5000, timeout: 15000 },
  });
}

export function getDb() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const client = createPrismaClient();
  if (client) globalForPrisma.prisma = client;

  return client;
}

export function requireDb() {
  const client = getDb();
  if (!client) {
    throw new Error(
      "DATABASE_URL is not configured. Set it before using database-backed features.",
    );
  }
  return client;
}

// Only use this for database-only callbacks: retries must not repeat provider calls.
export async function runTransaction<T>(
  operation: (tx: import("@/generated/prisma/client").Prisma.TransactionClient) => Promise<T>,
  options?: { isolationLevel?: import("@/generated/prisma/client").Prisma.TransactionIsolationLevel },
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await requireDb().$transaction(operation, { ...options, isolationLevel: "Serializable" });
    } catch (error) {
      if (attempt >= 3 || typeof error !== "object" || error === null || !("code" in error) || error.code !== "P2034") throw error;
      await new Promise((resolve) => setTimeout(resolve, 25 * 2 ** attempt));
    }
  }
}
