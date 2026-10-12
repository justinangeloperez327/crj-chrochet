# Product media management

Group 18 replaces product-specific placeholder artwork with managed product photography while preserving the existing crochet artwork as a fallback when a product has no uploaded media.

## Storage

Product media uses Vercel Blob through `@vercel/blob`.

The application uses a public Blob store because product photography is public storefront content.

Uploads use immutable object names with `addRandomSuffix: true`. Existing blobs are never overwritten in place. Replacing an image means uploading a new blob and deleting the old media record/blob.

The upload route uses a one-year Blob cache lifetime because uploaded product objects are immutable.

## Authentication

All media mutations are handled by:

`/api/admin/product-media`

The route requires a valid application session with the ADMIN role.

Supported methods:

- POST: upload a new image and create ProductImage.
- PATCH: update alt text and persist gallery order.
- DELETE: remove ProductImage, compact the remaining order, and delete the Blob object.

The browser never receives Blob write credentials.

## Vercel authentication

Current Vercel-connected Blob projects can use project OIDC authentication automatically when supported by the connected store and SDK.

For local development or older token-based Blob stores, `BLOB_READ_WRITE_TOKEN` remains supported through the Blob SDK.

The application dependency is pinned to `@vercel/blob@2.6.1`.

## Upload rules

Each product supports at most 8 images.

Each image must be no larger than 4 MB.

Allowed MIME types:

- image/jpeg
- image/png
- image/webp
- image/avif

The API validates product ownership/context server-side and does not trust client-provided URLs.

Uploaded paths are grouped under:

`products/<product-slug>/...`

The original filename is sanitized and Vercel Blob adds a random suffix.

## Failure handling

Upload order is:

1. validate admin, product, file type, size, and image count;
2. upload Blob object;
3. create ProductImage;
4. revalidate storefront/admin paths.

If ProductImage persistence fails after the Blob upload, the just-created Blob object is deleted as cleanup.

Delete order is:

1. remove ProductImage from the database;
2. compact remaining sortOrder values;
3. delete the Blob URL.

If Blob deletion fails after the database update, the storefront remains correct and the failure is logged. This can leave an orphan Blob object, which is preferable to leaving a storefront database row pointing to missing media.

## Existing ProductImage model

Group 18 reuses the existing Prisma ProductImage model:

- id
- productId
- url
- altText
- sortOrder
- createdAt

No additional storage pathname field is needed because Vercel Blob deletion accepts a Blob URL directly.

No Prisma schema change is required for Group 18.

## Ordering and primary image

ProductImage rows are ordered by `sortOrder`.

The first row is the primary image.

Admin media controls support:

- upload;
- edit alt text;
- make primary;
- move earlier;
- move later;
- delete.

PATCH persistence normalizes sort order to increments of 10.

Deleting an image compacts the remaining order to the same normalized sequence.

## Storefront usage

The shared Product catalog shape now exposes ordered media.

Real product media is used by:

- product cards;
- collection cards;
- homepage collection cards;
- product detail gallery;
- admin product table thumbnails;
- basket line items for newly added products;
- checkout summary for newly added products.

When a product has no uploaded image, the existing BloomArtwork component remains the fallback.

Older browser carts that were saved before Group 18 do not contain image URLs. They remain valid and use the existing fallback artwork.

## Product detail gallery

The product page uses the first media item as the initial large image.

Additional images render as selectable thumbnails.

When there are no uploaded images, the original generated crochet artwork composition remains visible.

## SEO

When a product has a primary image, product metadata adds that image to:

- Open Graph images;
- Twitter summary-large-image metadata.

The primary image therefore follows the same ordering controlled from the admin media manager.

## Next.js image delivery

The Next.js image configuration permits HTTPS images from public Vercel Blob hostnames.

Storefront and admin media use `next/image` for responsive loading and layout stability.

## Cart persistence

CartLine now optionally stores:

- imageUrl
- imageAlt

ProductCard and ProductPurchasePanel capture the primary image at add-to-cart time.

The fields are optional so carts saved before Group 18 remain backward-compatible.

## Environment

The example environment file documents:

`BLOB_READ_WRITE_TOKEN`

This is optional for Vercel OIDC-connected deployments but useful for local development and older token-based Blob stores.

## Deployment setup

Before uploading product media in a deployed environment:

1. create/connect a Public Vercel Blob store to the project;
2. use OIDC authentication when available, or ensure BLOB_READ_WRITE_TOKEN is available;
3. deploy with `@vercel/blob` installed;
4. open a product in Admin and upload the first image.

No database migration is required specifically for Group 18 because ProductImage already existed.
