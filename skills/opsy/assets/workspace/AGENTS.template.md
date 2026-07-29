# Shopify operations project

This project uses Opsy for guided Shopify operations.

## Safety

- Preserve existing files and customer materials.
- Keep credentials and Shopify CLI auth state outside the project.
- Require exact previews and explicit approval for Shopify writes.
- Create new products and Blog articles as non-public drafts first.
- Require a separate approval before publication.
- Back up existing objects before updates and verify changes through the same Shopify CLI Store channel.

## Data

- Treat `data-center/manifest.json` as the active monthly-data contract.
- State date ranges, timezone, source, and freshness in data-backed outputs.
- Do not claim real-time Google data unless a separate live connection is explicitly verified.

## Scope

V1 is for B2B inquiry-site operations. Orders, refunds, checkout, accounts, inventory replenishment, discounts, tax, logistics, and advertising are outside scope.
