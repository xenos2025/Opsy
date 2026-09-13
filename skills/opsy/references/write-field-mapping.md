# Product and Blog write fields

Basis: official Shopify Admin GraphQL validation and documentation, 2026-09-13,
Asia/Shanghai; templates target `2026-07`. Recheck the current schema before
live execution. All helpers below are bundled with Opsy and use Node built-ins.

## Product

| Package field | Write | Readback |
| --- | --- | --- |
| title, handle, descriptionHtml, vendor, productType, tags, seo | matching ProductCreateInput/ProductUpdateInput fields | product-readback.graphql |
| variant.sku | productVariantsBulkUpdate → variants[0].inventoryItem.sku | variants.nodes[0].sku |
| confirmed variant.price | productVariantsBulkUpdate → variants[0].price | variants.nodes[0].price |
| media[].src | create media originalSource, mediaContentType IMAGE, alt | product-media-readback.graphql; processing must finish |
| verified metafield values | existing definitions + metafields-set with compareDigest | product-readback.graphql |
| status / publication targets | separate product-activate / publishable-publish | status plus product-publication-readback.graphql |

Create the draft with ProductCreateInput fields only. SKU/price do not belong
in that input. Read the created product, then prepare its **single existing
variant**; multiple variants stay blocked for this lane.

```text
node <skill-root>/scripts/opsy.mjs prepare-product-variant --project <project-root> --file <package.json> --readback <product-readback.json> --output outputs/writes/variant-r1.json --apply --json
```

The output is guarded variables for `product-variant-update.graphql`. It sets
only SKU and an optional confirmed price; inventory quantity, price inference,
and variant creation remain outside this operation. For a minimal draft with
no confirmed SKU, skip this operation and retain the SKU supplement.

Read back after execution and run:

```text
node <skill-root>/scripts/opsy.mjs verify-write-fields --surface product --file <package.json> --readback <product-readback.json> --json
```

Preserve the original local `media[].path` when adding the uploaded `src` so
the intake binding still points to the reviewed image. Use only a ready
receipt from [workflow-image-upload.md](workflow-image-upload.md); never send
a local filesystem path as `originalSource`. Collections use the supported
collection fields on Product inputs; verify membership separately when changed.

## Blog

Map `article.bodyHtml` to Shopify's `article.body`; map title, handle, summary,
tags, author, blogId and image to the current Article input. Article input has
no direct `seoTitle`/`metaDescription` fields. The supported mapping is:

| Package field | Metafield namespace/key | Type |
| --- | --- | --- |
| article.seoTitle | global.title_tag | single_line_text_field |
| article.metaDescription | global.description_tag | single_line_text_field |

Use `article-readback.graphql`, which reads both aliases and `compareDigest`.
An explicit null allows create-if-absent; an omitted alias is insufficient.
Prepare the guarded `metafields-set` variables:

```text
node <skill-root>/scripts/opsy.mjs prepare-article-seo --project <project-root> --file <package.json> --readback <article-readback.json> --output outputs/writes/article-seo-r1.json --apply --json
node <skill-root>/scripts/opsy.mjs verify-write-fields --surface blog --file <package.json> --readback <post-write-article.json> --json
```

These are Shopify's special SEO fields. This mapping does not authorize new
custom definitions or changes to existing metafield definitions.

The preparation commands only create local variables. Obtain exact-operation
approval before each unapproved variant, SEO, or image write. Draft creation
approval alone does not authorize these additional writes. Keep publication
Approval B after draft readback and package validation. A successful narrow
field check does not prove body, image, storefront, or publication acceptance;
verify every approved field and record remaining work per object.

## Sources

- [Storefront SEO and special fields](https://shopify.dev/docs/apps/build/marketing/optimize-storefront-seo)
- [ProductVariantsBulkUpdate](https://shopify.dev/docs/api/admin-graphql/2026-07/mutations/productVariantsBulkUpdate)
- [ProductVariantsBulkInput](https://shopify.dev/docs/api/admin-graphql/2026-07/input-objects/ProductVariantsBulkInput)
