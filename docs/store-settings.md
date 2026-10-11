# Store settings and business configuration

Group 17 centralizes non-secret business and storefront configuration in a singleton StoreSettings record.

## Admin route

The settings route is /admin/settings.

Only authenticated ADMIN users can update settings through Server Actions.

Secrets remain environment variables. Stripe keys, webhook secrets, Resend API keys, checkout return secrets, database credentials, and cron secrets are intentionally not stored in StoreSettings.

## Singleton configuration

StoreSettings uses the fixed ID primary.

The application also carries typed code defaults. If DATABASE_URL is missing, the settings row does not exist, or settings retrieval fails, public rendering uses those safe defaults.

The seed creates the singleton row with Prisma defaults without overwriting existing administrator choices.

## Business identity

Configurable values include:

- businessName;
- brandByline;
- tagline;
- supportEmail;
- supportPhone;
- Instagram URL;
- Facebook URL;
- TikTok URL;
- WhatsApp URL.

Business identity is used by the storefront header/footer, root metadata branding, Stripe Checkout product description, homepage attribution, and email branding.

Public social/contact controls are only rendered when configured.

## Announcement bar

announcementEnabled controls whether the storefront announcement bar is rendered.

announcementText is limited to 180 characters by the admin action.

The header remains the single storefront source for announcement rendering.

## Maintenance mode

maintenanceMode redirects normal new-commerce storefront routes to /maintenance through the server SiteHeader wrapper.

Covered routes include pages that render the normal storefront header, such as:

- home;
- Shop;
- collections;
- product detail;
- cart;
- Build a Bouquet.

Checkout performs an explicit server-side maintenance check because it uses its own checkout header.

Maintenance is also enforced at the order-creation service and custom-bouquet request persistence boundary. Direct API calls therefore cannot create a new pending order or custom request while maintenance mode is active.

Maintenance mode deliberately does not block:

- /admin;
- /account;
- /login;
- /register;
- existing order confirmation;
- existing custom-bouquet payment links.

This prevents maintenance from locking administrators out or stranding customers who already have an order/payment flow in progress.

When maintenance mode is disabled, direct access to /maintenance redirects to home.

## Checkout defaults

Configurable checkout settings include:

- giftOrdersEnabled;
- giftMessageMaxLength;
- orderNoteMaxLength;
- checkoutReservationMinutes;
- defaultCurrency.

The current application remains single-currency and accepts AED only. The currency field is centralized for consistency but the admin action rejects non-AED values until the catalog, payment, and reporting layers support real multi-currency pricing.

Checkout reservation duration is constrained to 30–240 minutes.

Server-side order creation reads the current StoreSettings before opening its serializable transaction.

Gift orders are rejected server-side when disabled, even if stale local browser preferences still contain gift data.

Custom bouquet request gift messages use the same configured gift availability and maximum message length.

Gift message and order-note limits are enforced server-side. The cart UI also reads the configured limits and clamps older local preferences when those limits are reduced.

## Delivery configuration

Database delivery settings are available for:

- flat fallback;
- Abu Dhabi;
- Dubai;
- Sharjah;
- Ajman;
- Umm Al Quwain;
- Ras Al Khaimah;
- Fujairah.

Resolution order is:

1. database emirate-specific rate;
2. database flat rate;
3. environment emirate-specific DELIVERY_RATE_* value;
4. environment DELIVERY_FLAT_RATE_AED;
5. zero.

Environment delivery variables remain supported as deployment fallbacks and for environments where StoreSettings has not yet been configured.

Unsupported emirates still fail validation.

## Production defaults

Configurable production defaults include:

- productionDefaultPriority;
- productionDefaultMinutes;
- productionDefaultAssignee.

These defaults are applied only when a ProductionJob is created.

Existing production jobs are never overwritten when StoreSettings later changes. Per-job planner edits remain authoritative after creation.

## SEO defaults

seoTitle and seoDescription feed the root Next.js metadata generator.

Product and collection routes can continue to override root defaults with their own specific metadata.

## Email and payment branding

Notification email rendering reads StoreSettings and uses the configured business name/byline in the email brand and relevant order subject lines.

Stripe Checkout reads StoreSettings for the order product name shown in hosted Checkout.

ORDER_EMAIL_FROM remains an environment variable because sender-domain configuration belongs to email infrastructure, not business display configuration.

## Reset behavior

The Reset settings action restores typed application defaults and clears database contact/social/delivery/production overrides.

It does not alter environment variables or secrets.

It also disables maintenance mode so a reset cannot leave the public storefront intentionally locked.

## Validation

Important limits include:

- businessName: 80 characters;
- brandByline: 40 characters;
- tagline: 240 characters;
- announcementText: 180 characters;
- maintenanceMessage: 300 characters;
- support email: validated email format;
- external social URLs: http/https only;
- gift message maximum setting: 0–1000;
- order note maximum setting: 0–2000;
- checkout reservation: 30–240 minutes;
- delivery rates: 0–10,000;
- production planned minutes: 1–10,080 when configured;
- SEO title: 70 characters;
- SEO description: 180 characters.

## Migration

Group 17 adds the StoreSettings model.

The deferred consolidated migration must include all StoreSettings fields, including the enum-backed productionDefaultPriority field.

No migration file is generated in Group 17 because migration generation remains deferred under the current project plan.

After the consolidated migration, regenerate Prisma and run typecheck, lint, and production build before deployment.