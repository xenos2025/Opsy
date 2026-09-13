import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { skillRoot } from "./workspace.mjs";
import { inside } from "./product-intake.mjs";
import { runShopify, runShopifyAuth } from "./shopify-cli-runtime.mjs";
import { resumeTask } from "./task-results.mjs";

const catalog = JSON.parse(fs.readFileSync(path.join(skillRoot, "assets/authorization-scopes.json"), "utf8"));
const toolchain = JSON.parse(fs.readFileSync(path.join(skillRoot, "assets/toolchain.json"), "utf8"));
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const iso = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v) && !Number.isNaN(Date.parse(v));
const domain = (v) => typeof v === "string" && /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(v);
const unique = (values) => [...new Set(values)].sort();
const json = (raw) => { try { return JSON.parse(raw); } catch { return null; } };

export function authorizationPlan(profile, { store, features } = {}) {
  if (profile?.schema_version !== "opsy-store-profile-v1") throw new Error("An Opsy store profile is required; preserve other workspace formats");
  const target = (store ?? profile.store?.myshopify_domain)?.toLowerCase();
  if (!domain(target)) throw new Error("Confirm an exact myshopify.com store before authorization");
  if (profile.store?.myshopify_domain && profile.store.myshopify_domain.toLowerCase() !== target) throw new Error("Store differs from the existing profile");
  if (profile.connection?.store_domain && profile.connection.store_domain.toLowerCase() !== target) throw new Error("Store differs from the saved connection");
  const selected = features ?? profile.connection?.authorization?.policy?.features ?? catalog.default_features;
  if (!Array.isArray(selected) || !selected.length || selected.some((name) => !Object.hasOwn(catalog.features, name))) throw new Error("Choose supported authorization features; arbitrary scopes are not accepted");
  const plan = { schema_version: "opsy-authorization-plan-v1", store: target, api_version: toolchain.admin_graphql_version, features: unique(selected), scopes: unique(selected.flatMap((name) => catalog.features[name].scopes)) };
  return { ...plan, plan_sha256: hash(JSON.stringify(plan)), purposes: plan.features.map((name) => ({ feature: name, ...catalog.features[name] })), command: ["shopify", "store", "auth", "--store", target, "--scopes", plan.scopes.join(",")], effects: "Shopify CLI may open a browser and save or refresh its own authorization. Opsy stores only scopes, store identity and verification metadata; this does not approve product or Blog writes." };
}

export function effectiveScopes(scopes) {
  return unique(scopes.flatMap((scope) => scope.startsWith("write_") ? [scope, `read_${scope.slice(6)}`] : [scope]));
}

export function classifyAuthorizationFailure(result) {
  if (result.error_code === "ENOENT") return "missing_dependency";
  if (result.error_code === "ETIMEDOUT") return "network_error";
  const raw = `${result.stderr ?? ""}\n${result.stdout ?? ""}`;
  if (/429|throttl|rate.?limit/i.test(raw)) return "rate_limited";
  if (/ENOTFOUND|ECONN|ETIMEDOUT|EAI_AGAIN|fetch failed|network|timed? out|timeout|HTTP\s*5\d\d|\b50[234]\b/i.test(raw)) return "network_error";
  if (/preview stores.*unavailable|unavailable for preview stores/i.test(raw)) return "unsupported_store";
  if (/403|ACCESS_DENIED|access denied|fewer scopes|permission|missing scopes/i.test(raw)) return "permission_denied";
  if (/401|UNAUTHENTICATED|invalid (?:access )?token|token.*(?:expired|revoked)|expired.*token|no (?:stored )?(?:app )?authentication|authentication.*no longer valid|not authenticated|no refresh token|re-authenticate|reauthenticat/i.test(raw)) return "auth_required";
  if (/Nonexistent flag|unknown (?:command|flag)|not a shopify command/i.test(raw)) return "unsupported_cli";
  return "verification_failed";
}

