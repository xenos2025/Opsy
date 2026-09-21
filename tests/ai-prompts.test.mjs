import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import test from "node:test";
import { selectAiPrompts, promptColumns } from "../skills/opsy/scripts/lib/ai-prompts.mjs";
import { initializeWorkspace } from "../skills/opsy/scripts/lib/workspace.mjs";

test("formal questions require active policy, reviewed evidence and exact scope; invalid inputs never fall back", () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "opsy-ai-prompts-"));
  try {
    const task = { surface: "product", language: "en", market: "global", scope: "seals" };
    assert.equal(selectAiPrompts(project, task).status, "not_configured");
    initializeWorkspace({ projectPath: project, agents: "no", apply: true });
    const root = path.join(project, "shopify-ops");
    assert.equal(selectAiPrompts(root, task).status, "draft");
    assert.deepEqual(selectAiPrompts(root, task).items, []);
    fs.writeFileSync(path.join(root, "source.md"), "Synthetic source");
    fs.writeFileSync(path.join(root, "review.md"), "Synthetic review");
    const policy = { schema_version: "ai-search-intent-v1", status: "active", prompts_path: "config/ai-search/prompts.csv", review_ref: "review.md" };
    const save = () => fs.writeFileSync(path.join(root, "config/ai_search_intent.json"), JSON.stringify(policy));
    const row = ["q1", "How do I request a seal quote?", "buy", "en", "global", "product", "seals", "approved", "source.md#question", "review.md", ""];
    const writeRows = (rows) => fs.writeFileSync(path.join(root, "config/ai-search/prompts.csv"), [promptColumns, ...rows].map((r) => r.join(",")).join("\n") + "\n");
    save(); writeRows([row]);
    assert.equal(selectAiPrompts(root, task).items.length, 1);
    assert.equal(selectAiPrompts(root, task).write_authorized, false);
    assert.deepEqual(selectAiPrompts(root, { ...task, market: "EU" }).items, []);
    policy.status = "disabled"; save();
    assert.deepEqual(selectAiPrompts(root, task).items, []);
    policy.status = "active"; save(); row[7] = "draft"; writeRows([row]);
    assert.deepEqual(selectAiPrompts(root, task).items, []);
    row[7] = "approved"; row[8] = "missing.md"; writeRows([row]);
    assert.throws(() => selectAiPrompts(root, task), /source_ref/);
    row[8] = "source.md"; writeRows([row, row]);
    assert.throws(() => selectAiPrompts(root, task), /Duplicate/);
    for (const ref of ["../escape.csv", "outputs/prompts.csv", "config/ai-search/missing.csv"]) {
      policy.prompts_path = ref; save();
      assert.throws(() => selectAiPrompts(root, task));
    }
  } finally { fs.rmSync(project, { recursive: true, force: true }); }
});
