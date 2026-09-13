import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateDataCenter } from "../skills/opsy/scripts/lib/data-center.mjs";
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
  profile.profile.inquiry_cta = { url: "https://example.com/pages/contact", confirmed_at: "2026-07-29T00:10:00Z", evidence_ref: "inbox/profile/cta.md" };
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

function completeStoreRole(profile) {
  profile.profile.store_role = {
    status: "ready",
    business_model: "b2b_inquiry",
    industry: "Industrial components",
    primary_audience: "Procurement engineers at OEM factories",
    secondary_audiences: [],
    audience_status: "merchant_confirmed",
    audience_intake_path: null,
    primary_market: "United States",
    content_language: "en",
    conversion_goal: "Quote request",
    updated_at: "2026-07-29T00:12:00Z",
  };
  profile.profile.content_voice.status = "ready";
  profile.profile.content_voice.role =
    "We are the sales engineers who specify these components";
  profile.profile.content_voice.updated_at = "2026-07-29T00:12:00Z";
}

function completeBlogData(project) {
  const directory = path.join(project, "shopify-ops", "data-center");
  fs.writeFileSync(
    path.join(directory, "gsc_queries.csv"),
    "query,clicks,ctr,impressions,position\nexample query,1,0.01,100,10\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(directory, "ga4_landing_pages.csv"),
    "landingPagePlusQueryString,sessions,engagedSessions\n/blogs/news/example,20,10\n",
    "utf8",
  );
  writeJson(path.join(directory, "manifest.json"), {
    schema_version: "data-center-manifest-v1",
    updated_at: "2026-09-01T08:00:00+08:00",
    datasets: {
      gsc_queries: {
        path: "gsc_queries.csv",
        source_channel: "provider delivery",
        scope: "example property",
        date_range: { start_date: "2026-08-01", end_date: "2026-08-31" },
        timezone: "Asia/Shanghai",
        pulled_at: "2026-09-01T08:00:00+08:00",
        row_count: 1,
        columns: ["query", "clicks", "ctr", "impressions", "position"],
      },
      ga4_landing_pages: {
        path: "ga4_landing_pages.csv",
        source_channel: "provider delivery",
        scope: "example property",
        date_range: { start_date: "2026-08-01", end_date: "2026-08-31" },
        timezone: "Asia/Shanghai",
        pulled_at: "2026-09-01T08:00:00+08:00",
        row_count: 1,
        columns: ["landingPagePlusQueryString", "sessions", "engagedSessions"],
      },
    },
  });
}

function completeBlogFaq(project) {
  writeJson(path.join(project, "shopify-ops", "config", "buyer_faq.json"), {
    schema_version: "buyer-faq-v1",
    status: "draft",
    generated_at: "2026-09-01T09:00:00+08:00",
    last_reviewed_at: null,
    reviewed_by: "",
    source_summary: "Sales FAQ intake",
    sources: [
      {
        source_id: "faq-source-001",
        source_kind: "staff_faq_pack",
        title: "Sanitized sales FAQ",
        source_ref: "inbox/faq/2026-09-01/source-001.docx",
        contributor: "sales owner",
        observed_at: "2026-09-01T08:00:00+08:00",
        languages: ["en"],
        extraction_notes: "",
        file_sha256: "",
      },
    ],
    audience_signals: [],
    faq_items: [
      {
        id: "faq-buyer-comparison",
        canonical_question: "What should buyers compare before requesting a quote?",
        variants: [],
        scope: { type: "enterprise", refs: [] },
        category: "comparison",
        decision_stage: "evaluate",
        buyer_roles: ["procurement"],
        question_status: "staff_reported",
        source_refs: ["faq-source-001#Q1"],
        answer: {
          draft_answer: "Compare application fit, required proof, and inquiry inputs.",
          answer_status: "staff_supplied",
          claim_refs: [],
          unresolved_claims: ["Merchant must confirm the scoped comparison guidance."],
        },
        content_use: "question_only",
        primary_route: "blog",
        routes: ["blog"],
        seo_geo_topics: ["quote comparison checklist"],
        conflict_refs: [],
        quarantine_refs: [],
        notes: "",
      },
    ],
    conflicts: [],
    quarantine: [],
  });
}

