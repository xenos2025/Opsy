import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildFaqTopicSeeds, validateBuyerFaqFile } from "./buyer-faq.mjs";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const skillRoot = path.resolve(moduleDir, "..", "..");
export const workspaceAssets = path.join(skillRoot, "assets", "workspace");

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function resolveInside(basePath, relativePath, label = "path") {
  if (!relativePath || typeof relativePath !== "string") {
    throw new Error(`${label} must be a non-empty relative path`);
  }
  if (path.isAbsolute(relativePath)) {
    throw new Error(`${label} must be relative`);
  }
  const base = path.resolve(basePath);
  const resolved = path.resolve(base, relativePath);
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) {
    throw new Error(`${label} escapes its allowed root`);
  }
  return resolved;
}

export function findProjectRoot(startPath = process.cwd()) {
  let current = path.resolve(startPath);
  if (fs.existsSync(current) && fs.statSync(current).isFile()) {
    current = path.dirname(current);
  }

  let gitRoot = null;
  while (true) {
    if (fs.existsSync(path.join(current, "shopify-ops.json"))) {
      return current;
    }
    if (!gitRoot && fs.existsSync(path.join(current, ".git"))) {
      gitRoot = current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return gitRoot ?? path.resolve(startPath);
    }
    current = parent;
  }
}

export function readProject(projectPath) {
  const projectRoot = findProjectRoot(projectPath);
  const markerPath = path.join(projectRoot, "shopify-ops.json");
  if (!fs.existsSync(markerPath)) {
    return {
      projectRoot,
      markerPath,
      marker: null,
      workspaceRoot: null,
    };
  }

  const marker = readJson(markerPath);
  const workspaceRoot = resolveInside(
    projectRoot,
    marker.workspace,
    "shopify-ops.json workspace",
  );
  return { projectRoot, markerPath, marker, workspaceRoot };
}

function projectEntries(projectRoot) {
  return fs
    .readdirSync(projectRoot, { withFileTypes: true })
    .filter((entry) => entry.name !== ".git");
}

