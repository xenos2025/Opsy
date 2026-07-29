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

1. Present the validated product package.
2. Approval A creates only a Shopify `DRAFT`.
3. Read back ID, title, handle, status, fields, metafields, and media state.
4. Approval B activates and publishes to the exact selected publications.

### New article

1. Present the validated article package.
2. Approval A creates with `isPublished: false`.
3. Read back ID, blog, title, handle, publication state, body, summary, tags, and image.
4. Approval B publishes immediately or schedules the exact displayed time.

### Existing object update

1. Save a pre-write snapshot.
2. Show an exact before/after diff.
3. Obtain one approval for that exact diff.
4. Update and read back.

Treat product or article handle changes as a separate risk operation and add the old path to 404 handling.

### Redirect set

Approve only the selected, individually verified `path → target` pairs. Do not infer approval for the rest of the queue.

## Execution rules

- Use the same Shopify CLI Store channel for pre-read, mutation, and readback.
- Pass `--allow-mutations` only after explicit approval.
- Save query, variables, and sanitized response under `<workspace>/tmp/opsy/<operation-id>/`.
- Save existing-object snapshots under `<workspace>/backups/<operation-id>/`.
- Record outcome, not credentials, in `<workspace>/ai-log/operations-log.md`.
- Stop on CLI failure, top-level GraphQL errors, mutation `userErrors`, store mismatch, scope mismatch, or readback mismatch.
- Do not retry a mutation blindly. Read current state before deciding whether a retry is safe.

## Credential hygiene

Never open, print, copy, summarize, or commit Shopify CLI credential stores, `.env` secrets, tokens, cookies, private keys, OAuth refresh data, or Authorization headers. Check authentication with `shopify store auth list`, `shopify store info`, or a scoped read query.
