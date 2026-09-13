# Monthly data-center contract

This is a **provider-delivered local snapshot contract**, not a Google
connection contract. The enterprise owner does not configure API credentials,
OAuth, service accounts, GA4 properties, or GSC properties in Opsy. If no valid
package exists, report `not_delivered`. Product may continue from merchant and
sales evidence. Blog `data_backed` selection requires valid `gsc_queries` and
`ga4_landing_pages` snapshots. A valid empty/not-yet-populated manifest plus
accepted, language/scope-matched Blog FAQ questions permits `faq_seeded`
cold-start selection and drafting, with no numeric demand claims. Return
`scoring_blocked` for an invalid manifest or when neither source lane qualifies;
follow [blog-package-contract.md](blog-package-contract.md).

## Layout

Use:

```text
<workspace>/data-center/
  manifest.json
  gsc_queries.csv
  gsc_pages.csv
  gsc_query_page.csv
  ga4_channels.csv
  ga4_landing_pages.csv
  ga4_direct_unassigned_quality.csv
  ga4_effective_channels.csv
  ads_keyword_planner.csv
  gsc_not_found.csv                  # optional
  archive/YYYY-MM/
```

Only files listed by the manifest are active datasets. Not every named example is required.

## Manifest

Require:

```json
{
  "schema_version": "data-center-manifest-v1",
  "datasets": {
    "gsc_queries": {
      "path": "gsc_queries.csv",
      "archive_path": "archive/2026-06/gsc_queries.csv",
      "source_channel": "delivery channel and source",
      "scope": "property or account scope",
      "date_range": {
        "start_date": "2026-06-01",
        "end_date": "2026-06-30"
      },
      "timezone": "Asia/Shanghai",
      "pulled_at": "2026-07-11T03:01:08+08:00",
      "row_count": 145,
      "columns": ["clicks", "ctr", "impressions", "position", "query"]
    }
  },
  "updated_at": "2026-07-11T03:01:08+08:00"
}
```

Each dataset path must be relative and remain inside `data-center/`. A dataset
may declare an optional `header_row` (positive integer, default `1`) when the
provider export keeps title or caliber-note lines above the real header; it
counts non-empty CSV lines, and rows above it are ignored by validation and
summaries. Validate:

- schema and dataset object;
- file existence;
- UTF-8 CSV readability;
- manifest-declared headers as an ordered leading set at `header_row`;
- data-row count;
- ISO dates and `start_date <= end_date`;
- non-empty timezone, source, and scope;
- ISO `pulled_at`;
- optional archive-path safety and existence.

Treat a missing archive copy as a warning when the active dataset is otherwise valid. Additional trailing CSV columns are also a warning so monthly exports can add dynamic fields without blocking the core contract. Treat path escape, missing active file, missing/reordered declared headers, or row-count mismatch as an error.

## Derived Product/Blog keyword queue

`keyword-suggestions-YYYY-MM.csv` is a derived operating artifact under
`outputs/monthly/`; it is not an active manifest dataset and must not be copied
back into `data-center/`. Generate it from a valid `gsc_queries` dataset with:

```text
node <skill-root>/scripts/opsy.mjs suggest-keywords --project <project-root>
```

Required GSC columns are `query`, `clicks`, `ctr`, `impressions`, and
`position`. When present, `gsc_query_page` maps a query to its strongest owned
page. `ga4_landing_pages` adds landing sessions and engaged sessions; it is
required before a queue row can enter Blog, though Product may use a GSC-only
row with the GA4 gap disclosed.

Stable output columns are:

```text
query,route_hint,suggested_action,evidence_reason,owned_page,owned_surface,
clicks,impressions,ctr,position,ga4_sessions,ga4_engaged_sessions,
evidence_refs,source_period,selection_status,merchant_decision
```

`route_hint` is triage, not topic approval. Owned Product/Collection demand is
routed to Product; owned Blog demand is routed to Blog updates; existing Page
or Home intent is protected for review; question-like unowned demand may be
routed to Blog. Ambiguous demand remains `review`. Product and Blog treat this
file as the first content-selection step when a snapshot exists; the merchant
confirms at most three rows onto the package topic queue described in
[merchant-selection-contract.md](merchant-selection-contract.md).

## Provider-delivered inquiry analysis datasets

The merchant does not summarize inquiries alone. When the provider's weekly or
monthly inquiry review is delivered, its CSV tables enter the same manifest as
datasets whose names start with `inquiry_`. Suggested names follow the
provider report: `inquiry_notes`（口径说明）, `inquiry_channels`（渠道汇总）,
`inquiry_funnel`（核心漏斗）, `inquiry_countries`（国家转化）,
`inquiry_cta`（CTA 明细）, and `inquiry_compare`（服务方同期对比）. All are
optional; columns may be Chinese and follow the delivery caliber, and exports
with title lines use `header_row`.

Rules:

- Caliber interpretation belongs to the delivery notes（口径说明）; do not
  reinterpret thresholds or de-duplication rules locally.
- Contact clicks and intent events are never real inquiries; the real-inquiry
  stage stays pending until sales or support reports back.
- `summarize-data` renders each `inquiry_*` dataset as a bounded preview (at
  most 8 rows × 6 columns). Answer detail questions by targeted lookups in the
  active file, not by loading whole tables into the conversation.

## History comparison (bounded)

`summarize-data` computes the only supported history comparison: headline GSC
click/impression and GA4 session deltas against each dataset's `archive_path`
snapshot, plus at most five query movers. A provider-delivered
`inquiry_compare` dataset is used as-is. Never read full `archive/` files into
the conversation, and never estimate missing history.

An `archive_path` alone does not establish comparability. Its dataset entry
must also carry `archive_metadata` with the previous snapshot's `scope`,
`timezone`, `source_channel`, `filter_signature` when filtered, `date_range`,
`pulled_at`, `columns`, `row_count`, and `header_row` when needed. Scope,
timezone, source and filter must match the active snapshot; periods must be
non-overlapping with equal day counts. Missing/mismatched metadata yields an
explicit non-comparable result. Unequal calendar months need provider-normalized
comparison evidence; the helper does not silently normalize them.

Missing metric columns remain `Unavailable`; blank, invalid or negative
values in supplied standard metric columns fail validation. A GA4 user total
across channel rows is labelled as a non-deduplicated row sum. Query changes
include disappeared/new rows as zero only if both snapshots declare
`row_coverage: complete`; otherwise compare shared rows and disclose coverage.
Inquiry-only reports still retain their actual period, timezone, path, scope,
source channel and extraction time.

Local summary, keyword, agency queue and 404 output commands preserve existing
files. Choose a new `--output` path for a revision; do not overwrite previous
evidence. Final analysis uses the report and handoff contract in
[result-handoff-contract.md](result-handoff-contract.md).

## Optional 404 data

`gsc_not_found.csv` follows the same manifest rules. Prefer columns such as:

```text
path,status,source,last_seen,impressions,clicks
```

Accept `url` or `page` as the candidate field when `path` is absent. The file supplies candidates only; it does not authorize redirects.

## Freshness

Always display the dataset date range and `pulled_at`. If standard datasets cover different periods, disclose the mismatch. Use comparison language only when a compatible earlier snapshot exists.
