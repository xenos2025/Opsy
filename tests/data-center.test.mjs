import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  build404Queue,
  buildKeywordSuggestions,
  buildMonthlySummary,
  validateDataCenter,
} from "../skills/opsy/scripts/lib/data-center.mjs";
import {
  initializeWorkspace,
  writeJson,
} from "../skills/opsy/scripts/lib/workspace.mjs";

function fixture() {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "opsy-data-"));
  initializeWorkspace({ projectPath: project, agents: "auto", apply: true });
  const workspace = path.join(project, "shopify-ops");
  const dataCenter = path.join(workspace, "data-center");
  return { project, workspace, dataCenter };
}

function cleanup(directory) {
  fs.rmSync(directory, { recursive: true, force: true });
}

function dataset(pathName, rowCount, columns) {
  return {
    path: pathName,
    source_channel: "test delivery",
    scope: "sc-domain:example.com",
    date_range: {
      start_date: "2026-06-01",
      end_date: "2026-06-30",
    },
    timezone: "Asia/Shanghai",
    pulled_at: "2026-07-01T08:00:00+08:00",
    row_count: rowCount,
    columns,
  };
}

test("manifest validator accepts declared leading columns and warns on extensions", () => {
  const { project, dataCenter } = fixture();
  try {
    fs.writeFileSync(
      path.join(dataCenter, "gsc_queries.csv"),
      "clicks,impressions,query,dynamic_month\n2,100,fabric,40\n",
      "utf8",
    );
    writeJson(path.join(dataCenter, "manifest.json"), {
      schema_version: "data-center-manifest-v1",
      datasets: {
        gsc_queries: dataset("gsc_queries.csv", 1, ["clicks", "impressions", "query"]),
      },
      updated_at: "2026-07-01T08:00:00+08:00",
    });

    const result = validateDataCenter(dataCenter);
    assert.equal(result.ok, true);
    assert.match(result.warnings[0], /dynamic_month/);
  } finally {
    cleanup(project);
  }
});

test("manifest validator rejects path escape and row mismatch", () => {
  const { project, dataCenter } = fixture();
  try {
    writeJson(path.join(dataCenter, "manifest.json"), {
      schema_version: "data-center-manifest-v1",
      datasets: {
        bad: dataset("../outside.csv", 1, ["value"]),
      },
      updated_at: "2026-07-01T08:00:00+08:00",
    });
    const escaped = validateDataCenter(dataCenter);
    assert.equal(escaped.ok, false);
    assert.match(escaped.errors.join(" "), /escapes/);

    fs.writeFileSync(path.join(dataCenter, "inside.csv"), "value\n1\n", "utf8");
    writeJson(path.join(dataCenter, "manifest.json"), {
      schema_version: "data-center-manifest-v1",
      datasets: {
        bad: dataset("inside.csv", 2, ["value"]),
      },
      updated_at: "2026-07-01T08:00:00+08:00",
    });
    const mismatch = validateDataCenter(dataCenter);
    assert.equal(mismatch.ok, false);
    assert.match(mismatch.errors.join(" "), /row_count differs/);
  } finally {
    cleanup(project);
  }
});

test("monthly summary uses verified fields and does not invent inquiry evidence", () => {
  const { project, dataCenter } = fixture();
  try {
    fs.writeFileSync(
      path.join(dataCenter, "gsc_queries.csv"),
      "clicks,ctr,impressions,position,query\n2,0.02,100,8,fabric\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(dataCenter, "ga4_channels.csv"),
      "sessionDefaultChannelGroup,sessions,totalUsers,engagedSessions\nOrganic Search,10,8,6\n",
      "utf8",
    );
    writeJson(path.join(dataCenter, "manifest.json"), {
      schema_version: "data-center-manifest-v1",
      datasets: {
        gsc_queries: dataset("gsc_queries.csv", 1, [
          "clicks",
          "ctr",
          "impressions",
          "position",
          "query",
        ]),
        ga4_channels: dataset("ga4_channels.csv", 1, [
          "sessionDefaultChannelGroup",
          "sessions",
          "totalUsers",
          "engagedSessions",
        ]),
      },
      updated_at: "2026-07-01T08:00:00+08:00",
    });

    const summary = buildMonthlySummary(dataCenter);
    assert.equal(summary.period, "2026-06");
    assert.match(summary.markdown, /2 clicks/);
    assert.match(summary.markdown, /10 sessions/);
    assert.match(summary.markdown, /询盘证据：Unavailable/);
    assert.match(summary.markdown, /不提供环比/);
  } finally {
    cleanup(project);
  }
});

