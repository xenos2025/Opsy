import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { authorizationPlan, checkAuthorization, classifyAuthorizationFailure, ensureAuthorization, listAuthorizations, withAuthorizationState } from "../skills/opsy/scripts/lib/authorization.mjs";
import { cliEnvironment } from "../skills/opsy/scripts/lib/shopify-cli-runtime.mjs";
import { validateConnectionProfile } from "../skills/opsy/scripts/lib/workspace.mjs";

const date = "2026-09-13T00:00:00Z";
function setup(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "opsy-auth-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, "config"));
  const file = path.join(root, "config/store-profile.json");
  const profile = { schema_version: "opsy-store-profile-v1", store: { myshopify_domain: "example.myshopify.com", name: "Preserve name" }, connection: { status: "connected", authenticated_at: null, scopes: [], custom: "retain" }, profile: { merchant_context: { retained: true } } };
  const save = () => fs.writeFileSync(file, JSON.stringify(profile));
  save();
  const plan = authorizationPlan(profile);
  const approval = { plan_sha256: plan.plan_sha256, approved_at: date, evidence_ref: "inbox/approvals/merchant.md", allow_auto_reauthorize: true };
  return { root, file, profile, save, plan, approval };
}
const ready = (scopes, store = "example.myshopify.com") => ({ status: 0, stdout: JSON.stringify({ data: { shop: { id: "gid://shopify/Shop/1", myshopifyDomain: store }, currentAppInstallation: { id: "gid://shopify/AppInstallation/2", accessScopes: scopes.map((handle) => ({ handle })) } }, sensitiveExtra: "DO_NOT_RETAIN" }) });
const expired = () => ({ status: 1, stderr: "Stored app authentication is no longer valid. Re-run to re-authenticate. DO_NOT_RETAIN" });
function adapter(responses, authResult = { status: 0 }) {
  const calls = [], authCalls = [];
  let index = 0;
  return { calls, authCalls, now: () => new Date(date), invoke: (args) => { calls.push(args); return args[0] === "version" ? { status: 0, stdout: "4.7.1" } : responses[Math.min(index++, responses.length - 1)]; }, authenticate: async (store, scopes) => { authCalls.push({ store, scopes }); return authResult; } };
}

test("core plan covers all three functions; optional features and store are bound to approval", (t) => {
  const f = setup(t);
  assert.equal(f.plan.scopes.length, 8);
  assert.ok(f.plan.scopes.includes("write_files"));
  assert.ok(!f.plan.scopes.some((s) => /orders|customers|themes|navigation/.test(s)));
  assert.equal(authorizationPlan(f.profile, { features: ["media", "publication", "blog", "products"] }).plan_sha256, f.plan.plan_sha256);
  const expanded = authorizationPlan(f.profile, { features: [...f.plan.features, "redirects"] });
  assert.equal(expanded.scopes.length, 10);
  assert.notEqual(expanded.plan_sha256, f.plan.plan_sha256);
  assert.throws(() => authorizationPlan(f.profile, { store: "other.myshopify.com" }), /differs/);
  assert.throws(() => authorizationPlan(f.profile, { features: ["orders"] }), /supported/);
});

test("live scope check accepts write-implied reads and never returns raw CLI output", (t) => {
  const f = setup(t), a = adapter([ready(f.plan.scopes.filter((s) => s.startsWith("write_")))]);
  const result = checkAuthorization(f.plan, a);
  assert.equal(result.ok, true);
  assert.equal(result.effective_scopes.length, 8);
  assert.equal(JSON.stringify(result).includes("DO_NOT_RETAIN"), false);
  assert.ok(a.calls[1].includes("--query-file"));
  assert.ok(!a.calls.flat().includes("--allow-mutations"));
  assert.equal(checkAuthorization(f.plan, adapter([ready(f.plan.scopes, "wrong.myshopify.com")])).status, "store_mismatch");
});

test("first authorization requests the entire approved bundle, verifies it, and preserves profile data", async (t) => {
  const f = setup(t), a = adapter([expired(), ready(f.plan.scopes)]);
  const result = await ensureAuthorization({ workspaceRoot: f.root, recover: true, apply: true, approval: f.approval }, a);
  assert.equal(result.ok, true);
  assert.equal(result.auth_attempts, 1);
  assert.deepEqual(a.authCalls, [{ store: f.plan.store, scopes: f.plan.scopes }]);
  const profile = JSON.parse(fs.readFileSync(f.file, "utf8"));
  assert.equal(profile.connection.custom, "retain");
  assert.deepEqual(profile.profile, f.profile.profile);
  assert.equal(profile.store.name, "Preserve name");
  assert.equal(profile.connection.authenticated_at, null, "Do not fabricate a token issue time");
  assert.equal(validateConnectionProfile(profile).ok, true);
  assert.equal(fs.readFileSync(f.file, "utf8").includes("DO_NOT_RETAIN"), false);
  assert.equal(fs.readFileSync(path.join(f.root, result.receipt_path), "utf8").includes("DO_NOT_RETAIN"), false);
  assert.equal(fs.existsSync(path.join(f.root, "outputs/authorization/recovery.lock")), false);
});

