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

## Product references and media correspondence

Every image, including non-product illustrations, needs an
`article.mediaMappings` row with `location` (`featured` or one-based
`inline:1`, `inline:2`, ...), exact `url`, exact `alt`, retained `sourceRef`,
`rightsConfirmed` and `relevanceConfirmed`. Confirm relevance against the
actual image and intended content; never set these flags just to pass a gate.
Use ordinary explicit `src` images. `srcset`/lazy alternate sources must be
resolved into one reviewed source before writing this package.

For every named product add `article.productReferences: [{id, handle, url}]`.
Record the Shopify GID (or an independently verified stable product identifier),
exact public HTTPS product URL on this store, and handle. Verify the URL with a
supported read-only source. Body links use `<a data-product-id="<id>"
href="<exact-url>">Product name</a>` and appear in `article.internalLinks`.
`product_roundup` requires at least one such named product. Do not relabel a
named-product article as generic to avoid this gate.

Retain independent evidence in a customer-local file:

```json
{
  "schema_version": "opsy-product-evidence-v1",
  "method": "Supported readback plus public product URL verification",
  "observedAt": "2026-09-11T08:00:00Z",
  "products": [{
    "id": "gid://shopify/Product/123",
    "handle": "example-component",
    "url": "https://example.com/products/example-component",
    "sourceRef": "inbox/products/readback.json#product-123",
    "media": [{
      "id": "media-123",
      "url": "https://example.com/images/component.jpg",
      "sourceRef": "inbox/products/readback.json#media-123"
    }]
  }]
}
```

The example is synthetic, not a real verified store. Capture only fields
actually returned by the supported reader, and retain the source readback.
Do not invent a product or media ID from an image filename. Before using
Shopify API/CLI fields, verify the current official schema/help and available
scopes; this feature does not add or change any Shopify query or mutation.

The package adds `productEvidence: {path, fingerprint}` with a workspace-relative
evidence path and `fingerprint(evidence)` from `product-intake.mjs`. The agent
builds these records; the operator never writes JSON. Package validation loads
the retained file and compares the evidence fingerprint, product/handle/URL,
and product-media membership. Each product mapping additionally has `productId`
and `mediaId`; its `sourceRef` equals the matched evidence media source. Inline
product `<img>` tags carry the same `data-product-id`. A product must have a
corresponding mapped image; all body product links must be mapped. An orphan,
swapped product image or mismatched body mapping fails validation.

The evidence fingerprint is a freshness/linkage check, not independent proof
that a page was visited or that a photograph shows the correct item. Agent and
operator visual/semantic review remain required. Do not claim real-store
acceptance from synthetic tests. Existing packages without mappings remain
reviewable locally, with `needs_media`; they need mappings before a new write.

Internal links and the approved CTA must actually occur in the body; declaring
them only in package metadata is insufficient. Keep the CTA label configured
in the profile, and verify its destination during scene intake.

## Deterministic gate

For a local review:

```text
node <skill-root>/scripts/opsy.mjs validate-blog-package --project <project-root> --file <package.json> --mode review --json
```

Before Approval A, rerun with `--mode write`. Write mode requires one HTTPS
featured image, at least two HTTPS inline images with alt text, two verified
internal links, complete source/product media mappings, resolved confirmation
markers, and the approved CTA in the body. The
validator also cross-checks applied FAQ ids against accepted question status,
Blog-primary route, content language, scope, answer-conflict/quarantine state, and evidence
references; `faq_seeded` packages fail when any numeric search metric is
present. Answer text may enter the article only when that item also passes the
public answer gate. A passing package does not authorize a Shopify write.

Use [workflow-blog.md](workflow-blog.md) for the operating sequence, [workflow-blog-content.md](workflow-blog-content.md) for craft, and [workflow-buyer-decision.md](workflow-buyer-decision.md) for buyer usefulness.