function copyIfMissing(source, target, created) {
  if (fs.existsSync(target)) {
    return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  created.push(target);
}

export function planWorkspace({
  projectPath,
  workspaceName,
  agents = "auto",
}) {
  const projectRoot = path.resolve(projectPath);
  if (!fs.existsSync(projectRoot) || !fs.statSync(projectRoot).isDirectory()) {
    throw new Error(`Project directory does not exist: ${projectRoot}`);
  }

  const markerPath = path.join(projectRoot, "shopify-ops.json");
  if (fs.existsSync(markerPath)) {
    const current = readProject(projectRoot);
    return {
      action: "use-existing",
      projectRoot,
      markerPath,
      workspaceRoot: current.workspaceRoot,
      workspaceName: current.marker.workspace,
      markerOnly: true,
      createAgents: false,
      reason: "shopify-ops.json already exists",
    };
  }

  const existingLegacy = fs.existsSync(path.join(projectRoot, "_project"));
  const selectedWorkspace = workspaceName ?? (existingLegacy ? "_project" : "shopify-ops");
  const workspaceRoot = resolveInside(projectRoot, selectedWorkspace, "workspace");
  const isEmpty = projectEntries(projectRoot).length === 0;
  const agentsPath = path.join(projectRoot, "AGENTS.md");
  const hasAgents = fs.existsSync(agentsPath);
  let createAgents = false;

  if (!hasAgents) {
    if (agents === "yes") {
      createAgents = true;
    } else if (agents === "auto" && isEmpty) {
      createAgents = true;
    }
  }

  return {
    action: existingLegacy ? "add-marker" : "create-workspace",
    projectRoot,
    markerPath,
    workspaceRoot,
    workspaceName: selectedWorkspace,
    markerOnly: existingLegacy,
    createAgents,
    needsAgentsConfirmation: !hasAgents && !isEmpty && agents !== "yes",
    existingAgentsPreserved: hasAgents,
    reason: existingLegacy
      ? "existing _project detected; add marker only"
      : "no operations workspace marker found",
  };
}

export function initializeWorkspace(options) {
  const plan = planWorkspace(options);
  if (!options.apply) {
    return { ...plan, applied: false, created: [] };
  }

  const created = [];
  if (plan.action === "use-existing") {
    if (
      !plan.workspaceRoot ||
      !fs.existsSync(plan.workspaceRoot) ||
      !fs.statSync(plan.workspaceRoot).isDirectory()
    ) {
      throw new Error(`Configured workspace does not exist: ${plan.workspaceRoot}`);
    }
    fs.mkdirSync(path.join(plan.workspaceRoot, "inbox", "faq"), { recursive: true });
    fs.mkdirSync(path.join(plan.workspaceRoot, "inbox", "profile"), { recursive: true });
    copyIfMissing(
      path.join(workspaceAssets, "config", "buyer_faq.json"),
      path.join(plan.workspaceRoot, "config", "buyer_faq.json"),
      created,
    );
    return { ...plan, applied: true, created };
  }

  if (!fs.existsSync(plan.markerPath)) {
    writeJson(plan.markerPath, {
      schema_version: "opsy-project-v1",
      layout_version: 1,
      skill: "opsy",
      workspace: plan.workspaceName,
    });
    created.push(plan.markerPath);
  }

  if (!plan.markerOnly) {
    const directories = [
      "config",
      "data-center/archive",
      "inbox/products",
      "inbox/content",
      "inbox/faq",
      "inbox/profile",
      "inbox/data",
      "outputs",
      "ai-log",
      "backups",
      "tmp",
    ];
    for (const relative of directories) {
      fs.mkdirSync(path.join(plan.workspaceRoot, relative), { recursive: true });
    }

    const files = [
      ["README.md", "README.md"],
      [".gitignore", ".gitignore"],
      ["config/store-profile.json", "config/store-profile.json"],
      ["config/business-questionnaire.md", "config/business-questionnaire.md"],
      ["config/buyer_faq.json", "config/buyer_faq.json"],
      ["data-center/manifest.json", "data-center/manifest.json"],
      ["ai-log/operations-log.md", "ai-log/operations-log.md"],
      ["ai-log/handle-changes.csv", "ai-log/handle-changes.csv"],
    ];
    for (const [sourceRelative, targetRelative] of files) {
      copyIfMissing(
        path.join(workspaceAssets, sourceRelative),
        path.join(plan.workspaceRoot, targetRelative),
        created,
      );
    }
  }

  if (plan.createAgents) {
    copyIfMissing(
      path.join(workspaceAssets, "AGENTS.template.md"),
      path.join(plan.projectRoot, "AGENTS.md"),
      created,
    );
  }

  return { ...plan, applied: true, created };
}

function safeReadJson(filePath) {
  try {
    return { value: readJson(filePath), error: null };
  } catch (error) {
    return { value: null, error: error.message };
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDateTime(value) {
  return (
    isNonEmptyString(value) &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) &&
    !Number.isNaN(Date.parse(value))
  );
}

function addMissing(missing, pathName, condition) {
  if (!condition) missing.push(pathName);
}

export function validateConnectionProfile(profile) {
  const missing = [];
  const errors = [];
  const storeDomain = profile?.store?.myshopify_domain;
  const connectionDomain = profile?.connection?.store_domain;

  addMissing(
    missing,
    "schema_version",
    profile?.schema_version === "opsy-store-profile-v1",
  );
  addMissing(missing, "store.myshopify_domain", isNonEmptyString(storeDomain));
  addMissing(
    missing,
    "connection.status",
    profile?.connection?.status === "connected",
  );
  addMissing(
    missing,
    "connection.store_domain",
    isNonEmptyString(connectionDomain),
  );
  addMissing(
    missing,
    "connection.authenticated_at",
    isIsoDateTime(profile?.connection?.authenticated_at),
  );
  addMissing(
    missing,
    "connection.verified_at",
    isIsoDateTime(profile?.connection?.verified_at),
  );
  addMissing(
    missing,
    "connection.cli_version",
    isNonEmptyString(profile?.connection?.cli_version),
  );
  addMissing(
    missing,
    "connection.api_version",
    isNonEmptyString(profile?.connection?.api_version),
  );
  addMissing(
    missing,
    "connection.scopes",
    Array.isArray(profile?.connection?.scopes) &&
      profile.connection.scopes.length > 0,
  );
  addMissing(
    missing,
    "connection.smoke_test.status",
    profile?.connection?.smoke_test?.status === "passed",
  );
  addMissing(
    missing,
    "connection.smoke_test.verified_at",
    isIsoDateTime(profile?.connection?.smoke_test?.verified_at),
  );

  if (
    isNonEmptyString(storeDomain) &&
    !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(storeDomain)
  ) {
    errors.push("store.myshopify_domain must be a valid myshopify.com domain");
  }
  if (
    isNonEmptyString(connectionDomain) &&
    !/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(connectionDomain)
  ) {
    errors.push("connection.store_domain must be a valid myshopify.com domain");
  }
  if (
    isNonEmptyString(storeDomain) &&
    isNonEmptyString(connectionDomain) &&
    storeDomain.toLowerCase() !== connectionDomain.toLowerCase()
  ) {
    errors.push(
      "connection.store_domain must match store.myshopify_domain",
    );
  }

  return { ok: missing.length === 0 && errors.length === 0, missing, errors };
}

export function validateLightweightProfile(profile) {
  const missing = [];
  const errors = [];

  addMissing(missing, "store.id", isNonEmptyString(profile?.store?.id));
  addMissing(missing, "store.name", isNonEmptyString(profile?.store?.name));
  addMissing(
    missing,
    "store.primary_domain",
    isNonEmptyString(profile?.store?.primary_domain),
  );
  addMissing(
    missing,
    "store.currency",
    isNonEmptyString(profile?.store?.currency),
  );
  addMissing(
    missing,
    "store.iana_timezone",
    isNonEmptyString(profile?.store?.iana_timezone),
  );
  addMissing(
    missing,
    "profile.status",
    profile?.profile?.status === "complete",
  );
  addMissing(
    missing,
    "profile.completed_at",
    isIsoDateTime(profile?.profile?.completed_at),
  );
  addMissing(
    missing,
    "profile.verified_at",
    isIsoDateTime(profile?.profile?.verified_at),
  );
  addMissing(
    missing,
    "profile.languages",
    Array.isArray(profile?.profile?.languages) &&
      profile.profile.languages.length > 0,
  );
  addMissing(
    missing,
    "profile.markets",
    Array.isArray(profile?.profile?.markets) &&
      profile.profile.markets.length > 0,
  );
  addMissing(
    missing,
    "profile.primary_inquiry_cta",
    isNonEmptyString(profile?.profile?.primary_inquiry_cta),
  );
  addMissing(
    missing,
    "profile.publications",
    Array.isArray(profile?.profile?.publications),
  );
  addMissing(
    missing,
    "profile.blogs",
    Array.isArray(profile?.profile?.blogs),
  );
  addMissing(
    missing,
    "profile.metafield_definitions",
    Array.isArray(profile?.profile?.metafield_definitions),
  );
  addMissing(
    missing,
    "profile.publication_policy",
    isNonEmptyString(profile?.profile?.publication_policy),
  );

  if (
    isNonEmptyString(profile?.store?.id) &&
    !profile.store.id.startsWith("gid://shopify/Shop/")
  ) {
    errors.push("store.id must be a Shopify Shop GID");
  }

  return { ok: missing.length === 0 && errors.length === 0, missing, errors };
}

const BUSINESS_MODELS = new Set(["b2b_inquiry"]);
const AUDIENCE_STATUSES = new Set([
  "research_draft",
  "merchant_confirmed",
  "data_revised",
]);
const MERCHANT_DATA_ACCESS = Object.freeze({
  mode: "delivered_snapshots_only",
  live_google_api: false,
});

export function summarizeStoreRole(profile) {
  const role = profile?.profile?.store_role;
  const voice = profile?.profile?.content_voice;
  const missing = [];
  const errors = [];

  addMissing(
    missing,
    "profile.store_role.business_model",
    BUSINESS_MODELS.has(role?.business_model),
  );
  addMissing(
    missing,
    "profile.store_role.industry",
    isNonEmptyString(role?.industry),
  );
  addMissing(
    missing,
    "profile.store_role.primary_audience",
    isNonEmptyString(role?.primary_audience),
  );
  addMissing(
    missing,
    "profile.store_role.audience_status",
    AUDIENCE_STATUSES.has(role?.audience_status),
  );
  addMissing(
    missing,
    "profile.store_role.primary_market",
    isNonEmptyString(role?.primary_market),
  );
  addMissing(
    missing,
    "profile.store_role.content_language",
    isNonEmptyString(role?.content_language),
  );
  addMissing(
    missing,
    "profile.store_role.conversion_goal",
    isNonEmptyString(role?.conversion_goal),
  );
  addMissing(missing, "profile.store_role.status", role?.status === "ready");

  if (
    isNonEmptyString(role?.business_model) &&
    !BUSINESS_MODELS.has(role.business_model)
  ) {
    errors.push(
      "profile.store_role.business_model must be b2b_inquiry in Opsy B2B",
    );
  }

  if (
    isNonEmptyString(role?.audience_status) &&
    role.audience_status !== "not_started" &&
    !AUDIENCE_STATUSES.has(role.audience_status)
  ) {
    errors.push(
      "profile.store_role.audience_status must be research_draft, merchant_confirmed, or data_revised",
    );
  }

  if (
    role?.audience_status === "research_draft" &&
    !isNonEmptyString(role?.audience_intake_path)
  ) {
    errors.push(
      "profile.store_role.audience_intake_path is required for research_draft",
    );
  }

  const warnings = [
    ...(voice?.status === "ready" ? [] : ["profile.content_voice.status"]),
    ...(role?.audience_status === "research_draft"
      ? ["profile.store_role.audience_status:research_draft"]
      : []),
  ];
  const blocked = missing.length > 0 || errors.length > 0;

  return {
    status: blocked
      ? "blocked"
      : warnings.length > 0
        ? "ready_with_warnings"
        : "ready",
    business_model: BUSINESS_MODELS.has(role?.business_model)
      ? role.business_model
      : null,
    missing,
    errors,
    warnings,
  };
}

export function summarizeMerchantContext(profile) {
  const context = profile?.profile?.merchant_context;
  const missing = [];

  addMissing(missing, "profile.merchant_context.status", context?.status === "ready");
  for (const field of [
    "product_families",
    "buyer_roles",
    "sales_questions",
    "purchase_objections",
    "confirmed_commercial_facts",
    "restricted_claims",
  ]) {
    addMissing(
      missing,
      `profile.merchant_context.${field}`,
      Array.isArray(context?.[field]) && context[field].length > 0,
    );
  }
  for (const field of ["product_owner", "content_owner", "publication_approver"]) {
    addMissing(
      missing,
      `profile.merchant_context.${field}`,
      isNonEmptyString(context?.[field]),
    );
  }
  addMissing(
    missing,
    "profile.merchant_context.updated_at",
    isIsoDateTime(context?.updated_at),
  );

  const hasAnyAnswer =
    context &&
    Object.entries(context).some(
      ([key, value]) =>
        key !== "status" &&
        (isNonEmptyString(value) || (Array.isArray(value) && value.length > 0)),
    );

  return {
    status:
      missing.length === 0 ? "ready" : hasAnyAnswer ? "ready_with_gaps" : "not_started",
    missing,
  };
}

function capability(requiredScopes, scopes, requiredEvidence = []) {
  const missing = [
    ...requiredScopes
      .filter((scope) => !scopes.has(scope))
      .map((scope) => `connection.scopes:${scope}`),
    ...requiredEvidence
      .filter(({ ok }) => !ok)
      .map(({ path: pathName }) => pathName),
  ];
  return { write_ready: missing.length === 0, missing };
}

export function summarizeWriteCapabilities(profile) {
  const scopes = new Set(
    Array.isArray(profile?.connection?.scopes)
      ? profile.connection.scopes.filter(isNonEmptyString)
      : [],
  );
  const productScopes = ["read_products", "write_products"];
  const role = summarizeStoreRole(profile);
  const buyerCopyEvidence = [
    { path: "profile.store_role", ok: role.status !== "blocked" },
    { path: "profile.content_voice.status", ok: role.warnings.length === 0 },
  ];

  const products = capability(productScopes, scopes, buyerCopyEvidence);
  products.publication = capability(
    [...productScopes, "read_publications", "write_publications"],
    scopes,
    [
      {
        path: "profile.publications",
        ok:
          Array.isArray(profile?.profile?.publications) &&
          profile.profile.publications.length > 0,
      },
    ],
  );

  return {
    products,
    blog: capability(["read_content", "write_content"], scopes, [
      {
        path: "profile.blogs",
        ok:
          Array.isArray(profile?.profile?.blogs) &&
          profile.profile.blogs.length > 0,
      },
      ...buyerCopyEvidence,
    ]),
    redirects: capability(
      ["read_online_store_navigation", "write_online_store_navigation"],
      scopes,
    ),
    metafields: capability(productScopes, scopes, [
      {
        path: "profile.metafield_definitions",
        ok:
          Array.isArray(profile?.profile?.metafield_definitions) &&
          profile.profile.metafield_definitions.length > 0,
      },
    ]),
  };
}

const BLOG_DATASET_NAMES = ["gsc_queries", "ga4_landing_pages"];

function summarizeBlogDataCenter(workspaceRoot, manifest, validation = null) {
  const missing = [];
  if (manifest?.schema_version !== "data-center-manifest-v1") {
    missing.push("data-center/manifest.json");
  }
  for (const name of BLOG_DATASET_NAMES) {
    const dataset = manifest?.datasets?.[name];
    if (!isNonEmptyString(dataset?.path)) {
      missing.push(`data-center.${name}`);
      continue;
    }
    try {
      const datasetPath = resolveInside(
        path.join(workspaceRoot, "data-center"),
        dataset.path,
        `${name}.path`,
      );
      if (!fs.existsSync(datasetPath)) missing.push(`data-center.${name}`);
    } catch {
      missing.push(`data-center.${name}`);
    }
  }
  if (validation) {
    const validatedDatasets = new Map(
      (Array.isArray(validation.datasets) ? validation.datasets : []).map((dataset) => [
        dataset?.name,
        dataset,
      ]),
    );
    if (!validation.ok) missing.push("data-center.validation");
    for (const name of BLOG_DATASET_NAMES) {
      const dataset = validatedDatasets.get(name);
      if (!dataset || (Array.isArray(dataset.errors) && dataset.errors.length > 0)) {
        missing.push(`data-center.${name}`);
      }
    }
  }
  return {
    status: missing.length === 0 ? "ready" : "scoring_blocked",
    required_datasets: BLOG_DATASET_NAMES,
    missing: [...new Set(missing)],
  };
}

function summarizeBlogTopicSources(profile, blogDataCenter, dataCenterValidation, buyerFaqPayload) {
  const faqSeeds = buyerFaqPayload
    ? buildFaqTopicSeeds(buyerFaqPayload, {
        language: profile?.profile?.store_role?.content_language ?? null,
      })
    : {
        ok: false,
        status: "missing",
        rows: [],
        errors: [{ message: "config/buyer_faq.json is missing" }],
        warnings: [],
      };

  if (blogDataCenter.status === "ready") {
    return {
      status: "data_backed",
      data_center_status: "ready",
      faq_seed_count: faqSeeds.rows.length,
      numeric_demand_claims: true,
      missing: [],
    };
  }

  if (dataCenterValidation?.ok === true && faqSeeds.ok && faqSeeds.rows.length > 0) {
    return {
      status: "faq_seeded",
      data_center_status: blogDataCenter.status,
      faq_seed_count: faqSeeds.rows.length,
      numeric_demand_claims: false,
      missing: [],
      limitation: "Cold-start topics come from accepted sales-question evidence, not observed search demand; answer publication remains separately gated",
    };
  }

  return {
    status: "scoring_blocked",
    data_center_status: blogDataCenter.status,
    faq_seed_count: faqSeeds.rows.length,
    numeric_demand_claims: false,
    missing: [
      ...blogDataCenter.missing,
      ...(faqSeeds.rows.length === 0 ? ["buyer_faq.accepted_blog_question"] : []),
      ...(!faqSeeds.ok ? ["buyer_faq.validation"] : []),
    ].filter((value, index, values) => values.indexOf(value) === index),
  };
}

export function inspectState(projectPath, { dataCenterValidation = null } = {}) {
  let project;
  try {
    project = readProject(projectPath);
  } catch (error) {
    return {
      ok: false,
      state: "workspace_invalid",
      banner: "运营项目配置无效",
      error: error.message,
      data_access: MERCHANT_DATA_ACCESS,
      choices: ["检查 shopify-ops.json", "选择其他项目目录"],
    };
  }

  if (!project.marker) {
    return {
      ok: true,
      state: "workspace_missing",
      banner: "运营项目文件夹未建立",
      project_root: project.projectRoot,
      data_access: MERCHANT_DATA_ACCESS,
      choices: ["预览运营项目文件夹方案", "选择其他项目目录"],
    };
  }

  const profilePath = path.join(project.workspaceRoot, "config", "store-profile.json");
  if (!fs.existsSync(profilePath)) {
    const agencyEvidencePaths = [
      path.join(project.workspaceRoot, "config", "site_profile.json"),
      path.join(project.workspaceRoot, "config", "client-store-cache.json"),
      path.join(project.workspaceRoot, "ai-log", "shopify-store-context.md"),
    ].filter((candidate) => fs.existsSync(candidate));
    if (agencyEvidencePaths.length > 0) {
      return {
        ok: true,
        state: "connection_required",
        banner: "已识别服务商工作区；Opsy 尚未启用",
        workspace_overlay: "agency_workspace",
        project_root: project.projectRoot,
        workspace_root: project.workspaceRoot,
        profile_path: profilePath,
        agency_evidence_paths: agencyEvidencePaths,
        reason: "agency workspace detected; Opsy store profile is missing",
        data_access: MERCHANT_DATA_ACCESS,
        choices: [
          "导入服务商已审核任务",
          "预览 Opsy 兼容建档方案",
          "继续使用 Shopify Operations Skill",
        ],
      };
    }
    return {
      ok: true,
      state: "connection_required",
      banner: "店铺连接未完成",
      project_root: project.projectRoot,
      workspace_root: project.workspaceRoot,
      profile_path: profilePath,
      reason: "store profile is missing",
      data_access: MERCHANT_DATA_ACCESS,
      choices: ["企业画像问卷", "整理 FAQ 资料", "连接与店铺档案", "检查运营项目文件夹"],
    };
  }

  const parsed = safeReadJson(profilePath);
  if (parsed.error) {
    return {
      ok: false,
      state: "workspace_invalid",
      banner: "店铺档案无效",
      project_root: project.projectRoot,
      workspace_root: project.workspaceRoot,
      profile_path: profilePath,
      error: parsed.error,
      data_access: MERCHANT_DATA_ACCESS,
      choices: ["修复店铺档案", "查看原始错误"],
    };
  }

  const profile = parsed.value;
  const connectionValidation = validateConnectionProfile(profile);
  const profileValidation = validateLightweightProfile(profile);
  const manifestPath = path.join(project.workspaceRoot, "data-center", "manifest.json");
  const manifest = fs.existsSync(manifestPath) ? safeReadJson(manifestPath).value : null;
  const buyerFaqPath = path.join(project.workspaceRoot, "config", "buyer_faq.json");
  const legacyFaqPath = path.join(project.workspaceRoot, "config", "faq-library.json");
  const buyerFaqPayload = fs.existsSync(buyerFaqPath) ? safeReadJson(buyerFaqPath).value : null;
  const buyerFaq = fs.existsSync(buyerFaqPath)
    ? validateBuyerFaqFile(buyerFaqPath)
    : {
        ok: false,
        status: "fix",
        artifact_status: "missing",
        counts: { errors: 1, warnings: 0 },
        source_count: 0,
        item_count: 0,
        signal_count: 0,
        conflict_count: 0,
        quarantine_count: 0,
        route_counts: { product: 0, blog: 0, provider_handoff: 0, route_review_required: 0 },
        errors: [
          {
            code: "missing_file",
            path: "config/buyer_faq.json",
            message: "Buyer FAQ config is missing; rerun workspace initialization to add the neutral template",
          },
        ],
        warnings: [],
      };
  if (fs.existsSync(legacyFaqPath)) {
    buyerFaq.warnings = [
      ...(Array.isArray(buyerFaq.warnings) ? buyerFaq.warnings : []),
      {
        code: "legacy_faq_library_detected",
        path: "config/faq-library.json",
        message: "Legacy FAQ evidence is preserved; review and migrate it into config/buyer_faq.json",
      },
    ];
  }
  const blogDataCenter = summarizeBlogDataCenter(
    project.workspaceRoot,
    manifest,
    dataCenterValidation,
  );
  const blogTopicSources = summarizeBlogTopicSources(
    profile,
    blogDataCenter,
    dataCenterValidation,
    buyerFaqPayload,
  );

  if (!connectionValidation.ok) {
    return {
      ok: true,
      state: "connection_required",
      banner: "店铺连接未完成",
      project_root: project.projectRoot,
      workspace_root: project.workspaceRoot,
      store: profile?.store?.myshopify_domain ?? null,
      connection_validation: connectionValidation,
      buyer_faq: buyerFaq,
      data_access: MERCHANT_DATA_ACCESS,
      choices: ["企业画像问卷", "整理 FAQ 资料", "连接与店铺档案", "检查运营项目文件夹"],
    };
  }

  if (!profileValidation.ok) {
    return {
      ok: true,
      state: "profile_required",
      banner: "轻量店铺建档未完成",
      project_root: project.projectRoot,
      workspace_root: project.workspaceRoot,
      store: profile?.store?.myshopify_domain ?? null,
      profile_verified_at: profile?.profile?.verified_at ?? null,
      connection_validation: connectionValidation,
      profile_validation: profileValidation,
      store_role: summarizeStoreRole(profile),
      merchant_context: summarizeMerchantContext(profile),
      buyer_faq: buyerFaq,
      blog_data_center: blogDataCenter,
      blog_topic_sources: blogTopicSources,
      data_access: MERCHANT_DATA_ACCESS,
      choices: ["完成企业画像问卷", "整理 FAQ 资料", "刷新店铺连接", "查看缺失档案字段"],
    };
  }

  const writeCapabilities = summarizeWriteCapabilities(profile);
  if (blogTopicSources.status === "scoring_blocked") {
    writeCapabilities.blog.write_ready = false;
    writeCapabilities.blog.missing = [
      ...new Set([...writeCapabilities.blog.missing, ...blogTopicSources.missing]),
    ];
  }
  return {
    ok: true,
    state: "write_ready",
    banner: "运营写入就绪",
    project_root: project.projectRoot,
    workspace_root: project.workspaceRoot,
    store: profile?.store?.myshopify_domain ?? null,
    store_timezone: profile?.store?.iana_timezone ?? null,
    profile_verified_at: profile?.profile?.verified_at ?? null,
    data_updated_at: manifest?.updated_at ?? null,
    connection_validation: connectionValidation,
    profile_validation: profileValidation,
    store_role: summarizeStoreRole(profile),
    merchant_context: summarizeMerchantContext(profile),
    buyer_faq: buyerFaq,
    blog_data_center: blogDataCenter,
    blog_topic_sources: blogTopicSources,
    write_capabilities: writeCapabilities,
    data_access: MERCHANT_DATA_ACCESS,
    choices: [
      "本周三件事",
      "商品运营",
      "Blog 与内容",
      "404 处理",
      "导入服务方数据 / 查看已有摘要",
      "连接与企业画像",
    ],
  };
}
