# Workflow: 连接与店铺档案

## Before connection

Display:

> 店铺连接未完成

Offer only:

1. business questionnaire;
2. public-site observation;
3. prerequisite and Shopify CLI connection guidance;
4. workspace inspection or initialization.

### Business questionnaire

Ask one question at a time and propose a default. Capture only operational facts:

- brand and B2B offer;
- target markets and languages;
- primary inquiry CTA;
- product and content owners;
- publication policy and approver;
- known data-delivery route;
- known restrictions;
- **store role** for buyer-facing copy — see the intake below;
- **content voice / seller role** for Blog and buyer-facing copy (who is speaking:
  role, expertise, buyer relationship, tone, must-do / must-not). Save under
  `profile.content_voice` when confirmed — see
  [workflow-blog-content.md](workflow-blog-content.md).

Save confirmed answers in the workspace README or profile notes. Do not claim they were verified in Shopify Admin.

### Store-role intake

Product and Blog copy need to know who the store sells to before anything is
drafted. Ask one question at a time, propose a default from the questionnaire
and the public site, and save the confirmed answers under `profile.store_role`:

| Field | Question | Allowed values |
| --- | --- | --- |
| `business_model` | Does this store close through inquiries, direct online purchase, or both? | `b2b_inquiry`, `b2c_dtc`, `hybrid` |
| `industry` | What product category does the store actually sell? | free text from the catalog |
| `primary_audience` | Who makes or influences the buying decision? | free text, name the role |
| `primary_market` | Which market does the copy mainly serve? | free text |
| `content_language` | Which language do buyers read on the storefront? | free text |
| `conversion_goal` | What is the one action a good visitor takes? | free text |

Set `status: ready` and `updated_at` only after the operator confirms all six.
Never infer a B2B, B2C, or hybrid frame from the store name, the catalog, this
Skill's examples, or an agency workspace.

`profile.store_role` is **optional for connection unlock** but **required before
Product and Blog drafting**. While it is incomplete, the status helper reports
`store_role.status: blocked` and lists the gaps under
`write_capabilities.products.missing` and `write_capabilities.blog.missing`.
Redirect, weekly-report, and monthly-data work are unaffected.

When the six fields are confirmed but `content_voice` is not, the helper reports
`store_role.status: ready_with_warnings`. Planning may continue in a neutral,
evidence-first voice; Product and Blog writes stay blocked until the operator
confirms the voice.

### Public-site observation

Observe only pages accessible to an ordinary visitor. Record URL, timestamp, response, visible language, navigation, product presentation, Blog availability, and inquiry CTA. Label it `public-only`.

Do not infer Admin objects, theme source, metafield definitions, analytics, unpublished content, permissions, or configuration. Do not call this an audit.

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

Normalize and reconfirm the target `*.myshopify.com` domain. Choose the smallest scope pack required for the next operations. Run interactive `shopify store auth`; never automate credential entry.

After authentication, run a read-only smoke query. Record the authenticated domain in `connection.store_domain`, the same canonical domain in `store.myshopify_domain`, granted scope names, CLI/API versions, authentication and verification timestamps, and smoke pass/fail. Do not store tokens or credential-file paths. The two recorded domains must match before the connection gate can pass.

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
- `profile.content_voice` when the operator can confirm it (optional for
  connection unlock; required before Product and Blog draft Approval A).

Save the source and verification timestamp for each live section. Mark `profile.status: complete` only when required fields are present and the target store matches the connection. Run the status helper again and use its `profile_validation.missing`, `profile_validation.errors`, and `write_capabilities.*.missing` arrays as the authoritative completion list.

Connection alone does not enable writes.

## Refresh

Refresh affected profile sections before an operation when scopes changed, the store changed, a saved publication or Blog disappeared, relevant metafield definitions changed, or the previous verification is too old for the risk of the write.
