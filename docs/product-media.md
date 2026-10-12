# Product photography

Upload and manage photographs on the product's admin page. Each product supports up to eight images; reorder them and provide useful alternative text for accessibility.

Uploads require administrator authorization and a same-origin request. JPEG, PNG, WebP and AVIF are supported with a maximum size of 4 MB per image. The server checks declared type and file signatures before uploading to Vercel Blob.

Deleting an image removes its database reference and attempts Blob cleanup. A reported storage cleanup failure requires operator follow-up. An illustration is used when a real product has no photographs; production never substitutes a demo product.

Configure Blob access before uploading. See [deployment](deployment.md) for environment requirements.
