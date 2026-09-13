import fs from "node:fs";
import path from "node:path";
import { readJson, readProject, resolveInside } from "./workspace.mjs";

export function readUtf8(filePath) {
  const bytes = fs.readFileSync(filePath);
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error("CSV contains an unclosed quoted field");
  row.push(field);
  if (row.some((value) => value !== "")) rows.push(row);
  if (rows[0]?.[0]) rows[0][0] = rows[0][0].replace(/^\uFEFF/, "");
  return rows;
}

export function csvObjects(text, { headerRow = 1 } = {}) {
  const allRows = parseCsv(text);
  const skip = Math.max(0, Math.trunc(headerRow) - 1);
  const rows = allRows.slice(skip);
  if (rows.length === 0) return { headers: [], rows: [] };
  const [headers, ...dataRows] = rows;
  return {
    headers,
    rows: dataRows.map((values) =>
      Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
    ),
  };
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value ?? "")) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function validDateTime(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function declaredColumnsMatch(actual, declared) {
  return (
    actual.length >= declared.length &&
    declared.every((value, index) => value === actual[index])
  );
}

export function validateDataCenter(dataCenterPath) {
  const root = path.resolve(dataCenterPath);
  const manifestPath = path.join(root, "manifest.json");
  const errors = [];
  const warnings = [];
  const checked = [];

  if (!fs.existsSync(manifestPath)) {
    return { ok: false, manifest_path: manifestPath, errors: ["manifest.json is missing"], warnings, datasets: checked };
  }

  let manifest;
  try {
    manifest = readJson(manifestPath);
  } catch (error) {
    return {
      ok: false,
      manifest_path: manifestPath,
      errors: [`manifest.json is invalid JSON: ${error.message}`],
      warnings,
      datasets: checked,
    };
  }

  if (manifest.schema_version !== "data-center-manifest-v1") {
    errors.push("schema_version must be data-center-manifest-v1");
  }
  if (!manifest.datasets || typeof manifest.datasets !== "object" || Array.isArray(manifest.datasets)) {
    errors.push("datasets must be an object");
  }

  const datasets =
    manifest.datasets && typeof manifest.datasets === "object" && !Array.isArray(manifest.datasets)
      ? manifest.datasets
      : {};
  if (Object.keys(datasets).length === 0) {
    warnings.push("manifest contains no active datasets");
  } else if (!validDateTime(manifest.updated_at)) {
    errors.push("updated_at must be an ISO date-time when datasets are present");
  }

  for (const [name, dataset] of Object.entries(datasets)) {
    const itemErrors = [];
    const itemWarnings = [];
    let activePath = null;

    if (!dataset || typeof dataset !== "object" || Array.isArray(dataset)) {
      itemErrors.push("dataset entry must be an object");
    } else {
      try {
        activePath = resolveInside(root, dataset.path, `${name}.path`);
      } catch (error) {
        itemErrors.push(error.message);
      }
      if (!dataset.source_channel) itemErrors.push("source_channel is required");
      if (!dataset.scope) itemErrors.push("scope is required");
      if (!dataset.timezone) itemErrors.push("timezone is required");
      if (!validDateTime(dataset.pulled_at)) itemErrors.push("pulled_at must be an ISO date-time");

      const start = dataset.date_range?.start_date;
      const end = dataset.date_range?.end_date;
      if (!validDate(start) || !validDate(end)) {
        itemErrors.push("date_range requires valid start_date and end_date");
      } else if (start > end) {
        itemErrors.push("date_range start_date must not be after end_date");
      }
      if (!Number.isInteger(dataset.row_count) || dataset.row_count < 0) {
        itemErrors.push("row_count must be a non-negative integer");
      }
      if (!Array.isArray(dataset.columns) || dataset.columns.some((column) => typeof column !== "string")) {
        itemErrors.push("columns must be an array of strings");
      }
      if (
        dataset.header_row !== undefined &&
        (!Number.isInteger(dataset.header_row) || dataset.header_row < 1)
      ) {
        itemErrors.push("header_row must be a positive integer when present");
      }

      if (dataset.archive_path) {
        try {
          const archivePath = resolveInside(root, dataset.archive_path, `${name}.archive_path`);
          if (!fs.existsSync(archivePath)) {
            itemWarnings.push(`archive file is missing: ${dataset.archive_path}`);
          }
        } catch (error) {
          itemErrors.push(error.message);
        }
      }
    }

    if (activePath && !fs.existsSync(activePath)) {
      itemErrors.push(`active file is missing: ${dataset.path}`);
    } else if (activePath && fs.existsSync(activePath)) {
      try {
        const parsed = csvObjects(readUtf8(activePath), {
          headerRow: Number.isInteger(dataset.header_row) ? dataset.header_row : 1,
        });
        if (
          Array.isArray(dataset.columns) &&
          !declaredColumnsMatch(parsed.headers, dataset.columns)
        ) {
          itemErrors.push(
            `CSV declared headers differ: expected leading columns [${dataset.columns.join(", ")}], got [${parsed.headers.join(", ")}]`,
          );
        } else if (
          Array.isArray(dataset.columns) &&
          parsed.headers.length > dataset.columns.length
        ) {
          itemWarnings.push(
            `CSV has additional columns not declared in manifest: ${parsed.headers
              .slice(dataset.columns.length)
              .join(", ")}`,
          );
        }
        if (Number.isInteger(dataset.row_count) && parsed.rows.length !== dataset.row_count) {
          itemErrors.push(
            `row_count differs: expected ${dataset.row_count}, got ${parsed.rows.length}`,
          );
        }
        if (/^(gsc_|ga4_)/.test(name)) {
          for (const field of ["clicks", "impressions", "ctr", "position", "sessions", "totalUsers", "engagedSessions", "averageSessionDuration"]) {
            if (parsed.headers.includes(field) && parsed.rows.some((row) => metricValue(row[field]) === null)) {
              itemErrors.push(`metric ${field} contains missing, negative, or invalid numeric values`);
            }
          }
        }
      } catch (error) {
        itemErrors.push(`CSV cannot be read as UTF-8: ${error.message}`);
      }
    }

    checked.push({
      name,
      path: dataset?.path ?? null,
      date_range: dataset?.date_range ?? null,
      timezone: dataset?.timezone ?? null,
      pulled_at: dataset?.pulled_at ?? null,
      errors: itemErrors,
      warnings: itemWarnings,
    });
    errors.push(...itemErrors.map((message) => `${name}: ${message}`));
    warnings.push(...itemWarnings.map((message) => `${name}: ${message}`));
  }

  return {
    ok: errors.length === 0,
    manifest_path: manifestPath,
    updated_at: manifest.updated_at ?? null,
    errors,
    warnings,
    datasets: checked,
  };
}

function numberValue(value) {
  if (value === null || value === undefined || value === "") return 0;
  const normalized = String(value).replace(/,/g, "").replace(/%$/, "");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return 0;
  return String(value).trim().endsWith("%") ? parsed / 100 : parsed;
}

function metricValue(value) {
  if (value == null || String(value).trim() === "") return null;
  const raw = String(value).trim();
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?%?$/.test(raw)) return null;
  const number = Number(raw.replaceAll(",", "").replace(/%$/, ""));
  return Number.isFinite(number) ? number / (raw.endsWith("%") ? 100 : 1) : null;
}

