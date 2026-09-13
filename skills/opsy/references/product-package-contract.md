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
- `sourceFacts.topicQueue`, `sourceFacts.placement`, and
  `sourceFacts.audienceCard` from
  [merchant-selection-contract.md](merchant-selection-contract.md);
- an optional `mediaCaveat` only for a local draft with a known first-image gap.

## Imported material binding

New multi-source packages require `sourceFacts.intake: {path, candidateId,
fingerprint}` pointing to a retained `opsy-product-intake-v1` batch inside the
customer workspace. The helper loads that file and checks the candidate,
SKU, confirmed vendor/type/price, and exact media order. `fingerprint` is
`fingerprint(candidate)` from `product-intake.mjs` (SHA-256 of JSON serialization).
The agent computes it; it is not an operator input or a signature of approval.

Each intake candidate keeps `source`, `fields`, `sku`, `group`, `media`, and
`importErrors`. Confirmation requires:

- `confirmation.reviewer`, ISO `at`, retained `evidenceRef`, `grouping: true`;
- `confirmation.facts.<field>: {value, evidenceRef, authority:
  "merchant_confirmed"}` for every retained field, with exact value equality;
- each media row's `candidateId`, `assignmentConfirmed: true`,
  `rightsConfirmed: true`, and exactly one `primary: true`;
- `confirmation.inputFingerprint = fingerprint({fields, sku, group, media})`;
- `listingStrategy: separate_products` only when the merchant actually confirms
  separate products for multiple SKU rows sharing a group.

Unconfirmed fields can stay in the local intake; do not fake confirmation to
make a package pass. Resolve/remove an inapplicable field only with a retained
explanation. Record each used imported fact in `sourceFacts.factUses` with
`field`, exact `confirmedValue` and exact body `excerpt`; the helper checks
declared links, while the agent/operator still checks whether the prose really
means the confirmed fact. No static validator proves material or certification
truth. Supplier assertions and image appearance are not merchant confirmation.

Legacy manually prepared packages remain valid under the original source and
decision-brief contract. Never remove intake binding to bypass a failed import.

For lightweight audience/FAQ reuse, follow
[workflow-buyer-decision.md](workflow-buyer-decision.md) and retain
`sourceFacts.contentReuse`. It is buyer context, not Product claim evidence.

Before drafting, also retain the merchant topic queue, single-object
placement, and one confirmed `sourceFacts.audienceCard` from
[merchant-selection-contract.md](merchant-selection-contract.md). The topic
queue is the first Product content step: use `suggest-keywords` when a
snapshot exists, otherwise `merchant_materials` with a `nonUseReason`.

## Deterministic gate

Run:

```text
node <skill-root>/scripts/opsy.mjs validate-product-package --project <project-root> --file <package.json> --mode draft --json
```

Use `--mode public` only for the activation/publication preview. It requires `status: ACTIVE`, resolved confirmation markers, and a valid first overview image. A passing package does not authorize a Shopify write.

Use `--mode minimal` for the minimal-fill draft lane
(见 [workflow-products.md](workflow-products.md)). It keeps identity, evidence,
and safety checks blocking, moves completeness gaps to the report's
`supplements` array, and lists every defined-but-unfilled PRODUCT metafield as
a supplement. Show the supplements to the operator after draft creation and
resolve them before offering `--mode public`.

The validator blocks unsupported business role, unnamed evidence, ineligible
FAQ questions or answer reuse, unknown or legacy metafields, H1 in
`descriptionHtml`, missing buyer FAQ questions, hard-coded contact
routes, missing media/alt text, and unsafe public placeholders. An accepted
question may shape a PDP question, objection, or confirmation item; only an
`eligible` Product-primary answer may become a Product fact. Explicitly routed
supporting rows may guide objections, confirmation items, or internal links,
but do not own the answer. Product facts remain governed by
[workflow-products.md](workflow-products.md), content quality by
[workflow-product-content.md](workflow-product-content.md), and buyer usefulness
by [workflow-buyer-decision.md](workflow-buyer-decision.md).

A draft may have one FAQ when `sourceFacts.faqCaveat` explains the thin material;
the validator warns. Public mode always requires at least two. Neither a draft
FAQ caveat nor a passing package grants publication approval.
