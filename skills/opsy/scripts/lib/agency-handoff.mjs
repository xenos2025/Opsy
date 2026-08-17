import { csvObjects, readUtf8 } from "./data-center.mjs";

export const AGENCY_HANDOFF_VERSION = "opsy-agency-handoff-v1";

const REQUIRED_HEADERS = [
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
];

const ROUTES = new Set([
  "weekly_report",
  "product",
  "blog",
  "redirect",
  "monthly_data",
  "connection_profile",
]);

function text(value) {
  return String(value ?? "").trim();
}

function csvEscape(value) {
  const normalized = String(value ?? "");
  return /[",\r\n]/.test(normalized)
    ? `"${normalized.replace(/"/g, '""')}"`
    : normalized;
}

function csvText(headers, rows) {
  return `${headers.join(",")}\n${rows
    .map((row) => headers.map((header) => csvEscape(row[header])).join(","))
    .join("\n")}\n`;
}

function booleanText(value) {
  const normalized = text(value).toLocaleLowerCase();
  if (["true", "yes", "1"].includes(normalized)) return "true";
  if (["false", "no", "0"].includes(normalized)) return "false";
  return null;
}

export function importAgencyHandoff(filePath) {
  const errors = [];
  const warnings = [];
  let parsed;
  try {
    parsed = csvObjects(readUtf8(filePath));
  } catch (error) {
    return {
      ok: false,
      status: "blocked",
      period: null,
      rows: [],
      csv: "",
      errors: [`Agency handoff cannot be read: ${error.message}`],
      warnings,
      skipped: 0,
    };
  }

  const missingHeaders = REQUIRED_HEADERS.filter(
    (header) => !parsed.headers.includes(header),
  );
  if (missingHeaders.length > 0) {
    errors.push(`Agency handoff is missing required columns: ${missingHeaders.join(", ")}`);
  }

  const readyRows = parsed.rows
    .map((row, index) => ({ row, lineNumber: index + 2 }))
    .filter(
      ({ row }) =>
        text(row.status).toLocaleLowerCase() === "ready_for_merchant",
    );
  const skipped = parsed.rows.length - readyRows.length;
  if (skipped > 0) {
    warnings.push(
      `${skipped} row(s) skipped because status is not ready_for_merchant.`,
    );
  }

  const seenIds = new Set();
  const rows = [];
  for (const { row, lineNumber } of readyRows) {
    const label = `row ${lineNumber}`;
    const taskId = text(row.task_id);
    const route = text(row.route_hint).toLocaleLowerCase();
    const requiresWrite = booleanText(row.requires_shopify_write);

    if (text(row.contract_version) !== AGENCY_HANDOFF_VERSION) {
      errors.push(`${label}: contract_version must be ${AGENCY_HANDOFF_VERSION}`);
    }
    if (!taskId) {
      errors.push(`${label}: task_id is required`);
    } else if (seenIds.has(taskId)) {
      errors.push(`${label}: duplicate task_id ${taskId}`);
    } else {
      seenIds.add(taskId);
    }
    if (!/^\d{4}-\d{2}$/.test(text(row.month))) {
      errors.push(`${label}: month must use YYYY-MM`);
    }
    if (!ROUTES.has(route)) {
      errors.push(`${label}: route_hint must be one of ${[...ROUTES].join(", ")}`);
    }
    for (const field of ["target", "action", "evidence_refs", "acceptance_criteria"]) {
      if (!text(row[field])) errors.push(`${label}: ${field} is required`);
    }
    if (requiresWrite === null) {
      errors.push(`${label}: requires_shopify_write must be true or false`);
    }

    rows.push({
      task_id: taskId,
      month: text(row.month),
      route_hint: route,
      target: text(row.target),
      action: text(row.action),
      evidence_refs: text(row.evidence_refs),
      priority: text(row.priority),
      due_week: text(row.due_week),
      acceptance_criteria: text(row.acceptance_criteria),
      requires_shopify_write: requiresWrite ?? text(row.requires_shopify_write),
      source_type: "agency_handoff",
      source_status: "ready_for_merchant",
      merchant_decision: "",
      selected_for_execution: "false",
    });
  }

  const months = [...new Set(rows.map((row) => row.month).filter(Boolean))];
  const headers = [
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
    "source_type",
    "source_status",
    "merchant_decision",
    "selected_for_execution",
  ];

  return {
    ok: errors.length === 0,
    status:
      errors.length > 0 ? "blocked" : rows.length > 0 ? "ready" : "no_ready_tasks",
    period: months.length === 1 ? months[0] : months.length > 1 ? "mixed" : null,
    rows: errors.length > 0 ? [] : rows,
    csv: errors.length > 0 ? "" : csvText(headers, rows),
    errors,
    warnings,
    skipped,
  };
}