test("recovery reuses consent, requests full scopes rather than only missing ones, and is skipped when CLI refresh succeeds", async (t) => {
  const f = setup(t);
  await ensureAuthorization({ workspaceRoot: f.root, apply: true, approval: f.approval }, adapter([ready(f.plan.scopes)]));
  const a = adapter([ready(["write_products"]), ready(f.plan.scopes)]);
  const restored = await ensureAuthorization({ workspaceRoot: f.root, recover: true, apply: true }, a);
  assert.equal(restored.ok, true);
  assert.deepEqual(a.authCalls[0].scopes, f.plan.scopes);
  const fresh = adapter([ready(f.plan.scopes)]);
  assert.equal((await ensureAuthorization({ workspaceRoot: f.root, recover: true, apply: true }, fresh)).auth_attempts, 0);
  assert.equal(fresh.authCalls.length, 0);
});

test("no consent, changed features, disabled auto recovery and dry-run cannot open OAuth", async (t) => {
  const f = setup(t), a = adapter([expired()]);
  assert.equal((await ensureAuthorization({ workspaceRoot: f.root, recover: true, apply: true }, a)).status, "approval_required");
  await ensureAuthorization({ workspaceRoot: f.root, apply: true, approval: { ...f.approval, allow_auto_reauthorize: false } }, adapter([ready(f.plan.scopes)]));
  assert.equal((await ensureAuthorization({ workspaceRoot: f.root, recover: true, apply: true }, a)).status, "approval_required");
  assert.equal((await ensureAuthorization({ workspaceRoot: f.root, recover: true, apply: true, features: [...f.plan.features, "redirects"] }, a)).status, "approval_required");
  const before = fs.readFileSync(f.file, "utf8");
  await ensureAuthorization({ workspaceRoot: f.root, recover: true, approval: f.approval }, a);
  assert.equal(fs.readFileSync(f.file, "utf8"), before);
  assert.equal(a.authCalls.length, 0);
  await assert.rejects(ensureAuthorization({ workspaceRoot: f.root, recover: true, apply: true, approval: { ...f.approval, plan_sha256: "wrong" } }, a), /exact store/);
});

test("network, throttle, wrong store and ambiguous permission errors never cause reauthorization", async (t) => {
  const f = setup(t);
  for (const [response, expected] of [[{ status: 1, stderr: "fetch failed ECONNRESET" }, "network_error"], [{ status: 1, stderr: "HTTP 429" }, "rate_limited"], [{ status: 1, stderr: "HTTP 403 Access denied" }, "permission_denied"], [ready(f.plan.scopes, "wrong.myshopify.com"), "store_mismatch"]]) {
    const a = adapter([response]);
    const result = await ensureAuthorization({ workspaceRoot: f.root, recover: true, apply: true, approval: f.approval }, a);
    assert.equal(result.status, expected);
    assert.equal(a.authCalls.length, 0);
  }
  assert.equal(classifyAuthorizationFailure({ error_code: "ENOENT" }), "missing_dependency");
  assert.equal(classifyAuthorizationFailure({ stderr: "No stored app authentication found for example.myshopify.com." }), "auth_required");
});

test("failed recovery has one attempt, a receipt and a cooldown across subsequent invocations", async (t) => {
  const f = setup(t), a = adapter([expired()], { status: 1, error_code: "ETIMEDOUT", stderr: "DO_NOT_RETAIN" });
  const first = await ensureAuthorization({ workspaceRoot: f.root, recover: true, apply: true, approval: f.approval }, a);
  assert.equal(first.auth_attempts, 1);
  assert.equal(first.recovery_failure, "authorization_timeout");
  assert.equal(JSON.stringify(first).includes("DO_NOT_RETAIN"), false);
  const again = await ensureAuthorization({ workspaceRoot: f.root, recover: true, apply: true }, a);
  assert.equal(again.status, "recovery_cooldown");
  assert.equal(a.authCalls.length, 1);
});

test("a new store retains its approved target on failure and incomplete scope grants stop automatic retries", async (t) => {
  const f = setup(t);
  f.profile.store.myshopify_domain = null;
  f.save();
  const a = adapter([expired(), ready(["write_products"])]);
  const result = await ensureAuthorization({ workspaceRoot: f.root, store: f.plan.store, recover: true, apply: true, approval: f.approval }, a);
  assert.equal(result.ok, false);
  assert.equal(JSON.parse(fs.readFileSync(f.file, "utf8")).store.myshopify_domain, f.plan.store);
  const later = adapter([ready(["write_products"])]);
  later.now = () => new Date("2026-09-14T00:00:00Z");
  assert.equal((await ensureAuthorization({ workspaceRoot: f.root, recover: true, apply: true }, later)).status, "administrator_action_required");
  assert.equal(later.authCalls.length, 0);
});

