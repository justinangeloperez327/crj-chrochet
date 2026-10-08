# Admin operations

The admin area is available under `/admin`.

## Access protection

Next.js 16 uses the `proxy.ts` convention for request-time route protection.

The current operational gate uses HTTP Basic Authentication backed by:

```env
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="use-a-long-random-password"
```

This prevents anonymous access to the admin and its Server Action mutations.

This is an interim operational control. A later authentication group should replace it with a proper administrator identity/session system, password hashing, authorization roles, audit identity, and optional MFA.

If the admin credentials are not configured, `/admin` returns HTTP 503 rather than exposing the interface.

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

Each product can have multiple sellable SKU variants. Variant configuration includes:

- SKU
- name
- color and hex value
- size
- stem count
- selling price
- cost
- fulfillment mode
- lead time
- reorder level
- active/inactive state
- inventory tracking

Creating a variant with opening stock writes an `OPENING` inventory movement.

## Inventory

`/admin/inventory`

Inventory exposes:

- stock on hand
- reserved stock
- available stock
- reorder level / low-stock state
- recent inventory movements

Manual stock changes are implemented as delta adjustments, not direct stock replacement.

For example:

```text
+5 = receive/correct five additional units
-2 = remove two units after a physical count
```

A manual reduction is rejected when it would make stock on hand negative or lower than already-reserved stock.

Every adjustment writes an `ADJUSTMENT` movement.

## Order workflow

`/admin/orders`

Order, payment, and fulfillment states remain separate.

The operational order path is:

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

### Payment

Payment status can currently be updated manually by an authenticated administrator. This supports manual/offline payment reconciliation until a payment provider is connected.

The system will not allow an order to be fulfilled unless payment status is `PAID`.

### Stock on cancellation

Cancelling an order releases outstanding ready-stock reservations:

- `stockReserved` is reduced
- a `RELEASE` movement is written

Cancelled orders cannot be reopened.

### Stock on fulfillment

When a paid order is marked fulfilled:

- outstanding ready-stock reservations are consumed
- `stockOnHand` decreases
- `stockReserved` decreases
- a `SALE` movement is written

Fulfilled orders cannot be moved backwards.

Made-to-order quantities that did not reserve finished stock are not automatically deducted from finished-goods inventory. Production completion/assembly inventory can be added later when raw-material/BOM tracking is implemented.

## Database requirement

Unlike the public storefront, the admin does not operate from static fallback data.

It requires:

1. `DATABASE_URL`
2. the Prisma migration to be applied
3. seed data or manually created records

Without PostgreSQL, the admin displays database setup instructions instead of mock operational data.
