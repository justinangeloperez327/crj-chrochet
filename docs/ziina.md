# Ziina payments

Ziina is selectable hosted checkout for AED orders (minimum AED 2). Stripe remains the default and continues handling historical Stripe orders, callbacks and refunds.

## Manual setup

1. Use a verified Ziina business account. Generate an access token through Business Connect → Other builder or custom. Save it directly in your deployment environment; never commit credentials.
2. Set `PAYMENT_PROVIDER=ziina`, `ZIINA_ACCESS_TOKEN`, `ZIINA_ACCOUNT_ID` (the merchant account UUID), `ZIINA_WEBHOOK_SECRET` (a strong random secret), and `ZIINA_TEST_MODE=true`. Keep `APP_URL` set to the HTTPS store origin and configure `CHECKOUT_RETURN_SECRET`. Retain Stripe credentials while historical Stripe orders remain.
3. Review and manually apply the additive database migration with `npm run db:deploy` using the intended database environment. This PR does not migrate production or deploy the site.
4. Register the HTTPS endpoint `APP_URL/api/payments/ziina/webhook` using authenticated `POST https://api-v2.ziina.com/api/webhook` with JSON `{ "url": "https://YOUR-STORE/api/payments/ziina/webhook", "secret": "YOUR-ZIINA-WEBHOOK-SECRET" }`. The token needs webhook write permission. Ziina supports one account webhook: registration replaces its existing endpoint, so coordinate if another application uses that account.
5. Manually deploy, then test a completed payment, failed/canceled payment, duplicate webhook, partial refund and full refund with cancellation. Confirm order status, reserved stock and notifications. Only then set `ZIINA_TEST_MODE=false` and manually deploy again. Refunds always retain the original payment attempt’s test/live mode.

## Verification and reconciliation

Webhooks require the documented sender IP and HMAC SHA256 over the raw body. On Vercel the handler uses the platform client-IP header; other hosting must supply a trusted `x-forwarded-for` header and prevent clients from spoofing it. The handler fetches current authenticated Ziina API state before updating orders, validating merchant, amount, currency and local identity. Redirects are signed and also fetch API state; a browser cancel flag alone never releases stock.

Payment creation records a local attempt before the API call. The published creation schema does not expose a client idempotency input. An uncertain POST is therefore not repeated automatically, and its reservation is retained. A subsequent verified webhook can recover the local attempt from its merchant message. If no intent ID is recovered, inspect the Ziina account and reconcile the attempt manually before releasing inventory or retrying payment. Pending refunds keep the client UUID and block additional refunds until verified.

The existing authenticated maintenance route reconciles known pending Ziina intents/refunds and expired reservations. Monitor its failures and unresolved initial attempts; never assume elapsed local reservation time proves that no payment completed.

Local contract tests mock the Ziina HTTP boundary. They do not prove that account permissions, live credentials, webhook registration or provider delivery work. Complete those checks in a deployed test environment before accepting real payments.

Official references: [custom integrations](https://docs.ziina.com/developers/custom-integration), [payment intents](https://docs.ziina.com/api-reference/payment-intent), [webhooks](https://docs.ziina.com/api-reference/webhook), [refunds](https://docs.ziina.com/api-reference/refund/create).
