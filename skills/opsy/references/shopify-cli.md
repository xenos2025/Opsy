# Shopify CLI Store channel

Verified basis: Shopify CLI and Admin GraphQL official documentation checked 2026-07-29, Asia/Shanghai.

## Supported toolchain

Read `assets/toolchain.json`. V1 was validated with:

- Shopify CLI `4.5.2`;
- Node.js `>=22.12.0`;
- Git `>=2.28.0`;
- Admin GraphQL API `2026-07`.

Before changing the pinned versions, recheck official Shopify documentation, local CLI help, templates, and tests.

## Install

When prerequisites are already satisfied and the operator approves the global npm change:

```text
npm install -g @shopify/cli@4.5.2
```

Do not substitute `@latest` in persistent instructions. If another CLI version exists, report it and verify compatibility; do not upgrade blindly.

## Scope packs

Use the executable plan and recovery flow in
[authorization-lifecycle.md](authorization-lifecycle.md). The catalog at
`assets/authorization-scopes.json` defaults to the complete three-function
core, with optional redirects/extended profile. During recovery request the
whole previously confirmed plan, not only a failing operation's scope.

The following mappings explain individual capabilities:

- profile reads: `read_products,read_content,read_online_store_navigation,read_publications,read_themes,read_markets`;
- product draft/update: `write_products`;
- product publication: `write_publications`;
- article create/update: `write_content`;
- redirects: `write_online_store_navigation`.
- local image upload: `read_files,write_files`; receipt refresh needs `read_files`.

Shopify mutations also require the matching read scope for validation and readback; keep `read_products`, `read_publications`, `read_content`, and `read_online_store_navigation` when their corresponding write packs are selected. Product media readback can require additional file or image read scopes depending on the returned media type and current schema. Inspect the validated query's reported scopes before authentication and request only the types actually used.

Confirm current official scope names before live authentication. Reauthenticate interactively when a needed scope is missing:

```text
shopify store auth --store <store.myshopify.com> --scopes <comma-separated-scopes>
```

## Execute

Use files to reduce quoting errors:

```text
shopify store execute --store <store.myshopify.com> --version 2026-07 --query-file <query.graphql> --variable-file <variables.json> --output-file <response.json> --json
```

For an approved mutation, add:

```text
--allow-mutations
```

Mutations are disabled by default by Shopify CLI. Never add the flag before the exact operation is approved.

Before presenting an approval preview, validate the saved variables:

```text
node <skill-root>/scripts/opsy.mjs guard-mutation --operation <name> --variables <variables.json> --json
```

Supported operation names are `product-create-draft`, `product-update`, `product-variant-update`, `product-activate`, `article-create-draft`, `article-update`, `article-publish`, `article-schedule`, `publishable-publish`, `url-redirect-create`, `metafields-set`, `staged-image-upload`, and `image-file-create`. Do not relabel one operation as another to bypass a guard. The image helper keeps signed temporary staging material in memory and records a sanitized receipt; see [workflow-image-upload.md](workflow-image-upload.md).

After execution, validate the saved response against the same operation:

```text
node <skill-root>/scripts/opsy.mjs check-response --operation <name> --response <response.json> --json
```

## Verify

Treat all of these as failure:

- non-zero CLI exit;
- wrong store or version;
- top-level GraphQL `errors`;
- non-empty operation `userErrors`;
- missing operation-specific returned object or identifier;
- readback mismatch.

For asynchronous product media, verify the returned media state and report pending processing honestly.

## Official references

- `https://shopify.dev/docs/api/shopify-cli`
- `https://shopify.dev/docs/api/shopify-cli/store/store-auth`
- `https://shopify.dev/docs/api/shopify-cli/store/store-execute`
- `https://shopify.dev/docs/api/admin-graphql/2026-07`

Use these as authority over bundled examples when platform behavior changes.
