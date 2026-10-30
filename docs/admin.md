# Administration

Sign in at `/login` with an administrator account to open `/admin`. Create or rotate that account with `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `ADMIN_NAME` using `npm run db:bootstrap-admin`. The command revokes existing admin sessions and recovery tokens. Alternatively, a matching administrator can recover their password on the regular `/login` page using the current Vercel Production `ADMIN_EMAIL` and `ADMIN_PASSWORD` values after a manual deployment; the password rotation revokes previous sessions. Remove `ADMIN_PASSWORD` from Vercel and redeploy after successful setup. It does not create demo products.

The dashboard links to products, inventory, materials, production, orders, customers, collections, discounts, reviews, reports and store settings. Each page and mutation checks the administrator role on the server.

Create products as Draft, configure active variants and photographs, then publish them as Active. Review stock, material recipes, delivery rates and production capacity before accepting orders. Archive products you no longer sell rather than removing order history.

Use stock adjustments with a reason. Reserved inventory cannot be reduced below outstanding commitments. Manage financial reversals through the order's refund controls and physical returns separately. See [refunds](refunds-and-fulfillment.md), [production](production-planning.md), and [deployment](deployment.md).
