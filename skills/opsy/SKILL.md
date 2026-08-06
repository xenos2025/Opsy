---
name: opsy
description: Guides beginner and part-time B2B store operators through evidence-based Shopify operations in Codex or WorkBuddy. Use when setting up or locating an Opsy workspace, checking connection/profile readiness, preparing an operations weekly report, creating or updating products, drafting or revising Shopify blog articles with store-profile content_voice seller role plus scene-led content jobs and image/table/internal-link craft checks, triaging 404 URLs and approved redirects, validating or querying monthly data-center snapshots, filling existing metafields, or executing approved Shopify Admin GraphQL operations through Shopify CLI.
---

# Opsy

Operate a B2B inquiry-focused Shopify store through one state-aware entry point. Keep the interaction beginner-friendly while preserving evidence, approval, backup, execution, and readback controls.

## When to use

Use this entry point for the supported workspace, connection, reporting, product, Blog, redirect, monthly-data, metafield-value, and approved Admin GraphQL tasks named in the description.

Start every request as follows:

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

Display **“运营写入就绪”**, the target store, profile freshness, monthly-data freshness, and `write_capabilities` from the status helper. Offer:

1. 运营周报
2. 商品运营
3. Blog 与内容
4. 404 处理
5. 上月数据查询 / 数据更新
6. 连接与店铺档案

Load only the selected workflow:

- [workflow-weekly-report.md](references/workflow-weekly-report.md)
- [workflow-products.md](references/workflow-products.md) and
  [workflow-buyer-decision.md](references/workflow-buyer-decision.md)
- [workflow-blog.md](references/workflow-blog.md) and, for Blog drafts,
  [workflow-blog-content.md](references/workflow-blog-content.md), plus
  [workflow-buyer-decision.md](references/workflow-buyer-decision.md)
- [workflow-404.md](references/workflow-404.md)
- [workflow-monthly-data.md](references/workflow-monthly-data.md)
- [workflow-connection-profile.md](references/workflow-connection-profile.md)

`write_ready` means the base connection and lightweight profile passed validation. Before a workflow writes, require that workflow's capability to be `write_ready: true`. If it is false, show its `missing` list and allow only local preparation or the reads needed to refresh those prerequisites.

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
4. Save the exact query and variables, then run `scripts/opsy.mjs guard-mutation --operation <name> --variables <file> --json`. Stop if it fails.
5. Show an exact field-level preview or diff, expected effect, and readback plan.
6. Obtain explicit approval for that exact operation set.
7. Execute the already-guarded variables with pinned-version `shopify store execute --allow-mutations`.
8. Run `scripts/opsy.mjs check-response --operation <name> --response <file> --json`. Treat any helper failure as mutation failure.
9. Read the affected object back through the same channel and record the verified result.

New products and new articles require two separate approvals: first create a non-public draft; then, only after successful readback, request a second approval to publish or schedule. Never interpret approval to draft as approval to publish.

## When not to use

V1 supports B2B inquiry-site operations. Do not operate orders, refunds, checkout, accounts, inventory replenishment, discounts, tax, logistics, or ads. Do not create, modify, or delete metafield definitions. Fill values only after reading and matching existing definitions.

Do not broaden a public check into an audit. Do not fabricate real-time Google data. Do not auto-merge Git changes, redirect all 404s, publish content, or expose credentials.

Do not replace the agency **monthly-loop** suite (Shopify Operations Skill / client `*-data-agent`, `*-blog-seo-geo-agent`, keyword scoring, Inquiry Review, Ops Coach). Those agents own deep diagnosis, scored topic queues, and service-provider coaching. Opsy owns the beginner menus: 周报、商品、Blog、404、上月数据、连接建档. If a repo already runs that multi-agent loop under `_project/skills/`, keep using it for agency work unless the operator explicitly asks for `$opsy`.

## Use bundled helpers

- Initialize or inspect a workspace with `scripts/opsy.mjs`; read [project-layout.md](references/project-layout.md).
- Validate, summarize, or derive Product/Blog keyword suggestions from monthly
  snapshots with `scripts/opsy.mjs`; read [data-contract.md](references/data-contract.md).
- Validate the shared Product/Blog buyer-decision brief with
  `scripts/opsy.mjs`; read
  [workflow-buyer-decision.md](references/workflow-buyer-decision.md).
- Guard mutation variables and verify saved mutation responses with `scripts/opsy.mjs`; read [safety-and-approvals.md](references/safety-and-approvals.md).
- Use GraphQL operations from `assets/graphql/` as reviewed starting points. Verify them against current official Shopify documentation and the selected API version before a live write.
- Use workspace templates from `assets/workspace/`; never copy the Skill folder into a client project.

## Verification

Before claiming completion, verify:

- [ ] the mutation command exited successfully;
- [ ] the operation-specific response check passed;
- [ ] the same-channel readback matches the approved change;
- [ ] the sanitized outcome is recorded;
- [ ] each promised local artifact exists and its relevant validator passed.
- [ ] Product/Blog buyer-decision readiness is `pass` before Approval A.

Report partial success per object; never turn an unverified mutation attempt into a success claim.

## Common rationalizations

- “It is only a draft” does not bypass store identity, capability, variable-guard, preview, or approval checks.
- “The CLI exited successfully” is incomplete evidence until the response contract and readback pass.
- “The field is already in the variables” does not make a metafield update safe without the current `compareDigest`.

## Red flags

Stop and refresh evidence when the target domain differs, a required scope or configured object is missing, profile evidence is stale, variables changed after approval, or the returned object is absent.

## Example: guarded product draft

Run `status`, require `write_capabilities.products.write_ready`, prepare `status: DRAFT` variables, run the `product-create-draft` guard, show the exact preview, obtain Approval A, execute the reviewed template, check the saved response under the same operation name, and read the product back. Activation and publication remain a separate Approval B.
