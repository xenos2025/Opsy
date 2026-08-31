# Runtime contract: merchant-operated B2B

Use this contract at the start of every Opsy session.

## Fixed product boundary

- Business model: `b2b_inquiry` only. Route checkout-led stores to Opsy DTC.
- Operator: enterprise owner, sales, or basic operations; do not assume an in-house developer or analyst.
- Google data: `delivered_snapshots_only`. Opsy never asks the merchant to create Google credentials, authorize GA4/GSC, or run a live Google query.
- Technical foundation work is not part of Opsy. Do not offer Tracking, Core Web Vitals, structured-data acceptance, crawl/indexation audits, or implementation reports.
- Shopify mutations still use the Store channel and the approval/readback contract in [safety-and-approvals.md](safety-and-approvals.md).

## Session order

1. Run `status` and confirm the project, workspace, and store.
2. Read `data_access`, `store_role`, `merchant_context`, `buyer_faq`,
   `blog_data_center`, `blog_topic_sources`, and the selected
   `write_capabilities` entry.
3. Offer only the choices returned by the helper.
4. Load only the selected workflow reference.
5. Keep unknown commercial or product facts unresolved; do not fill them with analytics or model inference.
6. End with exactly three concrete actions when the operator asks what to do next.

Runtime reads FAQ validation status and selector outputs, not raw FAQ answers.
Use `select-faq` for Product or Blog scope, preserve returned `faq_ref` values,
and pass the selected rows to the relevant workflow. `faq-selection-v1` is a
temporary result and never becomes another workspace file.

## Evidence lanes

| Lane | Allowed use |
| --- | --- |
| Merchant or sales answers | Business profile, product facts, buyer questions, objections, commercial boundaries |
| Buyer FAQ evidence | Accepted, scope/language-matched questions may shape Product/Blog work; only independently eligible answers become public facts; questions may expand data-backed Blog clusters or seed explicitly non-numeric cold-start topics |
| Shopify readback | Store objects, current content, publications, definitions, and post-write verification |
| Provider-delivered local package | Optional GA4/GSC or agency evidence already placed in the workspace |
| Public storefront | Verify a named URL or buyer-visible result; not a technical site audit |

A missing delivered data package does not block Product work. Blog prefers a
valid local `data-center` with `gsc_queries` and `ga4_landing_pages`. When the
manifest is valid but those datasets do not exist yet, accepted Blog FAQ questions
may open the `faq_seeded` cold-start lane. This lane is non-numeric and must not
claim observed search demand. If neither data-backed nor FAQ-seeded evidence is
usable, return `scoring_blocked` and offer provider-data import, validation, or
FAQ confirmation.

## Stop conditions

Stop or keep the work local when the store identity differs, the business model is unsupported, the relevant owner facts are missing, a source is not named, Shopify write capability is false, or approval/readback evidence is absent.
