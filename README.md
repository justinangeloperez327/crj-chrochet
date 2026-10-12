# Handmade Blooms by CRJ

Crochet flower and bouquet storefront with back-office inventory, production,
customer management, discounts, checkout, and reporting.

## Stack

- Next.js 16.4 + React 19.3, App Router, TypeScript
- Tailwind CSS 4.3 + shadcn/ui (Base UI, Nova)
- PostgreSQL + Prisma ORM 7
- Stripe Checkout, Resend, Vercel Blob

## Local development

Use Node.js 22 and an accessible PostgreSQL database.

\`\`\`bash
npm ci
cp .env.example .env
# Edit .env and set DATABASE_URL and applicable service keys.
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
\`\`\`

Open http://localhost:3000.

The storefront includes a no-database fallback catalogue; accounts, orders,
admin persistence, inventory and checkout require PostgreSQL.

## Verification

\`\`\`bash
npm run lint
npm run typecheck
npm run build
\`\`\`

## Deployment

See [docs/deployment.md](docs/deployment.md) for the required environment,
database migration, admin bootstrap, release checklist and Vercel commands.

**Vercel Git auto-deployment is disabled.** Publish only through an explicit
manual deployment. Do not apply migrations or seed demo records automatically
during a build.

Other feature details are in [docs](docs/).
