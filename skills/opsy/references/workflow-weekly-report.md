# Workflow: 运营周报

## Purpose

Produce a concise operating handoff centered on work completed, work in progress, blockers, and next-week tasks. Monthly data is supporting evidence, not the report's organizing structure.

## Inputs

Read:

- `<workspace>/ai-log/operations-log.md`;
- relevant outputs created during the week;
- open product, article, 404, connection, and data tasks;
- latest valid `data-center/manifest.json`, when available;
- the prior weekly report, when available.

Use the store timezone and state the reporting week explicitly.

## New-week prompt

On the first Opsy use in a new store-local week, say:

> 已进入新的运营周。建议先生成上周运营周报，再开始新任务。现在生成吗？

Do not generate automatically. If deferred, continue the requested operation and keep the prompt available for the next explicit status check.

## Build the report

Use this order:

1. Week, store, timezone, and evidence cutoff.
2. Completed operations with verification status and output links.
3. In-progress items and blockers.
4. Decisions or approvals still needed.
5. Next-week tasks, ordered by impact and dependency.
6. Optional monthly-data evidence.

Do not invent weekly traffic or conversion trends from a monthly snapshot. If the data period does not cover the week, label it as contextual evidence only.

## Save

Write to:

```text
<workspace>/outputs/weekly/YYYY-Www-operations-weekly.md
```

Update the operations log with the report path and covered week. Do not add raw customer data or credentials to the report.
