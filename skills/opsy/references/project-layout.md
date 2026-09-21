# Project and workspace layout

## Locate

Prefer a root-level `shopify-ops.json`:

```json
{
  "schema_version": "opsy-project-v1",
  "skill": "opsy",
  "workspace": "shopify-ops"
}
```

`workspace` must be a relative path contained by the project root.

## New project

Read [client-config-standard.md](client-config-standard.md) for the initial
inventory, per-file purpose, consumers, and provider handover boundaries.
`node <skill-root>/scripts/opsy.mjs list-configs --json` lists the
six config files (including the prompt CSV) and all eleven workspace templates without a client project.

Preview with:

```text
node <skill-root>/scripts/opsy.mjs init --project <project-root>
```

Apply only after confirmation:

```text
node <skill-root>/scripts/opsy.mjs init --project <project-root> --apply
```

The default result is:

```text
project/
  shopify-ops.json
  AGENTS.md                  # only for a new empty project or separate approval
  shopify-ops/
    README.md
    .gitignore
    config/store-profile.json
    config/business-questionnaire.md
    config/buyer_faq.json
    config/ai_search_intent.json
    config/ai-search/prompts.csv
    config/content_voice.json
    data-center/manifest.json
    data-center/archive/
    inbox/products/
    inbox/content/
    inbox/faq/
    inbox/profile/
    inbox/data/
    outputs/
    ai-log/operations-log.md
    ai-log/handle-changes.csv
    backups/
    tmp/
```

The initializer adds missing files only. It never overwrites existing files.
An existing profile with inline voice does not receive an empty independent
voice template. With a marker, init still only backfills FAQ and intake folders;
voice migration requires an explicit reviewed change.
An existing `config/faq-library.json` is preserved as legacy evidence and
reported for manual migration into `buyer_faq.json`.

## Repository project

If the marker exists, validate and use its workspace even when named `_project/`. Do not rebuild, rename, or copy the Skill into it.

If `_project/` exists without a marker, preview adding only `shopify-ops.json`. Do not populate or modify `_project/` during that marker-only action.

## Project rules

- Keep an existing `AGENTS.md` unchanged.
- For a new empty project, `--agents auto` may create the bundled baseline.
- For an existing project without rules, require `--agents yes` after separate confirmation.
- Client README files are workspace instructions, not replacements for project rules.

## Version control

The default workspace `.gitignore` excludes:

- `inbox/`;
- `outputs/`;
- `backups/`;
- `tmp/`.

It leaves `config/`, `data-center/`, `ai-log/`, and workspace documentation available for intentional commits. Never commit credentials.
