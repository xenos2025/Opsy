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

function completeConnection(profile) {
  profile.store.myshopify_domain = "example.myshopify.com";
  profile.connection.status = "connected";
  profile.connection.store_domain = "example.myshopify.com";
  profile.connection.authenticated_at = "2026-07-29T00:00:00Z";
  profile.connection.verified_at = "2026-07-29T00:05:00Z";
  profile.connection.cli_version = "4.5.2";
  profile.connection.scopes = [
    "read_products",
    "write_products",
    "read_content",
    "write_content",
    "read_online_store_navigation",
    "write_online_store_navigation",
    "read_publications",
    "write_publications",
  ];
  profile.connection.smoke_test.status = "passed";
  profile.connection.smoke_test.verified_at = "2026-07-29T00:05:00Z";
}

function completeProfile(profile) {
  profile.store.id = "gid://shopify/Shop/1";
  profile.store.name = "Example";
  profile.store.primary_domain = "example.com";
  profile.store.currency = "USD";
  profile.store.iana_timezone = "Asia/Shanghai";
  profile.profile.status = "complete";
  profile.profile.completed_at = "2026-07-29T00:10:00Z";
  profile.profile.verified_at = "2026-07-29T00:10:00Z";
  profile.profile.languages = ["en"];
  profile.profile.markets = ["United States"];
  profile.profile.primary_inquiry_cta = "Request a quote";
  profile.profile.publications = [
    { id: "gid://shopify/Publication/1", name: "Online Store" },
  ];
  profile.profile.blogs = [{ id: "gid://shopify/Blog/1", name: "News" }];
  profile.profile.metafield_definitions = [
    {
      owner_type: "PRODUCT",
      namespace: "custom",
      key: "material",
      type: "single_line_text_field",
    },
  ];
  profile.profile.publication_policy = "Draft first; publish after separate approval";
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

test("agency workspace is detected without claiming the store is disconnected", () => {
  const project = tempProject();
  try {
    const workspace = path.join(project, "_project");
    fs.mkdirSync(path.join(workspace, "config"), { recursive: true });
    fs.mkdirSync(path.join(workspace, "ai-log"), { recursive: true });
    fs.writeFileSync(
      path.join(project, "shopify-ops.json"),
      '{"workspace":"_project","layout_version":1}\n',
      "utf8",
    );
    fs.writeFileSync(
      path.join(workspace, "config", "site_profile.json"),
      '{"schema_version":"site-profile-v1"}\n',
      "utf8",
    );

    const state = inspectState(project);
    assert.equal(state.state, "connection_required");
    assert.equal(state.workspace_overlay, "agency_workspace");
    assert.equal(state.banner, "已识别服务商工作区；Opsy 尚未启用");
    assert.ok(state.choices.includes("导入服务商已审核任务"));
    assert.doesNotMatch(state.banner, /店铺连接未完成/);
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
    completeConnection(profile);
    writeJson(profilePath, profile);

    assert.equal(inspectState(project).state, "profile_required");

    completeProfile(profile);
    writeJson(profilePath, profile);

    const ready = inspectState(project);
    assert.equal(ready.state, "write_ready");
    assert.equal(ready.banner, "运营写入就绪");
    assert.equal(ready.profile_validation.ok, true);
    assert.equal(ready.write_capabilities.products.write_ready, true);
    assert.equal(ready.write_capabilities.blog.write_ready, true);
    assert.equal(ready.write_capabilities.redirects.write_ready, true);
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

test("profile status strings cannot unlock writes without required evidence", () => {
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
    completeConnection(profile);
    profile.profile.status = "complete";
    profile.profile.verified_at = "2026-07-29T00:10:00Z";
    writeJson(profilePath, profile);

    const state = inspectState(project);
    assert.equal(state.state, "profile_required");
    assert.equal(state.profile_validation.ok, false);
    assert.ok(state.profile_validation.missing.includes("store.id"));
    assert.ok(state.profile_validation.missing.includes("profile.languages"));
    assert.ok(state.profile_validation.missing.includes("profile.publication_policy"));
  } finally {
    cleanup(project);
  }
});

test("connection store domain must match the profiled store", () => {
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
    completeConnection(profile);
    completeProfile(profile);
    profile.connection.store_domain = "other.myshopify.com";
    writeJson(profilePath, profile);

    const state = inspectState(project);
    assert.equal(state.state, "connection_required");
    assert.ok(
      state.connection_validation.errors.includes(
        "connection.store_domain must match store.myshopify_domain",
      ),
    );
  } finally {
    cleanup(project);
  }
});

test("connection evidence requires explicit ISO timestamps", () => {
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
    completeConnection(profile);
    completeProfile(profile);
    profile.connection.verified_at = "yesterday";
    writeJson(profilePath, profile);

    const state = inspectState(project);
    assert.equal(state.state, "connection_required");
    assert.ok(
      state.connection_validation.missing.includes("connection.verified_at"),
    );
  } finally {
    cleanup(project);
  }
});
