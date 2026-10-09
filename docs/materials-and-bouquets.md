# Custom bouquets and raw-material planning

Group 9 adds a workshop-planning layer on top of the finished-goods inventory introduced earlier.

## Inventory separation

The system intentionally keeps two inventories separate.

### Finished goods

`ProductVariant` continues to track sellable finished products:

- `stockOnHand`
- `stockReserved`
- `reorderLevel`

Those quantities represent completed flowers or bouquets ready for sale.

### Raw materials

`RawMaterial` tracks workshop inputs such as:

- yarn by color;
- floral wire;
- floral tape;
- wrapping sheets;
- clear sleeves;
- ribbon.

Raw-material quantities use decimal precision because yarn and tape are consumed in grams/meters rather than whole pieces.

Supported units:

- `GRAM`
- `METER`
- `PIECE`
- `ROLL`
- `PACK`

## Raw-material ledger

Every material change is represented by `RawMaterialMovement`.

Movement types:

- `OPENING`
- `RECEIPT`
- `ADJUSTMENT`
- `CONSUMPTION`
- `RETURN`

The material admin is available at:

```text
/admin/materials
```

Manual adjustments are deltas. The system rejects a change that would make stock negative.

## Product BOM

`VariantMaterial` is the bill of materials for one sellable `ProductVariant`.

Example:

```text
CRJ-ROS-LAV-05
├── Lavender Yarn   50 g
├── Green Yarn      15 g
├── Floral Wire      5 pcs
└── Floral Tape    1.5 m
```

BOM editing is available from the product screen or:

```text
/admin/products/<product-id>/bom
```

### Automatic consumption

When an authenticated administrator moves a paid standard order into:

- In Production
- Quality Check
- Ready
- Fulfilled

the system attempts to consume the BOM for each `MADE_TO_ORDER` order item.

Consumption is idempotent through `OrderItem.materialsConsumedAt`.

Ready-stock SKUs do **not** consume raw materials when the customer order enters production because their raw materials should already have been consumed when the finished item was manufactured.

`BOTH` variants are intentionally not auto-consumed yet because one customer line can be partly fulfilled from ready stock and partly produced. That split requires a production allocation model rather than guessing.

If required raw-material stock is insufficient, the production status change fails rather than allowing negative material stock.

## Build Your Bouquet

The customer builder is available at:

```text
/build-a-bouquet
```

The storefront navigation and homepage Build a Bouquet CTAs point to this route.

The builder has four steps:

1. choose flowers/colors and stem quantities;
2. choose wrapping;
3. add recipient/from/message;
4. provide contact details and submit.

Online designs require 3–30 stems.

## Builder catalog

The builder does not reuse finished bouquet SKUs.

It has purpose-built models:

- `BouquetStemOption`
- `BouquetStemMaterial`
- `BouquetWrapOption`
- `BouquetWrapMaterial`

Each active stem option has:

- flower type;
- color;
- customer price per stem;
- material recipe.

Each wrapping option has:

- name;
- customer price;
- material recipe.

This means customer pricing and workshop material planning are calculated from the same database-backed configuration.

## Server-authoritative request calculation

The browser shows a live estimate for UX, but submitted values are not trusted.

`POST /api/custom-bouquets`:

1. validates the contact data;
2. merges duplicate flower selections;
3. enforces the 3–30 stem limit;
4. reloads active stem/wrap options from PostgreSQL;
5. reloads their material recipes;
6. rejects missing/inactive recipes;
7. recalculates the price;
8. calculates raw-material requirements;
9. snapshots both the composition and material plan;
10. creates a `CustomBouquetRequest`.

The customer receives a reference such as:

```text
CB-20261009-A1B2C3
```

A custom bouquet submission is currently an **estimate/request**, not a paid commerce order. CRJ reviews it before committing to production.

## Frozen material plan

`CustomBouquetRequest.materialPlan` stores the calculated requirements at submission time.

This is deliberate. If the builder recipe changes tomorrow, an already-approved custom request should still represent the design CRJ originally reviewed.

The admin detail page shows both:

- required quantity;
- raw stock that existed at quote time.

Before actual consumption, current material stock is checked again.

## Custom bouquet workflow

Admin routes:

```text
/admin/custom-bouquets
/admin/custom-bouquets/<id>
```

Allowed workflow:

```text
Submitted
    ↓
Reviewing
    ↓
Approved
    ↓
In Production
    ↓
Ready
    ↓
Completed
```

A request can be declined during Submitted, Reviewing, or Approved.

Invalid workflow jumps are rejected server-side.

Moving an approved request to In Production consumes its frozen material plan exactly once and writes `CONSUMPTION` movements linked back to the custom request.

## Customer tracking

Signed-in customers can track their requests at:

```text
/account/custom-bouquets
```

A request submitted while signed in is attached to that customer account.

If a guest submits a custom request and later registers with the same normalized email, Group 9 links the unclaimed request to the new customer record, matching the existing guest-order linking behavior.

## Seed data

The seed now creates workshop starter data for:

- pink, lavender, cream, yellow, and green yarn;
- floral wire;
- floral tape;
- kraft/pink/violet/clear wrapping;
- satin ribbon;
- Tulip, Rose, Daisy, and Sunflower builder stems;
- Classic, Kraft, Pink, Violet, and Premium wrapping;
- material recipes for all builder options;
- BOMs for existing made-to-order storefront variants.

Seed re-runs do not reset current raw-material stock on existing material records.

## Migration

Group 9 changes the Prisma schema.

After connecting PostgreSQL:

```bash
npm install
npm run db:generate
npm run db:migrate -- --name add-raw-materials-and-custom-bouquets
npm run db:seed
```

Review and commit the generated migration before production deployment.

## Deliberate next boundary

Custom bouquet requests are not automatically converted into Stripe orders yet because an approved custom design still needs confirmed fulfillment/delivery details.

A later workflow can convert an approved request into a payable custom order after CRJ confirms:

- final price;
- production lead time;
- delivery/pickup method;
- recipient delivery details.
