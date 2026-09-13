import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { recordTaskResult, validateTaskResult, resumeTask } from "../skills/opsy/scripts/lib/task-results.mjs";

function setup(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "opsy-result-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, data) => fs.writeFileSync(path.join(root, file), typeof data === "string" ? data : JSON.stringify(data));
  write("input.json", {}); write("analysis.md", "Synthetic local report"); write("approval.md", "Synthetic approval A, exact product title and DRAFT status.");
  write("variables.json", { product: { title: "Sample", status: "DRAFT" } });
  write("response.json", { data: { productCreate: { product: { id: "gid://shopify/Product/1" }, userErrors: [] } } });
  write("readback.json", { data: { product: { id: "gid://shopify/Product/1", title: "Sample", handle: "sample", status: "DRAFT" } } });
  const result = { schema_version: "opsy-task-result-v1", task_id: "sample", run_id: "r1", workflow: "product", status: "draft_verified", store: "example.myshopify.com", goal: "Prepare one product", summary: "One draft verified", recorded_at: "2026-09-13T09:00:00+08:00", timezone: "Asia/Shanghai", basis: "Synthetic fixture", inputs: ["input.json"], artifacts: [], objects: [{ key: "sample", summary: "Draft ready for review", status: "draft_verified", id: "gid://shopify/Product/1", readback_ref: "readback.json", checks: [{ path: "data.product.title", expected: "Sample" }], operations: [{ operation: "product-create-draft", variables_ref: "variables.json", response_ref: "response.json", approval_ref: "approval.md", exit_code: 0 }] }], next_actions: [{ owner: "merchant", action: "Review draft", done_when: "Exact publication decision recorded" }] };
  return { root, write, result };
}

test("result bundle records per-object outcome and resume preserves IDs and detects changed inputs", (t) => {
  const { root, result, write } = setup(t);
  const saved = recordTaskResult(root, result, { apply: true });
  assert.equal(saved.ok, true, JSON.stringify(saved));
  for (const name of ["result.json", "report.md", "handoff.md"]) assert.equal(fs.existsSync(path.join(saved.directory, name)), true);
  assert.equal(resumeTask(root, "sample").objects[0].id, "gid://shopify/Product/1");
  assert.equal(resumeTask(root, "sample").requires_refresh, false);
  write("input.json", { changed: true });
  assert.deepEqual(resumeTask(root, "sample").changed_evidence, ["input.json"]);
  assert.throws(() => recordTaskResult(root, result, { apply: true }), { code: "EEXIST" });
});

test("result rejects empty success, wrong object, failed response, and mismatched field", (t) => {
  const { root, result, write } = setup(t);
  assert.equal(validateTaskResult(root, { ...result, objects: [] }).ok, false);
  result.objects[0].checks[0].expected = "Different";
  assert.equal(validateTaskResult(root, result).ok, false);
  result.objects[0].checks[0].expected = "Sample";
  result.objects[0].id = "gid://shopify/Product/2";
  assert.equal(validateTaskResult(root, result).ok, false);
  result.objects[0].id = "gid://shopify/Product/1";
  write("response.json", { errors: [{ message: "Synthetic failure" }] });
  assert.equal(validateTaskResult(root, result).ok, false);
});

test("partial outcome keeps successful IDs, unknown attempts and actionable handoff", (t) => {
  const { root, result } = setup(t);
  result.status = "partial";
  result.objects.push({ key: "second", status: "pending_verification", summary: "Timeout, check before retrying", id: null });
  assert.equal(recordTaskResult(root, result).ok, true);
  result.next_actions = [];
  assert.equal(validateTaskResult(root, result).ok, false);
});

test("data result needs actual artifacts and explicit evidence basis", (t) => {
  const { root, result } = setup(t);
  Object.assign(result, { workflow: "data", status: "analysis_complete", objects: [], artifacts: ["analysis.md"] });
  assert.equal(recordTaskResult(root, result).ok, true);
  result.artifacts = ["missing.md"];
  assert.equal(recordTaskResult(root, result).ok, false);
});

test("omitting an approved field from checks cannot conceal a failed write", (t) => {
  const { root, result, write } = setup(t);
  result.objects[0].checks = [{ path: "data.product.id", expected: result.objects[0].id }];
  write("variables.json", { product: { status: "DRAFT", title: "Actually approved title" } });
  const validation = validateTaskResult(root, result);
  assert.equal(validation.ok, false);
  assert.match(validation.errors.join(" "), /actual write fields differ/);
});

test("published result accepts the earlier draft operation but requires public evidence", (t) => {
  const { root, result, write } = setup(t);
  result.status = result.objects[0].status = "published_verified";
  write("readback.json", { data: { product: { id: result.objects[0].id, title: "Sample", handle: "sample", status: "ACTIVE" } } });
  result.objects[0].public_url = "https://example.com/products/sample";
  result.objects[0].public_check_ref = "public.json";
  assert.equal(validateTaskResult(root, result).ok, false);
  write("public.json", { url: result.objects[0].public_url, object_id: result.objects[0].id, ok: true, checked_at: "2026-09-13T00:00:00Z" });
  assert.equal(validateTaskResult(root, result).ok, false);
  write("publish-vars.json", { id: result.objects[0].id, input: [{ publicationId: "gid://shopify/Publication/1" }] });
  write("publish-response.json", { data: { publishablePublish: { publishable: { id: result.objects[0].id }, userErrors: [] } } });
  result.objects[0].operations.push({ operation: "publishable-publish", variables_ref: "publish-vars.json", response_ref: "publish-response.json", approval_ref: "approval.md", exit_code: 0 });
  assert.equal(validateTaskResult(root, result).ok, true);
});
