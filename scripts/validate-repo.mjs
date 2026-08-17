import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillRoot = path.join(root, "skills", "opsy");
const errors = [];

const gitignoreRules = new Set(
  fs
    .readFileSync(path.join(root, ".gitignore"), "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#")),
);
for (const localOnlyPath of ["promo/", "docs/adr/"]) {
  if (!gitignoreRules.has(localOnlyPath)) {
    errors.push(`local-only path must stay excluded from GitHub sync: ${localOnlyPath}`);
  }
}
if (gitignoreRules.has("tests/")) {
  errors.push("tests/ must remain synchronized so GitHub Actions can run npm test");
}

function requireFile(relativePath) {
  const fullPath = path.join(root, relativePath);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    errors.push(`missing file: ${relativePath}`);
  }
}

[
  "README.md",
  "VERSION",
  "opsy-release.json",
  "install.ps1",
  "install.sh",
  "uninstall.ps1",
  "uninstall.sh",
  "skills/opsy/SKILL.md",
  "skills/opsy/VERSION",
  "skills/opsy/agents/openai.yaml",
  "skills/opsy/scripts/opsy.mjs",
].forEach(requireFile);

const rootVersion = fs.readFileSync(path.join(root, "VERSION"), "utf8").trim();
const skillVersion = fs.readFileSync(path.join(skillRoot, "VERSION"), "utf8").trim();
const release = JSON.parse(fs.readFileSync(path.join(root, "opsy-release.json"), "utf8"));
const toolchain = JSON.parse(
  fs.readFileSync(path.join(skillRoot, "assets", "toolchain.json"), "utf8"),
);
if (rootVersion !== skillVersion || rootVersion !== release.version) {
  errors.push("VERSION, skill VERSION, and release version differ");
}
if (release.toolchain.shopify_cli !== toolchain.shopify_cli_supported) {
  errors.push("Shopify CLI versions differ between release and skill toolchain");
}
if (release.toolchain.admin_graphql !== toolchain.admin_graphql_version) {
  errors.push("Admin GraphQL versions differ between release and skill toolchain");
}

const skill = fs.readFileSync(path.join(skillRoot, "SKILL.md"), "utf8");
if (skill.includes("TODO")) errors.push("SKILL.md contains TODO");
if (skill.split(/\r?\n/).length >= 500) errors.push("SKILL.md must stay under 500 lines");

const referenceDir = path.join(skillRoot, "references");
for (const file of fs.readdirSync(referenceDir)) {
  if (!skill.includes(`references/${file}`)) {
    errors.push(`reference is not directly linked from SKILL.md: ${file}`);
  }
}

const forbiddenNames = new Set([".env", "auth.json", "secrets.json"]);
const residuePatterns = [
  /D:\\Codex\\shopify/i,
  /xenos2025\/(?!Opsy\b)/i,
  /shopify-basic[-]ops/i,
  /shpat_[A-Za-z0-9]+/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
];
const stack = [skillRoot];
while (stack.length > 0) {
  const current = stack.pop();
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      stack.push(fullPath);
      continue;
    }
    if (forbiddenNames.has(entry.name)) {
      errors.push(`forbidden sensitive filename: ${path.relative(root, fullPath)}`);
    }
    const content = fs.readFileSync(fullPath, "utf8");
    for (const pattern of residuePatterns) {
      if (pattern.test(content)) {
        errors.push(`residue or secret pattern in ${path.relative(root, fullPath)}: ${pattern}`);
      }
    }
  }
}

if (errors.length > 0) {
  process.stderr.write(`Repository validation failed:\n- ${errors.join("\n- ")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Repository validation passed for Opsy ${rootVersion}; ${fs.readdirSync(referenceDir).length} direct references checked.\n`,
  );
}
