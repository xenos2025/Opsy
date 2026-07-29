import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  if (!options.apply || plan.action === "use-existing") {
    return { ...plan, applied: false, created: [] };
  }

  const created = [];
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

  const products = capability(productScopes, scopes);
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

export function inspectState(projectPath) {
  let project;
  try {
    project = readProject(projectPath);
  } catch (error) {
    return {
      ok: false,
      state: "workspace_invalid",
      banner: "运营项目配置无效",
      error: error.message,
      choices: ["检查 shopify-ops.json", "选择其他项目目录"],
    };
  }

  if (!project.marker) {
    return {
      ok: true,
      state: "workspace_missing",
      banner: "运营项目文件夹未建立",
      project_root: project.projectRoot,
      choices: ["预览运营项目文件夹方案", "选择其他项目目录"],
    };
  }

  const profilePath = path.join(project.workspaceRoot, "config", "store-profile.json");
  if (!fs.existsSync(profilePath)) {
    return {
      ok: true,
      state: "connection_required",
      banner: "店铺连接未完成",
      project_root: project.projectRoot,
      workspace_root: project.workspaceRoot,
      profile_path: profilePath,
      reason: "store profile is missing",
      choices: ["业务问卷", "公开站点检查", "连接与店铺档案", "检查运营项目文件夹"],
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
      choices: ["修复店铺档案", "查看原始错误"],
    };
  }

  const profile = parsed.value;
  const connectionValidation = validateConnectionProfile(profile);
  const profileValidation = validateLightweightProfile(profile);
  const manifestPath = path.join(project.workspaceRoot, "data-center", "manifest.json");
  const manifest = fs.existsSync(manifestPath) ? safeReadJson(manifestPath).value : null;

  if (!connectionValidation.ok) {
    return {
      ok: true,
      state: "connection_required",
      banner: "店铺连接未完成",
      project_root: project.projectRoot,
      workspace_root: project.workspaceRoot,
      store: profile?.store?.myshopify_domain ?? null,
      connection_validation: connectionValidation,
      choices: ["业务问卷", "公开站点检查", "连接与店铺档案", "检查运营项目文件夹"],
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
      choices: ["完成轻量店铺建档", "刷新店铺连接", "查看缺失档案字段"],
    };
  }

  const writeCapabilities = summarizeWriteCapabilities(profile);
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
    write_capabilities: writeCapabilities,
    choices: [
      "运营周报",
      "商品运营",
      "Blog 与内容",
      "404 处理",
      "上月数据查询 / 数据更新",
      "连接与店铺档案",
    ],
  };
}
