---
name: opsy
description: Guides beginner and part-time B2B store operators through evidence-based Shopify operations in Codex or WorkBuddy. Use when setting up or locating an Opsy workspace, checking connection/profile readiness, importing reviewed agency task handoffs, preparing an operations weekly report, creating or updating products with store-profile seller-voice descriptions plus FAQ and media-order checks, drafting or revising Shopify blog articles with scene-led content jobs, rewrite cooldown, and image/table/internal-link craft checks, triaging 404 URLs and approved redirects, validating or querying monthly data-center snapshots, filling existing metafields, or executing approved Shopify Admin GraphQL operations through Shopify CLI.
---

# Opsy

Operate a B2B inquiry-focused Shopify store through one state-aware entry point. Keep the interaction beginner-friendly while preserving evidence, approval, backup, execution, and readback controls.

## When to use

Use this entry point for the supported workspace, connection, reporting, product, Blog, redirect, monthly-data, metafield-value, and approved Admin GraphQL tasks named in the description.

Start every request as follows:

1. Find the project root from the working directory. Prefer the nearest `shopify-ops.json`; otherwise use the repository root.
2. Read the project `AGENTS.md` when present and preserve every existing project rule.
3. Run:

   ```text
   node <skill-root>/scripts/opsy.mjs status --project <project-root> --json
   ```

4. If Node or the helper is unavailable, inspect `shopify-ops.json` and `<workspace>/config/store-profile.json` manually and apply the same rules from [state-machine.md](references/state-machine.md).
5. State what was verified, show the exact current-state banner, then show only currently allowed choices.

Present choices as operator goals rather than internal Skill or Agent names. Accept either a menu number or a natural-language goal.

## Route by current state

### Store connection incomplete

Normally display **“店铺连接未完成”** prominently.

If status returns `workspace_overlay: agency_workspace`, display
**“已识别服务商工作区；Opsy 尚未启用”** instead. Read
[agency-handoff.md](references/agency-handoff.md). Allow local import of
reviewed merchant tasks, preview of an Opsy-compatible profile plan, or return
to Shopify Operations Skill. Keep the current profile unchanged and Shopify in
read-only mode.

Allow only:

- business questionnaire;
- public-site observation;
- connection guidance;
- project/workspace inspection or initialization.

Limit this state to connection/profile evidence and local project inspection; Shopify remains read-only. Read [workflow-connection-profile.md](references/workflow-connection-profile.md).

### Connected, profile incomplete

Display **“轻量店铺建档未完成”** prominently.

Allow only the reads required to complete or refresh the lightweight store profile. Keep operational writes disabled. Read [workflow-connection-profile.md](references/workflow-connection-profile.md), and capture `profile.store_role` and `profile.content_voice` while interviewing the operator so Product and Blog work is not blocked later.

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
- [workflow-products.md](references/workflow-products.md) and, for buyer-visible
  descriptions,
  [workflow-product-content.md](references/workflow-product-content.md), plus
  [workflow-buyer-decision.md](references/workflow-buyer-decision.md)
- [workflow-blog.md](references/workflow-blog.md) and, for Blog drafts,
  [workflow-blog-content.md](references/workflow-blog-content.md), plus
  [workflow-buyer-decision.md](references/workflow-buyer-decision.md)
- [workflow-404.md](references/workflow-404.md)
- [workflow-monthly-data.md](references/workflow-monthly-data.md)
- [workflow-connection-profile.md](references/workflow-connection-profile.md)

`write_ready` means the base connection and lightweight profile passed validation. Before a workflow writes, require that workflow's capability to be `write_ready: true`. If it is false, show its `missing` list and allow only local preparation or the reads needed to refresh those prerequisites.

Product and Blog copy additionally require `store_role`. When the helper reports `store_role.status: blocked`, stop topic commitment and drafting and run store-role intake. When it reports `ready_with_warnings`, plan in a neutral, evidence-first voice and keep those writes blocked until the seller voice is confirmed. Never assume the business model, audience, market, content language, or conversion goal.

