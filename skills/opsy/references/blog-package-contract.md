# Blog package contract

Use this contract for topic selection, drafting, update cooldown, and Shopify write readiness.

## Topic sources

Blog always inspects the local `data-center` and the accepted FAQ question-seed
pool before shortlisting.

- `topic.selectionMode: data_backed` requires `sourceBasis.mode` of
  `delivered_data` or `agency_handoff`, a valid manifest, usable `gsc_queries`
  and `ga4_landing_pages`, their window/timezone, and both dataset references.
  FAQ may expand or route a qualified cluster and break ties without changing
  numeric data ranks.
- `topic.selectionMode: faq_seeded` requires `sourceBasis.mode: faq_seeded`, a
  valid empty or not-yet-populated manifest, and at least one accepted,
  language/scope-matched Blog FAQ question. Its answer does not need to be
  publishable because the question and answer gates are separate. It is a
  cold-start editorial lane, not observed search demand, so `topic.metrics`
  stays empty.

A malformed manifest, invalid `buyer_faq.json`, or absence of both usable data
and accepted FAQ questions returns `scoring_blocked`. Opsy does not connect to
GA4/GSC.

## Package shape

Use `schema_version: opsy-blog-package-v1` and include:

- `sourceBasis` matching the chosen selection mode;
- `topic.selectionMode`, `primaryCluster`, `intentClass`, `articleFormat`,
  `selectionBasis`, `evidenceRefs`, a real `commercialTargetUrl`,
  `createOrUpdate`, and `duplicateCheck`;
- `topic.scopeKeys` for any product/product-family FAQ evidence;
- `topic.faqReview` with status (`applied`, `no_match`, or `not_available`),
  exact `itemIds`, selection `influence`, and rationale. Applied ids are also
  cited as `config/buyer_faq.json#<id>`;
- cooldown dates and an allowed exception when updating inside 28 days;
- a passing `buyerDecision` for surface `blog`;
- `article.title`, `handle`, `summary`, `bodyHtml`, `seoTitle`, `metaDescription`, `tags`, `featuredImage`, `internalLinks`, and the profile-approved `cta`.

Supported formats are `procurement_guide`, `comparison`, `application`, `technical`, `market_solution`, and `product_roundup`. Procurement, comparison, and technical formats need a decision-useful table.

## Deterministic gate

For a local review:

```text
node <skill-root>/scripts/opsy.mjs validate-blog-package --project <project-root> --file <package.json> --mode review --json
```

Before Approval A, rerun with `--mode write`. Write mode requires one HTTPS
featured image, at least two HTTPS inline images with alt text, two verified
internal links, resolved confirmation markers, and the approved CTA. The
validator also cross-checks applied FAQ ids against accepted question status,
Blog-primary route, content language, scope, answer-conflict/quarantine state, and evidence
references; `faq_seeded` packages fail when any numeric search metric is
present. Answer text may enter the article only when that item also passes the
public answer gate. A passing package does not authorize a Shopify write.

Use [workflow-blog.md](workflow-blog.md) for the operating sequence, [workflow-blog-content.md](workflow-blog-content.md) for craft, and [workflow-buyer-decision.md](workflow-buyer-decision.md) for buyer usefulness.
