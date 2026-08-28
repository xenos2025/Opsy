# Opsy repository instructions

This repository builds and distributes **Opsy — Guided Shopify Operations**. It is a provider-neutral Skill project, not a customer store workspace.

## Boundaries

- Keep the only registered Skill at `skills/opsy/`.
- Keep `skills/opsy/SKILL.md` concise and link every reference directly.
- Keep client names, domains, IDs, credentials, raw exports, and project-specific rules out of the distributable Skill.
- Never copy the Skill into generated customer workspaces.
- Preserve existing customer `AGENTS.md`, `shopify-ops.json`, profiles, manifests, outputs, and inbox files.

## Shopify authority

- Verify CLI commands, access scopes, GraphQL fields, mutations, and API versions against current official Shopify documentation and CLI help.
- Treat bundled GraphQL files as reviewed templates, not permanent authority.
- Keep mutations disabled until an exact operation has explicit approval.
- Never read or log Shopify CLI credential storage, access tokens, cookies, private keys, or Authorization headers.

## Changes

- Edit source files with focused patches.
- Update `VERSION`, `opsy-release.json`, `skills/opsy/VERSION`, toolchain metadata, `CHANGELOG.md`, and user-facing version text together when releasing.
- Validate frontmatter, references, scripts, installers, tests, and residue before publishing.
- Use Node built-ins for runtime helpers; do not add an end-user package-install step without a documented need.

## Verification

Run:

```text
npm test
npm run validate
python <skill-creator>/scripts/quick_validate.py skills/opsy
```

Also dry-run both host installers and inspect `git diff --check`.
