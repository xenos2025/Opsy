import assert from "node:assert/strict";
import test from "node:test";
import {
  validateGraphqlResponse,
  validateMutationVariables,
} from "../skills/opsy/scripts/lib/guard.mjs";

test("product draft guard requires DRAFT", () => {
  assert.equal(
    validateMutationVariables("product-create-draft", {
      product: { title: "Sample", status: "DRAFT" },
    }).ok,
    true,
  );
  assert.equal(
    validateMutationVariables("product-create-draft", {
      product: { title: "Sample", status: "ACTIVE" },
    }).ok,
    false,
  );
});

test("article draft guard blocks publication and schedules", () => {
  assert.equal(
    validateMutationVariables("article-create-draft", {
      article: { title: "Sample", isPublished: false },
    }).ok,
    true,
  );
  assert.equal(
    validateMutationVariables("article-create-draft", {
      article: {
        title: "Sample",
        isPublished: false,
        publishDate: "2026-08-01T00:00:00Z",
      },
    }).ok,
    false,
  );
});

test("redirect guard requires a safe explicit pair", () => {
  assert.equal(
    validateMutationVariables("url-redirect-create", {
      urlRedirect: { path: "/old", target: "/new" },
    }).ok,
    true,
  );
  assert.equal(
    validateMutationVariables("url-redirect-create", {
      urlRedirect: { path: "/same", target: "/same" },
    }).ok,
    false,
  );
});

test("GraphQL response guard catches top-level and mutation user errors", () => {
  assert.equal(
    validateGraphqlResponse({
      data: { productCreate: { product: { id: "gid://shopify/Product/1" }, userErrors: [] } },
    }).ok,
    true,
  );
  assert.equal(
    validateGraphqlResponse({
      data: {
        productCreate: {
          product: null,
          userErrors: [{ field: ["product", "title"], message: "Required" }],
        },
      },
    }).ok,
    false,
  );
  assert.equal(validateGraphqlResponse({ errors: [{ message: "Denied" }] }).ok, false);
});
