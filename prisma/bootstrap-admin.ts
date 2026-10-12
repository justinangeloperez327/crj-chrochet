import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";

const connectionString = process.env.DATABASE_URL;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME?.trim() || "CRJ Administrator";

if (!connectionString) throw new Error("DATABASE_URL is required.");
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error("Set a valid ADMIN_EMAIL.");
}
if (!password || password.length < 12 || password === "change-this-to-a-long-random-password") {
  throw new Error("Set a unique ADMIN_PASSWORD with at least 12 characters.");
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

try {
  const passwordHash = await hashPassword(password);
  await db.user.upsert({
    where: { email },
    update: { name, passwordHash, role: "ADMIN", emailVerifiedAt: new Date() },
    create: { email, name, passwordHash, role: "ADMIN", emailVerifiedAt: new Date() },
  });
  console.info("Administrator account configured.");
} finally {
  await db.$disconnect();
}
