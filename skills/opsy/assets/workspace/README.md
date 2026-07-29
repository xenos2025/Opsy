# Shopify operations workspace

This directory stores the current store profile, monthly data snapshots, incoming materials, operational outputs, write backups, and a sanitized operation log.

Start Opsy from the project root and let it read `shopify-ops.json`. Do not place credentials, tokens, cookies, private keys, OAuth data, or Authorization headers here.

## Working folders

- `config/`: confirmed store profile and operating facts.
- `data-center/`: active monthly datasets, manifest, and archives.
- `inbox/`: product, content, and data materials awaiting processing.
- `outputs/`: generated reports, previews, queues, and article/product packages.
- `ai-log/`: sanitized operation and handle-change history.
- `backups/`: pre-write Shopify object snapshots.
- `tmp/`: operation-scoped query, variable, and response files.

The generated `.gitignore` keeps inboxes, outputs, backups, and temporary files local by default.
