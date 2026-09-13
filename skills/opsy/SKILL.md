---
name: opsy
description: Guides enterprise owners, sales, and basic operators through B2B inquiry-focused Shopify work. Use when the user requests Opsy workspace setup, business profiling, three weekly actions, product listing, Blog publishing, provider-delivered local data analysis, redirects, existing metafield values, or explicitly approved Shopify operations. Excludes checkout-led DTC, live Google access, and technical site-foundation audits.
---

# Opsy

Operate a B2B inquiry-focused Shopify store through one state-aware entry point. Keep the interaction beginner-friendly while preserving evidence, approval, backup, execution, and readback controls.

Read [runtime-contract.md](references/runtime-contract.md) first. Opsy is designed for an enterprise owner, sales team, or basic operator without an in-house developer or Google API setup.

Workflow prompt audit: N/A — one agent instruction context; no separate model-call prompts.

Role contract audit: N/A — one agent context; explicit workflow, approval, and readback rules determine decisions, evidence handling, permissions, output, and handoff.

## When to use

Use this entry point for the supported workspace, connection, reporting, product, Blog, redirect, monthly-data, metafield-value, and approved Admin GraphQL tasks named in the description.

Start every request as follows:

1. Find the project root from the working directory. Prefer the nearest `shopify-ops.json`; otherwise use the repository root.
2. Read the project `AGENTS.md` when present and preserve every existing project rule.
3. Run:

   ```text
   node <skill-root>/scripts/opsy.mjs status --project <project-root> --live --recover --apply --json
   ```

4. If Node or the helper is unavailable, inspect `shopify-ops.json` and `<workspace>/config/store-profile.json` manually and apply the same rules from [state-machine.md](references/state-machine.md).
5. Read `authorization` from status. Follow [authorization-lifecycle.md](references/authorization-lifecycle.md) for first consent or a recovery blocker; local profile readiness alone is insufficient. For continuing work, run `resume-task --task <task-id>` and read [result-handoff-contract.md](references/result-handoff-contract.md). Preserve known IDs and refresh changed evidence before acting.
6. State what was verified, show the exact current-state banner, then show only currently allowed choices.

Present choices as operator goals rather than internal Skill or Agent names. Accept either a menu number or a natural-language goal.

## Route by current state

If live authorization is unverified or recovery needs attention, show its
status and the next action from [authorization-lifecycle.md](references/authorization-lifecycle.md).
Keep Shopify writes blocked until the live store/scope check passes. A saved
full-scope recovery policy can reopen OAuth without repeated scope approval;
the customer completes any required browser login/consent.

### Store connection incomplete

Normally display **“店铺连接未完成”** prominently.

If status returns `workspace_overlay: agency_workspace`, display
**“已识别服务商工作区；Opsy 尚未启用”** instead. Read
[agency-handoff.md](references/agency-handoff.md). Allow local import of
reviewed merchant tasks, preview of an Opsy-compatible profile plan, or return
to Shopify Operations Skill. Keep the current profile unchanged and Shopify in
read-only mode.

Allow only:

- enterprise profile questionnaire;
- local FAQ material normalization and confirmation;
- connection guidance;
- project/workspace inspection or initialization.

Limit this state to connection/profile evidence and local project inspection; Shopify remains read-only. Read [business-profile-questionnaire.md](references/business-profile-questionnaire.md) and [workflow-connection-profile.md](references/workflow-connection-profile.md).

### Connected, profile incomplete

Display **“轻量店铺建档未完成”** prominently.

Allow only the reads required to complete or refresh the lightweight store
profile, plus local FAQ material normalization. Keep operational writes
disabled. Read [workflow-connection-profile.md](references/workflow-connection-profile.md),
and capture `profile.store_role`, `profile.content_voice`, and
`profile.merchant_context` from the enterprise profile questionnaire so
Product and Blog work is not blocked later.

### Write ready

Display **“运营写入就绪”**, the target store, profile freshness, monthly-data freshness, and `write_capabilities` from the status helper. Offer:

1. 本周三件事
2. 商品运营
3. Blog 与内容
4. 404 处理
5. 导入服务方数据 / 查看已有摘要
6. 连接与企业画像

Load only the selected workflow:

- [workflow-next-actions.md](references/workflow-next-actions.md)
- [workflow-products.md](references/workflow-products.md) and, for buyer-visible
  descriptions,
  [workflow-product-content.md](references/workflow-product-content.md), plus
  [workflow-buyer-decision.md](references/workflow-buyer-decision.md) and the
  executable [product-package-contract.md](references/product-package-contract.md).
  Confirm the topic queue, single-object placement, and one audience card from
  [merchant-selection-contract.md](references/merchant-selection-contract.md)
  before drafting.