export function checkAuthorization(plan, { invoke = runShopify, now = () => new Date() } = {}) {
  const base = { schema_version: "opsy-authorization-check-v1", store: plan.store, plan_sha256: plan.plan_sha256, required_scopes: plan.scopes, checked_at: now().toISOString(), live: true, ok: false, granted_scopes: [], effective_scopes: [], missing_scopes: [], cli_version: null, api_version: plan.api_version };
  const version = invoke(["version"]);
  if (version.status !== 0) return { ...base, status: classifyAuthorizationFailure(version) };
  base.cli_version = String(version.stdout ?? "").match(/\b\d+\.\d+\.\d+\b/)?.[0] ?? null;
  const result = invoke(["store", "execute", "--store", plan.store, "--version", plan.api_version, "--query-file", path.join(skillRoot, "assets/graphql/auth-status.graphql"), "--json"]);
  if (result.status !== 0) return { ...base, status: classifyAuthorizationFailure(result) };
  const response = json(result.stdout);
  if (response?.errors?.length) return { ...base, status: classifyAuthorizationFailure({ stdout: JSON.stringify(response.errors) }) };
  const shop = response?.data?.shop, app = response?.data?.currentAppInstallation;
  if (shop?.myshopifyDomain?.toLowerCase() !== plan.store) return { ...base, status: shop?.myshopifyDomain ? "store_mismatch" : "verification_failed" };
  if (!/^gid:\/\/shopify\/Shop\/\d+$/.test(shop?.id ?? "") || !/^gid:\/\/shopify\/AppInstallation\/\d+$/.test(app?.id ?? "") || !Array.isArray(app?.accessScopes) || app.accessScopes.some((s) => !/^[a-z][a-z0-9_]+$/.test(s?.handle ?? ""))) return { ...base, status: "verification_failed" };
  const granted = unique(app.accessScopes.map((s) => s.handle)), effective = effectiveScopes(granted);
  const missing = plan.scopes.filter((scope) => !effective.includes(scope));
  return { ...base, ok: missing.length === 0, status: missing.length ? "missing_scopes" : "ready", shop_id: shop.id, app_installation_id: app.id, granted_scopes: granted, effective_scopes: effective, missing_scopes: missing };
}

export function listAuthorizations({ invoke = runShopify } = {}) {
  const result = invoke(["store", "auth", "list", "--json"]);
  if (result.status !== 0) return { ok: false, status: classifyAuthorizationFailure(result), stores: [] };
  const response = json(result.stdout);
  if (!Array.isArray(response?.sessions)) return { ok: false, status: "unsupported_cli_response", stores: [] };
  const stores = response.sessions.map((item) => String(item.subdomain ?? "")).map((item) => item.endsWith(".myshopify.com") ? item : `${item}.myshopify.com`).filter(domain);
  return { ok: true, status: "local_auth_inventory", stores: unique(stores), live: false, note: "Listed stores still need a live authorization check; this is not token-validity evidence." };
}

function approvalPolicy(plan, approval) {
  if (approval?.plan_sha256 !== plan.plan_sha256 || !iso(approval.approved_at) || typeof approval.evidence_ref !== "string" || !approval.evidence_ref.trim() || typeof approval.allow_auto_reauthorize !== "boolean") throw new Error("Record actual approval of this exact store/scope plan and its automatic recovery preference");
  return { plan_sha256: plan.plan_sha256, store: plan.store, features: plan.features, scopes: plan.scopes, approved_at: approval.approved_at, approval_ref: approval.evidence_ref, allow_auto_reauthorize: approval.allow_auto_reauthorize };
}

