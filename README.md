# CRJ Chrochet

Next.js application foundation initialized with the current stable stack.

## Stack

- Next.js 16.4.0
- React 19.3.0
- TypeScript 7.0.2
- Tailwind CSS 4.3.3
- shadcn 4.21.1
- shadcn/ui Base UI + Nova preset
- ESLint 10.10.0
- App Router
- `src/` project layout

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The first `npm install` will generate `package-lock.json`.

## Quality checks

```bash
npm run lint
npm run typecheck
npm run build
```

## shadcn/ui

The project is initialized with the current Base UI default and the `base-nova` style.

```bash
npm run ui -- add button
npm run ui -- add card
```


## Database

The persistence layer uses PostgreSQL + Prisma ORM 7. See [docs/database.md](docs/database.md) for the schema, setup, migration, seeding, and deployment workflow.

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate -- --name initial-commerce-schema
npm run db:seed
```