test("keyword suggestions route observed demand without auto-approving content", () => {
  const { project, dataCenter } = fixture();
  try {
    fs.writeFileSync(
      path.join(dataCenter, "gsc_queries.csv"),
      [
        "clicks,ctr,impressions,position,query",
        "4,0.02,200,6,commercial panel sample",
        "1,0.01,150,12,how to compare panel finishes",
        "0,0,80,18,custom project options",
        "",
      ].join("\n"),
      "utf8",
    );
    fs.writeFileSync(
      path.join(dataCenter, "gsc_query_page.csv"),
      [
        "clicks,ctr,impressions,position,query,page",
        "4,0.02,200,6,commercial panel sample,https://example.com/products/panel-sample",
        "1,0.01,150,12,how to compare panel finishes,https://example.com/blogs/news/compare-finishes",
        "",
      ].join("\n"),
      "utf8",
    );
    fs.writeFileSync(
      path.join(dataCenter, "ga4_landing_pages.csv"),
      [
        "landingPagePlusQueryString,sessions,engagedSessions,averageSessionDuration",
        "/products/panel-sample,20,12,45",
        "/blogs/news/compare-finishes,10,7,60",
        "",
      ].join("\n"),
      "utf8",
    );
    writeJson(path.join(dataCenter, "manifest.json"), {
      schema_version: "data-center-manifest-v1",
      datasets: {
        gsc_queries: dataset("gsc_queries.csv", 3, [
          "clicks",
          "ctr",
          "impressions",
          "position",
          "query",
        ]),
        gsc_query_page: dataset("gsc_query_page.csv", 2, [
          "clicks",
          "ctr",
          "impressions",
          "position",
          "query",
          "page",
        ]),
        ga4_landing_pages: dataset("ga4_landing_pages.csv", 2, [
          "landingPagePlusQueryString",
          "sessions",
          "engagedSessions",
          "averageSessionDuration",
        ]),
      },
      updated_at: "2026-07-01T08:00:00+08:00",
    });

    const result = buildKeywordSuggestions(dataCenter);
    assert.equal(result.ok, true);
    assert.equal(result.status, "ready");
    assert.equal(result.rows.length, 3);
    assert.equal(result.rows[0].route_hint, "product");
    assert.equal(result.rows[0].suggested_action, "strengthen_product_or_listing");
    assert.equal(result.rows[0].ga4_sessions, "20");
    assert.equal(result.rows[0].selection_status, "suggested");
    assert.equal(result.rows[1].route_hint, "blog");
    assert.equal(result.rows[1].suggested_action, "update_existing_blog");
    assert.equal(result.rows[2].route_hint, "review");
    assert.match(result.csv, /source_period/);
    assert.doesNotMatch(result.csv, /approved|selected_for_write/i);
  } finally {
    cleanup(project);
  }
});

test("keyword suggestions fail closed when GSC query evidence is absent", () => {
  const { project, dataCenter } = fixture();
  try {
    writeJson(path.join(dataCenter, "manifest.json"), {
      schema_version: "data-center-manifest-v1",
      datasets: {},
      updated_at: "2026-07-01T08:00:00+08:00",
    });

    const result = buildKeywordSuggestions(dataCenter);
    assert.equal(result.ok, false);
    assert.equal(result.status, "blocked");
    assert.deepEqual(result.rows, []);
    assert.match(result.errors.join(" "), /gsc_queries/);
  } finally {
    cleanup(project);
  }
});

test("404 refresh merges optional dataset and handle changes without authorizing writes", () => {
  const { project, workspace, dataCenter } = fixture();
  try {
    fs.writeFileSync(
      path.join(dataCenter, "gsc_not_found.csv"),
      "path,status\n/old-page,404\n",
      "utf8",
    );
    writeJson(path.join(dataCenter, "manifest.json"), {
      schema_version: "data-center-manifest-v1",
      datasets: {
        gsc_not_found: dataset("gsc_not_found.csv", 1, ["path", "status"]),
      },
      updated_at: "2026-07-01T08:00:00+08:00",
    });
    fs.writeFileSync(
      path.join(workspace, "ai-log", "handle-changes.csv"),
      "changed_at,resource_type,resource_id,old_path,new_path,source_operation,status\n2026-07-01,article,1,/old-blog,/new-blog,op-1,pending\n",
      "utf8",
    );

    const queue = build404Queue(workspace);
    assert.equal(queue.count, 2);
    assert.match(queue.csv, /\/old-page/);
    assert.match(queue.csv, /\/old-blog/);
    assert.match(queue.csv, /needs_review/);
    assert.equal(queue.rows.every((row) => row.selected_for_write === "false"), true);
  } finally {
    cleanup(project);
  }
});

