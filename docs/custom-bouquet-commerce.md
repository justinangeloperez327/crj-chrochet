# Custom bouquet commerce

Group 10 converts an approved handmade request into normal paid commerce without creating a parallel order system.

## Lifecycle

```text
Submitted
  ↓
Reviewing
  ↓
Approved
  ↓
Admin finalizes price + lead time
  ↓
Awaiting Payment
  ↓
Customer enters delivery details
  ↓
Raw materials reserved
  ↓
Order + Stripe Checkout
  ↓
Verified webhook
  ↓
Paid
  ↓
In Production
  ↓
Ready
  ↓
Completed
```

## Finalizing a quote

From:

```text
/admin/custom-bouquets/<id>
```

an administrator finalizes:

- final bouquet price before delivery;
- minimum production lead time;
- maximum production lead time.

Only an `APPROVED` request can receive its initial commercial quote.

The quote is valid for seven days and receives a new 32-byte random payment token. Reissuing an expired unpaid quote rotates the token, so the previous public link stops resolving.

Pending or failed unsent quote emails are deleted before the replacement notification is queued. Sent notifications remain as history.

## Quote email

The existing notification outbox sends a `CUSTOM_BOUQUET_QUOTE_READY` email when Resend is configured.

The email contains:

- custom reference;
- approved bouquet price;
- lead-time range;
- secure payment URL;
- quote expiry date.

The public URL is:

```text
/custom-bouquets/pay/<high-entropy-token>
```

The token is unguessable and functions as a payment-link capability for guest customers.

Signed-in customers also receive a **Pay approved quote** action in:

```text
/account/custom-bouquets
```

## Delivery and order conversion

The payment page collects:

- recipient;
- mobile;
- address;
- apartment/landmark;
- city;
- emirate;
- optional postal code.

Delivery is recalculated server-side from the same emirate configuration used by ordinary checkout.

`POST /api/custom-bouquets/pay/<token>` does not trust browser pricing.

It verifies:

1. the quote exists;
2. the request is `AWAITING_PAYMENT`;
3. the final price is present;
4. the quote is not expired;
5. sufficient time remains to open a Stripe session;
6. no usable payment session already exists;
7. the delivery emirate is configured;
8. the raw-material plan can be reserved.

The service then creates a normal:

- `Customer` if necessary;
- `Order`;
- `OrderAddress`;
- `OrderItem`.

The custom order item intentionally has no `Product` or `ProductVariant`. Its SKU is the custom bouquet reference.

The request and order are linked one-to-one through `CustomBouquetRequest.orderId`.

## Raw-material reservation

`RawMaterial` now has:

```text
stockOnHand
stockReserved
```

Available workshop stock is:

```text
stockOnHand - stockReserved
```

Starting custom payment creates `RESERVATION` movements and increments `stockReserved`.

This prevents:

- another custom payment from allocating the same yarn;
- a made-to-order catalog SKU from consuming materials already promised to a custom checkout;
- a manual stock adjustment from reducing physical stock below the reserved quantity.

The material admin shows on-hand, reserved, available, and reorder quantities.

## Payment session lifetime

Custom material reservations use the order/Stripe session lifetime.

A new session is opened only when at least 46 minutes remain on the approved quote. The order reservation lasts up to 45 minutes and never extends beyond quote expiry.

When checkout is cancelled or expires:

- Stripe is expired/verified first;
- raw-material reservations are released;
- `RELEASE` movements are written;
- the cancelled order remains as audit history;
- the custom request is detached from that cancelled order;
- the same valid quote can start a fresh order/payment attempt.

If Stripe reports payment completed during a cancellation race, successful payment wins and the customer is sent to order confirmation.

## Verified payment

The browser return page never marks payment paid.

The signed Stripe webhook updates:

```text
Order.paymentStatus = PAID
Order.status = CONFIRMED
CustomBouquetRequest.status = PAID
```

The raw-material reservation remains in place after payment.

The normal order-confirmation email is then queued/sent.

Custom payment confirmation does **not** clear the customer's unrelated normal shopping basket.

## Production

A custom request can enter production only when its linked order is paid.

Starting production:

- validates the material reservation;
- decreases `RawMaterial.stockOnHand`;
- decreases `RawMaterial.stockReserved`;
- writes `CONSUMPTION` movements;
- records `materialsConsumedAt`;
- moves both the custom request and order into production.

Operational states stay synchronized:

| Custom bouquet | Order |
| --- | --- |
| Paid | Confirmed |
| In Production | In Production |
| Ready | Ready |
| Completed | Fulfilled |

The regular admin order workflow also enforces the custom sequence and cannot skip directly from Paid to Ready.

Paid custom orders cannot currently be cancelled through the ordinary admin action because a refund workflow is required first.

## Payment retries

If an existing Stripe Checkout Session is still valid, the payment page reuses it.

If the pending order/session is stale, it is cancelled first, its material reservation is released, and a fresh order/session can be created.

Async payment failures remain visible through the normal payment-state machinery; stale pending reservations are still covered by the existing reservation-expiry maintenance fallback.

## Account and admin visibility

Customer:

```text
/account/custom-bouquets
/account/orders
```

Admin:

```text
/admin/custom-bouquets
/admin/custom-bouquets/<id>
/admin/orders
/admin/orders/<id>
/admin/materials
```

The admin order detail links back to its custom bouquet request.

## Migration

Group 10 changes the Prisma schema again.

After pulling the commit:

```bash
npm install
npm run db:generate
npm run db:migrate -- --name add-custom-bouquet-commerce
npm run db:seed
npm run typecheck
npm run build
```

Review and commit the generated migration SQL before deployment.

No new external service is required beyond the Group 8 environment configuration for PostgreSQL, Stripe, delivery rates, Resend, and `APP_URL`.
