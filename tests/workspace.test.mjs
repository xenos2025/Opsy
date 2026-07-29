import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  initializeWorkspace,
  inspectState,
  readJson,
  writeJson,
} from "../skills/opsy/scripts/lib/workspace.mjs";

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "opsy-workspace-"));
}

function cleanup(directory) {
  fs.rmSync(directory, { recursive: true, force: true });
}

test("new project preview is read-only and apply creates the minimal workspace", () => {
  const project = tempProject();
  try {
    const preview = initializeWorkspace({ projectPath: project, agents: "auto", apply: false });
    assert.equal(preview.action, "create-workspace");
    assert.equal(preview.applied, false);
    assert.equal(fs.existsSync(path.join(project, "shopify-ops.json")), false);

    const applied = initializeWorkspace({ projectPath: project, agents: "auto", apply: true });
    assert.equal(applied.applied, true);
    assert.equal(readJson(path.join(project, "shopify-ops.json")).workspace, "shopify-ops");
    assert.equal(fs.existsSync(path.join(project, "AGENTS.md")), true);
    assert.equal(
      fs.existsSync(path.join(project, "shopify-ops", "config", "store-profile.json")),
      true,
    );
    assert.equal(fs.existsSync(path.join(project, "shopify-ops", "inbox", "products")), true);

    const state = inspectState(project);
    assert.equal(state.state, "connection_required");
    assert.equal(state.banner, "店铺连接未完成");
  } finally {
    cleanup(project);
  }
});

test("existing AGENTS.md is preserved", () => {
  const project = tempProject();
  try {
    const agentsPath = path.join(project, "AGENTS.md");
    fs.writeFileSync(agentsPath, "existing rules\n", "utf8");
    initializeWorkspace({ projectPath: project, agents: "yes", apply: true });
    assert.equal(fs.readFileSync(agentsPath, "utf8"), "existing rules\n");
  } finally {
    cleanup(project);
  }
});

test("existing _project receives only a marker", () => {
  const project = tempProject();
  try {
    const legacy = path.join(project, "_project");
    fs.mkdirSync(legacy);
    fs.writeFileSync(path.join(legacy, "existing.txt"), "keep\n", "utf8");

    const result = initializeWorkspace({ projectPath: project, agents: "no", apply: true });
    assert.equal(result.action, "add-marker");
    assert.equal(result.markerOnly, true);
    assert.equal(readJson(path.join(project, "shopify-ops.json")).workspace, "_project");
    assert.equal(fs.existsSync(path.join(legacy, "config", "store-profile.json")), false);
    assert.equal(fs.readFileSync(path.join(legacy, "existing.txt"), "utf8"), "keep\n");
  } finally {
    cleanup(project);
  }
});

test("connection and profile gates unlock writes in order", () => {
  const project = tempProject();
  try {
    initializeWorkspace({ projectPath: project, agents: "auto", apply: true });
    const profilePath = path.join(
      project,
      "shopify-ops",
      "config",
      "store-profile.json",
    );
    const profile = readJson(profilePath);
    profile.store.myshopify_domain = "example.myshopify.com";
    profile.connection.status = "connected";
    profile.connection.smoke_test.status = "passed";
    writeJson(profilePath, profile);

    assert.equal(inspectState(project).state, "profile_required");

    profile.profile.status = "complete";
    profile.profile.verified_at = "2026-07-29T00:00:00Z";
    writeJson(profilePath, profile);

    const ready = inspectState(project);
    assert.equal(ready.state, "write_ready");
    assert.equal(ready.banner, "运营写入就绪");
    assert.deepEqual(ready.choices, [
      "运营周报",
      "商品运营",
      "Blog 与内容",
      "404 处理",
      "上月数据查询 / 数据更新",
      "连接与店铺档案",
    ]);
  } finally {
    cleanup(project);
  }
});
