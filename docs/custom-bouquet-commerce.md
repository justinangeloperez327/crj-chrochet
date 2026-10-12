# Custom bouquet checkout

Customers submit a request through `/build-a-bouquet`. Admins use `/admin/custom-bouquets` to review choices, finalize pricing, define materials, set lead time and issue an expiring payment link.

The payment link opens `/custom-bouquets/pay/[token]`. The customer supplies delivery details; the server adds the configured delivery charge to the frozen quote. Checkout reserves the quoted materials and creates a normal order. Existing valid checkout sessions are reused.

Only confirmed payment authorizes production. Unpaid cancellation, payment failure or checkout expiry releases reservations. Production and delivery are managed through the standard order workflow. Treat payment links as confidential bearer links and do not publish or log them.
