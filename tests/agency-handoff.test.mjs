import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import { importAgencyHandoff } from "../skills/opsy/scripts/lib/agency-handoff.mjs";

function withCsv(text, callback) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "opsy-handoff-"));
  const filePath = path.join(directory, "opsy-merchant-handoff.csv");
  fs.writeFileSync(filePath, text, "utf8");
  try {
    callback(filePath);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

const headers = [
  "contract_version",
  "task_id",
  "month",
  "route_hint",
  "target",
  "action",
  "evidence_refs",
  "priority",
  "due_week",
  "acceptance_criteria",
  "requires_shopify_write",
  "status",
].join(",");

test("agency handoff imports only reviewed merchant tasks without execution approval", () => {
  withCsv(
    [
      headers,
      "opsy-agency-handoff-v1,t-1,2026-08,product,/products/example,Review PDP facts,outputs/report.md,P1,2,Approved facts are recorded,true,ready_for_merchant",
      "opsy-agency-handoff-v1,t-2,2026-08,blog,/blogs/news/example,Draft article,outputs/report.md,P2,3,Draft reviewed,false,needs_confirmation",
      "",
    ].join("\n"),
    (filePath) => {
      const result = importAgencyHandoff(filePath);
      assert.equal(result.ok, true);
      assert.equal(result.rows.length, 1);
      assert.equal(result.skipped, 1);
      assert.equal(result.rows[0].source_type, "agency_handoff");
      assert.equal(result.rows[0].selected_for_execution, "false");
      assert.equal(result.rows[0].requires_shopify_write, "true");
      assert.doesNotMatch(result.csv, /selected_for_execution,true/);
    },
  );
});

test("agency handoff blocks unsupported Opsy routes", () => {
  withCsv(
    [
      headers,
      "opsy-agency-handoff-v1,t-1,2026-08,theme,sections/main.liquid,Edit theme,outputs/report.md,P1,2,Theme changed,true,ready_for_merchant",
      "",
    ].join("\n"),
    (filePath) => {
      const result = importAgencyHandoff(filePath);
      assert.equal(result.ok, false);
      assert.equal(result.status, "blocked");
      assert.match(result.errors.join(" "), /route_hint/);
      assert.deepEqual(result.rows, []);
    },
  );
});

test("agency handoff CLI applies a local queue at the workspace boundary", () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "opsy-handoff-project-"));
  const workspace = path.join(project, "_project");
  const source = path.join(project, "opsy-merchant-handoff.csv");
  fs.mkdirSync(workspace, { recursive: true });
  fs.writeFileSync(
    path.join(project, "shopify-ops.json"),
    '{"workspace":"_project","layout_version":1}\n',
    "utf8",
  );
  fs.writeFileSync(
    source,
    [
      headers,
      "opsy-agency-handoff-v1,t-1,2026-08,weekly_report,store,Review the weekly report,outputs/report.md,P1,1,Merchant records a decision,false,ready_for_merchant",
      "",
    ].join("\n"),
    "utf8",
  );

  try {
    const command = spawnSync(
      process.execPath,
      [
        path.resolve("skills/opsy/scripts/opsy.mjs"),
        "import-agency-handoff",
        "--project",
        project,
        "--file",
        source,
        "--apply",
        "--json",
      ],
      { cwd: path.resolve("."), encoding: "utf8" },
    );
    assert.equal(command.status, 0, command.stderr);
    const result = JSON.parse(command.stdout);
    assert.equal(result.applied, true);
    assert.equal(result.imported, undefined);
    assert.equal(result.rows.length, 1);
    assert.equal(
      result.output_path,
      path.join(
        workspace,
        "outputs",
        "agency-handoff",
        "merchant-action-queue-2026-08.csv",
      ),
    );
    assert.ok(fs.existsSync(result.output_path));
    assert.match(fs.readFileSync(result.output_path, "utf8"), /selected_for_execution/);
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});
