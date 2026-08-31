# Enterprise audience intake contract

This is the only interactive site-foundation tool included in Opsy. It helps
an enterprise owner, sales lead, or basic operator describe the people involved
in a B2B inquiry decision. It does not generate Tracking, CWV, structured-data,
crawl, theme, or technical SEO reports.

## Open and save

Locate the bundled local-only HTML tool:

```text
node <skill-root>/scripts/opsy.mjs audience-wizard --json
```

Open the returned `index.html` locally. The tool has no network calls and saves
draft state only in that browser's local storage. Download the result as:

```text
<workspace>/inbox/profile/<YYYY-MM-DD>/audience-intake.json
```

Then validate it:

```text
node <skill-root>/scripts/opsy.mjs validate-audience-intake --file <path> --json
```

## Evidence and review states

The file uses `schema_version: opsy-audience-intake-v1` and records audience
roles, situations, decisions, objections, inquiry inputs, Product/Blog scope,
evidence references, and review state.

- `research_draft`: useful for planning, never enough for Shopify write
  readiness; retain `audience_intake_path` in the profile.
- `merchant_confirmed`: enterprise owner or responsible sales role confirmed
  the audience.
- `data_revised`: first-party trade, inquiry, or provider-delivered evidence
  revised an earlier merchant hypothesis.

Only Product and Blog are executable Opsy routes. Page, Collection, and FAQ
Hub needs are recorded as `provider_handoff`. The downloaded intake is dated
evidence, not a sixth project config file. Promote only the confirmed summary
to `profile.store_role.primary_audience`, `secondary_audiences`,
`audience_status`, and `audience_intake_path`; preserve the detailed evidence
under `inbox/profile/`.
