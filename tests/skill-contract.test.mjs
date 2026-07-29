import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillRoot = path.join(root, "skills", "opsy");

test("skill frontmatter has only name and description", () => {
  const skill = fs.readFileSync(path.join(skillRoot, "SKILL.md"), "utf8");
  const match = skill.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, "frontmatter is missing");
  const keys = match[1]
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split(":")[0]);
  assert.deepEqual(keys, ["name", "description"]);
  assert.match(match[1], /^name: opsy$/m);
  assert.equal(skill.includes("TODO"), false);
  assert.ok(skill.split(/\r?\n/).length < 500);
});

test("every reference is directly linked from SKILL.md", () => {
  const skill = fs.readFileSync(path.join(skillRoot, "SKILL.md"), "utf8");
  const referenceDir = path.join(skillRoot, "references");
  for (const file of fs.readdirSync(referenceDir)) {
    assert.match(skill, new RegExp(`references/${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  }
});

test("versions and UI metadata are synchronized", () => {
  const rootVersion = fs.readFileSync(path.join(root, "VERSION"), "utf8").trim();
  const skillVersion = fs.readFileSync(path.join(skillRoot, "VERSION"), "utf8").trim();
  const release = JSON.parse(fs.readFileSync(path.join(root, "opsy-release.json"), "utf8"));
  const agent = fs.readFileSync(path.join(skillRoot, "agents", "openai.yaml"), "utf8");
  assert.equal(rootVersion, skillVersion);
  assert.equal(rootVersion, release.version);
  assert.match(agent, /display_name: "Opsy"/);
  assert.match(agent, /default_prompt: ".*\$opsy/);
});

test("distributable files contain no client residue or plaintext secret markers", () => {
  const forbidden = [
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
      } else {
        const content = fs.readFileSync(fullPath, "utf8");
        forbidden.forEach((pattern) => assert.doesNotMatch(content, pattern, fullPath));
      }
    }
  }
});

test("installers use recoverable archives and avoid destructive removal", () => {
  const powershell = `${fs.readFileSync(path.join(root, "install.ps1"), "utf8")}\n${fs.readFileSync(path.join(root, "uninstall.ps1"), "utf8")}`;
  const shell = `${fs.readFileSync(path.join(root, "install.sh"), "utf8")}\n${fs.readFileSync(path.join(root, "uninstall.sh"), "utf8")}`;
  assert.match(powershell, /\.opsy-backups/);
  assert.doesNotMatch(powershell, /Remove-Item/);
  assert.match(shell, /\.opsy-backups/);
  assert.doesNotMatch(shell, /\brm\s+-rf\b/);
});
