import "dotenv/config";

import { defineConfig } from "prisma/config";

// Prisma loads this file for commands such as `prisma generate`, which do not
// need a live database. The fallback keeps dependency installation/build setup
// deterministic. Runtime database access still requires DATABASE_URL in
// src/lib/db.ts, and migration/seed commands will fail unless a real database
// is reachable.
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/handmade_blooms";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
