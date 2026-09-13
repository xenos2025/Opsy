import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

// Child processes own Shopify authentication. This module never opens the
// CLI credential store and never forwards raw output to the merchant/logs.
export function cliEnvironment(source = process.env, interactive = false) {
  const env = { ...source };
  for (const key of Object.keys(env)) {
    if (/^SHOPIFY_FLAG_/i.test(key) || /^(DEBUG|SHOPIFY_CLI_VERBOSE|SHOPIFY_CLI_ADMIN_API_ACCESS_TOKEN)$/i.test(key)) delete env[key];
  }
  env.NO_COLOR = "1";
  if (interactive) delete env.CI;
  else env.CI = "1";
  return env;
}

function executable(env) {
  if (process.platform !== "win32") return { command: "shopify", prefix: [] };
  const where = spawnSync("where.exe", ["shopify"], { encoding: "utf8", windowsHide: true, timeout: 5000, env });
  const entry = String(where.stdout ?? "").split(/\r?\n/).filter(Boolean)
    .map((shim) => path.join(path.dirname(shim), "node_modules", "@shopify", "cli", "bin", "run.js"))
    .find((candidate) => fs.existsSync(candidate));
  if (!entry) return null;
  return { command: process.execPath, prefix: [entry] };
}

export function runShopify(args) {
  const env = cliEnvironment();
  const cli = executable(env);
  if (!cli) return { status: null, error_code: "ENOENT", stdout: "", stderr: "" };
  const result = spawnSync(cli.command, [...cli.prefix, ...args], { encoding: "utf8", windowsHide: true, timeout: 30000, maxBuffer: 4 * 1024 * 1024, env });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "", error_code: result.error?.code ?? null };
}

export async function runShopifyAuth(store, scopes) {
  const env = cliEnvironment(process.env, true), cli = executable(env);
  if (!cli) return { status: null, error_code: "ENOENT" };
  // Shopify opens the browser and owns PKCE/callback handling. Suppress raw
  // browser URLs, token-exchange errors and account details in captured output.
  return new Promise((resolve) => {
    let child;
    try { child = spawn(cli.command, [...cli.prefix, "store", "auth", "--store", store, "--scopes", scopes.join(","), "--json"], { env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] }); }
    catch { resolve({ status: null, error_code: "SPAWN_FAILED" }); return; }
    let stdout = "", stderr = "", timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill(); }, 180000);
    child.stdout.on("data", (chunk) => { if (stdout.length < 128000) stdout += chunk.toString("utf8"); });
    child.stderr.on("data", (chunk) => { if (stderr.length < 128000) stderr += chunk.toString("utf8"); });
    child.once("error", (error) => { clearTimeout(timer); resolve({ status: null, error_code: error.code ?? "SPAWN_FAILED" }); });
    child.once("close", (status) => { clearTimeout(timer); resolve({ status, error_code: timedOut ? "ETIMEDOUT" : null, stdout, stderr }); });
  });
}
