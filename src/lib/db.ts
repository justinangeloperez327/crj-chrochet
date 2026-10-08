import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

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

  if (client && process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }

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