function metricTotal(dataset, field) {
  if (!dataset?.headers.includes(field)) return null;
  const values = dataset.rows.map((row) => metricValue(row[field]));
  return values.some((value) => value === null) ? null : values.reduce((a, b) => a + b, 0);
}

const metricDisplay = (value) => value === null ? "Unavailable" : formatInt(value);

function datasetHeaderRow(dataset) {
  return Number.isInteger(dataset?.header_row) ? dataset.header_row : 1;
}

function loadNamedDataset(dataCenterPath, manifest, name) {
  const dataset = manifest.datasets?.[name];
  if (!dataset?.path) return null;
  const filePath = resolveInside(dataCenterPath, dataset.path, `${name}.path`);
  if (!fs.existsSync(filePath)) return null;
  return {
    meta: dataset,
    filePath,
    ...csvObjects(readUtf8(filePath), { headerRow: datasetHeaderRow(dataset) }),
  };
}

function loadArchiveDataset(dataCenterPath, dataset) {
  const meta = dataset?.archive_metadata;
  if (!dataset?.archive_path || !meta) return null;
  const range = meta.date_range;
  if (!validDate(range?.start_date) || !validDate(range?.end_date) || range.start_date > range.end_date) return null;
  const currentRange = dataset.date_range;
  const span = (r) => Date.parse(r.end_date) - Date.parse(r.start_date);
  if (range.end_date >= currentRange.start_date || span(range) !== span(currentRange)) return null;
  if (!["scope", "timezone", "source_channel"].every((key) => meta[key] && meta[key] === dataset[key])) return null;
  if (meta.filter_signature !== dataset.filter_signature || !Array.isArray(meta.columns) || !Number.isInteger(meta.row_count)) return null;
  if (!validDateTime(meta.pulled_at)) return null;
  let filePath;
  try {
    filePath = resolveInside(dataCenterPath, dataset.archive_path, "archive_path");
  } catch {
    return null;
  }
  if (!fs.existsSync(filePath)) return null;
  try {
    const parsed = csvObjects(readUtf8(filePath), { headerRow: datasetHeaderRow(meta) });
    if (!declaredColumnsMatch(parsed.headers, meta.columns) || parsed.rows.length !== meta.row_count) return null;
    return { filePath, meta, period: `${range.start_date} — ${range.end_date}`, ...parsed };
  } catch {
    return null;
  }
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + numberValue(row[field]), 0);
}

