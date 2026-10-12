# Product reviews and ratings

Group 19 adds verified-purchase product reviews with moderation.

## Trust model

A review can only be submitted by an authenticated customer whose account owns the exact order item being reviewed.

The server requires all of the following:

- the order item references a real product;
- the order belongs to the authenticated user's Customer record;
- paymentStatus is PAID;
- order status is FULFILLED;
- fulfillmentStatus is DELIVERED.

The browser cannot select an arbitrary product ID. It submits an orderItemId and the server resolves the purchased product.

Each OrderItem can have at most one ProductReview through a unique orderItemId constraint.

## Review lifecycle

New reviews are created as PENDING.

Only ADMIN users can moderate reviews.

Moderation states:

- PENDING
- APPROVED
- REJECTED

Only APPROVED reviews are public and only APPROVED ratings contribute to product rating aggregates.

An admin can approve, reject, or return a moderated review to pending.

## Review content

Rating must be an integer from 1 through 5.

Title is optional and limited to 100 characters.

Review body is required and must be between 10 and 1,200 characters.

Review text is rendered as text by React; user HTML is not injected.

## Verified purchase

Reviews created through the customer order flow are marked verifiedPurchase=true.

The storefront displays a Verified purchase marker.

Reviewer display names are deliberately reduced to a first-name initial form rather than exposing customer email addresses or full names.

## Customer experience

Eligible delivered order items expose a review form in /account/orders.

After submission, the review is shown as pending moderation and another form is not offered for the same order item.

The database unique constraint remains the authoritative duplicate protection.

## Admin experience

/admin/reviews provides:

- pending review count;
- approved review count;
- rating;
- product;
- customer identity for moderation;
- source order number;
- review title/body;
- verified-purchase state;
- approve;
- reject;
- return to pending.

Admin moderation actions call requireAdmin() themselves.

## Storefront

Product catalog mapping now calculates:

- reviewCount from approved reviews only;
- rating as the arithmetic mean of approved review ratings.

Products with no approved reviews show no synthetic rating.

Product detail pages list approved reviews only.

Collection product cards inherit the same approved-review aggregates.

## Abuse controls in this group

The first review layer deliberately uses deterministic controls rather than heuristic filtering:

- authentication required;
- purchase ownership verified server-side;
- paid + delivered order required;
- one review per order item;
- length limits;
- integer rating validation;
- moderation before publication;
- admin-only moderation;
- no public reviewer email/full-name exposure.

Rate limiting and automated content classification can be added later if review volume warrants it.

## Prisma migration

Group 19 changes the Prisma schema and therefore requires a real migration.

After pulling the group and connecting the intended PostgreSQL database:

```bash
npm install
npm run db:generate
npm run db:migrate -- --name add-product-reviews
```

Review the generated SQL and commit the generated migration directory.

Do not hand-write a migration merely to make the repository appear migrated.

Production deployment should run:

```bash
npm run db:deploy
```

before starting application code that queries ProductReview.

## Schema additions

New enum:

- ReviewStatus

New model:

- ProductReview

Relations are added to:

- Product
- User
- OrderItem

The unique OrderItem review relation is the structural duplicate-review guarantee.
