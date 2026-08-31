# Product package contract

Use this contract for every new or materially revised Product before Shopify variables are built.

## Entry modes

1. **Merchant materials** — supplier notes, images, spreadsheets, chat answers, and sales confirmation. This is the default and requires no analytics.
2. **Delivered data** — an optional provider-delivered local package may help prioritize an existing surface. It never proves product facts.

`sourceFacts.sourceBasis.mode` must be `merchant_materials`, `merchant_directed`, `sales_questions`, `delivered_data`, or `agency_handoff`. Live Google modes are invalid. Always name source references; delivered data also names its date window and timezone.

## Package shape

Use `schema_version: opsy-product-package-v1` and include:

- Shopify fields: `title`, `handle`, `vendor`, `status`, `productType`, `descriptionHtml`, `seo`, `tags`, `collections`, `variant`, `metafields`, and `media`;
- `sourceFacts.sourceBasis` with mode and references;
- `sourceFacts.scopeKeys` plus `sourceFacts.faqReview` with status, exact
  `itemIds`, use labels, and rationale. Applied items are cited as
  `config/buyer_faq.json#<id>`;
- 2–3 evidence-based `titleCandidates` plus the selected `titleChoice`;
- a passing `sourceFacts.decisionBrief` for surface `pdp`;
- an optional `mediaCaveat` only for a local draft with a known first-image gap.

## Deterministic gate

Run:

```text
node <skill-root>/scripts/opsy.mjs validate-product-package --project <project-root> --file <package.json> --mode draft --json
```

Use `--mode public` only for the activation/publication preview. It requires `status: ACTIVE`, resolved confirmation markers, and a valid first overview image. A passing package does not authorize a Shopify write.

The validator blocks unsupported business role, unnamed evidence, ineligible
FAQ questions or answer reuse, unknown or legacy metafields, H1 in
`descriptionHtml`, fewer than two buyer FAQ questions, hard-coded contact
routes, missing media/alt text, and unsafe public placeholders. An accepted
question may shape a PDP question, objection, or confirmation item; only an
`eligible` Product-primary answer may become a Product fact. Explicitly routed
supporting rows may guide objections, confirmation items, or internal links,
but do not own the answer. Product facts remain governed by
[workflow-products.md](workflow-products.md), content quality by
[workflow-product-content.md](workflow-product-content.md), and buyer usefulness
by [workflow-buyer-decision.md](workflow-buyer-decision.md).