function formatInt(value) {
  return Math.round(value).toLocaleString("en-US");
}

function escapeCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function topRows(dataset, dimension, metric, limit = 5) {
  if (!dataset || !dataset.headers.includes(dimension) || !dataset.headers.includes(metric)) return [];
  return [...dataset.rows]
    .filter((row) => row[dimension])
    .sort((left, right) => numberValue(right[metric]) - numberValue(left[metric]))
    .slice(0, limit);
}

export function buildMonthlySummary(dataCenterPath) {
  const root = path.resolve(dataCenterPath);
  const manifest = readJson(path.join(root, "manifest.json"));
  const validation = validateDataCenter(root);
  if (!validation.ok) {
    throw new Error(`Data center validation failed: ${validation.errors.join("; ")}`);
  }

  const gscQueries = loadNamedDataset(root, manifest, "gsc_queries");
  const gscPages = loadNamedDataset(root, manifest, "gsc_pages");
  const ga4Channels = loadNamedDataset(root, manifest, "ga4_channels");
  const ga4Landing = loadNamedDataset(root, manifest, "ga4_landing_pages");
  const standard = [gscQueries, gscPages, ga4Channels, ga4Landing].filter(Boolean);
  const inquiryDatasets = Object.keys(manifest.datasets ?? {})
    .filter((name) => name.startsWith("inquiry_"))
    .sort()
    .map((name) => ({ name, dataset: loadNamedDataset(root, manifest, name) }))
    .filter((entry) => entry.dataset);
  const consumed = [...standard, ...inquiryDatasets.map((entry) => entry.dataset)];
  const periods = [
    ...new Set(
      consumed.map(
        (dataset) =>
          `${dataset.meta.date_range?.start_date ?? "unknown"} → ${dataset.meta.date_range?.end_date ?? "unknown"}`,
      ),
    ),
  ];
  const timezones = [...new Set(consumed.map((dataset) => dataset.meta.timezone).filter(Boolean))];
  const endDate =
    consumed
      .map((dataset) => dataset.meta.date_range?.end_date)
      .filter(Boolean)
      .sort()
      .at(-1) ?? "unknown";

  const lines = [
    `# 交付数据摘要 — ${endDate.slice(0, 7)}`,
    "",
    `- 报告生成：${new Date().toISOString()}（UTC）；依据为服务方交付的本地快照`,
    `- 数据范围：${periods.length > 0 ? periods.join("；") : "无标准 GSC/GA4 数据集"}`,
    `- 时区：${timezones.length > 0 ? timezones.join("；") : "未提供"}`,
    `- Manifest 更新：${manifest.updated_at ?? "未提供"}`,
    `- 验证：${validation.ok ? "通过" : "失败"}`,
    "",
    "## 主要指标",
    "",
  ];

  if (gscQueries) {
    const clicks = metricTotal(gscQueries, "clicks");
    const impressions = metricTotal(gscQueries, "impressions");
    const ctr = clicks !== null && impressions > 0 ? clicks / impressions : null;
    const weightedPosition =
      impressions > 0 && metricTotal(gscQueries, "position") !== null
        ? gscQueries.rows.reduce(
            (total, row) => total + numberValue(row.position) * numberValue(row.impressions),
            0,
          ) / impressions
        : null;
    lines.push(
      `- GSC：${metricDisplay(clicks)} clicks，${metricDisplay(impressions)} impressions，CTR ${ctr === null ? "Unavailable" : `${(ctr * 100).toFixed(2)}%`}，加权平均排名 ${weightedPosition === null ? "Unavailable" : weightedPosition.toFixed(2)}`,
    );
  } else {
    lines.push("- GSC：Unavailable（缺少 `gsc_queries`）");
  }

  if (ga4Channels) {
    const sessions = metricTotal(ga4Channels, "sessions");
    const users = metricTotal(ga4Channels, "totalUsers");
    const engaged = metricTotal(ga4Channels, "engagedSessions");
    lines.push(
      `- GA4：${metricDisplay(sessions)} sessions，${metricDisplay(users)} users（渠道行求和，非跨渠道去重人数），${metricDisplay(engaged)} engaged sessions${sessions > 0 && engaged !== null ? `，engagement rate ${((engaged / sessions) * 100).toFixed(2)}%` : ""}`,
    );
  } else {
    lines.push("- GA4：Unavailable（缺少 `ga4_channels`）");
  }

  const inquiryFields = standard.flatMap((dataset) =>
    dataset.headers.filter((header) => /inquir|lead|form|keyevents|conversion/i.test(header)),
  );
  if (inquiryDatasets.length > 0) {
    lines.push(
      `- 询盘证据：服务方交付的询盘分析数据集（${inquiryDatasets.map((entry) => `\`${entry.name}\``).join("、")}），口径以交付说明为准`,
    );
  } else {
    lines.push(
      inquiryFields.length > 0
        ? `- 询盘证据字段：${[...new Set(inquiryFields)].join(", ")}（需按业务定义解释）`
        : "- 询盘证据：Unavailable（当前标准数据集没有明确询盘字段；等待服务方交付询盘分析数据集）",
    );
  }

  const queries = topRows(gscQueries, "query", "clicks");
  if (queries.length > 0) {
    lines.push("", "## 点击最高的查询", "", "| Query | Clicks | Impressions | CTR | Position |", "|---|---:|---:|---:|---:|");
    for (const row of queries) {
      lines.push(
        `| ${escapeCell(row.query)} | ${metricDisplay(metricValue(row.clicks))} | ${metricDisplay(metricValue(row.impressions))} | ${metricValue(row.ctr) === null ? "Unavailable" : `${(metricValue(row.ctr) * 100).toFixed(2)}%`} | ${metricValue(row.position) === null ? "Unavailable" : metricValue(row.position).toFixed(2)} |`,
      );
    }
  }

  const pages = topRows(gscPages, "page", "clicks");
  if (pages.length > 0) {
    lines.push("", "## 点击最高的页面", "", "| Page | Clicks | Impressions |", "|---|---:|---:|");
    for (const row of pages) {
      lines.push(
        `| ${escapeCell(row.page)} | ${metricDisplay(metricValue(row.clicks))} | ${metricDisplay(metricValue(row.impressions))} |`,
      );
    }
  }

  if (inquiryDatasets.length > 0) {
    lines.push(
      "",
      "## 服务方询盘分析（交付口径）",
      "",
      "点击与意图事件不等于真实询盘；真实询盘以销售或客服回传为准。口径解释以交付包说明为准。",
    );
    const MAX_INQUIRY_ROWS = 8;
    const MAX_INQUIRY_COLUMNS = 6;
    for (const { name, dataset } of inquiryDatasets) {
      const headers = dataset.headers.slice(0, MAX_INQUIRY_COLUMNS);
      const range = dataset.meta.date_range;
      lines.push(
        "",
        `### \`${name}\`（${range?.start_date ?? "?"} → ${range?.end_date ?? "?"}，共 ${dataset.rows.length} 行）`,
        "",
      );
      if (headers.length === 0) continue;
      lines.push(
        `| ${headers.map(escapeCell).join(" | ")} |`,
        `|${headers.map(() => "---").join("|")}|`,
      );
      for (const row of dataset.rows.slice(0, MAX_INQUIRY_ROWS)) {
        lines.push(`| ${headers.map((header) => escapeCell(row[header])).join(" | ")} |`);
      }
      const hiddenRows = dataset.rows.length - MAX_INQUIRY_ROWS;
      const hiddenColumns = dataset.headers.length - headers.length;
      if (hiddenRows > 0 || hiddenColumns > 0) {
        lines.push(
          "",
          `（截断展示：${hiddenRows > 0 ? `另有 ${hiddenRows} 行` : ""}${hiddenRows > 0 && hiddenColumns > 0 ? "，" : ""}${hiddenColumns > 0 ? `另有 ${hiddenColumns} 列` : ""}保留在 \`${dataset.meta.path}\`，按需定点查询，不要整表读入会话。）`,
        );
      }
    }
  }

  const prompts = [];
  if (gscQueries) {
    const candidate = [...gscQueries.rows]
      .filter((row) => numberValue(row.impressions) > 0)
      .sort((left, right) => numberValue(right.impressions) - numberValue(left.impressions))
      .find((row) => metricValue(row.ctr) !== null && metricValue(row.ctr) < 0.03);
    if (candidate) {
      prompts.push(
        `复核高曝光低 CTR 查询“${candidate.query}”对应页面的标题、摘要和搜索意图匹配。`,
      );
    }
  }
  const topLanding = topRows(ga4Landing, "landingPagePlusQueryString", "sessions", 1)[0];
  if (topLanding) {
    prompts.push(`复核主要落地页 ${topLanding.landingPagePlusQueryString} 的 B2B 询盘 CTA 与内容承接。`);
  }
  if (periods.length > 1) {
    prompts.push("标准数据集覆盖周期不一致；形成跨源结论前先统一比较窗口。");
  }

  lines.push("", "## 运营提示", "");
  if (prompts.length === 0) {
    lines.push("- 当前数据不足以生成可靠提示；先补齐或确认标准数据集。");
  } else {
    prompts.slice(0, 3).forEach((prompt) => lines.push(`- ${prompt}`));
  }

  lines.push("", "## 历史对比（有界）", "");
  const comparisons = [];
  const gscArchive = gscQueries ? loadArchiveDataset(root, gscQueries.meta) : null;
  const compare = (label, current, prior, fields) => {
    if (!current || !prior) return;
    for (const field of fields) {
      const before = metricTotal(prior, field), after = metricTotal(current, field);
      if (before === null || after === null) {
        comparisons.push(`- ${label} ${field}：不可比（双方均需完整有效指标）`);
      } else {
        const delta = after - before;
        comparisons.push(`- ${label} vs ${prior.period}：${field} ${formatInt(before)} → ${formatInt(after)}（${delta >= 0 ? "+" : ""}${formatInt(delta)}）`);
      }
    }
  };
  compare("GSC", gscQueries, gscArchive, ["clicks", "impressions"]);
  if (gscQueries && gscArchive && metricTotal(gscQueries, "clicks") !== null && metricTotal(gscArchive, "clicks") !== null) {
    if (gscQueries.headers.includes("query") && gscArchive.headers.includes("query")) {
      const aggregate = (rows) => {
        const result = new Map();
        for (const row of rows) {
          const key = String(row.query ?? "").trim().toLocaleLowerCase();
          result.set(key, (result.get(key) ?? 0) + metricValue(row.clicks));
        }
        return result;
      };
      const priorByQuery = aggregate(gscArchive.rows), currentByQuery = aggregate(gscQueries.rows);
      const complete = gscQueries.meta.row_coverage === "complete" && gscArchive.meta.row_coverage === "complete";
      const keys = complete ? new Set([...priorByQuery.keys(), ...currentByQuery.keys()]) : new Set([...currentByQuery.keys()].filter((key) => priorByQuery.has(key)));
      const movers = [...keys]
        .map((query) => ({ query, delta: (currentByQuery.get(query) ?? 0) - (priorByQuery.get(query) ?? 0) }))
        .filter((row) => row.query && row.delta !== 0)
        .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
        .slice(0, 5);
      for (const mover of movers) {
        comparisons.push(
          `  - 查询点击变化：${escapeCell(mover.query)} ${mover.delta > 0 ? "+" : ""}${formatInt(mover.delta)}`,
        );
      }
      if (!complete) comparisons.push("- 查询变化仅比较双方都有的查询；未声明完整覆盖，缺行不视为零。");
    }
  }
  const ga4Archive = ga4Channels ? loadArchiveDataset(root, ga4Channels.meta) : null;
  compare("GA4", ga4Channels, ga4Archive, ["sessions"]);
  if (comparisons.length > 0) {
    lines.push(
      ...comparisons,
      "",
      "- 比较已核对来源、范围、时区、筛选条件与等长时间窗口；不要将全量归档读入会话。字段不完整时仅显示不可比。",
    );
  } else {
    lines.push("- 本摘要未发现可读的兼容归档快照，因此不提供环比；不要以模型推断补齐历史数据。");
  }

  lines.push(
    "",
    "## 数据来源",
    "",
    ...[...consumed, gscArchive, ga4Archive].filter(Boolean).map(
      (dataset) =>
        `- \`${path.relative(root, dataset.filePath).replaceAll("\\", "/")}\`：${dataset.meta.source_channel}；scope ${dataset.meta.scope}；${dataset.meta.date_range.start_date} → ${dataset.meta.date_range.end_date}；timezone ${dataset.meta.timezone}；pulled_at ${dataset.meta.pulled_at}`,
    ),
    "",
  );

  return {
    period: endDate.slice(0, 7),
    markdown: lines.join("\n"),
    validation,
  };
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvText(headers, rows) {
  return `${headers.join(",")}\n${rows
    .map((row) => headers.map((header) => csvEscape(row[header])).join(","))
    .join("\n")}\n`;
}

