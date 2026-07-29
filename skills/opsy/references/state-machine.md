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
- `connection.status` is not `connected`, or the read-only smoke test is not `passed`.

Banner:

> 店铺连接未完成

Choices:

1. Complete the business questionnaire.
2. Run a public-site observation.
3. Check prerequisites or connect Shopify CLI.
4. Inspect the project/workspace.

Do not run Admin reads, full audits, data analysis, or Shopify writes.

## `profile_required`

Evidence:

- connection and smoke test passed; and
- `profile.status` is not `complete`.

Banner:

> 轻量店铺建档未完成

Choices:

1. Complete the lightweight profile.
2. Refresh the connection.
3. Show the missing profile fields.

Allow only reads needed for the profile. Do not perform operational writes.

## `write_ready`

Evidence:

- connection and read-only smoke test passed;
- lightweight profile is complete; and
- the profile is still valid for the intended operation.

Banner:

> 运营写入就绪

Show the six-item main menu from `SKILL.md`.

Before a write, downgrade to `profile_required` if the target store, scopes, theme, publications, blog, metafield definitions, languages, or markets relevant to that write changed or cannot be verified.

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
