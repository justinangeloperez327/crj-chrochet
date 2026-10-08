# Storefront persistence flow

Group 5 connects the customer storefront to the Prisma/PostgreSQL persistence layer while preserving a safe fallback when the database is not configured.

## Catalog loading

The storefront uses `src/lib/data/storefront-catalog.ts`.

Behavior:

1. If `DATABASE_URL` is not configured, use the checked-in static catalog.
2. If `DATABASE_URL` is configured, PostgreSQL is authoritative.
3. If a configured database is temporarily unreachable, the storefront falls back to the static catalog instead of returning a server error.

The home page, shop page, and product detail pages all use this loader.

Database records are mapped to the existing storefront `Product` shape before being passed to client components. Prisma `Decimal` values therefore never leak into browser components.

## Variant identity

New cart lines persist the identifying fields needed to resolve the exact database variant:

- product slug
- SKU when available
- color
- size
- stem count
- display label

Older localStorage cart entries remain compatible. The server can fall back to the product slug and display metadata when an SKU is absent.

The browser's stored price is display-only. Checkout never trusts it.

## Checkout quote

`POST /api/discounts/validate` resolves the submitted cart against PostgreSQL and recalculates the subtotal before validating a discount code.

Supported validation includes:

- active/inactive status
- start/end dates
- minimum order amount
- maximum redemption count
- fixed-value discounts
- percentage discounts

The order endpoint performs the same validation again. A successful quote does not grant the client authority over the final amount.

## Pending order creation

`POST /api/orders` runs order creation in a serializable Prisma transaction.

The transaction:

1. resolves every submitted item to an active database SKU;
2. combines duplicate SKU lines;
3. re-reads the current database price;
4. validates ready-stock availability;
5. recalculates subtotal and discount;
6. upserts the customer by normalized email;
7. saves a reusable customer address when it is new;
8. creates an immutable order address snapshot;
9. creates the pending order and order-item snapshots;
10. reserves finished inventory where appropriate;
11. writes inventory reservation movements.

Orders are created as:

- `OrderStatus.PENDING_PAYMENT`
- `PaymentStatus.PENDING`
- `FulfillmentStatus.UNFULFILLED`

No payment is simulated or marked successful.

## Inventory reservation rules

### READY_STOCK

The entire requested quantity must be available.

```text
available = stockOnHand - stockReserved
```

If the requested quantity exceeds available stock, order creation fails with a conflict response.

### MADE_TO_ORDER

No finished stock is reserved. The production workflow handles the order after payment/confirmation.

### BOTH

Existing ready stock is reserved up to the available quantity. Any remainder can be produced as made-to-order stock.

## Reservation lifecycle

Group 5 creates reservation movements but does not yet release expired pending-payment reservations or convert reservations into sales. Those transitions belong with payment/order-state processing so inventory changes remain tied to authoritative order events.

## Delivery fees

Delivery is currently stored as AED 0. A later delivery-zone/rate implementation should calculate the fee server-side before payment and persist the resulting `deliveryAmount`.

## Payment boundary

The checkout UI can now create a real pending order and display its order number, but it collects no card or bank data.

A payment provider should later:

1. create a payment intent/session for an existing pending order;
2. verify provider webhooks server-side;
3. move `PaymentStatus` to `PAID` only after verification;
4. move the order into the confirmed/production workflow;
5. increment discount redemption only on the appropriate successful-payment event.
