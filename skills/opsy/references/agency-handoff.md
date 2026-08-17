# Agency handoff

Use this contract when Shopify Operations Skill / Ops Coach has already
reviewed the evidence and selected a small set of tasks for the merchant.
Opsy imports the tasks; it does not repeat the agency diagnosis or inherit a
Shopify write approval.

## Input contract

The agency exports `opsy-merchant-handoff.csv` with these columns:

```text
contract_version,task_id,month,route_hint,target,action,evidence_refs,priority,
due_week,acceptance_criteria,requires_shopify_write,status
```

Rules:

- `contract_version` is `opsy-agency-handoff-v1`.
- `task_id` is stable and unique in the file.
- `month` uses `YYYY-MM`.
- `route_hint` is one of `weekly_report`, `product`, `blog`, `redirect`,
  `monthly_data`, or `connection_profile`.
- `status=ready_for_merchant` means the agency reviewed task scope, evidence,
  target, owner lane, and acceptance criteria. Other rows are ignored.
- `requires_shopify_write=true` is a warning only. It never carries approval.
- Theme, Ads, full-audit, direct API, and agency-only work must not enter this
  handoff.
- Do not include customer PII, credentials, tokens, cookies, or raw inquiry
  records.

## Import

Preview without writing a local file:

```text
node <skill-root>/scripts/opsy.mjs import-agency-handoff --project <project-root> --file <opsy-merchant-handoff.csv>
```

After the operator confirms the source file, save the local queue:

```text
node <skill-root>/scripts/opsy.mjs import-agency-handoff --project <project-root> --file <opsy-merchant-handoff.csv> --apply --json
```

Default output:

```text
<workspace>/outputs/agency-handoff/merchant-action-queue-YYYY-MM.csv
```

Every imported row starts with:

```text
source_type=agency_handoff
source_status=ready_for_merchant
merchant_decision=
selected_for_execution=false
```

The operator still chooses whether to act. For Product, Blog, redirects, or
other Shopify writes, Opsy must re-enter the matching workflow and complete
its current profile, capability, preview, approval, execution, and readback
gates.

## Agency workspace overlay

When `shopify-ops.json` points to a workspace with `config/site_profile.json`,
`config/client-store-cache.json`, or `ai-log/shopify-store-context.md` but no
Opsy `config/store-profile.json`, status reports:

> 已识别服务商工作区；Opsy 尚未启用

This preserves the agency workspace and allows local handoff import. Do not
copy either Skill tree into the client workspace and do not auto-create a
second profile.
