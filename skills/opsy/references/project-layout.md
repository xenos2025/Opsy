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
