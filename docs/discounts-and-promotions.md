# Discounts and promotions

Group 14 expands the original global discount-code support into a promotion engine with scoped eligibility, scheduling, usage limits, automatic offers, and admin reporting.

## Admin route

The promotion management route is /admin/discounts.

Admins can create, edit, deactivate, and delete unused promotions. Promotions with any order history, successful redemption, or pending reserved usage are retained for audit and must be deactivated instead of hard-deleted.

## Discount types

Supported discount types remain:

- percentage;
- fixed amount.

Percentage values must be greater than zero and cannot exceed 100%. Fixed values must be greater than zero.

Discount amount is always capped at the eligible merchandise subtotal, so a fixed promotion can never make eligible merchandise negative.

## Scope

Each promotion has one scope:

- ENTIRE_ORDER;
- PRODUCTS;
- COLLECTIONS.

Product-scoped promotions require at least one selected active/non-archived product.

Collection-scoped promotions require at least one selected collection.

Collection eligibility is evaluated from CollectionProduct membership at checkout time.

The minimum-order threshold uses the full cart merchandise subtotal. The discount itself is calculated only from the scoped eligible subtotal.

## Customer eligibility

Supported customer segments are:

- ALL;
- NEW_CUSTOMERS;
- RETURNING_CUSTOMERS.

Customer identity is normalized by checkout email.

NEW_CUSTOMERS means the email has no earlier paid, partially refunded, or refunded order.

RETURNING_CUSTOMERS means the email has at least one earlier paid order history entry.

Refunding an earlier order does not make the shopper new again.

Customer-specific promotions require an email before validation.

## Usage limits

Promotions can define:

- global maximum redemptions;
- maximum redemptions per customer.

Successful redemption count is not decremented by later refunds. A refund changes order economics, not whether the promotion was historically used.

### Reserved uses

Limited promotions reserve their usage slot when a pending order is created.

The lifecycle is:

eligible checkout -> pending order -> reserved use -> successful payment -> successful redemption.

If Stripe Checkout is cancelled, expires, or order creation is rolled back, the reserved use is released.

This prevents two concurrent pending checkouts from both consuming the final globally available redemption.

Per-customer validation counts both successful uses and that customer's active pending reservations.

Reservation consumption and release use an atomic claim on Order.discountReservationActive so duplicate cancellation/expiry processing cannot decrement the reserved counter twice.

## Automatic promotions

A promotion can be marked automatic.

When no manual code is supplied, the server evaluates eligible automatic promotions.

Selection order is:

1. highest priority;
2. largest customer saving within that priority.

Only one promotion applies to an order. Promotions do not stack.

A manually entered valid code always overrides automatic selection.

The checkout revalidates promotion eligibility after the shopper supplies an email and again when the pending order is created.

## Schedule

Promotions may have optional start and end dates.

Admin date inputs use UAE business-day boundaries:

- startsAt: 00:00 Asia/Dubai;
- endsAt: 23:59:59.999 Asia/Dubai.

No start date means immediately available subject to other eligibility rules.

No end date means no scheduled expiry.

## Order audit snapshot

Orders now store:

- discountCodeSnapshot;
- discountEligibleSubtotal;
- discountReservationActive.

The snapshot preserves the actual code and scoped merchandise value used during checkout even if an admin later renames or changes the promotion.

Customer order history and admin order detail display the applied code snapshot.

## Promotion reporting

The Discounts page reports:

- active promotions;
- scheduled promotions;
- pending reserved uses;
- successful redemptions;
- total discount value given on paid orders;
- net revenue from orders using promotions;
- per-promotion paid-order count;
- unique customers;
- average discount;
- reserved versus successful usage.

Net revenue is refund-adjusted using the current successful refunded amount on each paid order.

The page also provides an admin-only CSV export at /api/admin/discounts.csv containing promotion configuration plus reserved uses, successful redemptions, paid orders, customer count, discount value, net revenue, and average discount. The response is private/no-store, UTF-8 BOM encoded for Excel compatibility, and protects spreadsheet cells from formula injection.

## WELCOME10

The seed promotion WELCOME10 is now:

- 10% off;
- minimum AED 100 merchandise subtotal;
- entire-order scope;
- first-order customers only;
- maximum one successful/reserved use per customer;
- manual code, not automatic.

## Checkout validation

The discount validation API now receives the shopper email along with cart lines.

The final pending-order transaction repeats all checks server-side:

- active state;
- schedule;
- global capacity;
- per-customer capacity;
- customer segment;
- minimum order;
- product or collection scope;
- current server-side product price.

Client totals are advisory. Stripe Checkout always uses the server-created order total.

## Migration

Group 14 changes the Prisma schema.

The deferred consolidated migration must include:

- DiscountScope;
- DiscountCustomerEligibility;
- Discount.scope;
- Discount.customerEligibility;
- Discount.maxRedemptionsPerCustomer;
- Discount.reservedRedemptions;
- Discount.automatic;
- Discount.priority;
- DiscountProduct;
- DiscountCollection;
- Product.discountRules;
- Collection.discountRules;
- Order.discountEligibleSubtotal;
- Order.discountCodeSnapshot;
- Order.discountReservationActive.

Migration remains deferred per the current project plan. After the consolidated migration, regenerate Prisma and run the full typecheck/build before deployment.