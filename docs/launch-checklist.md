# CRJ launch checklist — single release

## Release checks

- Lint, TypeScript, unit tests and production builds pass on the reviewed commit.
- Fresh PostgreSQL migrations, schema comparison and business integration tests pass.
- Browser tests cover storefront, cart, customer sessions and administrative access.
- Runtime dependencies pass the security audit; review development-tool advisories separately.
- Stripe test-mode transactions, Resend mail, Blob operations and hosted database configuration are verified in staging.
- Git deployments remain disabled and production is published manually.

## Required environment

Create a Vercel project linked to `justinangeloperez327/crj-chrochet`, using Node 22 or newer.
Configure `DATABASE_URL`, `APP_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`CHECKOUT_RETURN_SECRET`, `RESEND_API_KEY`, `ORDER_EMAIL_FROM`,
`CRON_SECRET`, and Vercel Blob connection/token where needed.
Use a real HTTPS domain for `APP_URL` and a Resend-verified sending address.
Never paste credentials into chat or commit them in Git.

## Database

Back up any populated database before making changes.

Fresh database:
```bash
npm ci
npm run db:deploy
ADMIN_EMAIL=... ADMIN_PASSWORD=... ADMIN_NAME=... npm run db:bootstrap-admin
```

Existing database: inspect migration history with `prisma migrate status` and review
both committed SQL migrations before applying `npm run db:deploy`.
The initial migration must not be applied to an already-populated database
without proper baselining.

## Staging verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
SMOKE_URL=https://YOUR-DEPLOYMENT.vercel.app npm run smoke
SMOKE_REQUIRE_READY=1 SMOKE_URL=https://YOUR-DEPLOYMENT.vercel.app npm run smoke
```

Use Stripe test mode and test: registration/resend/expiry, guest order claiming,
login/logout, password reset and session revocation, customer authorization,
catalog/checkout, Stripe webhook idempotency, refunds, inventory reservations,
custom bouquet production, delivery updates, email outbox, uploads and cron.

Only deploy production after `/api/health` returns 200 and real integration
tests pass; unit tests and a passing Next build alone cannot verify live payments.
