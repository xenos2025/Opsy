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
  const connectionReady =
    profile?.connection?.status === "connected" &&
    profile?.connection?.smoke_test?.status === "passed";
  const profileReady = profile?.profile?.status === "complete";
  const manifestPath = path.join(project.workspaceRoot, "data-center", "manifest.json");
  const manifest = fs.existsSync(manifestPath) ? safeReadJson(manifestPath).value : null;

  if (!connectionReady) {
    return {
      ok: true,
      state: "connection_required",
      banner: "店铺连接未完成",
      project_root: project.projectRoot,
      workspace_root: project.workspaceRoot,
      store: profile?.store?.myshopify_domain ?? null,
      choices: ["业务问卷", "公开站点检查", "连接与店铺档案", "检查运营项目文件夹"],
    };
  }

  if (!profileReady) {
    return {
      ok: true,
      state: "profile_required",
      banner: "轻量店铺建档未完成",
      project_root: project.projectRoot,
      workspace_root: project.workspaceRoot,
      store: profile?.store?.myshopify_domain ?? null,
      profile_verified_at: profile?.profile?.verified_at ?? null,
      choices: ["完成轻量店铺建档", "刷新店铺连接", "查看缺失档案字段"],
    };
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
