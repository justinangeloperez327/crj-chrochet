# Storefront persistence flow

The customer storefront is database-first while retaining a safe static catalog fallback when PostgreSQL is not configured.

## Catalog loading

The storefront uses `src/lib/data/storefront-catalog.ts`.

1. Without `DATABASE_URL`, use the checked-in static catalog.
2. With `DATABASE_URL`, PostgreSQL is authoritative.
3. If a configured database is temporarily unreachable, public catalog pages fall back to the static catalog instead of returning a server error.

The admin, authentication, checkout persistence, payment, inventory, and order workflows always require PostgreSQL.

## Variant identity

Cart lines keep enough metadata to resolve the exact database variant:

- product slug
- SKU when available
- color
- size
- stem count
- display label

Older localStorage cart entries remain compatible. The server can resolve from product/variant metadata when an SKU is absent.

The browser's stored unit price is display-only.

## Checkout

The supported checkout entry point is:

```text
POST /api/checkout
```

It:

1. resolves each cart item against PostgreSQL;
2. recalculates current prices;
3. validates stock;
4. validates discounts;
5. calculates server-side delivery;
6. upserts the customer;
7. saves a reusable address when new;
8. creates an immutable order address;
9. creates the pending-payment order;
10. reserves ready stock;
11. creates a Stripe Checkout Session.

Direct public pending-order creation is disabled.

For payment, webhook, reservation expiry, delivery configuration, and notifications, see `docs/payments-and-delivery.md`.