- [workflow-blog.md](references/workflow-blog.md) and, for Blog drafts,
  [workflow-blog-content.md](references/workflow-blog-content.md), plus
  [workflow-buyer-decision.md](references/workflow-buyer-decision.md) and the
  executable [blog-package-contract.md](references/blog-package-contract.md).
  Use the same [merchant-selection-contract.md](references/merchant-selection-contract.md)
  gates: `suggest-keywords` or `suggest-faq-topics` first, then one placement
  and one confirmed audience card.
- [workflow-404.md](references/workflow-404.md)
- [workflow-monthly-data.md](references/workflow-monthly-data.md)
- [workflow-connection-profile.md](references/workflow-connection-profile.md)

`write_ready` means the base connection and lightweight profile passed validation. Before a workflow writes, require that workflow's capability to be `write_ready: true`. If it is false, show its `missing` list and allow only local preparation or the reads needed to refresh those prerequisites.

Product and Blog copy additionally require `store_role` with `business_model: b2b_inquiry`. When the helper reports `store_role.status: blocked`, stop topic commitment and drafting and run store-role intake. If the store closes through direct checkout, route it to the separate Opsy DTC package. When the helper reports `ready_with_warnings`, plan in a neutral, evidence-first voice and keep those writes blocked until the seller voice is confirmed. Use the confirmed audience, market, content language, and conversion goal.

Blog must inspect `blog_data_center` and `blog_topic_sources` before topic
selection. Prefer `blog_topic_sources.status: data_backed`, backed by valid
`gsc_queries` and `ga4_landing_pages`; accepted Blog question signals may
expand clusters, shape the buyer angle or format, affect surface routing, or
break ties without changing numeric ranks. For a new site with a valid empty
data-center manifest, `blog_topic_sources.status: faq_seeded` may create a
cold-start shortlist from accepted, language/scope-matched FAQ questions. Mark
it non-numeric and explicitly label the search demand as unobserved. Reuse an
associated answer only after it independently passes the answer publication gate.
If neither source is usable, return
`scoring_blocked` and offer provider-data import or FAQ confirmation.

## Guide the operator

- Ask one necessary question at a time and give a recommended default.
- Separate verified facts, assumptions, and missing inputs.
- Show the next safe action and its completion condition.
- Prefer chat attachments and workspace folders over asking beginners to format JSON.
- When FAQ documents or sales Q&A are supplied, normalize them through
  [buyer-faq-contract.md](references/buyer-faq-contract.md); accepted questions
  may guide work; publish answers only after confirmation and conflict resolution.
- For a guided audience intake, use the local-only HTML tool described in
  [audience-intake-contract.md](references/audience-intake-contract.md). Keep
  the dated evidence under `inbox/profile/` and reuse the existing profile config.
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

1. Reconfirm the target `myshopify.com` domain and current profile state. Run `ensure-auth --recover --apply --task <task-id>` through the bundled helper before the write group; proceed only after its live check passes. On authentication failure during execution, preserve the uncertain result and recover authorization before reading current object state; recovery never replays the mutation.
2. Read the current object through the same Shopify CLI Store channel.
3. Save a pre-write snapshot for existing objects.
4. Save the exact query and variables, then run `scripts/opsy.mjs guard-mutation --operation <name> --variables <file> --json`. Stop if it fails. Temporary signed image staging uses the memory-only exception in [workflow-image-upload.md](references/workflow-image-upload.md).
5. Show an exact field-level preview or diff, expected effect, and readback plan.
6. Obtain explicit approval for that exact operation set.
7. Execute the already-guarded variables with pinned-version `shopify store execute --allow-mutations`.
8. Run `scripts/opsy.mjs check-response --operation <name> --response <file> --json`. Treat any helper failure as mutation failure.
9. Read the affected object back through the same channel and record the verified result.

New products and new articles require two separate approvals: first create a non-public draft; then, only after successful readback, request a second approval to publish or schedule. Approval A covers draft creation only; publication or scheduling requires Approval B.

## When not to use

V1 supports B2B inquiry-site operations. Orders, refunds, checkout, accounts, inventory replenishment, discounts, tax, logistics, and ads remain outside its operating scope. Existing metafield definitions are read-only; fill values only after reading and matching them.

Do not offer Tracking, Core Web Vitals, structured-data acceptance, crawl/indexation audits, theme-code audits, or other technical site-foundation reports. Do not ask the merchant to configure Google OAuth, API credentials, GA4, or GSC access. Product work may proceed from merchant/sales evidence without analytics. Blog prefers provider-delivered local GSC/GA4 evidence; a new site may use accepted FAQ question evidence only through the explicitly non-numeric `faq_seeded` cold-start lane. Git merges, bulk 404 redirects, content publication, and credential disclosure stay outside automatic actions.

