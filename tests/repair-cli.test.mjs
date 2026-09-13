import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";

test("report, keyword and 404 CLI refuse repeated writes and accept a new revision", (t) => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "opsy-cli-"));
  t.after(() => fs.rmSync(project, { recursive: true, force: true }));
  const workspace = path.join(project, "_project"), data = path.join(workspace, "data-center");
  fs.mkdirSync(data, { recursive: true });
  fs.writeFileSync(path.join(project, "shopify-ops.json"), JSON.stringify({ workspace: "_project", layout_version: 1 }));
  fs.writeFileSync(path.join(data, "queries.csv"), "query,clicks,impressions,ctr,position\nhow to choose,2,100,0.02,8\n");
  fs.writeFileSync(path.join(data, "manifest.json"), JSON.stringify({ schema_version: "data-center-manifest-v1", updated_at: "2026-09-01T00:00:00Z", datasets: { gsc_queries: { path: "queries.csv", row_count: 1, columns: ["query", "clicks", "impressions", "ctr", "position"], scope: "synthetic", source_channel: "provider", timezone: "UTC", pulled_at: "2026-09-01T00:00:00Z", date_range: { start_date: "2026-08-01", end_date: "2026-08-31" } } } }));
  const run = (command, extra = []) => spawnSync(process.execPath, [path.resolve("skills/opsy/scripts/opsy.mjs"), command, "--project", project, "--json", ...extra], { encoding: "utf8", timeout: 10000 });
  for (const command of ["summarize-data", "suggest-keywords", "refresh-404"]) {
    const first = run(command, ["--apply"]);
    assert.equal(first.status, 0, first.stderr);
    const result = JSON.parse(first.stdout), file = result.output_path;
    const content = fs.readFileSync(file, "utf8");
    if (command === "suggest-keywords") assert.equal(result.rows[0].ga4_sessions, "");
    const again = run(command, ["--apply"]);
    assert.equal(again.status, 1);
    assert.equal(fs.readFileSync(file, "utf8"), content);
    const revision = run(command, ["--apply", "--output", `${file}.r2`]);
    assert.equal(revision.status, 0, revision.stderr);
  }
  fs.writeFileSync(path.join(workspace, "result-input.json"), JSON.stringify({ schema_version: "opsy-task-result-v1", task_id: "monthly", run_id: "r1", workflow: "data", status: "analysis_complete", goal: "Review", summary: "Synthetic report", timezone: "UTC", recorded_at: "2026-09-13T00:00:00Z", basis: "Synthetic export", inputs: ["data-center/manifest.json", "data-center/queries.csv"], artifacts: ["outputs/monthly/monthly-summary-2026-08.md"], objects: [], next_actions: [] }));
  assert.equal(run("record-task-result", ["--file", "result-input.json", "--apply"]).status, 0);
  const resumed = run("resume-task", ["--task", "monthly"]);
  assert.equal(resumed.status, 0, resumed.stderr);
  assert.equal(JSON.parse(resumed.stdout).status, "analysis_complete");
});
