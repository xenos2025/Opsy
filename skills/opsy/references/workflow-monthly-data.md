# Workflow: 上月数据查询 / 数据更新

## State the data basis

Before any answer, show:

- active manifest path;
- dataset date range;
- timezone;
- `pulled_at` or delivery time;
- whether the requested metric exists;
- whether a comparison snapshot exists.

Never describe a monthly snapshot as real-time Google data.

## Update from Git

For a repository project:

1. Run read-only status and fetch.
2. Preview incoming commits and changed paths.
3. Stop if the worktree is dirty or the update is not fast-forward.
4. Disclose theme, config, rule, Skill, or other non-data changes separately.
5. Ask approval for the exact fast-forward update.
6. Pull without stash, reset, force, or automatic merge.
7. Validate the active manifest and datasets.

Do not reduce a repository update to a blind `git pull`.

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

All three commands preview without changing files. The second previews a
one-page summary. The third previews a Product/Blog suggestion queue derived
from observed GSC demand and optional GA4 landing-page support. Add `--apply`
only after confirming each output path.

The summary contains:

- reporting period and freshness;
- available GSC and GA4 headline metrics;
- strongest observable queries, pages, or channels;
- explicit inquiry evidence when a relevant field exists;
- at most three operational prompts;
- comparison only when a compatible prior snapshot is present.

The keyword queue is saved, when approved, as:

```text
<workspace>/outputs/monthly/keyword-suggestions-YYYY-MM.csv
```

It records the observed query, `route_hint` (`product`, `blog`, or `review`),
suggested action, owned page/surface, GSC metrics, optional joined GA4 landing
metrics, evidence references, source period, and merchant decision fields.
GSC supplies demand evidence. GA4 only describes how an already-owned landing
page was used. Neither source proves product capability, certification,
commercial terms, or buyer outcome. Ads planner data is not required.

Every row starts as `selection_status: suggested`. Product and Blog workflows
must still check store fit, duplication, claim evidence, and buyer decision
before an operator selects it. Generating the queue never authorizes content
creation or a Shopify write.

After a successful update, refresh the read-only 404 queue. Read [data-contract.md](data-contract.md) for the exact manifest contract.

## Natural-language questions

Answer from the active files only. Cite the dataset and date range in the response. If the needed field is unavailable, say so and name the safest next data input; do not estimate.