export async function ensureAuthorization(options, adapters = {}) {
  const profilePath = inside(options.workspaceRoot, "config/store-profile.json");
  let original = fs.readFileSync(profilePath, "utf8");
  const profile = JSON.parse(original), plan = authorizationPlan(profile, options);
  const now = adapters.now ?? (() => new Date());
  const check = () => checkAuthorization(plan, { ...adapters, now });
  let result = check(), policy = profile.connection?.authorization?.policy;
  const explicit = options.approval ? approvalPolicy(plan, options.approval) : null;
  const save = (attempt = null) => {
    if (!options.apply) return;
    if (fs.readFileSync(profilePath, "utf8") !== original) throw new Error("Profile changed during authorization; preserve it and rerun the live check");
    profile.connection ??= {};
    profile.store ??= {};
    if (!profile.store.myshopify_domain && policy?.store === plan.store) profile.store.myshopify_domain = plan.store;
    profile.connection.authorization = { ...profile.connection.authorization, ...(policy ? { policy } : {}), last_check: result, ...(attempt ? { last_attempt: attempt } : {}) };
    profile.connection.status = result.ok ? "connected" : "authorization_unverified";
    profile.connection.smoke_test = { ...profile.connection.smoke_test, status: result.ok ? "passed" : "failed", verified_at: result.checked_at };
    if (result.ok) {
      profile.store ??= {};
      profile.store.myshopify_domain = plan.store;
      profile.store.id = result.shop_id;
      Object.assign(profile.connection, { store_domain: plan.store, verified_at: result.checked_at, scopes: result.effective_scopes, api_version: result.api_version, cli_version: result.cli_version });
    }
    const text = `${JSON.stringify(profile, null, 2)}\n`;
    fs.writeFileSync(profilePath, text);
    original = text;
  };
  if (explicit && options.apply) policy = explicit;
  const finish = (extra = {}) => {
    let taskResume;
    if (result.ok && options.task) {
      try {
        taskResume = resumeTask(options.workspaceRoot, options.task);
        if (taskResume.store && taskResume.store !== plan.store) taskResume = { ok: false, status: "task_store_mismatch", task_id: options.task };
      } catch { taskResume = { ok: false, status: "handoff_needs_review", task_id: options.task }; }
    }
    return { ...result, plan, applied: Boolean(options.apply), auth_attempts: 0, ...extra, ...(taskResume ? { task_resume: taskResume } : {}), resume: result.ok ? "Refresh project status, then resume the saved task using known IDs. Verify interrupted writes before retrying; authorization does not approve a mutation." : "Keep the task pending; preserve known IDs and local work." };
  };
  if (result.ok) { save(); return finish(); }
  const recoverable = ["auth_required", "missing_scopes"].includes(result.status);
  if (!options.recover || !options.apply || !recoverable) { save(); return finish({ recovery_available: recoverable }); }
  if (!explicit && (policy?.plan_sha256 !== plan.plan_sha256 || policy?.store !== plan.store || policy?.allow_auto_reauthorize !== true)) {
    save(); return finish({ status: "approval_required", cause: result.status });
  }
  const last = profile.connection?.authorization?.last_attempt;
  if (!explicit && last?.plan_sha256 === plan.plan_sha256 && ["permission_denied", "unsupported_store", "scope_grant_incomplete"].includes(last.status)) {
    save(); return finish({ status: "administrator_action_required", cause: last.status });
  }
  if (!explicit && last?.plan_sha256 === plan.plan_sha256 && last.status !== "ready" && now().getTime() - Date.parse(last.started_at) < 10 * 60 * 1000) {
    save(); return finish({ status: "recovery_cooldown", cause: result.status, retry_after: new Date(Date.parse(last.started_at) + 10 * 60 * 1000).toISOString() });
  }
  const outputDir = inside(options.workspaceRoot, "outputs/authorization");
  fs.mkdirSync(outputDir, { recursive: true });
  const lockPath = path.join(outputDir, "recovery.lock");
  let lock;
  try { lock = fs.openSync(lockPath, "wx"); }
  catch (error) { if (error.code !== "EEXIST") throw error; return finish({ status: "recovery_in_progress", cause: result.status }); }
  const attempt = { id: crypto.randomUUID(), store: plan.store, plan_sha256: plan.plan_sha256, started_at: now().toISOString(), status: "pending" };
  try {
    fs.writeFileSync(lock, JSON.stringify({ ...attempt, pid: process.pid }));
    save(attempt);
    let auth;
    try { auth = await (adapters.authenticate ?? runShopifyAuth)(plan.store, plan.scopes); }
    catch { auth = { status: null, error_code: "SPAWN_FAILED" }; }
    // Always inspect actual server state, including after an uncertain callback.
    // The read command may let Shopify CLI refresh its own token transparently.
    result = check();
    if (!result.ok && auth.status !== 0) {
      const failure = auth.error_code === "ETIMEDOUT" ? "authorization_timeout" : classifyAuthorizationFailure(auth);
      result = { ...result, recovery_failure: failure };
    }
    attempt.status = result.ok ? "ready" : result.recovery_failure ?? (result.status === "missing_scopes" ? "scope_grant_incomplete" : result.status);
    attempt.finished_at = now().toISOString();
    const receipt = { ...attempt, check: result, required_scopes: plan.scopes, approval_ref: policy?.approval_ref ?? null };
    fs.writeFileSync(path.join(outputDir, `${attempt.id}.json`), JSON.stringify(receipt, null, 2), { flag: "wx" });
    save(attempt);
    return finish({ auth_attempts: 1, receipt_path: `outputs/authorization/${attempt.id}.json` });
  } finally { fs.closeSync(lock); fs.unlinkSync(lockPath); }
}

export function withAuthorizationState(state, authorization) {
  const next = { ...state, authorization };
  if (state.state === "write_ready" && !authorization.ok) {
    next.state = "authorization_required";
    next.banner = authorization.live ? "店铺授权尚未通过实时核验" : "配置已就绪；尚未核验实时授权";
    next.ok = false;
    next.choices = ["检查或恢复 CLI 授权", "查看已有任务与本地资料"];
    next.write_capabilities = Object.fromEntries(Object.entries(state.write_capabilities ?? {}).map(([key, value]) => [key, { ...value, write_ready: false, missing: [...(value.missing ?? []), `authorization:${authorization.status}`], ...(value.publication ? { publication: { ...value.publication, write_ready: false } } : {}) }]));
  }
  return next;
}
