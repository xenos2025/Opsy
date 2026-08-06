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

export function csvObjects(text) {
  const rows = parseCsv(text);
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
        const parsed = csvObjects(readUtf8(activePath));
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

function loadNamedDataset(dataCenterPath, manifest, name) {
  const dataset = manifest.datasets?.[name];
  if (!dataset?.path) return null;
  const filePath = resolveInside(dataCenterPath, dataset.path, `${name}.path`);
  if (!fs.existsSync(filePath)) return null;
  return { meta: dataset, filePath, ...csvObjects(readUtf8(filePath)) };
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
  const periods = [
    ...new Set(
      standard.map(
        (dataset) =>
          `${dataset.meta.date_range?.start_date ?? "unknown"} → ${dataset.meta.date_range?.end_date ?? "unknown"}`,
      ),
    ),
  ];
  const timezones = [...new Set(standard.map((dataset) => dataset.meta.timezone).filter(Boolean))];
  const endDate =
    standard
      .map((dataset) => dataset.meta.date_range?.end_date)
      .filter(Boolean)
      .sort()
      .at(-1) ?? "unknown";

  const lines = [
    `# 上月数据摘要 — ${endDate.slice(0, 7)}`,
    "",
    `- 数据范围：${periods.length > 0 ? periods.join("；") : "无标准 GSC/GA4 数据集"}`,
    `- 时区：${timezones.length > 0 ? timezones.join("；") : "未提供"}`,
    `- Manifest 更新：${manifest.updated_at ?? "未提供"}`,
    `- 验证：${validation.ok ? "通过" : "失败"}`,
    "",
    "## 主要指标",
    "",
  ];

  if (gscQueries) {
    const clicks = sum(gscQueries.rows, "clicks");
    const impressions = sum(gscQueries.rows, "impressions");
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const weightedPosition =
      impressions > 0
        ? gscQueries.rows.reduce(
            (total, row) => total + numberValue(row.position) * numberValue(row.impressions),
            0,
          ) / impressions
        : 0;
    lines.push(
      `- GSC：${formatInt(clicks)} clicks，${formatInt(impressions)} impressions，CTR ${(ctr * 100).toFixed(2)}%，加权平均排名 ${weightedPosition.toFixed(2)}`,
    );
  } else {
    lines.push("- GSC：Unavailable（缺少 `gsc_queries`）");
  }

  if (ga4Channels) {
    const sessions = sum(ga4Channels.rows, "sessions");
    const users = sum(ga4Channels.rows, "totalUsers");
    const engaged = sum(ga4Channels.rows, "engagedSessions");
    lines.push(
      `- GA4：${formatInt(sessions)} sessions，${formatInt(users)} users，${formatInt(engaged)} engaged sessions${sessions > 0 ? `，engagement rate ${((engaged / sessions) * 100).toFixed(2)}%` : ""}`,
    );
  } else {
    lines.push("- GA4：Unavailable（缺少 `ga4_channels`）");
  }

  const inquiryFields = standard.flatMap((dataset) =>
    dataset.headers.filter((header) => /inquir|lead|form|keyevents|conversion/i.test(header)),
  );
  lines.push(
    inquiryFields.length > 0
      ? `- 询盘证据字段：${[...new Set(inquiryFields)].join(", ")}（需按业务定义解释）`
      : "- 询盘证据：Unavailable（当前标准数据集没有明确询盘字段）",
  );

  const queries = topRows(gscQueries, "query", "clicks");
  if (queries.length > 0) {
    lines.push("", "## 点击最高的查询", "", "| Query | Clicks | Impressions | CTR | Position |", "|---|---:|---:|---:|---:|");
    for (const row of queries) {
      lines.push(
        `| ${escapeCell(row.query)} | ${formatInt(numberValue(row.clicks))} | ${formatInt(numberValue(row.impressions))} | ${(numberValue(row.ctr) * 100).toFixed(2)}% | ${numberValue(row.position).toFixed(2)} |`,
      );
    }
  }

  const pages = topRows(gscPages, "page", "clicks");
  if (pages.length > 0) {
    lines.push("", "## 点击最高的页面", "", "| Page | Clicks | Impressions |", "|---|---:|---:|");
    for (const row of pages) {
      lines.push(
        `| ${escapeCell(row.page)} | ${formatInt(numberValue(row.clicks))} | ${formatInt(numberValue(row.impressions))} |`,
      );
    }
  }

  const prompts = [];
  if (gscQueries) {
    const candidate = [...gscQueries.rows]
      .filter((row) => numberValue(row.impressions) > 0)
      .sort((left, right) => numberValue(right.impressions) - numberValue(left.impressions))
      .find((row) => numberValue(row.ctr) < 0.03);
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

  lines.push(
    "",
    "## 比较说明",
    "",
    "- 本摘要未发现并校验兼容的前一期 manifest，因此不提供环比。",
    "",
    "## 数据来源",
    "",
    ...standard.map(
      (dataset) =>
        `- \`${path.basename(dataset.filePath)}\`：${dataset.meta.source_channel}；${dataset.meta.date_range.start_date} → ${dataset.meta.date_range.end_date}；pulled_at ${dataset.meta.pulled_at}`,
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
  const number = numberValue(value);
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
      const current = landingByPath.get(pathname) ?? { sessions: 0, engagedSessions: 0 };
      current.sessions += numberValue(row.sessions);
      current.engagedSessions += numberValue(row.engagedSessions);
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
        ga4_sessions: metricText(landing?.sessions ?? 0),
        ga4_engaged_sessions: metricText(landing?.engagedSessions ?? 0),
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
