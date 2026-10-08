# Database foundation

Handmade Blooms by CRJ uses PostgreSQL with Prisma ORM.

## Current stack

- Prisma ORM 7.10
- PostgreSQL
- `@prisma/adapter-pg` / `pg`
- Prisma Client generated into `src/generated/prisma`

The app intentionally keeps the storefront's temporary catalog data independent from the database until the database is connected. This means the current storefront can still render without `DATABASE_URL`.

## Setup

1. Copy the environment template.

   ```bash
   cp .env.example .env
   ```

2. Set `DATABASE_URL` to a PostgreSQL database.

3. Install dependencies.

   ```bash
   npm install
   ```

4. Generate Prisma Client.

   ```bash
   npm run db:generate
   ```

5. Create and apply the initial development migration.

   ```bash
   npm run db:migrate -- --name initial-commerce-schema
   ```

6. Seed development data.

   ```bash
   npm run db:seed
   ```

7. Inspect the database when needed.

   ```bash
   npm run db:studio
   ```

Generated migrations under `prisma/migrations/` should be committed after they are created and reviewed.

## Production deployment

Apply already-reviewed migrations with:

```bash
npm run db:deploy
```

Do not run `prisma migrate dev` against the production database.

## Model boundaries

### Catalog

- `Category`
- `Collection`
- `CollectionProduct`
- `Product`
- `ProductImage`
- `ProductVariant`

`ProductVariant` is the sellable inventory unit. Price, SKU, color, size, number of stems, fulfillment mode, lead time, and stock all live at the variant level.

### Inventory

Each stock-tracked variant stores:

- `stockOnHand`
- `stockReserved`
- `reorderLevel`
- `trackInventory`

Available finished stock is:

```text
stockOnHand - stockReserved
```

`InventoryMovement` is the audit trail for receipts, adjustments, reservations, releases, sales, and returns.

Made-to-order variants can carry minimum and maximum lead-time days even when finished-goods stock is zero.

### Customers

`Customer` owns reusable saved `Address` records.

Orders do not point directly to a reusable customer address. `OrderAddress` stores an immutable delivery snapshot so editing a customer's saved address later cannot rewrite historical orders.

### Orders

`Order` separates:

- order status
- payment status
- fulfillment status

This allows production workflow and payment workflow to move independently.

`OrderItem` stores both optional foreign keys and immutable snapshots such as product name, SKU, variant name, quantity, and price. Historical order lines therefore remain readable even when catalog data changes later.

### Discounts

`Discount` currently supports:

- percentage discounts
- fixed-amount discounts
- minimum order values
- activation windows
- redemption limits

Product/collection-specific promotion rules can be layered on later without changing the order totals model.

## Seed data

`prisma/seed.ts` creates or updates:

- Crochet Flowers category
- eight storefront products
- concrete SKU variants
- ready-stock and made-to-order inventory
- Best Sellers / Ready to Ship / Made to Order / Gift Favorites collections
- `WELCOME10` development discount
- one example customer and address

The seed is intended for development and test environments.

## Runtime usage

Use:

```ts
import { db } from "@/lib/db";
```

The Prisma client uses the PostgreSQL driver adapter and is cached on `globalThis` during development to avoid creating unnecessary clients during Next.js hot reloads.

Catalog-specific database queries are isolated in:

```text
src/lib/data/catalog-repository.ts
```

This boundary lets the storefront switch from the current static catalog to PostgreSQL without spreading Prisma calls throughout React components.
