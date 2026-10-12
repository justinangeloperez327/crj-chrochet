# Release and manual deployment

## Status

This project uses Next.js, PostgreSQL, Prisma 7, Stripe, Resend and Vercel Blob.
Development storefront pages can show fallback products without a database.
Production does not show demo products. Checkout,
account operations, inventory and admin persistence require PostgreSQL.

Git-based Vercel deployments are intentionally **disabled** in `vercel.json`.
Deploy explicitly from your computer / Vercel CLI after reviewing a commit.
Do **not** change this setting without deciding to enable auto-deployments.

## Before the first deployment

1. Install Node.js 24 and npm. Run `npm ci`.
2. Create a PostgreSQL database, set `DATABASE_URL` in the Vercel project's
   environment variables, and restrict database access appropriately.
3. Configure `APP_URL` with the *actual* HTTPS production site URL.
4. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and a strong
   `CHECKOUT_RETURN_SECRET`. Register the webhook endpoint
   `https://YOUR_DOMAIN/api/payments/stripe/webhook` in Stripe.
5. Set a strong `CRON_SECRET` for the Vercel cron endpoint.
6. Configure Resend (`RESEND_API_KEY`, `ORDER_EMAIL_FROM`) and the verified
   sending domain as a launch requirement. Account verification and password recovery require
   email delivery; order emails remain queued during provider outages.
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
npm run test
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

## Project settings and staging verification

In Vercel Project Settings → Git, confirm Git deployment is disabled for all
branches. Keep `git.deploymentEnabled: false`; CI has no deployment steps.
Project dashboard settings cannot be verified from repository configuration
alone. Review the linked team/project before running `vercel deploy --prod`.

Use Node.js 24 in Vercel, matching CI. Set every required environment variable
in Production and in your manually deployed staging project. Do not reuse live
Stripe keys or a production database for tests. Configure the same region for
your PostgreSQL database and functions where practical.

Before publishing, verify customer verification/resend/reset mail delivery,
Stripe test checkout and failure/expiry events, full/partial refund recovery,
Blob upload/deletion, delivery configuration, and administrative operations.
The automated suites test database state and browser access; they do not prove
provider delivery or a successful financial transaction.

The webhook endpoint requires a raw signed body. Subscribe to
`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, `checkout.session.expired`,
`refund.created`, `refund.updated`, and `refund.failed`. Processing failures
return HTTP 500 so Stripe retries. Never manually replay unsigned events.
Maintenance checks Stripe before releasing expired stock. A payment for an
already cancelled order raises a reconciliation error; investigate in Stripe
and refund as appropriate before fulfillment. Do not fulfill a cancelled order.

After reviewing and backing up the production database, run these commands
with the correct production environment loaded on your computer:

```bash
npm ci
npx prisma validate
npm run lint
npm run typecheck
npm run test
npm run build
npm run db:deploy
npm run db:bootstrap-admin
vercel deploy --prod
```

Then run `SMOKE_URL=https://YOUR_DOMAIN SMOKE_REQUIRE_READY=1 npm run smoke`.
Create your actual products, materials, recipes and delivery rates in admin.
Do not run `db:seed` against production; a local shell lacking `NODE_ENV` can
still point at production. Seeding additionally requires `ALLOW_DEMO_SEED=true`;
leave that unset in production and review `DATABASE_URL` before any seed command.

## Monitoring and rollback

Monitor `/api/health` (200 means required configuration and database connection
are present), Stripe event retries, pending refunds, email outbox failures and
Vercel function errors. Health does not verify provider credentials or delivery.
Ensure cron is enabled and inspect its results; the daily job processes bounded
batches, so reservation/email backlogs may need an authenticated maintenance
run or a more frequent cron on a plan supporting it.

Record the prior deployment URL and database backup before release. To roll
back application code, use `vercel rollback <previous-deployment-url>` after
reviewing the linked project. Rollback does not reverse database migrations.
Keep database changes compatible with the prior application; restore data only
through an independently reviewed recovery procedure.
