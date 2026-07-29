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

test("existing object update guards keep publication changes explicit", () => {
  assert.equal(
    validateMutationVariables("product-update", {
      product: { id: "gid://shopify/Product/1", title: "Updated" },
    }).ok,
    true,
  );
  assert.equal(
    validateMutationVariables("product-update", {
      product: { id: "gid://shopify/Product/1", status: "ACTIVE" },
    }).ok,
    false,
  );
  assert.equal(
    validateMutationVariables("article-update", {
      id: "gid://shopify/Article/1",
      article: { title: "Updated" },
    }).ok,
    true,
  );
  assert.equal(
    validateMutationVariables("article-update", {
      id: "gid://shopify/Article/1",
      article: { isPublished: true },
    }).ok,
    false,
  );
  assert.equal(
    validateMutationVariables("article-publish", {
      id: "gid://shopify/Article/1",
      article: { isPublished: true },
    }).ok,
    true,
  );
  assert.equal(
    validateMutationVariables("article-schedule", {
      id: "gid://shopify/Article/1",
      article: { publishDate: "2026-08-01T00:00:00Z" },
    }).ok,
    true,
  );
  assert.equal(
    validateMutationVariables("article-schedule", {
      id: "gid://shopify/Article/1",
      article: { publishDate: "tomorrow" },
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
    validateGraphqlResponse(
      {
        data: {
          productCreate: {
            product: { id: "gid://shopify/Product/1" },
            userErrors: [],
          },
        },
      },
      "product-create-draft",
    ).ok,
    true,
  );
  assert.equal(
    validateGraphqlResponse(
      {
        data: {
          productCreate: {
            product: null,
            userErrors: [{ field: ["product", "title"], message: "Required" }],
          },
        },
      },
      "product-create-draft",
    ).ok,
    false,
  );
  assert.equal(
    validateGraphqlResponse(
      { errors: [{ message: "Denied" }] },
      "product-create-draft",
    ).ok,
    false,
  );
});

test("GraphQL response guard rejects missing expected mutation objects", () => {
  const result = validateGraphqlResponse(
    {
      data: {
        productCreate: {
          product: null,
          userErrors: [],
        },
      },
    },
    "product-create-draft",
  );
  assert.equal(result.ok, false);
  assert.deepEqual(result.contract_errors, [
    "expected data.productCreate.product.id in GraphQL response",
  ]);
});

test("metafield updates require explicit compareDigest concurrency intent", () => {
  assert.equal(
    validateMutationVariables("metafields-set", {
      metafields: [
        {
          ownerId: "gid://shopify/Product/1",
          namespace: "custom",
          key: "material",
          value: "Cotton",
        },
      ],
    }).ok,
    false,
  );
  assert.equal(
    validateMutationVariables("metafields-set", {
      metafields: [
        {
          ownerId: "gid://shopify/Product/1",
          namespace: "custom",
          key: "material",
          value: "Cotton",
          compareDigest: null,
        },
      ],
    }).ok,
    true,
  );
});
