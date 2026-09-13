# Task result, customer report and handoff

Every Product, Blog or data task ends with a customer-local result bundle,
including blocked or partially finished work. Opsy owns this contract and
does not require another reporting or handoff Skill. The agent writes the
JSON; the merchant sees a concise report and concrete next actions.

## Start and resume

Choose a stable task ID when work starts. Before creating any new remote
object for an existing task, run:

```text
node <skill-root>/scripts/opsy.mjs resume-task --project <project-root> --task <task-id> --json
```

Read the latest result, known object IDs, missing work, owners and evidence
changes. Refresh changed/missing inputs, current store readiness and exact
approvals. Continue from known IDs. For timed-out writes without an ID, query
the store by the approved handle/source identity before considering recreation.
Never infer that a missing success response means nothing was created.
Retain all earlier objects in subsequent revisions, including failed ones.

## Result format

Save a new `opsy-task-result-v1` input under the workspace, then preview:

```text
node <skill-root>/scripts/opsy.mjs record-task-result --project <project-root> --file outputs/task-result-r1.json --json
```

Add `--apply` to write **three files** under
`outputs/runs/<task_id>/<run_id>/`: `result.json`, `report.md`, `handoff.md`.
Existing run IDs are refused. Later work uses a new `run_id` and timestamp.
Evidence paths must be workspace-relative, non-sensitive retained files.

```json
{
  "schema_version": "opsy-task-result-v1",
  "task_id": "monthly-review",
  "run_id": "r1",
  "workflow": "data",
  "status": "analysis_complete",
  "goal": "Review the provider-delivered operating package",
  "summary": "Local report ready; real inquiry follow-up remains with sales.",
  "recorded_at": "2026-09-13T10:00:00+08:00",
  "timezone": "Asia/Shanghai",
  "basis": "Provider exports; state each dataset period, scope and extraction time in the report",
  "inputs": ["data-center/manifest.json", "data-center/active/inquiry_channels.csv"],
  "artifacts": ["outputs/reports/monthly-review-r1.md"],
  "objects": [],
  "next_actions": [{"owner": "sales", "action": "Confirm real inquiry outcomes", "done_when": "Deduplicated sales feedback delivered"}]
}
```

The example is synthetic; replace its paths and statements with actual inputs.
`workflow` is product/blog/data/mixed. `status` and each object's status use:
local_prepared, pending_input, pending_approval, draft_verified,
published_verified, analysis_complete, partial, failed, pending_verification.
Use `partial` when objects differ; list the correct state for each object.
Scheduled publication remains pending until the public state is confirmed.

Each object requires `key`, `status`, and a factual `summary`. Carry `id` as
soon as it is known. A verified draft or published object additionally requires:

- `operations[]`: operation name, `variables_ref`, sanitized `response_ref`,
  retained `approval_ref`, and actual `exit_code`. All relevant writes belong
  here, including variant and article SEO writes; never count a failed attempt
  as success. Save failure evidence separately and explain it in the summary.
- `readback_ref`: the same-channel Product/Article readback. The ID and actual
  draft/published state must match. Include the store at task level.
- `checks[]`: `{path: "data.product.title", expected: "Approved title"}`
  for **every approved field**, including nested variant/SEO fields; use array
  indices in dotted paths. Check body, links and media with their package and
  media validators too. List remaining supplements in artifacts/next_actions.
- For `published_verified`, `public_url` and a retained `public_check_ref`
  JSON with `{url, object_id, ok: true, checked_at}` from an actual public-page
  check. Product activation alone does not prove publication-channel membership.

The helper rejects failed mutation contracts, wrong IDs, mismatched expected
fields, missing artifacts and success with no objects. It also compares core
Product/Article fields, single-variant SKU/price and metafield values directly
with approved variables, even when a caller omits them from `checks`. Other
promised fields still require explicit checks and the workflow validators.
It fingerprints inputs
and evidence. These are integrity checks of retained local evidence; they
cannot prove that the execution channel, merchant approval or visual review
was authentic. The agent must verify and report those facts explicitly.

## Authorization interruption

When authorization fails, retain the current task, known object IDs and any
uncertain write outcome before recovery. Run `ensure-auth --recover --apply
--task <task-id>` using the confirmed project. Link the sanitized authorization
receipt in the next result's artifacts and report the actual blocker or restored
scope status. The returned `task_resume` is continuation context, not proof that
an interrupted write succeeded. Read back known IDs before retrying writes.
Follow [authorization-lifecycle.md](authorization-lifecycle.md).

## Customer report standard

Lead with what was completed, what remains and why. Report exact object counts,
IDs/URLs where available, artifact paths, and per-object failure/verification
state. Distinguish local draft, Shopify draft, published page and pending media.
For data, disclose date, timezone, sources, period coverage, provenance,
unavailable metrics and non-comparable history. Separate observed facts,
inferences and recommended actions; keep real inquiries separate from clicks.
Put analysis conclusions in the analysis artifact, not only in this wrapper.

Every pending action has an owner, exact action and completion condition.
Preserve selected audience/topic/placement and source fingerprints so another
session can continue. Record SEO/GEO work performed without claiming rankings,
traffic or AI citations improved until later provider evidence supports it.
