import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { skillRoot } from "./workspace.mjs";

function versionParts(value) {
  const match = String(value ?? "").match(/(\d+)\.(\d+)\.(\d+)/);
  return match ? match.slice(1).map(Number) : null;
}

export function compareVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  if (!a || !b) return null;
  for (let index = 0; index < 3; index += 1) {
    if (a[index] > b[index]) return 1;
    if (a[index] < b[index]) return -1;
  }
  return 0;
}

function runVersion(command, args) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    shell: process.platform === "win32",
    windowsHide: true,
    timeout: 10000,
  });
  if (result.error || result.status !== 0) {
    return {
      available: false,
      raw: "",
      error:
        result.error?.message ??
        (String(result.stderr ?? "").trim() || "command failed"),
    };
  }
  const raw = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  return { available: true, raw, error: null };
}

export function inspectEnvironment() {
  const toolchain = JSON.parse(
    fs.readFileSync(path.join(skillRoot, "assets", "toolchain.json"), "utf8"),
  );
  const npm = runVersion("npm", ["--version"]);
  const git = runVersion("git", ["--version"]);
  const shopify = runVersion("shopify", ["version"]);
  const nodeVersion = process.versions.node;
  const gitVersion = versionParts(git.raw)?.join(".") ?? null;
  const shopifyVersion = versionParts(shopify.raw)?.join(".") ?? null;

  const checks = {
    node: {
      available: true,
      version: nodeVersion,
      minimum: toolchain.node_minimum,
      supported: compareVersions(nodeVersion, toolchain.node_minimum) >= 0,
    },
    npm: {
      available: npm.available,
      version: versionParts(npm.raw)?.join(".") ?? null,
      error: npm.error,
    },
    git: {
      available: git.available,
      version: gitVersion,
      minimum: toolchain.git_minimum,
      supported:
        git.available && compareVersions(gitVersion, toolchain.git_minimum) >= 0,
      error: git.error,
    },
    shopify_cli: {
      available: shopify.available,
      version: shopifyVersion,
      supported_version: toolchain.shopify_cli_supported,
      exact_match:
        shopify.available &&
        compareVersions(shopifyVersion, toolchain.shopify_cli_supported) === 0,
      error: shopify.error,
    },
  };

  return {
    ok:
      checks.node.supported &&
      checks.npm.available &&
      checks.git.supported &&
      checks.shopify_cli.available,
    checked_at: new Date().toISOString(),
    toolchain,
    checks,
    next_action: !checks.node.supported
      ? "guide-node-install"
      : !checks.git.supported
        ? "guide-git-install"
        : !checks.npm.available
          ? "guide-package-manager-install"
          : !checks.shopify_cli.available
            ? `request-approval:npm install -g @shopify/cli@${toolchain.shopify_cli_supported}`
            : !checks.shopify_cli.exact_match
              ? "verify-existing-shopify-cli-compatibility"
              : "ready-for-interactive-store-auth",
  };
}