function inspectValidatedState(project) {
  return inspectState(project, {
    dataCenterValidation: validateDataCenter(
      path.join(project, "shopify-ops", "data-center"),
    ),
  });
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
    assert.equal(fs.existsSync(path.join(project, "shopify-ops", "inbox", "faq")), true);
    assert.equal(
      fs.existsSync(path.join(project, "shopify-ops", "config", "buyer_faq.json")),
      true,
    );
    assert.equal(fs.existsSync(path.join(project, "shopify-ops", "inbox", "profile")), true);

    const state = inspectState(project);
    assert.equal(state.state, "connection_required");
    assert.equal(state.banner, "店铺连接未完成");
    assert.deepEqual(state.choices, [
      "企业画像问卷",
      "整理 FAQ 资料",
      "连接与店铺档案",
      "检查运营项目文件夹",
    ]);
    assert.equal(state.data_access.live_google_api, false);
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

test("existing buyer FAQ config is preserved on workspace initialization", () => {
  const project = tempProject();
  try {
    initializeWorkspace({ projectPath: project, agents: "auto", apply: true });
    const faqPath = path.join(
      project,
      "shopify-ops",
      "config",
      "buyer_faq.json",
    );
    const existing = '{"schema_version":"merchant-owned-faq"}\n';
    fs.writeFileSync(faqPath, existing, "utf8");
    initializeWorkspace({ projectPath: project, agents: "auto", apply: true });
    assert.equal(fs.readFileSync(faqPath, "utf8"), existing);
  } finally {
    cleanup(project);
  }
});

test("existing Opsy workspace receives only missing buyer FAQ and profile-intake assets", () => {
  const project = tempProject();
  try {
    initializeWorkspace({ projectPath: project, agents: "auto", apply: true });
    const workspace = path.join(project, "shopify-ops");
    const faqPath = path.join(workspace, "config", "buyer_faq.json");
    const faqInbox = path.join(workspace, "inbox", "faq");
    const profileInbox = path.join(workspace, "inbox", "profile");
    const profilePath = path.join(workspace, "config", "store-profile.json");
    const profileBefore = fs.readFileSync(profilePath, "utf8");
    fs.rmSync(faqPath);
    fs.rmSync(faqInbox, { recursive: true, force: true });
    fs.rmSync(profileInbox, { recursive: true, force: true });

    const result = initializeWorkspace({
      projectPath: project,
      agents: "auto",
      apply: true,
    });
    assert.equal(result.action, "use-existing");
    assert.equal(result.applied, true);
    assert.equal(fs.existsSync(faqPath), true);
    assert.equal(fs.existsSync(faqInbox), true);
    assert.equal(fs.existsSync(profileInbox), true);
    assert.equal(fs.readFileSync(profilePath, "utf8"), profileBefore);
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
    completeStoreRole(profile);
    writeJson(profilePath, profile);
    completeBlogData(project);

    const ready = inspectValidatedState(project);
    assert.equal(ready.state, "write_ready");
    assert.equal(ready.banner, "运营写入就绪");
    assert.equal(ready.profile_validation.ok, true);
    assert.equal(ready.store_role.status, "ready");
    assert.equal(ready.buyer_faq.artifact_status, "not_started");
    assert.equal(ready.write_capabilities.products.write_ready, true);
    assert.equal(ready.write_capabilities.blog.write_ready, true);
    assert.equal(ready.blog_data_center.status, "ready");
    assert.equal(ready.write_capabilities.redirects.write_ready, true);
    assert.equal(ready.data_access.mode, "delivered_snapshots_only");
    assert.equal(ready.data_access.live_google_api, false);
    assert.deepEqual(ready.choices, [
      "本周三件事",
      "商品运营",
      "Blog 与内容",
      "404 处理",
      "导入服务方数据 / 查看已有摘要",
      "连接与企业画像",
    ]);
  } finally {
    cleanup(project);
  }
});

test("Blog uses accepted FAQ question cold-start until local GSC and GA4 datasets are delivered", () => {
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
    completeStoreRole(profile);
    writeJson(profilePath, profile);

    const blocked = inspectValidatedState(project);
    assert.equal(blocked.state, "write_ready");
    assert.equal(blocked.blog_data_center.status, "scoring_blocked");
    assert.equal(blocked.blog_topic_sources.status, "scoring_blocked");
    assert.equal(blocked.write_capabilities.blog.write_ready, false);
    assert.ok(blocked.write_capabilities.blog.missing.includes("data-center.gsc_queries"));
    assert.ok(blocked.write_capabilities.blog.missing.includes("data-center.ga4_landing_pages"));

    completeBlogFaq(project);
    const coldStart = inspectValidatedState(project);
    assert.equal(coldStart.blog_data_center.status, "scoring_blocked");
    assert.equal(coldStart.blog_topic_sources.status, "faq_seeded");
    assert.equal(coldStart.blog_topic_sources.numeric_demand_claims, false);
    assert.equal(coldStart.write_capabilities.blog.write_ready, true);

    completeBlogData(project);
    const ready = inspectValidatedState(project);
    assert.equal(ready.blog_data_center.status, "ready");
    assert.equal(ready.blog_topic_sources.status, "data_backed");
    assert.equal(ready.write_capabilities.blog.write_ready, true);

    fs.writeFileSync(
      path.join(project, "shopify-ops", "data-center", "ga4_landing_pages.csv"),
      "landingPagePlusQueryString,sessions,engagedSessions\n/blogs/news/example,20,10\nextra,row\n",
      "utf8",
    );
    const invalid = inspectValidatedState(project);
    assert.equal(invalid.blog_data_center.status, "scoring_blocked");
    assert.equal(invalid.write_capabilities.blog.write_ready, false);
    assert.ok(invalid.write_capabilities.blog.missing.includes("data-center.validation"));
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

test("missing store role blocks buyer-facing writes but not redirects", () => {
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
    writeJson(profilePath, profile);

    const state = inspectState(project);
    assert.equal(state.state, "write_ready");
    assert.equal(state.store_role.status, "blocked");
    assert.ok(
      state.store_role.missing.includes("profile.store_role.business_model"),
    );
    assert.equal(state.write_capabilities.products.write_ready, false);
    assert.equal(state.write_capabilities.blog.write_ready, false);
    assert.ok(
      state.write_capabilities.blog.missing.includes("profile.store_role"),
    );
    assert.equal(state.write_capabilities.redirects.write_ready, true);
  } finally {
    cleanup(project);
  }
});

test("an unconfirmed seller voice warns and still blocks buyer-facing writes", () => {
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
    completeStoreRole(profile);
    profile.profile.content_voice.status = "not_started";
    writeJson(profilePath, profile);

    const state = inspectState(project);
    assert.equal(state.store_role.status, "ready_with_warnings");
    assert.deepEqual(state.store_role.missing, []);
    assert.ok(
      state.store_role.warnings.includes("profile.content_voice.status"),
    );
    assert.equal(state.write_capabilities.products.write_ready, false);
    assert.ok(
      state.write_capabilities.products.missing.includes(
        "profile.content_voice.status",
      ),
    );
  } finally {
    cleanup(project);
  }
});

test("DTC and unsupported business models are rejected by Opsy B2B", () => {
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
    completeStoreRole(profile);
    for (const businessModel of ["b2c_dtc", "hybrid", "marketplace"]) {
      profile.profile.store_role.business_model = businessModel;
      writeJson(profilePath, profile);

      const state = inspectState(project);
      assert.equal(state.store_role.status, "blocked", businessModel);
      assert.equal(state.store_role.business_model, null, businessModel);
      assert.ok(
        state.store_role.errors.includes(
          "profile.store_role.business_model must be b2b_inquiry in Opsy B2B",
        ),
        businessModel,
      );
    }
  } finally {
    cleanup(project);
  }
});
