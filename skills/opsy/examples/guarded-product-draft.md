# Guarded product draft

Use this case to test the product workflow without granting publication approval.

## Starting state

- `status` reports `write_ready`.
- `write_capabilities.products.write_ready` is `true`.
- The target is `<store>.myshopify.com`.
- Reviewed variables set product status to `DRAFT`.

## Operator goal

Create one non-public product draft and verify its saved state.

## Expected flow

1. Reconfirm the target store and read current product evidence through Shopify CLI Store.
2. Save the exact query and variables locally.
3. Run `guard-mutation` with operation `product-create-draft`.
4. Show the field-level preview, expected effect, and readback plan.
5. Obtain Approval A for the exact draft operation.
6. Execute the reviewed mutation variables.
7. Run `check-response` with the same operation name.
8. Read the created product back through the same channel.

## Completion evidence

- The mutation command succeeded.
- The operation-specific response check passed.
- Readback confirms the approved fields and `DRAFT` status.
- The sanitized outcome and local artifacts were recorded.
- Publication remains pending Approval B.
