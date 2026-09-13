# Local image to a verified Shopify URL

Use this bundled workflow for merchant-confirmed Product or Blog images. It
needs no image-generation or other Skill. Confirm rights, product assignment,
visual relevance and alt text before upload. Use Node >=22.12.0 and the
existing Shopify CLI Store authentication. `read_files` and `write_files`
are required for upload; check current official scopes before requesting them.

## Preview and approval

```text
node <skill-root>/scripts/opsy.mjs upload-image --project <project-root> --file inbox/products/component.png --store <store.myshopify.com> --alt "Confirmed component description" --json
```

Preview reads the local image only. The plan names the store, relative image
path, SHA-256, alt text and exact three operations: stage an image, upload its
bytes, create a Shopify image file. Show this plan and its side effects before
asking approval. Current supported intake: PNG, JPEG or WebP up to 16 MiB;
convert other formats locally only after preserving and reviewing the original.

After actual approval, the agent records a customer-local approval file:

```json
{
  "plan_sha256": "<exact preview hash>",
  "store": "<store.myshopify.com>",
  "approved_at": "<ISO time with timezone>",
  "evidence_ref": "<retained approval reference>"
}
```

Run the same preview command with `--approval inbox/approvals/image-r1.json
--apply`. Store mismatch, stale/changed image plan, or missing exact approval
blocks execution. An approval JSON is a record of real approval, never a
substitute for it. Signed staging targets and form parameters remain in
memory; do not save them, enable verbose CLI output, or paste them into chat.
This is the temporary-upload exception to saving ordinary mutation variables.

## Verify and bind

The helper checks mutation responses, keeps the file ID immediately, and
makes at most three readback attempts. It writes a sanitized receipt under
`outputs/media/<plan-hash>.json`, containing image hash, store, file ID,
status and a public URL only after `READY`.
The receipt also names the last attempted phase for handoff.

- `ready`: compare the original hash and product assignment, then use the
  returned URL in the package. Product keeps both local `path` and uploaded
  `src`; its first overview image remains first. Blog updates featured/inline
  URLs and matching `mediaMappings` together, preserving `sourceRef`.
- `pending_verification` with file ID: use the read-only refresh below.
- Unknown file ID after timeout: inspect Shopify Files by the hash filename
  and store before deciding whether another upload is necessary. Do not
  delete the pending receipt to trigger a blind retry.
  Once retained readback conclusively establishes that no file was created,
  preserve the old receipt under a unique `outputs/media/recovery/` path with
  that recovery evidence, then prepare a fresh exact approval before retrying.

```text
node <skill-root>/scripts/opsy.mjs refresh-image-upload --project <project-root> --store <store.myshopify.com> --receipt outputs/media/<plan-hash>.json --json
```

Refresh performs a read-only Shopify query. Add `--apply` only to update the
local receipt; it does not upload or create anything. A duplicate upload plan
is refused while its receipt exists. This upload receipt proves file readiness,
not attachment to a Product/Blog: verify attachment and rendered image after
the separately approved content write, then include the receipt in the result
bundle. If store scopes or the CLI are unavailable, retain local preparation,
the exact missing dependency and next owner; do not claim upload completion.

## Verified basis

Checked 2026-09-13, Asia/Shanghai: current official GraphQL validator accepted
the bundled staging, file-create and image-readback templates. Local Shopify
CLI 4.7.1 help supports the parameters used; distributed baseline remains
4.5.2 and no installation/version change was performed. Real store upload
and processing require live confirmation.

- [StagedUploadsCreate](https://shopify.dev/docs/api/admin-graphql/2026-07/mutations/stagedUploadsCreate)
- [FileCreate](https://shopify.dev/docs/api/admin-graphql/2026-07/mutations/fileCreate)
