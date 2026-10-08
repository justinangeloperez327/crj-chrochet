# Admin operations

The admin area is available under `/admin`.

## Authentication and authorization

Group 7 replaces the temporary HTTP Basic Authentication gate with database-backed users and sessions.

A bootstrap administrator can be created or updated by the Prisma seed using:

```env
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="use-a-long-unique-password"
ADMIN_NAME="CRJ Administrator"
```

Then run:

```bash
npm run db:seed
```

The admin signs in through the same `/login` page used by customers. An administrator is redirected to `/admin` after normal sign-in when no other destination was requested.

Next.js `proxy.ts` performs an early session-cookie redirect for `/admin` and `/account`. It is not the authorization boundary.

Actual authorization is enforced server-side:

- the admin layout requires an authenticated `ADMIN` role;
- every admin Server Action independently calls the admin guard;
- invalid, expired, or non-admin sessions cannot authorize product, inventory, or order mutations.

Passwords are stored as scrypt password hashes with per-password random salts. Session cookies contain opaque random tokens; only SHA-256 token hashes are stored in PostgreSQL.

## Dashboard

`/admin` shows:

- paid revenue from the last 30 days
- open orders
- active products
- customer count
- recent orders
- low-stock alerts

Only orders with `PaymentStatus.PAID` contribute to the revenue KPI.

## Product management

`/admin/products`

Products use lifecycle states:

- Draft
- Active
- Archived

Products are archived rather than hard deleted so historical order relationships remain valid.

Each product can have multiple sellable SKU variants. Variant configuration includes SKU, color, size, stem count, price, cost, fulfillment mode, lead time, reorder level, active state, and inventory tracking.

Creating a variant with opening stock writes an `OPENING` inventory movement.

## Inventory

`/admin/inventory`

Inventory exposes stock on hand, reserved stock, available stock, reorder state, and recent inventory movements.

Manual changes are delta adjustments:

```text
+5 = receive/correct five additional units
-2 = remove two units after a physical count
```

A reduction is rejected when it would make stock negative or lower than already-reserved stock. Every adjustment writes an `ADJUSTMENT` movement.

## Order workflow

`/admin/orders`

Order, payment, and fulfillment states remain separate.

```text
Pending Payment
    ↓
Confirmed
    ↓
In Production
    ↓
Quality Check
    ↓
Ready
    ↓
Fulfilled
```

Cancellation is also available.

Payment status can currently be updated manually by an authenticated administrator. This supports manual/offline reconciliation until a payment provider is connected.

The system will not allow fulfillment unless payment is `PAID`.

Cancelling an order releases outstanding ready-stock reservations and writes `RELEASE` inventory movements. Fulfillment consumes outstanding reservations, decreases physical stock, and writes `SALE` movements.

Cancelled orders cannot be reopened. Fulfilled orders cannot be moved backward.

## Database requirement

The admin requires PostgreSQL. Unlike the public storefront, it does not operate from static fallback data.

Required setup:

1. configure `DATABASE_URL`;
2. generate/apply the Prisma migration;
3. configure the admin bootstrap variables;
4. run `npm run db:seed`.

Without PostgreSQL, operational admin data is unavailable.
