# Shopify operations workspace

This directory stores the enterprise profile, provider-delivered data snapshots, incoming materials, Product/Blog packages, exactly-three action plans, write backups, and a sanitized operation log. Data is optional for Product and required for Blog.

Start Opsy from the project root and let it read `shopify-ops.json`. Do not place credentials, tokens, cookies, private keys, OAuth data, or Authorization headers here.

## Working folders

- `config/`: confirmed store profile, operating facts, and routed buyer FAQ evidence.
- `data-center/`: active monthly datasets, manifest, and archives.
- `inbox/`: product, content, FAQ, and data materials awaiting processing.
- `outputs/`: generated reports, previews, queues, and article/product packages.
- `ai-log/`: sanitized operation and handle-change history.
- `backups/`: pre-write Shopify object snapshots.
- `tmp/`: operation-scoped query, variable, and response files.

The generated `.gitignore` keeps inboxes, outputs, backups, and temporary files local by default.

Opsy does not ask the enterprise owner to configure Google API access. A
missing data package does not block merchant-led Product work. Blog prefers
provider-delivered GSC and GA4 datasets; on a new site, accepted FAQ questions
may seed a clearly labeled non-numeric cold-start topic list. A question does
not make its draft answer publishable. If neither source is
usable, Blog stays `scoring_blocked`. This workspace also does not produce
Tracking, Core Web Vitals, structured-data, or other technical site-foundation
reports.

The audience HTML tool downloads dated evidence to `inbox/profile/`; it does
not create another config file. Only confirmed summary fields belong in
`config/store-profile.json`.
