# Customer management and CRM

Group 16 adds an operational CRM layer on top of the existing Customer, User, Order, Address, CustomBouquetRequest, and Discount data.

## Admin routes

- /admin/customers lists customer profiles with search, derived segments, activity risk, account state, paid-order count, lifetime net value, and note count.
- /admin/customers/[id] is the customer operational profile.

Orders and custom bouquet admin pages link back to the associated customer profile when a Customer relation exists.

## Customer identity

The existing Customer record remains the commerce identity.

Guest checkout does not create a second CRM identity system. Guest and registered history converge on the same Customer record when the normalized email/customer relationship is available.

Customer.userId continues to distinguish registered accounts from guest-only customer profiles.

Admin CRM editing intentionally does not allow the customer email to be changed because email participates in:

- User authentication identity;
- guest checkout matching;
- order customerEmail snapshots;
- discount per-customer usage;
- historical customer lookup.

Admin may edit first name, last name, and phone. If the Customer is linked to a User, the User.name display field is updated from the CRM name.

## Segmentation

Segments are derived at read time and are not persisted:

- PROSPECT: no paid order history;
- FIRST_ORDER: exactly one paid order;
- RETURNING: two or more paid orders;
- VIP: at least five paid orders or at least AED 1,000 lifetime net value.

VIP evaluation takes precedence over RETURNING.

Because segments are derived from the payment ledger, refunds and future orders automatically change customer metrics without a separate segment synchronization job.

## At-risk flag

A customer with paid history is marked at risk when the last paid order is at least 90 days old.

Prospects are not marked at risk because they have no prior paid relationship to lapse.

The at-risk flag is separate from the primary segment, so a VIP customer may also be at risk.

## Lifetime value

Operational lifetime net value is:

sum of paid-order totals - sum of successful refunded amounts.

Payment states counted as paid history are:

- PAID;
- PARTIALLY_REFUNDED;
- REFUNDED.

Fully refunded orders remain part of order-count/relationship history but contribute zero net value after refund adjustment.

Average order value on the customer profile uses lifetime net value divided by paid-order count.

Total discount savings is the sum of order discountAmount across the customer's paid-history orders.

## Customer profile

The customer detail page shows:

- registered versus guest status;
- segment;
- at-risk state;
- lifetime net value;
- paid order count;
- average order value;
- total discount savings;
- first and last paid dates;
- saved addresses;
- up to 100 recent orders;
- up to 50 custom bouquet requests;
- up to 100 internal CRM notes;
- active promotion context.

Order history remains linked to the Order admin workflow rather than duplicating order controls inside CRM.

Custom bouquet history remains linked to the Custom Bouquet admin workflow.

## Internal notes

Group 16 adds CustomerNote.

Customer notes are admin-only service context. They are not visible in the customer account.

Each note stores:

- customerId;
- optional authorUserId;
- body;
- createdAt;
- updatedAt.

Deleting an admin user does not delete the note; authorUserId is set null by relation policy.

Deleting a customer cascades its notes.

Notes are limited to 2,000 characters by the admin action.

## Promotion context

The CRM profile shows currently active/scheduled-valid promotions and the customer's relationship to them.

Displayed customer context includes:

- manual versus automatic promotion;
- scope;
- customer-segment eligibility;
- successful uses;
- pending reserved uses;
- customer uses remaining;
- global uses remaining;
- historical discount value received.

A CRM 'customer eligible' label means the customer segment and configured usage capacity currently allow the promotion.

It does not guarantee a checkout discount. Product scope, collection scope, minimum order, current basket value, and all final server validation still run at checkout.

Pending promotion reservations are included in per-customer capacity so CRM does not overstate remaining uses.

## Search and filters

Customer search checks:

- email;
- first name;
- last name;
- phone.

Filters support:

- primary segment;
- active versus at-risk activity.

Segment/risk filtering uses the same derived metrics shown in the rows.

## CSV export

The protected endpoint is /api/admin/customers.csv.

It supports the same q, segment, and risk query parameters as the CRM list.

The export includes:

- customer ID;
- display name;
- email;
- phone;
- registered/guest state;
- segment;
- at-risk flag;
- paid orders;
- total orders;
- lifetime net value;
- gross paid value;
- refunded value;
- first and last paid dates;
- saved-address count;
- custom bouquet count;
- internal note count;
- customer creation date.

The endpoint requires an ADMIN session, returns private/no-store responses, includes a UTF-8 BOM for Excel compatibility, and protects spreadsheet cells from formula injection.

Internal note bodies are intentionally excluded from CSV exports.

## Privacy boundary

CRM segmentation is operational customer-service context only.

It is not a marketing-consent system and does not imply consent for promotional email, SMS, WhatsApp, or other outbound messaging.

Marketing consent should be modeled separately if outbound campaign functionality is added later.

## Migration

Group 16 changes the Prisma schema by adding:

- User.customerNotesAuthored relation;
- Customer.notes relation;
- CustomerNote model;
- CustomerNote customer/createdAt index;
- CustomerNote authorUserId index.

Migration remains deferred under the current consolidated-migration plan. After migration generation, regenerate Prisma and run the full typecheck/build before deployment.