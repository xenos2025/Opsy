# Workflow: 商品运营

Load [workflow-product-content.md](workflow-product-content.md) before writing
any buyer-visible description. A filled field set is not a usable PDP.

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

Do not infer technical specifications, certifications, materials, dimensions, MOQ, lead time, pricing, or claims from images alone. Use the unconfirmed-fact fallbacks in [workflow-product-content.md](workflow-product-content.md) instead of guessing.

## Load store role and seller voice

Before drafting any buyer-visible description, read
`<workspace>/config/store-profile.json` and confirm:

- `profile.store_role.status` is `ready`. If it is `blocked`, run store-role
  intake from [workflow-connection-profile.md](workflow-connection-profile.md);
  never assume the business model, audience, market, content language, or
  conversion goal.
- `profile.content_voice.status` is `ready`. If not, run voice intake from
  [workflow-blog-content.md](workflow-blog-content.md). The same seller role
  serves Blog and PDP.

Apply the expression order **buyer decision brief → store role and
content_voice → structure → `descriptionHtml`**. Record which role and voice
were applied in the product package. The status helper reports both gaps as
`write_capabilities.products.missing`.

## Name the product

Derive the title from evidence, not from a supplier folder name or a single
observed option:

1. List the evidence tokens you actually have: material or construction, form or
   type, and buyer application.
2. Draft 2–3 title candidates from those tokens.
3. Record the chosen title and a one-line reason in the package.
4. Align the handle and SEO title with the chosen title.

Avoid code-only titles, single generic category words, and brand-plus-synonym
stuffing. When a line has several colours, finishes, or options, keep the
individual option name out of the title, handle, and SEO title unless the
operator confirms it is a genuinely single-option SKU. Mention available options
only when the operator confirms them, and offer the option-list FAQ from
[workflow-product-content.md](workflow-product-content.md).

## Use delivered demand evidence

When the active monthly snapshot is valid, preview the shared queue:

```text
node <skill-root>/scripts/opsy.mjs suggest-keywords --project <project-root>
```

For Product work, consider only `route_hint: product` and relevant `review`
rows. Prefer strengthening the owned Product/Collection already mapped to the
query. Select at most three semantically relevant queries for one candidate,
record their `evidence_refs` and period, and ask the operator to confirm the
fit. Do not place a query into copy merely because it has impressions.

Keyword, GSC, and GA4 signals explain buyer demand; they never prove product
features, applications, certifications, availability, price, MOQ, lead time,
or outcomes. A selected query remains demand evidence in the product package.
Product claims still require verified product facts or merchant confirmation.

## Group media

Auto-group only when the input clearly represents one product. When several candidates or ambiguous files exist, show the proposed groups and ask the operator to confirm. Visual similarity is not sufficient evidence.

Then order the media honestly. The first position must be a front overview of
the product; a video, colour chip, extreme macro, label shot, or application
scene must not take it when a front overview exists. Never relabel a swatch or
detail crop as the front view — ask the operator which file it is. A candidate
without a front overview stays a draft and records the media gap. See
[workflow-product-content.md](workflow-product-content.md).

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

1. Prepare the shared PDP decision brief from
   [workflow-buyer-decision.md](workflow-buyer-decision.md). Translate facts
   into buyer value, record the main objection and fit/not-fit boundary, and
   keep unknown commercial terms unresolved.
2. Validate it with `validate-decision-brief --surface pdp`. Stop before
   Approval A unless all five checks return `pass`.
3. Write `descriptionHtml` through
   [workflow-product-content.md](workflow-product-content.md) and show the
   operator its pass/fix/blocked scorecard. Fix failures before building Shopify
   variables.
4. Save the local product package, decision brief, applied store role and voice,
   selected demand evidence, and field preview.
5. Prepare variables with `status: DRAFT` and pass the `product-create-draft` guard.
6. Ask Approval A for the exact selected candidates.
7. Execute `assets/graphql/product-create-draft.graphql`, pass the matching response check, then read each product back with the core `product-readback.graphql`. If media was supplied, validate the extra media-read scopes, then use `product-media-readback.graphql` to verify asynchronous media state.
8. Prepare and guard the exact activation (`product-activate`) and publication (`publishable-publish`) variables, then ask Approval B for those status and publication targets.
9. Execute only the approved operations, check each response under its own operation name, and read back status and publications.

Approval A never authorizes Approval B.

## Update an existing product

Read and back up the current product. Show a field-level diff, including tags, SEO, handle, media, variants, and metafield values. For a material buyer-visible description change, reload store role and `content_voice`, then prepare and pass the shared PDP decision brief and the [workflow-product-content.md](workflow-product-content.md) scorecard again. Keep activation separate. Pass the `product-update` variable guard, obtain approval for the exact diff, execute, pass the matching response check, read back, and add old paths to 404 handling when a handle changes.
