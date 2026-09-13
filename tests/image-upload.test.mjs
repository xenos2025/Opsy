import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { uploadImage, refreshImageUpload } from "../skills/opsy/scripts/lib/image-upload.mjs";

function setup(t) {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "opsy-media-"));
  t.after(() => fs.rmSync(workspaceRoot, { recursive: true, force: true }));
  fs.writeFileSync(path.join(workspaceRoot, "image.png"), Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jQ1sAAAAASUVORK5CYII=", "base64"));
  return { workspaceRoot, file: "image.png", store: "example.myshopify.com", alt: "Confirmed sample" };
}
function adapters({ pending = false, fail = false } = {}) {
  const calls = [];
  return { calls, wait: async () => {}, upload: async () => { calls.push("storage"); if (fail) throw new Error("SENSITIVE SIGNED RESPONSE"); }, execute: async (query) => {
    calls.push(query);
    if (query === "staged-image-upload.graphql") return { data: { stagedUploadsCreate: { stagedTargets: [{ url: "https://storage.googleapis.com/upload", resourceUrl: "https://storage.googleapis.com/resource", parameters: [{ name: "signature", value: "SENSITIVE SIGNED RESPONSE" }] }], userErrors: [] } } };
    if (query === "image-file-create.graphql") return { data: { fileCreate: { files: [{ id: "gid://shopify/MediaImage/1", fileStatus: "PROCESSING" }], userErrors: [] } } };
    return { data: { node: { id: "gid://shopify/MediaImage/1", fileStatus: pending ? "PROCESSING" : "READY", image: { url: "https://cdn.shopify.com/sample.png", altText: "Confirmed sample" } } } };
  } };
}
async function approved(options) {
  const preview = await uploadImage(options);
  return { ...options, apply: true, approval: { plan_sha256: preview.plan.plan_sha256, store: options.store, evidence_ref: "chat-approved-exact-plan", approved_at: "2026-09-13T08:00:00Z" } };
}

test("preview is local; exact upload approval binds file hash and store", async (t) => {
  const options = setup(t), fake = adapters();
  const preview = await uploadImage(options, fake);
  assert.equal(preview.applied, false);
  assert.equal(fake.calls.length, 0);
  await assert.rejects(uploadImage({ ...options, apply: true }, fake), /approval/);
  const request = await approved(options);
  fs.appendFileSync(path.join(options.workspaceRoot, options.file), "changed");
  await assert.rejects(uploadImage(request, fake), /approval/);
  assert.equal(fake.calls.length, 0);
});

test("image upload verifies CDN receipt, never persists signed values, and refuses duplicate upload", async (t) => {
  const options = setup(t), request = await approved(options), fake = adapters();
  const result = await uploadImage(request, fake);
  assert.equal(result.ok, true);
  assert.equal(result.public_url, "https://cdn.shopify.com/sample.png");
  assert.equal(fs.readFileSync(result.receipt_path, "utf8").includes("SENSITIVE SIGNED RESPONSE"), false);
  await assert.rejects(uploadImage(request, fake), { code: "EEXIST" });
  assert.equal(fake.calls.filter((v) => v === "staged-image-upload.graphql").length, 1);
});

test("processing stays pending and refresh only reads the known file", async (t) => {
  const options = setup(t);
  const result = await uploadImage(await approved(options), adapters({ pending: true }));
  assert.equal(result.ok, false);
  assert.equal(result.file_id, "gid://shopify/MediaImage/1");
  const fake = adapters();
  const refreshed = await refreshImageUpload({ ...options, receiptFile: path.relative(options.workspaceRoot, result.receipt_path), apply: true }, fake);
  assert.equal(refreshed.ok, true);
  assert.deepEqual(fake.calls, ["image-file-readback.graphql"]);
});

test("unknown upload failure preserves a sanitized pending receipt", async (t) => {
  const options = setup(t);
  const result = await uploadImage(await approved(options), adapters({ fail: true }));
  assert.equal(result.status, "pending_verification");
  assert.equal(JSON.stringify(result).includes("SENSITIVE SIGNED RESPONSE"), false);
  assert.equal(result.file_id, null);
});
