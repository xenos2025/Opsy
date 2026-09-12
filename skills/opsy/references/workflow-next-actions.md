# Workflow: 本周三件事

This is the merchant version of Ops Coach. It produces action, not a diagnostic report or backlog.

## Output contract

Return exactly three actions. Each action must have:

- `id` — unique short identifier;
- `action` — one concrete verb and object;
- `owner` — `owner`, `sales`, `operations`, `ai_session`, or `needs_approval`;
- `target` — the named product, article, URL, file, or decision;
- `source` — the local file, Shopify readback, or operator answer that justified it;
- `due` — a real `YYYY-MM-DD` date;
- `done_when` — observable completion evidence;
- `risk` — `none`, `needs_owner_fact`, `needs_shopify_approval`, `needs_design_or_media`, or `customer_sensitive`.

Save machine-readable output as `schema_version: opsy-next-actions-v1` with a `period` date and an `actions` array. Validate it with:

```text
node <skill-root>/scripts/opsy.mjs validate-next-actions --file <actions.json> --json
```

## Selection order

Choose the three actions that remove the nearest real blockers:

1. missing merchant fact or approval owner;
2. one Product or Blog package that can be completed safely;
3. one approved Shopify or storefront follow-up with observable readback.

Use delivered data to prioritize `data_backed` Blog work. If it is missing, a
valid empty manifest plus accepted, language/scope-matched FAQ questions permits
`faq_seeded` topics and drafts without metrics, following
[blog-package-contract.md](blog-package-contract.md). If neither lane qualifies,
one action may be to obtain or validate the missing input. Product and other
actions may still use merchant facts, package
validation results, and Shopify readbacks. Never fabricate metrics or require
Google API access.

Do not return a long analysis, maturity score, technical audit, monthly agency plan, or more than three actions. Label any Shopify/theme/redirect/metafield mutation `needs_shopify_approval`; the action list itself is not approval.
