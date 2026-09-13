# Merchant selection contract

This is the merchant-facing substitute for agency keyword scoring, the
sitewide embedding workbook, and the Foundation audience library. It does not
add a fifth project config file, a KD scorer, or Google API access.

Use it before drafting Product or Blog copy. The agent writes the records;
the operator confirms in plain language.

## 1. Topic queue

Run this as the first Product/Blog content step, not an optional side path.

```text
node <skill-root>/scripts/opsy.mjs suggest-keywords --project <project-root> --json
node <skill-root>/scripts/opsy.mjs suggest-faq-topics --project <project-root> --json
```

Record `opsy-topic-queue-v1` on the package (`topicQueue` for Blog,
`sourceFacts.topicQueue` for Product):

- `source`: `suggest-keywords`, `suggest-faq-topics`, or `merchant_materials`;
- `sourcePath` when a retained queue or FAQ file exists;
- `period` for a data-backed window;
- `selectionMode`: `data_backed`, `faq_seeded`, or `merchant_materials`;
- `merchantConfirmed: true` and an ISO `confirmedAt`;
- one to three `rows` when a queue exists, each with `query`, `route_hint`,
  `owned_page` when known, `evidence_refs`, `source_period`, and
  `selection_status: selected`.

Rules:

- Blog `data_backed` uses `suggest-keywords`. Keep `route_hint: blog` or
  `review`. Do not consume `route_hint: product` as a new article.
- Blog `faq_seeded` uses `suggest-faq-topics` only. Label the shortlist
  **FAQ-seeded / no observed search-demand score**. Rows must not carry
  impressions, clicks, CTR, position, KD, opportunity score, or GA4 sessions.
- Product may use `suggest-keywords` with `route_hint: product` or `review`.
  When no delivered snapshot exists, use `merchant_materials`, empty `rows`,
  and a `nonUseReason`. Product work continues from confirmed materials.
- `route_hint` is triage. The merchant still confirms each selected row.
- Demand evidence never proves a product fact.

## 2. Single-object placement

Each Product or Blog package records `opsy-placement-v1` (`placement` /
`sourceFacts.placement`):

- `primary.query` plus `carriers` (`title`, `seo_title`, `seo_description`,
  `h2`, `body`, `alt`);
- optional `secondary` rows, at most two;
- `doNotOccupy` owned URLs that must not receive this query, or an
  `occupiedReason` when the current snapshot has no colliding URL;
- `evidenceRefs` to the confirmed queue, FAQ seed, or merchant material.

This is placement for one product or one article. It is not a sitewide
embedding workbook and does not write Home, solution, or collection SEO in
batch.

The validator checks that each query actually appears in the named carriers,
that the package URL is not listed in `doNotOccupy`, and that a data-backed
or FAQ-seeded primary query matches a confirmed queue row. Cold-start
packages still cannot invent search metrics.

## 3. Confirmed audience card

Questionnaire intake may contain several audiences. Drafting requires exactly
one confirmed card. Promote only the summary to
`profile.store_role.primary_audience`, `secondary_audiences`,
`audience_status`, and `audience_intake_path`. Keep dated detail under
`inbox/profile/`. Do not create an audience library, `audience_context.json`,
or create/merge/restore operations.

```text
node <skill-root>/scripts/opsy.mjs select-content-context --project <root> --surface blog --job comparison --scope <ref> --market <market> --language <code> --card <audience-id> --json
```

Omit `--card` only when exactly one confirmed card matches. Multiple matches
stay `needs_input`. A store with no intake file may use the implicit
`profile-primary` card when `audience_status` is `merchant_confirmed` or
`data_revised`.

Save the chosen card as `audienceCard` (Blog) or `sourceFacts.audienceCard`
(Product): `id`, `source` (`profile` or `intake`), `label`, `market`, and
`language`. The card is buyer context, not product-claim evidence.

See [workflow-buyer-decision.md](workflow-buyer-decision.md),
[data-contract.md](data-contract.md), and
[audience-intake-contract.md](audience-intake-contract.md).
