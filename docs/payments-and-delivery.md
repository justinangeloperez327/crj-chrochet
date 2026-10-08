# Payments, delivery, reservations, and notifications

Group 8 adds the production payment boundary for Handmade Blooms by CRJ.

## Payment provider

The initial provider is Stripe Checkout.

The application never receives card details. Checkout creates a Stripe-hosted payment session from the database-authoritative order total and redirects the customer to Stripe.

Required environment variables:

```env
APP_URL="https://your-domain.example"
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
CHECKOUT_RETURN_SECRET="use-a-long-random-secret"
```

Stripe webhook endpoint:

```text
POST /api/payments/stripe/webhook
```

Listen for:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`

Do not mark an order paid from the browser return page. Only a successfully verified Stripe webhook changes `PaymentStatus` to `PAID`.

## Checkout lifecycle

```text
Browser checkout form
        ↓
POST /api/checkout
        ↓
Server re-resolves SKUs and prices
        ↓
Server calculates delivery
        ↓
Pending order + stock reservation
        ↓
Stripe Checkout Session
        ↓
Customer pays on Stripe
        ↓
Verified Stripe webhook
        ↓
PAID + CONFIRMED
        ↓
Confirmation email outbox
```

The legacy public `POST /api/orders` route no longer creates reservations and returns HTTP 410.

## Reservation lifetime

A new pending-payment order receives a 45-minute `reservationExpiresAt`.

The matching Stripe Checkout Session uses the same expiration window.

Ready-stock quantities are reserved when the order is created. Made-to-order quantities do not reserve finished goods.

### Successful payment

A verified successful webhook:

- marks the payment attempt `PAID`;
- marks the order payment `PAID`;
- moves a pending order to `CONFIRMED`;
- records `paidAt`;
- clears `reservationExpiresAt`;
- increments discount redemption once;
- queues the confirmation email.

Physical finished stock remains reserved until fulfillment. Group 6 fulfillment then converts the reservation into a `SALE` movement.

### Stripe cancellation

The Stripe cancel URL is signed with `CHECKOUT_RETURN_SECRET`.

The cancel handler first expires the Stripe session. Only then does it cancel the local pending order and release reserved inventory.

If Stripe reports that payment already completed, the handler redirects to the order confirmation page instead of releasing stock.

### Expiration

The `checkout.session.expired` webhook cancels the still-pending order and releases outstanding reservations.

There is also a scheduled maintenance fallback that scans expired pending orders. Stripe webhooks remain the primary, timely release mechanism.

## Delivery pricing

Delivery is calculated on the server.

A flat fallback can be configured:

```env
DELIVERY_FLAT_RATE_AED="25"
```

Optional emirate-specific overrides:

```env
DELIVERY_RATE_ABU_DHABI_AED=""
DELIVERY_RATE_DUBAI_AED=""
DELIVERY_RATE_SHARJAH_AED=""
DELIVERY_RATE_AJMAN_AED=""
DELIVERY_RATE_UMM_AL_QUWAIN_AED=""
DELIVERY_RATE_RAS_AL_KHAIMAH_AED=""
DELIVERY_RATE_FUJAIRAH_AED=""
```

Blank emirate values fall back to `DELIVERY_FLAT_RATE_AED`.

The browser delivery quote is informational. Order creation recalculates the same delivery amount server-side before Stripe Checkout is created.

## Order confirmation

Stripe redirects successful hosted checkout to:

```text
/order-confirmation?session_id={CHECKOUT_SESSION_ID}
```

The confirmation page uses the high-entropy Stripe Checkout Session ID to find the payment attempt and associated order.

The page does not mark payment successful. If the webhook has not arrived yet, it briefly refreshes while the server remains authoritative.

The local basket is cleared only after the database shows the order payment as paid.

## Email notifications

Email delivery uses Resend.

```env
RESEND_API_KEY="re_..."
ORDER_EMAIL_FROM="Handmade Blooms by CRJ <orders@your-domain.example>"
```

Emails are represented by `NotificationOutbox` records.

This prevents an email provider outage from rolling back or corrupting a payment webhook.

Current notifications:

- order confirmed
- payment failed

If Resend is not configured, notifications stay queued.

Failed sends are retried up to five attempts by maintenance runs.

## Scheduled maintenance

Vercel cron configuration is stored in `vercel.json`.

The maintenance endpoint:

```text
GET /api/internal/maintenance
```

requires:

```env
CRON_SECRET="use-a-long-random-secret"
```

It:

- releases stale pending-payment reservations;
- retries queued/failed email notifications.

The checked-in schedule is once daily so it remains deployable on Vercel Hobby. Stripe webhook expiry is the normal reservation cleanup path. On a plan that supports higher-frequency cron schedules, the fallback can be made more frequent.

## Database migration

Group 8 changes the Prisma schema.

After configuring PostgreSQL:

```bash
npm install
npm run db:generate
npm run db:migrate -- --name add-payments-delivery-notifications
npm run db:seed
```

Commit the generated migration directory after reviewing the SQL.

## Payment-state rules

The browser is never authoritative for:

- product price;
- discount amount;
- delivery charge;
- stock availability;
- payment success.

Those values are calculated or verified on the server.

A customer-facing return URL is presentation only. Stripe webhook signature verification is the payment authority.
