import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { loadContentProfile, profileVoiceStatus, validateContentVoice } from "../skills/opsy/scripts/lib/content-voice.mjs";
import { initializeWorkspace, inspectState, skillRoot, summarizeStoreRole } from "../skills/opsy/scripts/lib/workspace.mjs";
import { selectContentContext, validateContentReuse } from "../skills/opsy/scripts/lib/content-reuse.mjs";

function voice() {
  return { schema_version: "content-voice-v1", status: "ready", role: "Sales engineer",
    expertise: ["Application fit"], buyer_relationship: "Help procurement engineers select parts",
    tone: ["Clear"], must_do: ["Use confirmed evidence"], must_not: ["Invent performance"],
    signature_proof: [], example_phrasing: null, updated_at: "2026-09-21T09:00:00+08:00" };
}
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "opsy-voice-"));
  t.after(() => {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(root, { recursive: true, force: true });
  });
  initializeWorkspace({ projectPath: root, agents: "no", apply: true });
  const workspace = path.join(root, "shopify-ops");
  const file = path.join(workspace, "config", "content_voice.json");
  const profilePath = path.join(workspace, "config", "store-profile.json");
  return { root, workspace, file, profilePath };
}
const write = (file, value) => fs.writeFileSync(file, JSON.stringify(value));

test("voice readiness rejects empty shells and wrong types, accepts proof-free confirmed voice", () => {
  assert.equal(validateContentVoice(voice(), { standalone: true }).ready, true);
  for (const invalid of [
    { status: "ready" }, { ...voice(), tone: 123 }, { ...voice(), must_not: [""] },
    { ...voice(), updated_at: "2026-09-21" }, { ...voice(), buyer_relationship: "" },
    { ...voice(), signature_proof: "claim" }, { ...voice(), schema_version: "unknown" },
    null, [],
  ]) assert.equal(validateContentVoice(invalid, { standalone: true }).ready, false);
});

test("new workspace uses one independent voice and validator distinguishes template from ready", (t) => {
  const f = fixture(t);
  assert.equal(JSON.parse(fs.readFileSync(f.profilePath)).profile.content_voice, undefined);
  const run = () => spawnSync(process.execPath, [path.join(skillRoot, "scripts/opsy.mjs"),
    "validate-content-voice", "--file", f.file, "--json"], { encoding: "utf8" });
  let result = run();
  assert.equal(result.status, 2);
  assert.equal(JSON.parse(result.stdout).ok, true);
  assert.equal(inspectState(f.root).content_voice.ready, false);
  write(f.file, voice());
  result = run();
  assert.equal(result.status, 0);
  assert.equal(inspectState(f.root).content_voice.source, "config/content_voice.json");
  assert.equal(inspectState(f.root).content_voice.ready, true);
});

test("independent voice wins; invalid JSON blocks; absent file falls back without mutating profile", (t) => {
  const f = fixture(t);
  const profile = JSON.parse(fs.readFileSync(f.profilePath));
  profile.profile.content_voice = { ...voice(), role: "Legacy seller" };
  write(f.profilePath, profile);
  const original = fs.readFileSync(f.profilePath, "utf8");
  write(f.file, voice());
  assert.equal(loadContentProfile(f.workspace).profile.content_voice.role, "Sales engineer");
  write(f.file, { ...voice(), tone: 123 });
  assert.equal(profileVoiceStatus(loadContentProfile(f.workspace)).ready, false);
  fs.writeFileSync(f.file, "{broken");
  assert.throws(() => loadContentProfile(f.workspace), /content_voice.json/);
  assert.equal(inspectState(f.root).state, "workspace_invalid");
  fs.unlinkSync(f.file);
  assert.equal(profileVoiceStatus(loadContentProfile(f.workspace)).ready, true);
  assert.equal(loadContentProfile(f.workspace).profile.content_voice.role, "Legacy seller");
  initializeWorkspace({ projectPath: f.root, apply: true });
  assert.equal(fs.existsSync(f.file), false);
  assert.equal(fs.readFileSync(f.profilePath, "utf8"), original);
});

test("initialization preserves a pre-marker legacy voice and an existing independent file", (t) => {
  const f = fixture(t);
  const original = { profile: { content_voice: voice() } };
  write(f.profilePath, original);
  fs.unlinkSync(path.join(f.root, "shopify-ops.json"));
  fs.unlinkSync(f.file);
  initializeWorkspace({ projectPath: f.root, apply: true });
  assert.equal(fs.existsSync(f.file), false);
  assert.deepEqual(JSON.parse(fs.readFileSync(f.profilePath)), original);
  write(f.file, voice());
  const before = fs.readFileSync(f.file, "utf8");
  initializeWorkspace({ projectPath: f.root, apply: true });
  assert.equal(fs.readFileSync(f.file, "utf8"), before);
});

test("Product and Blog context expose effective voice and reject stale selection after voice changes", (t) => {
  const f = fixture(t);
  const profile = JSON.parse(fs.readFileSync(f.profilePath));
  profile.profile.store_role = { status: "ready", business_model: "b2b_inquiry", industry: "Components",
    primary_audience: "Engineers", audience_status: "merchant_confirmed", primary_market: "US",
    content_language: "en", conversion_goal: "inquiry" };
  profile.profile.merchant_context.product_families = ["parts"];
  write(f.profilePath, profile);
  write(f.file, voice());
  for (const [surface, job] of [["product", "pdp"], ["blog", "comparison"]]) {
    const effective = loadContentProfile(f.workspace);
    assert.equal(summarizeStoreRole(effective).status, "ready");
    const task = { surface, job, scopeKeys: ["parts"], market: "US", language: "en" };
    const selection = selectContentContext({ profile: effective, task });
    assert.equal(selection.contentVoice.value.role, "Sales engineer");
    assert.equal(selection.sourcePaths.contentVoice, "config/content_voice.json");
    const reuse = { selection, uses: [], nonUseReason: "No relevant buyer context" };
    assert.deepEqual(validateContentReuse(reuse, { profile: effective }, { surface, scopeKeys: ["parts"], job }), []);
    write(f.file, { ...voice(), tone: ["Specific", "Warm"] });
    assert.ok(validateContentReuse(reuse, { profile: loadContentProfile(f.workspace) },
      { surface, scopeKeys: ["parts"], job }).some((item) => /stale/.test(item.message)));
    write(f.file, voice());
  }
});