Preserve the agency **monthly-loop** suite (Shopify Operations Skill / client `*-data-agent`, `*-blog-seo-geo-agent`, keyword scoring, Inquiry Review, Ops Coach). Those agents own deep diagnosis, scored topic queues, and service-provider coaching. Opsy owns the merchant menus: 本周三件事、商品、Blog、404、服务方数据、连接与企业画像. If a repo already runs that multi-agent loop under `_project/skills/`, keep using it for agency work unless the operator explicitly asks for `$opsy`.

## Use bundled helpers

- Initialize or inspect a workspace with `scripts/opsy.mjs`; read [project-layout.md](references/project-layout.md).
- Validate or summarize provider-delivered local snapshots with `scripts/opsy.mjs`; read [data-contract.md](references/data-contract.md). Label results as local snapshots with their delivered period and source.
- Import reviewed merchant tasks from Shopify Operations Skill without
  inheriting write approval; read [agency-handoff.md](references/agency-handoff.md).
- Validate the shared Product/Blog buyer-decision brief with
  `scripts/opsy.mjs`; read
  [workflow-buyer-decision.md](references/workflow-buyer-decision.md).
- Validate Product, Blog, and exactly-three-action packages with `scripts/opsy.mjs`; read [product-package-contract.md](references/product-package-contract.md), [blog-package-contract.md](references/blog-package-contract.md), and [workflow-next-actions.md](references/workflow-next-actions.md).
- Validate sanitized FAQ business evidence with `scripts/opsy.mjs validate-buyer-faq`; read
  [buyer-faq-contract.md](references/buyer-faq-contract.md). Product and Blog
  consume only temporary `select-faq` results; public answer facts require the
  separate answer gate. Product may request supporting rows; Blog remains
  primary-only.
- Expose accepted Blog FAQ question seeds with `scripts/opsy.mjs suggest-faq-topics`;
  every Blog package records whether FAQ evidence was applied, had no relevant
  match, or was unavailable.
- Confirm Product/Blog topic rows, one-object placement, and one audience card
  with `suggest-keywords`, `suggest-faq-topics`, and `select-content-context`;
  read [merchant-selection-contract.md](references/merchant-selection-contract.md).
- Locate the local audience HTML tool with `scripts/opsy.mjs audience-wizard`
  and validate its download with `validate-audience-intake`; read
  [audience-intake-contract.md](references/audience-intake-contract.md).
- Guard mutation variables and verify saved mutation responses with `scripts/opsy.mjs`; read [safety-and-approvals.md](references/safety-and-approvals.md).
- Map single-variant SKU/price and Blog SEO through [write-field-mapping.md](references/write-field-mapping.md); a local package field alone is not a completed Shopify write.
- Upload confirmed local images through [workflow-image-upload.md](references/workflow-image-upload.md), then verify their attachment and display separately.
- End every core task with `record-task-result`: per-object result, customer report and handoff, including partial or blocked work. Read [result-handoff-contract.md](references/result-handoff-contract.md). The three core workflows and their reports require no other Skill; optional agency handoff remains optional.
- Use GraphQL operations from `assets/graphql/` as reviewed starting points. Verify them against current official Shopify documentation and the selected API version before a live write.
- Use workspace templates from `assets/workspace/` while keeping the Skill folder in its source package.

## Verification

Before claiming completion, verify:

- [ ] the mutation command exited successfully;
- [ ] the operation-specific response check passed;
- [ ] the same-channel readback matches the approved change;
- [ ] the sanitized outcome is recorded;
- [ ] each promised local artifact exists and its relevant validator passed.
- [ ] Product/Blog buyer-decision readiness is `pass` before Approval A, except a Product minimal-fill draft, which defers the brief into `supplements`.
- [ ] Product passed `draft` or `minimal` before Approval A and `public` before Approval B; Blog passed `write` before either approval (`review` is local preparation only).
- [ ] the Product or Blog package records a confirmed topic queue, single-object placement, and one audience card — or, for a minimal-fill Product draft, carries those gaps in `supplements` and shows them after the draft readback.

Report partial success per object and classify every unverified mutation attempt as failed or pending verification.

## Common rationalizations

- “It is only a draft” does not bypass store identity, capability, variable-guard, preview, or approval checks.
- “The CLI exited successfully” is incomplete evidence until the response contract and readback pass.
- “The field is already in the variables” does not make a metafield update safe without the current `compareDigest`.

## Red flags

Stop and refresh evidence when the target domain differs, a required scope or configured object is missing, profile evidence is stale, variables changed after approval, or the returned object is absent.

## Example: guarded product draft

Use [guarded-product-draft.md](examples/guarded-product-draft.md) to test the product route, Approval A boundary, saved-response check, and same-channel readback evidence.
