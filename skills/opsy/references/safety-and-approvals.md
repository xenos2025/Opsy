# Safety and approvals

## Evidence labels

Label material claims as:

- **Verified**: read from the current public page, project file, monthly snapshot, or live Shopify read.
- **Assumption**: proposed default awaiting confirmation.
- **Unavailable**: required source is missing or inaccessible.

For reports and reviews, record date, timezone, inputs, evidence paths, scope, confidence, and items needing live confirmation.

## Approval ladder

### Local-only creation

Show the files and locations first. A workspace initializer may add only missing files after approval. Never overwrite an existing `AGENTS.md`, marker, profile, manifest, output, or client material.

### New product

1. Present the validated product package and a shared PDP buyer-decision brief
   with all five checks at `pass`.
2. Approval A creates only a Shopify `DRAFT`.
3. Read back ID, title, handle, status, fields, metafields, and media state.
4. Approval B activates and publishes to the exact selected publications.

### New article

1. Present the validated article package, a shared Blog buyer-decision brief
   with all five checks at `pass`, **and** the craft scorecard from
   `workflow-blog-content.md` (writer role from the effective shared content voice, topic,
   body, images, table, links/CTA). Do not offer Approval A when
   `content_voice` is not `ready`, or for encyclopedia-style drafts that lack
   a scene, commercial target, or write-ready media when a Shopify write is
   requested.
2. Approval A creates with `isPublished: false`.
3. Read back ID, blog, title, handle, publication state, body, summary, tags, and image.
4. Approval B publishes immediately or schedules the exact displayed time.

### Existing object update

1. Save a pre-write snapshot.
2. Show an exact before/after diff.
3. Obtain one approval for that exact diff.
4. Update and read back.

Material buyer-visible Product or Blog copy changes must re-run the matching
decision-brief check before approval. Metadata-only or operational changes do
not need a new brief unless they change the buyer promise or next step.

Treat product or article handle changes as a separate risk operation and add the old path to 404 handling.

### Redirect set

Approve only the selected, individually verified `path → target` pairs. Do not infer approval for the rest of the queue.

## Execution rules

- Use the same Shopify CLI Store channel for pre-read, mutation, and readback.
- Before each write group run `ensure-auth --recover --apply --task <task-id>`
  through the helper; see [authorization-lifecycle.md](authorization-lifecycle.md).
  Recover only the previously approved store/scope plan and verify actual scopes.
  An interrupted mutation remains pending verification until object readback.
- Before requesting approval, run `guard-mutation` against the exact saved variables and the operation name defined in [shopify-cli.md](shopify-cli.md).
- Pass `--allow-mutations` only after explicit approval.
- Save query, variables, and sanitized response under `<workspace>/tmp/opsy/<operation-id>/`.
- Immediately after execution, run `check-response` with the same operation name. A zero CLI exit alone is not success.
- Save existing-object snapshots under `<workspace>/backups/<operation-id>/`.
- Record outcome, not credentials, in `<workspace>/ai-log/operations-log.md`.
- Stop on CLI failure, top-level GraphQL errors, mutation `userErrors`, store mismatch, scope mismatch, or readback mismatch.
- Do not retry a mutation blindly. Read current state before deciding whether a retry is safe.

For `metafields-set`, read the current value and carry its returned `compareDigest` into the approved variables. Use explicit `null` only for a confirmed create-if-absent operation. A missing digest is never accepted.

## Credential hygiene

Never open, print, copy, summarize, or commit Shopify CLI credential stores, `.env` secrets, tokens, cookies, private keys, OAuth refresh data, or Authorization headers. Use `auth-stores` only for the local registration inventory; use `ensure-auth` for live store/scope verification. A local auth listing or `store info` metadata alone cannot prove an operational token is valid.
