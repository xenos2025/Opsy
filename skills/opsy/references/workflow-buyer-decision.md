# Workflow: 买家决策简报

Use this shared workflow before drafting or materially rewriting a Product/PDP
or Blog package. Opsy exposes only the `pdp` and `blog` adapters. `page` remains
reserved for the service-provider Page workflow and is not an Opsy menu item.

The module has one small interface with two operations:

1. prepare one `decision-brief.json` for one primary buyer decision;
2. validate it and receive `pass`, `fix`, or `blocked` across five checks.

Start from [the example asset](../assets/decision-brief.example.json), but do
not show JSON authoring as an operator task. Ask one necessary question at a
time, fill the artifact locally, then show a plain-language summary.

## Inputs

- surface: `pdp` or `blog`;
- one decision stage: `discover`, `evaluate`, `validate`, or `inquire`;
- verified product/article materials and merchant confirmations;
- active store profile, configured seller voice, and approved primary CTA;
- optional keyword suggestions generated from the delivered data-center.

Keyword, GSC, GA4, and inquiry-pattern inputs are **demand evidence**. They can
support buyer questions, the decision being served, and the decision stage.
They cannot prove a product feature, application, certification, capability,
commercial term, or buyer outcome.

Supplier notes, merchant confirmation, current Shopify fields, named product
documents, and suitable external references are **claim evidence**. Every
buyer-visible store/product claim must map to eligible claim evidence or remain
in `unresolved`.

## Prepare

Save beside the package:

```text
<workspace>/outputs/products/<candidate>/decision-brief.json
<workspace>/outputs/blog/<handle>/decision-brief.json
```

A brief serves one buyer situation, one decision stage, one primary decision,
one primary answer, and one primary CTA. Fill:

- buyer role, situation, decision, desired outcome, constraints, and questions;
- primary answer, buyer value, reason, and scope;
- fact → buyer requirement → buyer value translations;
- the main blocking objection and an evidence-backed response;
- fit, not-fit, conditions, and merchant-confirmation needs;
- CTA goal/label/route, commitment, buyer inputs, and expected response;
- demand/claim evidence with exact `supports` targets;
- unresolved items with explicit `blocking` status.

Use stable support targets:

```text
buyer.questions
buyer.decision
decision_stage
primary_answer
value_translations.<id>
objections.<id>.response
boundary
next_step
```

## Validate

Run:

```text
node <skill-root>/scripts/opsy.mjs validate-decision-brief --project <project-root> --file <decision-brief.json> --surface pdp --json
node <skill-root>/scripts/opsy.mjs validate-decision-brief --project <project-root> --file <decision-brief.json> --surface blog --json
```

The five checks are:

| Check | Requirement |
| --- | --- |
| `relevance` | Buyer, situation, decision, questions, and decision stage are explicit |
| `clarity` | Primary answer and fact-to-value translations are complete |
| `credibility` | Claim references exist, match their targets, and are not demand evidence |
| `risk_boundary` | Main objection plus fit/not-fit/conditions are explicit |
| `next_step` | Approved CTA, buyer inputs, and buyer response are explicit |

Status rules:

- `pass`: all five checks pass; the surface-specific craft gate may continue;
- `fix`: facts exist but an objection, boundary, evidence date, or explanation
  still needs repair;
- `blocked`: required facts conflict or are missing, demand evidence is used as
  claim proof, CTA conflicts, or a blocking unresolved item remains.

Only `pass` may proceed to Product/Blog Approval A. This validator does not
publish, mutate Shopify, or replace the existing product/article craft gates.

## Surface adapters

### PDP

Translate specifications into procurement/use meaning, state fit/not-fit, keep
unknown MOQ/lead time/certification terms unresolved, and state what buyers
must provide for a sample or quote response.

### Blog

Answer one real buyer question, use evidence/comparison/boundary to advance the
decision, and introduce the commercial path only after the article has done the
decision work. The existing seller voice, content job, media, table, link, and
CTA checks still apply.

## Red flags

- A selected keyword appears as a product capability claim.
- A generic pain/pleasure story replaces a procurement or selection decision.
- A brief tries to serve several competing buyers or primary decisions.
- `decision_brief` passes but the Product/Blog craft or Shopify write gate fails.
- A quality score or CTA click is called buyer acceptance.
