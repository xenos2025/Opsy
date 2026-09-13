# CLI authorization lifecycle

Opsy uses Shopify CLI directly. No Shopify plugin, MCP server, other Skill,
custom OAuth server or copied credential file is required. The CLI owns its
tokens and browser callback; Opsy owns the approved scope plan, live checks,
bounded recovery and task handoff.

## Required permissions

The machine-readable authority is `assets/authorization-scopes.json`.
Default features `products,blog,publication,media` cover the three core
workflows with eight explicit read/write scope names:

| Feature | Scopes |
| --- | --- |
| products | read_products, write_products |
| blog | read_content, write_content |
| publication | read_products, write_products, read_publications, write_publications |
| media | read_files, write_files |
| redirects, optional | read_online_store_navigation, write_online_store_navigation |
| extended_profile, optional | read_markets, read_themes |

Local provider data analysis needs no additional Shopify/Google analytics
permission. Orders, customer records, checkout and payments are outside this
scope catalog. Write scopes imply corresponding read access; the helper
retains raw granted scopes separately from its effective read/write set.

When enabling an optional feature, pass the **complete desired feature list**,
including previously enabled features. A changed store, scope plan or API
version needs updated approval. During recovery, request the whole confirmed
plan, not just the missing scopes. CLI may retain existing permissions; Opsy
does not revoke permissions used by other work.

## First use

1. Initialize the project and inspect Node/CLI prerequisites. Confirm the
   permanent `myshopify.com` domain. If needed, `auth-stores --json` lists
   locally stored CLI store registrations; a listing does not prove the token
   is valid. `store info` is store metadata, not proof of this app's scopes.
2. Build the local plan:

   ```text
   node <skill-root>/scripts/opsy.mjs auth-plan --project <project-root> --store <store.myshopify.com> --json
   ```

3. Explain the requested operations and that Shopify CLI may open a browser
   and save authorization. Obtain actual consent for this store/scope plan
   and whether the same scope plan may automatically reauthorize later.
   Reuse valid prior consent; do not ask again just because a session changed.
   The agent records the approval inside the workspace, for example:

   ```json
   {
     "plan_sha256": "<hash from auth-plan>",
     "approved_at": "<ISO time with timezone>",
     "evidence_ref": "<retained real approval reference>",
     "allow_auto_reauthorize": true
   }
   ```

4. Run:

   ```text
   node <skill-root>/scripts/opsy.mjs ensure-auth --project <project-root> --store <store.myshopify.com> --recover --approval inbox/approvals/store-auth.json --apply --json
   ```

   The helper first checks current authorization. If it is already sufficient,
   it saves the policy and verified metadata without opening OAuth. Otherwise
   it runs `shopify store auth` with all scopes in the approved plan. Ask the
   customer to finish any Shopify login/consent shown in their browser.
   Opsy cannot approve that page for them.

5. The helper rereads `shop` and `currentAppInstallation.accessScopes` using
   the same CLI channel and pinned API version. Store mismatch or missing
   scopes remain blocked. A CLI success exit or local auth listing alone
   cannot unlock writes. Update only connection verification fields in the
   existing profile; preserve business context, unknown keys and concurrent edits.

`ensure-auth` without `--apply` performs a live check only. `--recover` requires
`--apply` to open OAuth or write the recovery policy. `auth-plan` is fully local.
Never fabricate approval JSON to unlock recovery.

## Session start and expired authorization

Start operational work with:

```text
node <skill-root>/scripts/opsy.mjs status --project <project-root> --live --recover --apply --json
```

This reads the configured store, live-checks it, and saves sanitized verification
metadata. Recovery is automatic only for a matching persisted policy with
`allow_auto_reauthorize: true`. Initial or expanded scopes return
`approval_required` instead. Plain `status` is local-only and explicitly reports
that live authorization has not been checked; it does not offer writes.

Before each write group, refresh authorization again. If a read/write command
reports an authentication error during a task, preserve its outcome and run:

```text
node <skill-root>/scripts/opsy.mjs ensure-auth --project <project-root> --recover --apply --task <task-id> --json
```

The CLI may transparently refresh its own token during the read. If the check
succeeds, Opsy opens no login. If it reports missing/invalid authorization or
live scopes are insufficient, Opsy attempts the approved full-scope OAuth once,
then rechecks the server. The returned `task_resume` reloads known IDs, pending
actions and evidence changes. Continue from those IDs; inspect an interrupted
write before retrying it. Authorization recovery never replays a mutation or
turns draft approval into publication approval.

## Failure and concurrency behavior

| Status | Action |
| --- | --- |
| ready | Refresh workflow readiness; resume the saved task |
| auth_required / missing_scopes | Recover once if the matching policy permits it |
| approval_required | Show the concrete store/scope plan and obtain missing consent |
| network_error / rate_limited | Preserve work, report connection/rate issue; do not open OAuth |
| permission_denied | Ask the store administrator to check actual app/user permissions; no automatic escalation |
| store_mismatch | Stop; confirm the project and requested store |
| missing_dependency / unsupported_cli | Report the CLI dependency or compatibility issue |
| recovery_in_progress | Preserve the active recovery; do not start or kill another process |
| recovery_cooldown | A prior failed attempt is within ten minutes; report it and avoid repeated prompts |
| administrator_action_required | Recovery still could not obtain scopes or was refused; wait for an administrator or new explicit approval rather than looping |
| verification_failed / unsupported_store | Retain the blocker; inspect supported CLI/store conditions |

Interactive recovery has a three-minute timeout. Cancellation, timeout or fewer
granted scopes never counts as success; a final live read still checks whether
authorization completed despite an uncertain callback. Each attempt records a
sanitized receipt under `outputs/authorization/`. A lock prevents concurrent
recovery in the same workspace. After a crashed process, inspect the lock's
recorded PID/attempt and confirm it is no longer running before preserving the
lock as a dated recovery artifact. Do not remove an active lock automatically.

If the browser does not open, return the plan's safe `command` and guide the
customer to run it in a local terminal, then run `ensure-auth --apply` again.
Do not expose captured raw CLI output or signed OAuth URLs to work logs.
An explicit new user-approved attempt may retry after a failed attempt; never
manufacture new approval evidence to bypass the cooldown.

Connection metadata records the check time, actual scopes, CLI/API version,
store and app installation ID. It never copies access/refresh tokens or cookies.
When CLI token issue time is unknown, `authenticated_at` remains unknown; the
live check supplies connection verification evidence instead.

## Verified basis

2026-09-13, Asia/Shanghai: official API/CLI documentation and installed CLI
4.7.1 help/source were checked. That CLI implements token refresh internally;
refresh behavior of other versions is not assumed. Bundled API version is
2026-07. No real store authentication was executed during development.

- [CLI store auth](https://shopify.dev/docs/api/shopify-cli/store/store-auth)
- [CLI stored authorization list](https://shopify.dev/docs/api/shopify-cli/store/store-auth-list)
- [Current app installation and scopes](https://shopify.dev/docs/api/admin-graphql/latest/queries/currentappinstallation)
- [Shopify access scopes](https://shopify.dev/docs/api/usage/access-scopes)
