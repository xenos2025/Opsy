# Workflow: 商品运营

## Intake

Prefer:

1. images or videos sent in chat plus basic facts;
2. `<workspace>/inbox/products/<batch>/<candidate>/`;
3. optional Excel or CSV for batch supplements.

Stage chat attachments in the product inbox before processing. Never require JSON from the operator.

Ask for missing facts one at a time. At minimum verify:

- product title and target language;
- product type or category;
- vendor or brand;
- factual description and B2B inquiry CTA;
- options, values, SKU, price, and availability facts when applicable;
- media ownership and product assignment;
- SEO title/description when supplied or approved;
- existing metafield values to fill.

Do not infer technical specifications, certifications, materials, dimensions, MOQ, lead time, pricing, or claims from images alone.

## Group media

Auto-group only when the input clearly represents one product. When several candidates or ambiguous files exist, show the proposed groups and ask the operator to confirm. Visual similarity is not sufficient evidence.

## Build a queue

Validate each candidate independently. Mark it:

- `passed`;
- `needs_input`;
- `blocked`;
- `excluded`.

Show item-level errors. Let the operator choose only `passed` items for draft creation; one failed item must not block unrelated passed items.

## Metafields

Read current definitions for the correct owner type. Match namespace, key, type, and validations before preparing values. Omit and hand off any field with a missing or incompatible definition. Never create, update, pin, migrate, or delete a definition.

Read the current metafield value and use its `compareDigest` for updates. Use explicit `null` only when the approved intent is create-if-absent. Run the `metafields-set` variable guard before approval and the matching response check after execution.

## Create new products

1. Save the local product package and field preview.
2. Prepare variables with `status: DRAFT` and pass the `product-create-draft` guard.
3. Ask Approval A for the exact selected candidates.
4. Execute `assets/graphql/product-create-draft.graphql`, pass the matching response check, then read each product back with the core `product-readback.graphql`. If media was supplied, validate the extra media-read scopes, then use `product-media-readback.graphql` to verify asynchronous media state.
5. Prepare and guard the exact activation (`product-activate`) and publication (`publishable-publish`) variables, then ask Approval B for those status and publication targets.
6. Execute only the approved operations, check each response under its own operation name, and read back status and publications.

Approval A never authorizes Approval B.

## Update an existing product

Read and back up the current product. Show a field-level diff, including tags, SEO, handle, media, variants, and metafield values. Keep activation separate. Pass the `product-update` variable guard, obtain approval for the exact diff, execute, pass the matching response check, read back, and add old paths to 404 handling when a handle changes.
