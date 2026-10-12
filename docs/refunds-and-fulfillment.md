# Refunds and fulfillment

Open an order in `/admin/orders` to manage production, delivery and refunds. Paid or partially refunded orders can receive partial or full refunds up to their remaining refundable amount. A pending refund blocks another refund request for the same order.

Refund cancellation requires a full refund. Already shipped orders cannot be cancelled; record any physical stock return separately. If production consumed materials, acknowledge the production loss instead of automatically restoring supplies.

Stripe refund updates and the corresponding order/payment/inventory changes commit together. Duplicate notifications do not repeat the refund side effects, and terminal provider status is preserved against stale pending events. The provider refund identifier, amount and currency must match the local refund.

Delivery moves from Ready to Shipped, then Out for Delivery or Delivered. Repeating an already completed delivery transition does not consume stock again. Record carrier and tracking details when available.

An ambiguous provider failure may leave a refund pending. Inspect Stripe and the local order before retrying or issuing another refund. Never assume a timeout means no money moved. Provider dashboard refunds outside the application's tracked refund flow require reconciliation.
