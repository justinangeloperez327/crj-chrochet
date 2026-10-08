# Prisma migrations

Migration SQL is generated and reviewed after a PostgreSQL `DATABASE_URL` is connected.

Create the first migration with:

```bash
npm run db:migrate -- --name initial-commerce-schema
```

Commit the generated migration directory after reviewing the SQL.

Production environments should only run:

```bash
npm run db:deploy
```