test("header_row datasets validate and provider inquiry analysis renders bounded", () => {
  const { project, dataCenter } = fixture();
  try {
    const funnelRows = Array.from({ length: 10 }, (_, index) => `阶段${index + 1},${100 - index},定义${index + 1}`);
    fs.writeFileSync(
      path.join(dataCenter, "inquiry_funnel.csv"),
      `线索漏斗\n点击不是询盘：最后一级必须由销售回传\n阶段,数量,定义\n${funnelRows.join("\n")}\n`,
      "utf8",
    );
    writeJson(path.join(dataCenter, "manifest.json"), {
      schema_version: "data-center-manifest-v1",
      datasets: {
        inquiry_funnel: {
          ...dataset("inquiry_funnel.csv", 10, ["阶段", "数量", "定义"]),
          header_row: 3,
        },
      },
      updated_at: "2026-07-01T08:00:00+08:00",
    });

    const validation = validateDataCenter(dataCenter);
    assert.equal(validation.ok, true, JSON.stringify(validation, null, 2));

    const summary = buildMonthlySummary(dataCenter);
    assert.match(summary.markdown, /服务方询盘分析/);
    assert.match(summary.markdown, /inquiry_funnel/);
    assert.match(summary.markdown, /销售或客服回传/);
    assert.match(summary.markdown, /阶段8/);
    assert.doesNotMatch(summary.markdown, /阶段9/);
    assert.match(summary.markdown, /截断展示/);
    assert.match(summary.markdown, /询盘证据：服务方交付的询盘分析数据集/);
  } finally {
    cleanup(project);
  }
});

test("header_row must be a positive integer and headers are read at that row", () => {
  const { project, dataCenter } = fixture();
  try {
    fs.writeFileSync(
      path.join(dataCenter, "inquiry_channels.csv"),
      "标题行\n渠道,净会话\n自然搜索,118\n",
      "utf8",
    );
    writeJson(path.join(dataCenter, "manifest.json"), {
      schema_version: "data-center-manifest-v1",
      datasets: {
        inquiry_channels: {
          ...dataset("inquiry_channels.csv", 1, ["渠道", "净会话"]),
          header_row: 0,
        },
      },
      updated_at: "2026-07-01T08:00:00+08:00",
    });
    const invalid = validateDataCenter(dataCenter);
    assert.equal(invalid.ok, false);
    assert.match(invalid.errors.join(" "), /header_row/);

    writeJson(path.join(dataCenter, "manifest.json"), {
      schema_version: "data-center-manifest-v1",
      datasets: {
        inquiry_channels: {
          ...dataset("inquiry_channels.csv", 1, ["渠道", "净会话"]),
          header_row: 2,
        },
      },
      updated_at: "2026-07-01T08:00:00+08:00",
    });
    const valid = validateDataCenter(dataCenter);
    assert.equal(valid.ok, true, JSON.stringify(valid, null, 2));
  } finally {
    cleanup(project);
  }
});

test("monthly summary computes a bounded history comparison from archives", () => {
  const { project, dataCenter } = fixture();
  try {
    fs.writeFileSync(
      path.join(dataCenter, "gsc_queries.csv"),
      "clicks,ctr,impressions,position,query\n6,0.03,200,5,wpc panel\n1,0.01,90,12,pvc marble sheet\n",
      "utf8",
    );
    const archiveDirectory = path.join(dataCenter, "archive", "2026-05");
    fs.mkdirSync(archiveDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(archiveDirectory, "gsc_queries.csv"),
      "clicks,ctr,impressions,position,query\n2,0.02,150,8,wpc panel\n",
      "utf8",
    );
    writeJson(path.join(dataCenter, "manifest.json"), {
      schema_version: "data-center-manifest-v1",
      datasets: {
        gsc_queries: {
          ...dataset("gsc_queries.csv", 2, ["clicks", "ctr", "impressions", "position", "query"]),
          archive_path: "archive/2026-05/gsc_queries.csv",
          row_coverage: "complete",
          archive_metadata: {
            ...dataset("archive/2026-05/gsc_queries.csv", 1, ["clicks", "ctr", "impressions", "position", "query"]),
            date_range: { start_date: "2026-05-01", end_date: "2026-05-30" },
            row_coverage: "complete",
          },
        },
      },
      updated_at: "2026-07-01T08:00:00+08:00",
    });

    const summary = buildMonthlySummary(dataCenter);
    assert.match(summary.markdown, /历史对比（有界）/);
    assert.match(summary.markdown, /GSC vs 2026-05/);
    assert.match(summary.markdown, /wpc panel \+4/);
    assert.match(summary.markdown, /不要将全量归档读入会话/);
    assert.doesNotMatch(summary.markdown, /不提供环比/);
  } finally {
    cleanup(project);
  }
});
