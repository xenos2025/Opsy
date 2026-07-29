---
name: opsy
description: Guided Shopify operations for beginner and part-time B2B store operators in Codex or WorkBuddy. Use when setting up or locating an Opsy workspace, checking connection/profile readiness, preparing an operations weekly report, creating or updating products, drafting or revising Shopify blog articles, triaging 404 URLs and approved redirects, validating or querying monthly data-center snapshots, filling existing metafields, or executing approved Shopify Admin GraphQL operations through Shopify CLI.
---

# Opsy

Operate a B2B inquiry-focused Shopify store through one state-aware entry point. Keep the interaction beginner-friendly while preserving evidence, approval, backup, execution, and readback controls.

## Start every request

1. Find the project root from the working directory. Prefer the nearest `shopify-ops.json`; otherwise use the repository root.
2. Read the project `AGENTS.md` when present. Never replace or weaken existing project rules.
3. Run:

   ```text
   node <skill-root>/scripts/opsy.mjs status --project <project-root> --json
   ```

4. If Node or the helper is unavailable, inspect `shopify-ops.json` and `<workspace>/config/store-profile.json` manually and apply the same rules from [state-machine.md](references/state-machine.md).
5. State what was verified, show the exact current-state banner, then show only currently allowed choices.

Do not ask the operator to choose an internal Skill or Agent. Accept either a menu number or a natural-language goal.

## Route by current state

### Store connection incomplete

Display **“店铺连接未完成”** prominently.

Allow only:

- business questionnaire;
- public-site observation;
- connection guidance;
- project/workspace inspection or initialization.

Do not run any other audit, infer Admin state, or write to Shopify. Read [workflow-connection-profile.md](references/workflow-connection-profile.md).

### Connected, profile incomplete

Display **“轻量店铺建档未完成”** prominently.

Allow only the reads required to complete or refresh the lightweight store profile. Do not enable operational writes. Read [workflow-connection-profile.md](references/workflow-connection-profile.md).

### Write ready

Display **“运营写入就绪”**, the target store, profile freshness, and monthly-data freshness. Offer:

1. 运营周报
2. 商品运营
3. Blog 与内容
4. 404 处理
5. 上月数据查询 / 数据更新
6. 连接与店铺档案

Load only the selected workflow:

- [workflow-weekly-report.md](references/workflow-weekly-report.md)
- [workflow-products.md](references/workflow-products.md)
- [workflow-blog.md](references/workflow-blog.md)
- [workflow-404.md](references/workflow-404.md)
- [workflow-monthly-data.md](references/workflow-monthly-data.md)
- [workflow-connection-profile.md](references/workflow-connection-profile.md)

## Guide the operator

- Ask one necessary question at a time and give a recommended default.
- Separate verified facts, assumptions, and missing inputs.
- Show the next safe action and its completion condition.
- Prefer chat attachments and workspace folders over asking beginners to format JSON.
- Keep reports and previews in the workspace; keep the Skill itself project-neutral.

## Control every Shopify write

Read [safety-and-approvals.md](references/safety-and-approvals.md) and [shopify-cli.md](references/shopify-cli.md) before preparing a write.

For every write:

1. Reconfirm the target `myshopify.com` domain and current profile state.
2. Read the current object through the same Shopify CLI Store channel.
3. Save a pre-write snapshot for existing objects.
4. Show an exact field-level preview or diff, expected effect, and readback plan.
5. Obtain explicit approval for the exact operation set.
6. Execute a pinned-version GraphQL mutation with `shopify store execute --allow-mutations`.
7. Treat top-level GraphQL errors or non-empty mutation `userErrors` as failure.
8. Read the affected object back through the same channel and record the verified result.

New products and new articles require two separate approvals: first create a non-public draft; then, only after successful readback, request a second approval to publish or schedule. Never interpret approval to draft as approval to publish.

## Preserve scope

V1 supports B2B inquiry-site operations. Do not operate orders, refunds, checkout, accounts, inventory replenishment, discounts, tax, logistics, or ads. Do not create, modify, or delete metafield definitions. Fill values only after reading and matching existing definitions.

Do not broaden a public check into an audit. Do not fabricate real-time Google data. Do not auto-merge Git changes, redirect all 404s, publish content, or expose credentials.

## Use bundled helpers

- Initialize or inspect a workspace with `scripts/opsy.mjs`; read [project-layout.md](references/project-layout.md).
- Validate or summarize monthly snapshots with `scripts/opsy.mjs`; read [data-contract.md](references/data-contract.md).
- Use GraphQL operations from `assets/graphql/` as reviewed starting points. Verify them against current official Shopify documentation and the selected API version before a live write.
- Use workspace templates from `assets/workspace/`; never copy the Skill folder into a client project.
