# Payments and delivery

Checkout validates product availability, pricing, promotions and delivery on the server, creates a pending order and opens Stripe Checkout. Set `APP_URL`, Stripe credentials and `CHECKOUT_RETURN_SECRET` before accepting orders.

A browser return is not payment confirmation. Signed Stripe webhooks confirm payment; duplicate callbacks must not duplicate confirmation, inventory changes or fulfillment. Payment processing errors return HTTP 500 for Stripe retry. Amount and currency are checked against the stored payment attempt.

Finished stock stays reserved until shipping or delivery converts the reservation into a sale. Failed payment releases the reservation. Maintenance consults Stripe before releasing expired unpaid reservations, protecting delayed payment notifications. A payment received for an already cancelled order requires manual reconciliation and must not be fulfilled automatically.

Delivery is UAE-only and priced in AED. Configure rates in `/admin/settings`; environment values can provide fallback rates. See [deployment](deployment.md) for webhook events, cron and provider configuration, and [refunds](refunds-and-fulfillment.md) for reverse transactions.
