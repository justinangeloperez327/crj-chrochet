# Release and manual deployment

## Status

This project uses Next.js, PostgreSQL, Prisma 7, Stripe, Resend and Vercel Blob.
Storefront pages can show fallback products without a database; checkout,
account operations, inventory and admin persistence require PostgreSQL.

Git-based Vercel deployments are intentionally **disabled** in `vercel.json`.
Deploy explicitly from your computer / Vercel CLI after reviewing a commit.
Do **not** change this setting without deciding to enable auto-deployments.

## Before the first deployment

1. Install Node.js 22 and npm. Run `npm ci`.
2. Create a PostgreSQL database, set `DATABASE_URL` in the Vercel project's
   environment variables, and restrict database access appropriately.
3. Configure `APP_URL` with the *actual* HTTPS production site URL.
4. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and a strong
   `CHECKOUT_RETURN_SECRET`. Register the webhook endpoint
   `https://YOUR_DOMAIN/api/payments/stripe/webhook` in Stripe.
5. Set a strong `CRON_SECRET` for the Vercel cron endpoint.
6. Configure Resend (`RESEND_API_KEY`, `ORDER_EMAIL_FROM`) and the verified
   sending domain if emails are required. Without it, emails stay queued.
7. Connect Vercel Blob; set `BLOB_READ_WRITE_TOKEN` only if your environment
   requires a legacy/local read-write token.
8. Review delivery rates and store settings. Catalogue currency is AED.
9. Ensure the `package-lock.json`, `0_init/migration.sql`, and
   `migration_lock.toml` files are committed before proceeding.

Never commit real secrets or `.env` files.

## Database lifecycle

For a **new, empty** Postgres database:

```bash
npm ci
npm run db:generate
npm run db:deploy
```

`db:deploy` applies versioned, committed SQL migrations. It must be run from
an environment with access to `DATABASE_URL` **before** the deployed app
accepts orders. Do not run `prisma migrate dev` in production, and do not
configure migrations as a concurrent runtime/build side-effect.

For a database with **existing tables**, back up the database and compare its
schema with the migration *before* using `db:deploy`. Do not apply the
from-empty initial migration to a populated database. Baseline with
`prisma migrate resolve --applied 0_init` only after independently verifying
the existing schema matches the expected migration.

To create or rotate the production admin without importing demo products:

```bash
ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME=... npm run db:bootstrap-admin
```

The command updates the admin password each time it is run. Use actual
environment variables/secrets rather than committing values to the repo.
`npm run db:seed` is **development data only**, and intentionally refuses to
run in production.

## Quality gates

```bash
npm ci
npx prisma validate
npm run lint
npm run typecheck
npm run build
```

Run the flows in a staging database with Stripe **test** keys: register/login,
catalogue and inventory, custom bouquet, order/discount, Checkout, verified
webhook, refund, email outbox, and admin permissions.

## Manual Vercel deployment

```bash
npm install -g vercel
vercel login
vercel link
vercel deploy --prod
```

Vercel project environment variables must be configured in the dashboard.
Do not depend on CI/Git pushes to deploy this app. A deployment does not
initialize the database or create the admin automatically.

Vercel cron runs `/api/internal/maintenance` daily at 03:15 UTC.
It requires the platform-provided `Authorization: Bearer $CRON_SECRET`.
Confirm cron availability for your Vercel plan.

## Go/no-go

**Go** only after the migration has been reviewed/applied successfully,
quality checks pass, secrets are set, Stripe webhooks function in test mode,
and checkout/refund/inventory are verified against a test database.
Until then the application is not production-verified.
