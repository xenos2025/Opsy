# Workflow: 连接与店铺档案

## Before connection

Display:

> 店铺连接未完成

Offer only:

1. enterprise profile questionnaire;
2. prerequisite and Shopify CLI connection guidance;
3. workspace inspection or initialization.

### Enterprise profile questionnaire

Ask one question at a time and propose a default. Capture only operational facts:

- brand and B2B offer;
- target markets and languages;
- primary inquiry CTA;
- product and content owners;
- publication policy and approver;
- optional provider-delivered local data route;
- known restrictions;
- **store role** for buyer-facing copy — see the intake below;
- **content voice / seller role** for Blog and buyer-facing copy (who is speaking:
  role, expertise, buyer relationship, tone, must-do / must-not). Save under
  the effective shared voice source when confirmed — see
  [content-voice-contract.md](content-voice-contract.md).
- product families, buyer roles, real sales questions, purchase objections,
  confirmed commercial facts, restricted claims, and approvers under
  `profile.merchant_context`; use
  [business-profile-questionnaire.md](business-profile-questionnaire.md).
- when a guided audience exercise helps, use the local-only tool in
  [audience-intake-contract.md](audience-intake-contract.md), save its dated
  output under `inbox/profile/`, and promote only the confirmed summary.

Save confirmed answers in the workspace README or profile notes. Do not claim they were verified in Shopify Admin.

### Store-role intake

Product and Blog copy need to know who the store sells to before anything is
drafted. Ask one question at a time, propose a default from the questionnaire
and merchant answers, and save the confirmed answers under `profile.store_role`:

| Field | Question | Allowed values |
| --- | --- | --- |
| `business_model` | Does this store close through B2B inquiries? | `b2b_inquiry`; route checkout-led stores to Opsy DTC |
| `industry` | What product category does the store actually sell? | free text from the catalog |
| `primary_audience` | Who makes or influences the buying decision? | free text, name the role |
| `secondary_audiences` | Which other roles influence, use, approve, or block the decision? | array of confirmed role names; may be empty |
| `primary_market` | Which market does the copy mainly serve? | free text |
| `content_language` | Which language do buyers read on the storefront? | free text |
| `conversion_goal` | What is the one action a good visitor takes? | free text |
| `audience_status` | What review gate supports the audience? | `research_draft`, `merchant_confirmed`, or `data_revised` |
| `audience_intake_path` | Where is the dated intake evidence? | required for `research_draft`; otherwise a relative path or `null` |

Set `status: ready`, `audience_status: merchant_confirmed`, and `updated_at`
only after the operator confirms the required role fields. A
`research_draft` remains planning evidence and keeps Product/Blog writes
blocked until the responsible merchant role confirms or revises it.
This package accepts only `b2b_inquiry`. Route a checkout-led store to Opsy DTC
instead of inferring or forcing a B2B frame from the store name, catalog,
examples, or an agency workspace.

`profile.store_role` is **optional for connection unlock** but **required before
Product and Blog drafting**. While it is incomplete, the status helper reports
`store_role.status: blocked` and lists the gaps under
`write_capabilities.products.missing` and `write_capabilities.blog.missing`.
Redirect, next-actions, and provider-delivered data work are unaffected.

When the six fields are confirmed but `content_voice` is not, the helper reports
`store_role.status: ready_with_warnings`. Planning may continue in a neutral,
evidence-first voice; Product and Blog writes stay blocked until the operator
confirms the voice.

This profile route does not produce Tracking, Core Web Vitals, structured-data,
indexation, crawl, or theme reports. Public storefront pages may be opened later
only to verify a named buyer-visible URL or an approved change, not as a
site-foundation audit.

## Check prerequisites

Run:

```text
node <skill-root>/scripts/opsy.mjs doctor --json
```

Requirements:

- Node.js 22.12 or higher;
- a Node package manager;
- Git 2.28 or higher;
- the supported Shopify CLI version recorded in `assets/toolchain.json`.

If Node or Git is missing, provide installation guidance only. Do not silently install system prerequisites.

If prerequisites are satisfied and CLI is missing, show the pinned installation command from [shopify-cli.md](shopify-cli.md), its global-package side effect, and ask approval. Do not silently upgrade an existing CLI.

## Authenticate

Normalize and reconfirm the target `*.myshopify.com` domain. Follow
[authorization-lifecycle.md](authorization-lifecycle.md): `auth-plan` defaults
to the complete core-operation scope pack; record real store/scope and automatic
recovery consent, then use `ensure-auth --recover --approval <file> --apply`.
Keep optional features explicit. The helper runs Shopify CLI interactive auth
when necessary; the customer completes login/consent.

The helper verifies the store and actual granted scopes with a read-only query,
then saves connection metadata in the existing profile. Token issue time stays
unknown when unavailable; the live-check timestamp is the verification evidence.
No token or credential-file path enters the profile. The two recorded domains
must match. Follow the same lifecycle for expired authorization or added features.

## Build the lightweight profile

Read and record only facts required for safe operations:

- shop ID, name, `myshopify.com` domain, primary public domain, currency, and IANA timezone;
- target languages and markets;
- main theme identity when relevant;
- primary inquiry CTA;
- publication IDs and names used for product publishing;
- Blog IDs and names used for articles;
- existing metafield definitions needed by supported objects;
- approval and publication policy;
- `profile.store_role` when the operator can confirm it (optional for connection
  unlock; required before Product and Blog drafting);
- shared `config/content_voice.json` when the operator can confirm it (optional for
  connection unlock; required before Product and Blog draft Approval A).
- `profile.merchant_context` from the enterprise profile questionnaire
  (reported separately as `not_started`, `ready_with_gaps`, or `ready`).

Save the source and verification timestamp for each live section. Mark `profile.status: complete` only when required fields are present and the target store matches the connection. Run the status helper again and use its `profile_validation.missing`, `profile_validation.errors`, and `write_capabilities.*.missing` arrays as the authoritative completion list.

Connection alone does not enable writes.

## Refresh

Refresh affected profile sections before an operation when scopes changed, the store changed, a saved publication or Blog disappeared, relevant metafield definitions changed, or the previous verification is too old for the risk of the write.