test("an unexpected authorization launcher failure is sanitized and still produces a recovery receipt", async (t) => {
  const f = setup(t), a = adapter([expired()]);
  a.authenticate = async () => { throw new Error("DO_NOT_RETAIN"); };
  const result = await ensureAuthorization({ workspaceRoot: f.root, recover: true, apply: true, approval: f.approval }, a);
  assert.equal(result.auth_attempts, 1);
  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(result).includes("DO_NOT_RETAIN"), false);
  assert.ok(fs.existsSync(path.join(f.root, result.receipt_path)));
  assert.equal(fs.existsSync(path.join(f.root, "outputs/authorization/recovery.lock")), false);
});

test("an existing recovery lock blocks duplicate OAuth and concurrent profile edits are preserved", async (t) => {
  const f = setup(t);
  fs.mkdirSync(path.join(f.root, "outputs/authorization"), { recursive: true });
  const lock = path.join(f.root, "outputs/authorization/recovery.lock");
  fs.writeFileSync(lock, "synthetic active session");
  const a = adapter([expired(), ready(f.plan.scopes)]);
  assert.equal((await ensureAuthorization({ workspaceRoot: f.root, recover: true, apply: true, approval: f.approval }, a)).status, "recovery_in_progress");
  assert.equal(a.authCalls.length, 0);
  assert.equal(fs.readFileSync(lock, "utf8"), "synthetic active session");
  fs.unlinkSync(lock);
  const b = adapter([expired(), ready(f.plan.scopes)]);
  b.authenticate = async () => { fs.writeFileSync(f.file, JSON.stringify({ ...f.profile, owner_change: "preserve" })); return { status: 0 }; };
  await assert.rejects(ensureAuthorization({ workspaceRoot: f.root, recover: true, apply: true, approval: f.approval }, b), /Profile changed/);
  assert.equal(JSON.parse(fs.readFileSync(f.file, "utf8")).owner_change, "preserve");
});

test("authorization inventory is whitelisted and cached readiness never claims live authorization", () => {
  const inventory = listAuthorizations({ invoke: () => ({ status: 0, stdout: JSON.stringify({ sessions: [{ subdomain: "example", token: "DO_NOT_RETAIN" }] }) }) });
  assert.deepEqual(inventory.stores, ["example.myshopify.com"]);
  assert.equal(inventory.live, false);
  assert.equal(JSON.stringify(inventory).includes("DO_NOT_RETAIN"), false);
  const state = withAuthorizationState({ ok: true, state: "write_ready", write_capabilities: { products: { write_ready: true, missing: [], publication: { write_ready: true } } } }, { ok: false, live: false, status: "not_checked" });
  assert.equal(state.state, "authorization_required");
  assert.equal(state.write_capabilities.products.publication.write_ready, false);
});

test("CLI child environment removes ambient query, mutation and verbose overrides", () => {
  const result = cliEnvironment({ PATH: "keep", SHOPIFY_FLAG_STORE: "wrong", SHOPIFY_FLAG_ALLOW_MUTATIONS: "1", SHOPIFY_FLAG_VERBOSE: "1", DEBUG: "*", CI: "1" }, true);
  assert.equal(result.PATH, "keep");
  assert.equal(result.CI, undefined);
  assert.equal(result.DEBUG, undefined);
  assert.equal(Object.keys(result).some((key) => key.startsWith("SHOPIFY_FLAG_")), false);
});

test("recovered task returns known object IDs without executing its pending write", async (t) => {
  const f = setup(t), taskDir = path.join(f.root, "outputs/runs/task/r1");
  fs.mkdirSync(taskDir, { recursive: true });
  fs.writeFileSync(path.join(taskDir, "result.json"), JSON.stringify({ task_id: "task", run_id: "r1", store: f.plan.store, status: "pending_verification", recorded_at: date, evidence: [], objects: [{ id: "gid://shopify/Product/7", status: "pending_verification" }], next_actions: [] }));
  const a = adapter([expired(), ready(f.plan.scopes)]);
  const result = await ensureAuthorization({ workspaceRoot: f.root, recover: true, apply: true, approval: f.approval, task: "task" }, a);
  assert.equal(result.task_resume.objects[0].id, "gid://shopify/Product/7");
  assert.ok(a.calls.every((args) => !args.includes("--allow-mutations")));
});

test("auth-plan CLI works without an installed Shopify plugin or any authentication", (t) => {
  const f = setup(t), project = path.join(f.root, "project");
  fs.mkdirSync(project);
  // This fixture uses its own profile and no external store command.
  const workspace = path.join(project, "work");
  fs.mkdirSync(path.join(workspace, "config"), { recursive: true });
  fs.copyFileSync(f.file, path.join(workspace, "config/store-profile.json"));
  fs.writeFileSync(path.join(project, "shopify-ops.json"), JSON.stringify({ workspace: "work", layout_version: 1 }));
  const run = spawnSync(process.execPath, [path.resolve("skills/opsy/scripts/opsy.mjs"), "auth-plan", "--project", project, "--json"], { encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(JSON.parse(run.stdout).scopes.length, 8);
});
