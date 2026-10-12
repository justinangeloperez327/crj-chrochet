# Storefront search and discovery

Group 20 adds storefront search, autocomplete, recent-search convenience, URL-addressable filters, collection discovery, and back-office search improvements.

## Architecture

Search remains application-level and schema-free in Group 20.

The storefront search service reuses the existing normalized storefront product and collection loaders. This preserves:

- database catalog behavior;
- static fallback behavior;
- product availability logic;
- approved-review ratings;
- product media;
- collection publish rules.

No external search provider or PostgreSQL full-text index is introduced yet.

That is intentional for the current catalog size. A dedicated search index should be introduced only when catalog scale, typo tolerance, facets, or performance measurements justify it.

## Storefront routes

The full search route is:

`/search`

Search state is represented in URL query parameters:

- q
- flower
- availability
- min
- max
- sort

This makes filtered searches shareable and reload-safe.

## Search ranking

For product searches, ranking favors:

1. exact product name or slug;
2. product name prefix;
3. product name;
4. slug;
5. exact flower type;
6. flower type;
7. variant text;
8. color names;
9. description.

Token-level matches add smaller relevance increments.

Featured state and approved-review rating contribute only small tie-breaker weight so commercial merchandising does not overwhelm textual relevance.

Collection ranking uses:

- exact collection name/slug;
- name prefix;
- name;
- slug;
- description;
- contained product names;
- a small featured tie-breaker.

## Filters

The search results page supports:

- flower type;
- availability;
- minimum price;
- maximum price;
- relevance sorting;
- rating sorting;
- price ascending;
- price descending.

Invalid URL values are normalized to safe defaults rather than passed directly into filtering.

## Autocomplete

The endpoint is:

`GET /api/search?q=...`

Queries shorter than 2 characters return no suggestions.

Queries longer than 100 characters are rejected.

Autocomplete returns at most:

- 6 products;
- 4 collections.

The response is private/no-store.

The global header shows compact autocomplete on wide desktop layouts and links to /search on smaller layouts.

The Shop hero also includes the full search control.

## Recent searches

Recent searches are stored only in browser localStorage under:

`crj_recent_searches`

At most five terms are retained.

Recent search history is not written to the database and is not associated with the user's account.

The user can clear the recent-search list from the search dropdown.

## Empty states

The full search page provides a controlled empty result state with guidance to:

- broaden the query;
- search by flower/color;
- relax price filters;
- browse the full Shop.

Autocomplete also distinguishes between:

- no query/recent searches;
- query with suggestions;
- query with no quick matches.

## Collections

Published collections can match a search independently of product results.

Collection search includes collection name, slug, description, and contained product names.

Collection results link directly to the existing collection storefront pages.

## Admin search

Group 20 adds search to:

### Products

/admin/products supports q matching:

- product name;
- slug;
- flower type;
- category name;
- variant SKU;
- variant name;
- variant color.

### Orders

/admin/orders supports q matching:

- order number;
- customer email;
- customer phone;
- tracking number;
- linked customer first name;
- linked customer last name;
- linked customer email.

The existing Customers CRM search remains unchanged and already searches name, email, and phone.

## Privacy

Storefront recent searches stay browser-local.

The autocomplete endpoint does not persist queries.

Group 20 therefore adds no server-side search-history tracking or analytics table.

If search analytics are added later, consent, retention, aggregation, and PII handling should be designed separately.

## Database migration

Group 20 requires no Prisma schema changes and no new migration.

It can be deployed after the previously deferred schema migrations are generated and applied.

## Future scale path

If the catalog becomes large, the next search evolution should be evidence-driven. Likely options are:

1. PostgreSQL full-text search with generated/search-vector indexes;
2. trigram indexes for typo-tolerant matching;
3. a dedicated search service only if operational requirements justify it.

The current application-level ranking should not be treated as the long-term solution for a very large catalog.
