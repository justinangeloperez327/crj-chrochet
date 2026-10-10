# Collections and merchandising

Group 15 turns the existing Collection and CollectionProduct models into a full merchandising workflow for Handmade Blooms by CRJ.

## Admin routes

- /admin/collections lists all collections, storefront state, merchandising order, product count, and promotion-target count.
- /admin/collections/[id] edits collection metadata, publish state, SEO, product membership, and manual product order.

## Collection fields

Collections now support:

- name;
- slug;
- description;
- featured homepage flag;
- isActive storefront publish state;
- collection-level sortOrder;
- seoTitle;
- seoDescription.

CollectionProduct.sortOrder remains the source of truth for product order inside a collection.

Collection-level sort order and product-level sort order are separate concerns.

## Publish behavior

Only collections with isActive=true are returned to the storefront.

Only ACTIVE products are rendered inside storefront collections.

A draft product may remain assigned in the admin editor but remains hidden from customers until the product itself becomes ACTIVE.

Archiving a product removes it from the collection editor's assignable product list and from storefront collection queries.

Unpublishing a collection removes it from:

- /collections;
- /collections/[slug];
- homepage collection merchandising;
- Shop collection shortcuts.

Direct storefront access to an unpublished collection returns not found when the database catalog is active.

## Featured collections

featured=true controls homepage merchandising.

The homepage displays up to three featured, published collections in collection sort order.

If published collections exist but none are featured, the first three published collections are used as a merchandising fallback.

The /collections index still shows all published collections regardless of featured state.

## Manual product ordering

Admins assign products from the collection editor.

Each selected product receives a CollectionProduct.sortOrder value.

Lower values appear first on the storefront.

Selected products must have unique whole-number sort ranks between -10000 and 10000, preventing ambiguous order.

Updating collection membership is transactional: the submitted assignment set replaces the previous set in one database transaction.

## Product data

Collections do not copy product pricing, stock, fulfillment mode, or active state.

Collection storefront pages use the same mapDatabaseProduct function as the main Shop catalog.

This keeps price, default variant, ready-stock quantity, made-to-order status, lead time, badge, and product tone consistent across Shop and Collections.

## Storefront routes

### /collections

Shows all published collections ordered by Collection.sortOrder, then name.

Each card includes collection name, description, featured state, product count, and collection artwork tone inferred from its products.

### /collections/[slug]

Shows:

- collection name;
- description;
- manually ordered active products;
- current ProductCard behavior including wishlist and quick add;
- SEO metadata from the collection when configured.

Empty published collections remain viewable and show a controlled empty state linking back to Shop.

## Static fallback

The storefront retains a static collection fallback when DATABASE_URL is not configured or the database collection query fails.

Fallback collections mirror the seeded default set:

- Best Sellers;
- Ready to Ship;
- Gift Favorites;
- Made to Order.

When a working database is configured, the database collection catalog is authoritative. A missing database collection does not fall back to a static duplicate.

## Promotion consistency

Collection-scoped discounts continue to resolve eligibility through CollectionProduct membership at checkout time.

Changing collection membership therefore changes collection-promotion eligibility immediately.

A hidden collection no longer grants collection-scoped promotion eligibility.

The collection editor shows every promotion currently targeting that collection and warns that membership changes affect eligibility.

A collection cannot be deleted while any promotion targets it. The promotion target must be removed first.

The Discounts editor also identifies hidden collection targets and notes that those promotions will not apply until the collection is published.

## Deletion

Deleting a collection removes its CollectionProduct membership records through the existing cascade relation.

Products themselves are never deleted by collection deletion.

Promotion-targeted collections are protected from deletion.

## Seed behavior

The default collections are seeded as published with deterministic collection order:

1. Best Sellers — 10;
2. Ready to Ship — 20;
3. Gift Favorites — 30;
4. Made to Order — 40.

Seeded CollectionProduct rows receive deterministic sort ranks from product seed order in increments of 10.

## Validation

Collection slugs remain globally unique.

Collection sort order must be between -10000 and 10000.

Description is limited to 600 characters.

SEO title is limited to 70 characters.

SEO description is limited to 180 characters.

Product assignments accept only non-archived product IDs.

## Migration

Group 15 changes the Prisma schema.

The deferred consolidated migration must include these Collection fields:

- isActive Boolean default true;
- sortOrder Int default 0;
- seoTitle String?;
- seoDescription String?;
- composite index on isActive, featured, sortOrder.

CollectionProduct itself does not require a new field because its existing sortOrder is now used by the merchandising workflow.

Migration remains deferred per the project plan. After the consolidated migration, regenerate Prisma and run the full typecheck/build before deployment.