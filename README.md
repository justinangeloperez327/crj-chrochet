# Handmade Blooms by CRJ

Crochet flower and bouquet storefront with back-office inventory, production,
customer management, discounts, checkout, and reporting.

## Stack

- Next.js 16.4 + React 19.3, App Router, TypeScript
- Tailwind CSS 4.3 + shadcn/ui (Base UI, Nova)
- PostgreSQL + Prisma ORM 7
- Stripe Checkout, Resend, Vercel Blob

## Local development

Use Node.js 24 and an accessible PostgreSQL database.

```bash
npm ci
cp .env.example .env
# Edit .env and set DATABASE_URL and applicable service keys.
npm run db:generate
npm run db:deploy
ALLOW_DEMO_SEED=true npm run db:seed
npm run dev
```

Open http://localhost:3000.

Development includes a no-database fallback catalogue. Production only shows database products; accounts, orders,
admin persistence, inventory and checkout require PostgreSQL.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Deployment

See [docs/deployment.md](docs/deployment.md) for the required environment,
database migration, admin bootstrap, release checklist and Vercel commands.

**Vercel Git auto-deployment is disabled.** Publish only through an explicit
manual deployment. Do not apply migrations or seed demo records automatically
during a build.

Other feature details are in [docs](docs/).

For real database and browser verification, use only a disposable PostgreSQL
`crj_test` database, apply migrations, run development seeding and bootstrap a
CI administrator, then run `npm run test:integration`, `npm run build`,
`npx playwright install chromium`, and `npm run test:e2e`. CI runs these steps
against PostgreSQL 16 and never deploys.
