# Monthly data-center contract

This is a **provider-delivered local snapshot contract**, not a Google
connection contract. The enterprise owner does not configure API credentials,
OAuth, service accounts, GA4 properties, or GSC properties in Opsy. If no valid
package exists, report `not_delivered`. Product may continue from merchant and
sales evidence. Blog must return `scoring_blocked` until valid
`gsc_queries` and `ga4_landing_pages` snapshots are delivered.

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

Each dataset path must be relative and remain inside `data-center/`. Validate:

- schema and dataset object;
- file existence;
- UTF-8 CSV readability;
- manifest-declared headers as an ordered leading set;
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
routed to Blog. Ambiguous demand remains `review`.

## Optional 404 data

`gsc_not_found.csv` follows the same manifest rules. Prefer columns such as:

```text
path,status,source,last_seen,impressions,clicks
```

Accept `url` or `page` as the candidate field when `path` is absent. The file supplies candidates only; it does not authorize redirects.

## Freshness

Always display the dataset date range and `pulled_at`. If standard datasets cover different periods, disclose the mismatch. Use comparison language only when a compatible earlier snapshot exists.
