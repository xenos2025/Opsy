import test from "node:test";
import assert from "node:assert/strict";
import { prepareVariantUpdate, prepareArticleSeo, verifyWriteFields } from "../skills/opsy/scripts/lib/write-fields.mjs";
import { validateGraphqlResponse } from "../skills/opsy/scripts/lib/guard.mjs";

test("single existing variant maps SKU to inventoryItem and compares normalized price", () => {
  const payload = { handle: "component", variant: { sku: "X-1", price: "12.50" } };
  const response = { data: { product: { id: "gid://shopify/Product/1", handle: "component", variants: { nodes: [{ id: "gid://shopify/ProductVariant/2", sku: "X-1", price: "12.5" }] } } } };
  const prepared = prepareVariantUpdate(payload, response);
  assert.equal(prepared.validation.ok, true);
  assert.deepEqual(prepared.variables.variants, [{ id: "gid://shopify/ProductVariant/2", inventoryItem: { sku: "X-1" }, price: "12.5" }]);
  assert.equal(verifyWriteFields("product", payload, response).ok, true);
  response.data.product.variants.nodes[0].sku = "wrong";
  assert.equal(verifyWriteFields("product", payload, response).ok, false);
  response.data.product.variants.nodes.push({ id: "gid://shopify/ProductVariant/3" });
  assert.throws(() => prepareVariantUpdate(payload, response), /single/);
});

test("Blog SEO uses global keys and read-before-write compareDigest", () => {
  const payload = { article: { handle: "guide", seoTitle: "Buyer guide", metaDescription: "Choose the right component" } };
  const response = { data: { article: { id: "gid://shopify/Article/1", handle: "guide", seoTitle: null, seoDescription: { type: "single_line_text_field", compareDigest: "digest", value: "old" } } } };
  const prepared = prepareArticleSeo(payload, response);
  assert.equal(prepared.validation.ok, true);
  assert.deepEqual(prepared.variables.metafields.map((v) => [v.namespace, v.key, v.compareDigest]), [["global", "title_tag", null], ["global", "description_tag", "digest"]]);
  assert.equal(verifyWriteFields("blog", payload, response).ok, false);
  response.data.article.seoTitle = { value: "Buyer guide" };
  response.data.article.seoDescription.value = payload.article.metaDescription;
  assert.equal(verifyWriteFields("blog", payload, response).ok, true);
  delete response.data.article.seoTitle;
  assert.throws(() => prepareArticleSeo(payload, response), /Read SEO/);
});

test("new response contracts reject empty returned objects", () => {
  assert.equal(validateGraphqlResponse({ data: { productVariantsBulkUpdate: { productVariants: [{}] } } }, "product-variant-update").ok, false);
  assert.equal(validateGraphqlResponse({ data: { fileCreate: { files: [{}] } } }, "image-file-create").ok, false);
  assert.equal(validateGraphqlResponse({ data: { stagedUploadsCreate: { stagedTargets: [{}] } } }, "staged-image-upload").ok, false);
});
