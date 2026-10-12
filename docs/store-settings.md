# Store settings

Use `/admin/settings` for business name and byline, support contacts, social links, announcement, maintenance message, checkout options, delivery rates, production defaults and search metadata.

Secret credentials belong in environment variables, never dashboard fields. Prices and delivery use AED. Reservation duration must fit Stripe's supported checkout-expiry window. Review delivery rates before accepting orders.

Maintenance mode blocks new checkout. Existing orders and provider callbacks still need to be monitored and processed. Catalogue changes load at runtime so administrators do not need to redeploy for updated inventory.
