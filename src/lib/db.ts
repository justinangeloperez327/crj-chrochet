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
    adapter: new PrismaPg({ connectionString }),
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
