# Workflow: 导入服务方数据 / 查看已有摘要

Opsy never obtains Google credentials or queries GA4/GSC for the enterprise
owner. This workflow only accepts a provider-delivered local package already
placed in the workspace, or reads an existing validated snapshot.

## State the data basis

Before any answer, show:

- active manifest path;
- dataset date range;
- timezone;
- `pulled_at` or delivery time;
- whether the requested metric exists;
- whether a comparison snapshot exists.

Never describe a monthly snapshot as real-time Google data. Never offer OAuth,
API setup, Property ID entry, or an “update from Google” button.

## Update from a local package

Inspect the package first. Require a compatible `manifest.json` and referenced files. Preview files to archive, replace, and add. After approval:

1. archive the current affected files under `data-center/archive/YYYY-MM/`;
2. copy only the approved package files;
3. validate paths, columns, row counts, date ranges, timezone, and timestamps;
4. stop and preserve evidence if validation fails.

Never copy credentials or unrelated files from the package.

## Validate and summarize

Run:

```text
node <skill-root>/scripts/opsy.mjs validate-data --project <project-root> --json
node <skill-root>/scripts/opsy.mjs summarize-data --project <project-root>
node <skill-root>/scripts/opsy.mjs suggest-keywords --project <project-root>
```

All three commands read local files and preview without changing them. The second previews a
one-page summary. The third previews a Product/Blog suggestion queue derived
from observed GSC demand and GA4 landing-page support. Product can use a
GSC-only queue with a disclosed gap; Blog handoff requires valid
`ga4_landing_pages`. Add `--apply`
only after confirming each output path.

The summary contains:

- reporting period and freshness;
- available GSC and GA4 headline metrics;
- strongest observable queries, pages, or channels;
- bounded previews of provider-delivered `inquiry_*` analysis datasets when
  present, otherwise explicit inquiry evidence when a relevant field exists;
- at most three operational prompts;
- a bounded history comparison against archived snapshots when readable.

## Inquiry analysis is provider-delivered

The merchant is not asked to summarize inquiries. The provider's weekly or
monthly inquiry review arrives as `inquiry_*` datasets under the manifest (see
[data-contract.md](data-contract.md)). Explain results using the delivered
caliber notes; contact clicks and intent events are never real inquiries, and
the real-inquiry stage stays pending until sales or support reports back.
Answer detail questions with targeted lookups in the active files; do not load
whole inquiry tables or the raw report into the conversation.

## History comparison stays bounded

Use only the `历史对比（有界）` section produced by `summarize-data`, or a
provider-delivered `inquiry_compare` dataset. Never read full
`data-center/archive/` files into the conversation, and never estimate missing
history. If no readable archive exists, say so and continue without a
comparison.

The keyword queue is saved, when approved, as:

```text
<workspace>/outputs/monthly/keyword-suggestions-YYYY-MM.csv
```

It records the observed query, `route_hint` (`product`, `blog`, or `review`),
suggested action, owned page/surface, GSC metrics, joined GA4 landing
metrics, evidence references, source period, and merchant decision fields.
GSC supplies demand evidence. GA4 only describes how an already-owned landing
page was used. Neither source proves product capability, certification,
commercial terms, or buyer outcome. Ads planner data is not required.

Every row starts as `selection_status: suggested`. Product and Blog treat this
preview as their first content-selection step when a snapshot exists: the
merchant confirms at most three rows onto the package topic queue in
[merchant-selection-contract.md](merchant-selection-contract.md). They must
still check store fit, duplication, claim evidence, and buyer decision.
Generating the queue never authorizes content creation or a Shopify write.

After a successful update, refresh the read-only 404 queue. Read [data-contract.md](data-contract.md) for the exact manifest contract.

## Natural-language questions

Answer from the active files only. Cite the dataset and date range in the response. If the needed field is unavailable, say so and name the safest next data input; do not estimate.
