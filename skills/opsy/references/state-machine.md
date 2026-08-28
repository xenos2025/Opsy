# State machine

Use these states as hard gates, not suggestions.

## `workspace_missing`

Evidence:

- no valid `shopify-ops.json` can be found.

Banner:

> 运营项目文件夹未建立

Choices:

1. Inspect the current project and preview a safe workspace plan.
2. Select another project root.

Do not create anything until the plan is shown. For an existing `_project/` without a marker, propose adding only `shopify-ops.json`. For an existing project without `AGENTS.md`, ask separately before creating project rules.

## `connection_required`

Evidence:

- workspace exists; and
- the connection validation is incomplete or inconsistent, including missing timestamps, CLI/API evidence, granted scopes, read-only smoke evidence, or a mismatch between `connection.store_domain` and `store.myshopify_domain`.

Banner:

> 店铺连接未完成

Choices:

1. Complete the business questionnaire.
2. Run a public-site observation.
3. Check prerequisites or connect Shopify CLI.
4. Inspect the project/workspace.

Do not run Admin reads, full audits, data analysis, or Shopify writes.

### Agency workspace overlay

When the workspace contains Shopify Operations Skill context
(`config/site_profile.json`, `config/client-store-cache.json`, or
`ai-log/shopify-store-context.md`) but no Opsy `config/store-profile.json`,
keep the base state `connection_required` and add:

```text
workspace_overlay: agency_workspace
```

Banner:

> 已识别服务商工作区；Opsy 尚未启用

Allow only local agency-handoff import, Opsy compatibility planning, or return
to the agency Runtime. Do not report the store itself as disconnected, copy a
Skill tree, create a second profile automatically, or perform Shopify writes.
Read [agency-handoff.md](agency-handoff.md).

## `profile_required`

Evidence:

- the full connection validation passed; and
- the lightweight profile validation is incomplete, even if `profile.status` was manually set to `complete`.

Banner:

> 轻量店铺建档未完成

Choices:

1. Complete the lightweight profile.
2. Refresh the connection.
3. Show the missing profile fields.

Allow only reads needed for the profile. Do not perform operational writes.

## `write_ready`

Evidence:

- connection identity, timestamps, scopes, and read-only smoke evidence passed validation;
- all required lightweight profile fields passed validation; and
- a per-workflow capability map was calculated from current scopes and profile evidence.

Banner:

> 运营写入就绪

Show the six-item main menu from `SKILL.md` plus each relevant `write_capabilities.*.write_ready` result. The base state does not override a false capability. Show the capability's exact `missing` list and permit only local preparation or prerequisite refresh until it passes.

Before a write, downgrade to `connection_required` or `profile_required` if the validated base evidence changed. Keep the base state but block only the affected workflow when a workflow-specific scope, publication, Blog, or metafield definition is missing.

### Store-role overlay for buyer-facing copy

The status helper also returns `store_role` with one of three values:

| Status | Meaning | Effect |
| --- | --- | --- |
| `blocked` | one or more `profile.store_role` fields are missing or the business model is unsupported | stop Product and Blog topic commitment and drafting; run store-role intake |
| `ready_with_warnings` | the six role fields are confirmed but `profile.content_voice.status` is not `ready` | planning may continue in a neutral, evidence-first voice; Product and Blog writes stay blocked |
| `ready` | role and seller voice are both confirmed | Product and Blog copy may proceed to their craft gates |

Both gaps also appear in `write_capabilities.products.missing` and
`write_capabilities.blog.missing`. Redirect, weekly-report, and monthly-data work
are not affected by them. Read
[workflow-connection-profile.md](workflow-connection-profile.md) for the intake.

## `approval_pending`

This is an operation-level overlay, not a store state. Show:

- operation ID;
- target store;
- exact selected objects and fields;
- whether the approval creates a draft, updates an existing object, or publishes;
- backup and readback paths.

An approval applies only to the displayed set. Any changed target, field, value, publication, or schedule invalidates it.

## State storage

Read state from:

```text
<project>/shopify-ops.json
<workspace>/config/store-profile.json
```

Never store tokens, cookies, authorization headers, or Shopify CLI credential files in the workspace.
