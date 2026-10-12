# PostgreSQL database

The application uses PostgreSQL through Prisma 7 and the `pg` adapter. A bounded connection pool is reused per warm server process. Business transactions use serializable isolation; database-only commerce callbacks retry serialization conflicts.

For a fresh development database, configure `DATABASE_URL`, then run:

```bash
npm ci
npm run db:generate
npm run db:deploy
ALLOW_DEMO_SEED=true npm run db:seed
npm run db:studio
```

The seed opt-in is only for disposable development data. Production must use actual products and inventory entered through admin, with `db:bootstrap-admin` for the initial administrator.

Committed migrations include the initial commerce schema and account security. Apply reviewed migrations with `npm run db:deploy`; builds do not migrate or seed. Fresh-database migration and schema comparison run in PostgreSQL CI.

For an existing database, back it up and compare migration history and schema before applying SQL. Never reset a populated database or mark the initial migration applied without verifying its baseline. See [deployment](deployment.md) for the production procedure and rollback requirements.
