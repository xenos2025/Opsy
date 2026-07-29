# Monthly data-center contract

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

## Optional 404 data

`gsc_not_found.csv` follows the same manifest rules. Prefer columns such as:

```text
path,status,source,last_seen,impressions,clicks
```

Accept `url` or `page` as the candidate field when `path` is absent. The file supplies candidates only; it does not authorize redirects.

## Freshness

Always display the dataset date range and `pulled_at`. If standard datasets cover different periods, disclose the mismatch. Use comparison language only when a compatible earlier snapshot exists.