## Guide the operator

- Ask one necessary question at a time and give a recommended default.
- Separate verified facts, assumptions, and missing inputs.
- Show the next safe action and its completion condition.
- Prefer chat attachments and workspace folders over asking beginners to format JSON.
- Keep reports and previews in the workspace; keep the Skill itself project-neutral.

## Check axes

Keep each selected workflow bounded to these checks:

- **Readiness** — workspace, target store, profile freshness, and workflow capability.
- **Evidence** — verified facts, assumptions, missing inputs, and source traceability.
- **Change safety** — pre-write snapshot, guarded variables, exact approval scope, and least mutation scope.
- **Outcome** — response contract, same-channel readback, promised artifacts, and relevant validators.

Use the selected workflow reference for field-level checks and report completion against these axes.

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

New products and new articles require two separate approvals: first create a non-public draft; then, only after successful readback, request a second approval to publish or schedule. Approval A covers draft creation only; publication or scheduling requires Approval B.

## When not to use

V1 supports B2B inquiry-site operations. Orders, refunds, checkout, accounts, inventory replenishment, discounts, tax, logistics, and ads remain outside its operating scope. Existing metafield definitions are read-only; fill values only after reading and matching them.

Keep public checks at the requested scope. Treat Google data as real-time only when live evidence is available. Git merges, bulk 404 redirects, content publication, and credential disclosure stay outside automatic actions.

Preserve the agency **monthly-loop** suite (Shopify Operations Skill / client `*-data-agent`, `*-blog-seo-geo-agent`, keyword scoring, Inquiry Review, Ops Coach). Those agents own deep diagnosis, scored topic queues, and service-provider coaching. Opsy owns the beginner menus: 周报、商品、Blog、404、上月数据、连接建档. If a repo already runs that multi-agent loop under `_project/skills/`, keep using it for agency work unless the operator explicitly asks for `$opsy`.

## Use bundled helpers

- Initialize or inspect a workspace with `scripts/opsy.mjs`; read [project-layout.md](references/project-layout.md).
- Validate, summarize, or derive Product/Blog keyword suggestions from monthly
  snapshots with `scripts/opsy.mjs`; read [data-contract.md](references/data-contract.md).
- Import reviewed merchant tasks from Shopify Operations Skill without
  inheriting write approval; read [agency-handoff.md](references/agency-handoff.md).
- Validate the shared Product/Blog buyer-decision brief with
  `scripts/opsy.mjs`; read
  [workflow-buyer-decision.md](references/workflow-buyer-decision.md).
- Guard mutation variables and verify saved mutation responses with `scripts/opsy.mjs`; read [safety-and-approvals.md](references/safety-and-approvals.md).
- Use GraphQL operations from `assets/graphql/` as reviewed starting points. Verify them against current official Shopify documentation and the selected API version before a live write.
- Use workspace templates from `assets/workspace/` while keeping the Skill folder in its source package.

## Verification

Before claiming completion, verify:

- [ ] the mutation command exited successfully;
- [ ] the operation-specific response check passed;
- [ ] the same-channel readback matches the approved change;
- [ ] the sanitized outcome is recorded;
- [ ] each promised local artifact exists and its relevant validator passed.
- [ ] Product/Blog buyer-decision readiness is `pass` before Approval A.

Report partial success per object and classify every unverified mutation attempt as failed or pending verification.

## Common rationalizations

- “It is only a draft” does not bypass store identity, capability, variable-guard, preview, or approval checks.
- “The CLI exited successfully” is incomplete evidence until the response contract and readback pass.
- “The field is already in the variables” does not make a metafield update safe without the current `compareDigest`.

## Red flags

Stop and refresh evidence when the target domain differs, a required scope or configured object is missing, profile evidence is stale, variables changed after approval, or the returned object is absent.

## Example: guarded product draft

Use [guarded-product-draft.md](examples/guarded-product-draft.md) to test the product route, Approval A boundary, saved-response check, and same-channel readback evidence.
