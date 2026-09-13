import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateDataCenter, buildMonthlySummary } from "../skills/opsy/scripts/lib/data-center.mjs";

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "opsy-data-regression-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (name, value) => fs.writeFileSync(path.join(root, name), typeof value === "string" ? value : JSON.stringify(value));
  const meta = (name, rows, columns) => ({ path: name, row_count: rows, columns, source_channel: "synthetic delivery", scope: "fixture", timezone: "Asia/Shanghai", date_range: { start_date: "2026-06-01", end_date: "2026-06-30" }, pulled_at: "2026-07-01T00:00:00Z" });
  const manifest = (datasets) => write("manifest.json", { schema_version: "data-center-manifest-v1", updated_at: "2026-07-01T00:00:00Z", datasets });
  return { root, write, meta, manifest };
}

test("inquiry-only summary retains full provenance", (t) => {
  const f = fixture(t);
  f.write("inquiry.csv", "stage,count\nintent,8\n");
  f.manifest({ inquiry_funnel: f.meta("inquiry.csv", 1, ["stage", "count"]) });
  const result = buildMonthlySummary(f.root);
  assert.equal(result.period, "2026-06");
  assert.match(result.markdown, /Asia\/Shanghai/);
  assert.match(result.markdown, /inquiry.csv.*synthetic delivery/);
});

test("missing metrics stay unavailable and invalid numbers fail validation", (t) => {
  const f = fixture(t);
  f.write("query.csv", "query,clicks\ncomponent,N/A\n");
  f.manifest({ gsc_queries: f.meta("query.csv", 1, ["query", "clicks"]) });
  assert.equal(validateDataCenter(f.root).ok, false);
  assert.throws(() => buildMonthlySummary(f.root), /invalid numeric/);
  f.write("query.csv", "query,clicks\ncomponent,2\n");
  const report = buildMonthlySummary(f.root).markdown;
  assert.match(report, /Unavailable impressions/);
  assert.doesNotMatch(report, /0\.00%/);
});

test("history requires provenance and never invents absent metrics or query rows", (t) => {
  const f = fixture(t);
  f.write("current.csv", "query,clicks,impressions\nkept,2,10\n");
  f.write("prior.csv", "query,clicks\nkept,1\nvanished,9\n");
  const current = { ...f.meta("current.csv", 1, ["query", "clicks", "impressions"]), archive_path: "prior.csv", row_coverage: "complete" };
  f.manifest({ gsc_queries: current });
  assert.match(buildMonthlySummary(f.root).markdown, /不提供环比/);
  current.archive_metadata = { ...f.meta("prior.csv", 2, ["query", "clicks"]), date_range: { start_date: "2026-05-01", end_date: "2026-05-30" }, row_coverage: "complete" };
  f.manifest({ gsc_queries: current });
  const comparable = buildMonthlySummary(f.root).markdown;
  assert.match(comparable, /vanished -9/);
  assert.match(comparable, /impressions：不可比/);
  current.archive_metadata.scope = "different property";
  f.manifest({ gsc_queries: current });
  assert.match(buildMonthlySummary(f.root).markdown, /不提供环比/);
});