function queryKey(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

function pagePath(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  try {
    if (/^https?:\/\//i.test(raw)) return new URL(raw).pathname;
  } catch {
    return "";
  }
  return raw.split("?", 1)[0];
}

function pageSurface(value) {
  const pathname = pagePath(value).toLocaleLowerCase();
  if (/\/products\//.test(pathname)) return "product";
  if (/\/collections\//.test(pathname)) return "collection";
  if (/\/blogs?\//.test(pathname)) return "blog";
  if (/\/pages\//.test(pathname)) return "page";
  if (pathname === "/") return "home";
  return pathname ? "other" : "none";
}

function questionLike(value) {
  return /^(?:how|what|why|which|when|where|can|should|is|are|do|does)\b|\b(?:guide|vs|versus|difference|compare|comparison)\b|(?:怎么|如何|什么|为什么|区别|对比|比较|指南)/i.test(
    String(value ?? "").trim(),
  );
}

function sourcePeriod(dataset) {
  const start = dataset?.meta?.date_range?.start_date;
  const end = dataset?.meta?.date_range?.end_date;
  return start && end ? `${start} → ${end}` : "";
}

function metricText(value) {
  const number = metricValue(value);
  if (number === null) return "";
  return Number.isInteger(number) ? String(number) : String(Number(number.toFixed(4)));
}

export function buildKeywordSuggestions(dataCenterPath, { limit = 50 } = {}) {
  const root = path.resolve(dataCenterPath);
  const validation = validateDataCenter(root);
  const empty = {
    ok: false,
    status: "blocked",
    period: null,
    rows: [],
    csv: "",
    errors: [],
    warnings: validation.warnings,
    validation,
  };
  if (!validation.ok) {
    return { ...empty, errors: validation.errors };
  }

  const manifest = readJson(path.join(root, "manifest.json"));
  const gscQueries = loadNamedDataset(root, manifest, "gsc_queries");
  if (!gscQueries) {
    return { ...empty, errors: ["gsc_queries is required for keyword suggestions"] };
  }

  const required = ["query", "clicks", "ctr", "impressions", "position"];
  const missing = required.filter((field) => !gscQueries.headers.includes(field));
  if (missing.length > 0) {
    return {
      ...empty,
      errors: [`gsc_queries is missing required columns: ${missing.join(", ")}`],
    };
  }

  const queryPage = loadNamedDataset(root, manifest, "gsc_query_page");
  const ga4Landing = loadNamedDataset(root, manifest, "ga4_landing_pages");
  const pageByQuery = new Map();
  if (
    queryPage?.headers.includes("query") &&
    queryPage.headers.includes("page")
  ) {
    for (const row of queryPage.rows) {
      const key = queryKey(row.query);
      if (!key || !row.page) continue;
      const current = pageByQuery.get(key);
      if (
        !current ||
        numberValue(row.impressions) > numberValue(current.impressions) ||
        (numberValue(row.impressions) === numberValue(current.impressions) &&
          numberValue(row.clicks) > numberValue(current.clicks))
      ) {
        pageByQuery.set(key, row);
      }
    }
  }

  const landingByPath = new Map();
  if (ga4Landing?.headers.includes("landingPagePlusQueryString")) {
    for (const row of ga4Landing.rows) {
      const pathname = pagePath(row.landingPagePlusQueryString);
      if (!pathname) continue;
      const current = landingByPath.get(pathname) ?? { sessions: ga4Landing.headers.includes("sessions") ? 0 : null, engagedSessions: ga4Landing.headers.includes("engagedSessions") ? 0 : null };
      if (current.sessions !== null) current.sessions += metricValue(row.sessions);
      if (current.engagedSessions !== null) current.engagedSessions += metricValue(row.engagedSessions);
      landingByPath.set(pathname, current);
    }
  }

  const candidates = new Map();
  for (const row of gscQueries.rows) {
    const query = String(row.query ?? "").trim();
    const key = queryKey(query);
    const impressions = numberValue(row.impressions);
    if (!key || impressions <= 0) continue;
    const current = candidates.get(key);
    if (
      !current ||
      impressions > numberValue(current.impressions) ||
      (impressions === numberValue(current.impressions) &&
        numberValue(row.clicks) > numberValue(current.clicks))
    ) {
      candidates.set(key, { ...row, query });
    }
  }

  const rows = [...candidates.values()]
    .sort(
      (left, right) =>
        numberValue(right.impressions) - numberValue(left.impressions) ||
        numberValue(right.clicks) - numberValue(left.clicks) ||
        numberValue(left.position) - numberValue(right.position),
    )
    .slice(0, Math.max(1, Number(limit) || 50))
    .map((row) => {
      const owned = pageByQuery.get(queryKey(row.query));
      const ownedPage = String(owned?.page ?? "").trim();
      const ownedSurface = pageSurface(ownedPage);
      const landing = landingByPath.get(pagePath(ownedPage));
      let routeHint = "review";
      let suggestedAction = "match_to_product_or_blog";
      if (ownedSurface === "product" || ownedSurface === "collection") {
        routeHint = "product";
        suggestedAction = "strengthen_product_or_listing";
      } else if (ownedSurface === "blog") {
        routeHint = "blog";
        suggestedAction = "update_existing_blog";
      } else if (ownedSurface === "page" || ownedSurface === "home") {
        suggestedAction = "protect_existing_page_intent";
      } else if (questionLike(row.query)) {
        routeHint = "blog";
        suggestedAction = "consider_blog";
      }

      const reasonCodes = [];
      const clicks = numberValue(row.clicks);
      const ctr = numberValue(row.ctr);
      const position = numberValue(row.position);
      if (clicks > 0) reasonCodes.push("observed_clicks");
      if (ctr < 0.03) reasonCodes.push("low_ctr");
      if (position > 3 && position <= 20) reasonCodes.push("position_4_20");
      if (ownedSurface !== "none") reasonCodes.push(`owned_${ownedSurface}`);
      if (reasonCodes.length === 0) reasonCodes.push("observed_impressions");

      return {
        query: row.query,
        route_hint: routeHint,
        suggested_action: suggestedAction,
        evidence_reason: reasonCodes.join(";"),
        owned_page: ownedPage,
        owned_surface: ownedSurface,
        clicks: metricText(row.clicks),
        impressions: metricText(row.impressions),
        ctr: metricText(row.ctr),
        position: metricText(row.position),
        ga4_sessions: metricText(landing?.sessions),
        ga4_engaged_sessions: metricText(landing?.engagedSessions),
        evidence_refs: [
          "gsc_queries",
          owned ? "gsc_query_page" : null,
          landing ? "ga4_landing_pages" : null,
        ]
          .filter(Boolean)
          .join(";"),
        source_period: sourcePeriod(gscQueries),
        selection_status: "suggested",
        merchant_decision: "",
      };
    });

  const headers = [
    "query",
    "route_hint",
    "suggested_action",
    "evidence_reason",
    "owned_page",
    "owned_surface",
    "clicks",
    "impressions",
    "ctr",
    "position",
    "ga4_sessions",
    "ga4_engaged_sessions",
    "evidence_refs",
    "source_period",
    "selection_status",
    "merchant_decision",
  ];
  return {
    ok: true,
    status: rows.length > 0 ? "ready" : "insufficient_data",
    period: gscQueries.meta.date_range?.end_date?.slice(0, 7) ?? null,
    rows,
    csv: csvText(headers, rows),
    errors: [],
    warnings: validation.warnings,
    validation,
  };
}

function normalizeCandidate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    if (/^https?:\/\//i.test(raw)) {
      const parsed = new URL(raw);
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch {
    return null;
  }
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export function build404Queue(workspacePath) {
  const workspaceRoot = path.resolve(workspacePath);
  const dataRoot = path.join(workspaceRoot, "data-center");
  const manifestPath = path.join(dataRoot, "manifest.json");
  const outputPath = path.join(workspaceRoot, "outputs", "404", "404-queue.csv");
  const previous = new Map();

  if (fs.existsSync(outputPath)) {
    const oldQueue = csvObjects(readUtf8(outputPath));
    for (const row of oldQueue.rows) {
      const candidate = normalizeCandidate(row.path);
      if (candidate) previous.set(candidate, row);
    }
  }

  const candidates = new Map(previous);
  if (fs.existsSync(manifestPath)) {
    const manifest = readJson(manifestPath);
    const dataset = manifest.datasets?.gsc_not_found;
    if (dataset?.path) {
      const filePath = resolveInside(dataRoot, dataset.path, "gsc_not_found.path");
      if (fs.existsSync(filePath)) {
        const parsed = csvObjects(readUtf8(filePath));
        const candidateField = ["path", "url", "page"].find((field) => parsed.headers.includes(field));
        if (candidateField) {
          for (const row of parsed.rows) {
            const candidate = normalizeCandidate(row[candidateField]);
            if (!candidate) continue;
            const existing = candidates.get(candidate) ?? {};
            candidates.set(candidate, {
              ...existing,
              path: candidate,
              source: [existing.source, "gsc_not_found"].filter(Boolean).join(";"),
              source_period:
                dataset.date_range
                  ? `${dataset.date_range.start_date} → ${dataset.date_range.end_date}`
                  : existing.source_period ?? "",
            });
          }
        }
      }
    }
  }

  const handlePath = path.join(workspaceRoot, "ai-log", "handle-changes.csv");
  if (fs.existsSync(handlePath)) {
    const handles = csvObjects(readUtf8(handlePath));
    for (const row of handles.rows) {
      if (row.status === "resolved") continue;
      const candidate = normalizeCandidate(row.old_path);
      if (!candidate) continue;
      const existing = candidates.get(candidate) ?? {};
      candidates.set(candidate, {
        ...existing,
        path: candidate,
        source: [existing.source, "handle_change"].filter(Boolean).join(";"),
        suggested_target: existing.suggested_target || normalizeCandidate(row.new_path) || "",
      });
    }
  }

  const headers = [
    "path",
    "source",
    "source_period",
    "last_checked_at",
    "http_status",
    "category",
    "suggested_target",
    "decision",
    "evidence",
    "selected_for_write",
  ];
  const rows = [...candidates.values()]
    .map((row) => ({
      path: row.path,
      source: row.source ?? "",
      source_period: row.source_period ?? "",
      last_checked_at: row.last_checked_at ?? "",
      http_status: row.http_status ?? "",
      category: row.category ?? "needs_review",
      suggested_target: row.suggested_target ?? "",
      decision: row.decision ?? "",
      evidence: row.evidence ?? "",
      selected_for_write: row.selected_for_write ?? "false",
    }))
    .sort((left, right) => left.path.localeCompare(right.path));

  return { output_path: outputPath, count: rows.length, csv: csvText(headers, rows), rows };
}

export function dataCenterFromProject(projectPath) {
  const project = readProject(projectPath);
  if (!project.workspaceRoot) throw new Error("No workspace is configured");
  return {
    project,
    dataCenterPath: path.join(project.workspaceRoot, "data-center"),
  };
}
