# Shared Product and Blog content voice

Read this contract before creating or updating product titles, descriptions,
FAQ copy, Blog drafts, or published buyer-facing content. Pair it with
[buyer-faq-contract.md](buyer-faq-contract.md): FAQ supplies qualified buyer
questions and answers; voice governs expression, not business facts.

## Source and compatibility

Use `<workspace>/config/content_voice.json` when present. Only when absent,
read legacy `config/store-profile.json#profile.content_voice`. Never merge
them or fall back from an invalid, incomplete, or unconfirmed independent file.
Keep both originals unchanged during inspection. New workspaces get the
independent file; init does not migrate existing customers.

For deliberate migration, preview the old confirmed fields and proposed file,
retain the original profile, add `schema_version: content-voice-v1`, then
validate. Missing facts stay unconfirmed. Existing same-name provider files
must be checked against this contract before use, not assumed compatible.

## Fields

| Field | Requirement for ready |
| --- | --- |
| `schema_version` | `content-voice-v1` in the independent file |
| `status` | `ready`; starter value is `not_started` |
| `role` | Non-empty seller role |
| `expertise` | Non-empty list of real competencies |
| `buyer_relationship` | Non-empty description of whom the seller helps |
| `tone` | Non-empty list of tone requirements |
| `must_do` | Non-empty list of required writing behaviors |
| `must_not` | Non-empty list of prohibited claims or expressions |
| `signature_proof` | List of evidence angles; empty is allowed without verified proof |
| `example_phrasing` | Optional text, not a source of unverified product claims |
| `updated_at` | Confirmation timestamp with timezone |

Every list entry is non-empty text. Missing or invalid fields block Product
and Blog writing, including minimal Product drafts. Connection setup and
unrelated workflows do not require a ready voice.

## Use in both workflows

1. Read the effective file and check `status.content_voice` for source,
   validation errors and missing fields. For an independent file:

   ```text
   node <skill-root>/scripts/opsy.mjs validate-content-voice --file <workspace>/config/content_voice.json --json
   ```

   Exit 0 means ready; exit 2 means invalid or incomplete. A valid empty
   template can have `ok: true` while `ready: false`.
2. Confirm missing preferences with the merchant, one question at a time.
   Service providers may prepare the file; merchants need not edit JSON.
3. Select task-specific FAQ evidence using `select-faq` and
   `select-content-context`. The latter includes the effective voice and its
   source; its profile fingerprint includes the current voice.
4. Apply the role, expertise, tone, required behaviors and prohibitions across
   Product title/description/FAQ or Blog body/FAQ/CTA. Do not treat style or
   proof angles as verified MOQ, certification, delivery or performance facts.
5. Validate the content package and review actual prose against these rules.
   Scripts validate configuration structure and readiness, not full semantic
   adherence. A changed voice invalidates saved content-context selections;
   reselect and review drafts before writing.

The CLI resolves the effective voice in memory for Product, Blog, batch,
preview and context-selection commands. Library callers pass the effective
profile from `loadContentProfile(workspaceRoot)`. It never writes the resolved
voice back into the store profile or alters authorization.
