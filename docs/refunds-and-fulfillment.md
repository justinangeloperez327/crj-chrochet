# Refunds, cancellations, returns, and delivery

Group 11 adds the reverse financial and fulfillment lifecycle.

## Core rule

These are separate operations:

1. **Refund** — money returned through Stripe.
2. **Cancellation** — order stops progressing.
3. **Return** — a physical finished item comes back into sellable stock.

The application never assumes that a refund means inventory was physically returned.

## Refund records

Each Stripe refund has a local `Refund` record containing:

- order;
- payment attempt;
- initiating admin;
- amount;
- currency;
- Stripe refund ID;
- status;
- reason;
- internal note;
- cancellation intent;
- production-loss acknowledgement;
- timestamps/errors.

Refund states:

```text
Pending
Requires Action
Succeeded
Failed
Canceled
```

Order payment states continue to use:

```text
PAID
PARTIALLY_REFUNDED
REFUNDED
```

`Order.refundedAmount` stores the successfully refunded aggregate.

## Stripe refund creation

Refunds are initiated from:

```text
/admin/orders/<id>
```

The server resolves the original Stripe PaymentIntent from the successful Checkout Session.

Stripe receives:

- PaymentIntent;
- amount in the smallest currency unit;
- `requested_by_customer` as the Stripe reason;
- local order/refund metadata.

The local refund ID is also used as the Stripe idempotency key.

This means retrying the same server refund request cannot create a second Stripe refund.

## Partial refunds

Multiple partial refunds are supported until the order's remaining refundable balance reaches zero.

The UI shows:

```text
remaining refundable = order total - successful refunds
```

A partial refund does not cancel the order.

Production and delivery may continue for a partially refunded order.

## Full refund + cancellation

An admin can request:

```text
full refund + cancel order
```

The cancellation is applied only after Stripe reports the refund as successful.

For an unshipped order this:

- releases outstanding ready-stock reservations;
- releases unconsumed custom-bouquet raw-material reservations;
- marks the order Cancelled;
- marks a linked custom bouquet Cancelled;
- records the cancellation reason;
- sends refund/cancellation notifications.

## Production already started

If production has started, cancellation requires explicit acknowledgement.

Consumed raw materials are **not** restored automatically.

This is deliberate because consumed yarn, tape, wrapping, labor, or custom work cannot safely be inferred as reusable inventory.

## Shipped or delivered orders

Orders in:

```text
SHIPPED
OUT_FOR_DELIVERY
FULFILLED
```

cannot be cancelled by the refund workflow.

They may still be refunded, but physical return handling is separate.

## Physical returns

After an order is delivered, eligible finished-stock lines can be recorded as physically returned.

Eligible lines must:

- have a product variant;
- track inventory;
- use `READY_STOCK` or `BOTH`;
- have unreturned quantity remaining.

Recording a return:

- increments `ProductVariant.stockOnHand`;
- increments `OrderItem.returnedQuantity`;
- writes an `InventoryMovementType.RETURN` movement.

Made-to-order/custom material consumption is never reversed automatically.

## Asynchronous refunds

Stripe refunds can be asynchronous.

Group 11 handles:

- `refund.created`
- `refund.updated`
- `refund.failed`

Add those events to the existing Stripe webhook endpoint:

```text
POST /api/payments/stripe/webhook
```

The local refund transition uses an optimistic state claim so webhook/API reconciliation cannot apply the same refund effects twice.

A refund that later fails causes successful-refund totals to be recalculated.

If an order had already been cancelled before Stripe later reports refund failure, the order stays cancelled and is flagged through its cancellation reason for manual review. Inventory is not silently re-reserved or re-opened.

## Refund notifications

The outbox now supports:

- Refund started
- Partial refund completed
- Full refund completed
- Refund failed
- Order cancelled

Email provider failures do not roll back refund/payment state.

## Delivery workflow

Production and delivery are now separate workflows.

After production reaches Ready:

```text
READY
  ↓
SHIPPED
  ↓
OUT_FOR_DELIVERY
  ↓
DELIVERED
```

The admin can store:

- carrier / driver;
- tracking or delivery reference;
- shipped timestamp;
- out-for-delivery timestamp;
- delivered timestamp.

### Shipping stock

For ready-stock lines, outstanding finished-goods reservations are converted into `SALE` movements when the order ships.

If an older/unusual order reaches Delivered without that conversion, delivery performs the same consumption as a safety fallback. Because the calculation uses outstanding reservation movements, stock is not consumed twice.

### Custom bouquets

Custom bouquet status remains synchronized:

```text
Order READY              → Custom READY
Order SHIPPED            → Custom READY
Order OUT_FOR_DELIVERY   → Custom READY
Order DELIVERED          → Custom COMPLETED
```

## Customer account

`/account/orders` now exposes:

- order status;
- payment status;
- fulfillment status;
- refunded total;
- individual refund states;
- carrier;
- tracking/reference;
- shipped/out-for-delivery/delivered timestamps;
- cancellation reason.

## Revenue KPI

The 30-day admin revenue metric is now net of successful refunds:

```text
net revenue = order total - refunded amount
```

Paid, partially refunded, and fully refunded orders are all included in the calculation so partial refunds do not incorrectly remove the entire order from revenue.

## Migration

Group 11 changes the Prisma schema.

Migration remains deferred per the current development plan.

When migrations are eventually applied:

```bash
npm install
npm run db:generate
npm run db:migrate -- --name add-refunds-returns-and-delivery
npm run db:seed
npm run typecheck
npm run build
```

Review and commit the generated migration SQL before production deployment.
