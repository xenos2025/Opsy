import fs from "node:fs";

const SCHEMA_VERSION = "opsy-audience-intake-v1";
const REPORT_VERSION = "opsy-audience-intake-validation-v1";
const REVIEW_STATUSES = new Set(["draft", "merchant_reviewed", "data_revised"]);
const EVIDENCE_MATURITIES = new Set(["none", "merchant_input", "proxy", "first_party", "mixed"]);
const ROLE_TYPES = new Set([
  "user",
  "champion",
  "decision_maker",
  "financial_buyer",
  "technical_influencer",
  "procurement",
  "other",
]);
const SOURCE_TYPES = new Set([
  "merchant_interview",
  "first_party_trade",
  "buyer_faq",
  "provider_snapshot",
  "shopify_store",
  "sales_notes",
  "other",
]);
const EVIDENCE_THEMES = new Set([
  "role",
  "jtbd",
  "trigger",
  "pain",
  "outcome",
  "objection",
  "alternative",
  "language",
  "route",
  "other",
]);
const ROUTES = new Set(["product", "blog", "provider_handoff"]);
const AUDIENCE_ID_RE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const ID_RE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const PLACEHOLDER_RE = /\{\{[^{}]+\}\}/;

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
    : null;
}

function list(value) {
  return stringList(value) ?? [];
}

function isIsoDate(value) {
  return typeof value === "string" && value.trim() && !Number.isNaN(Date.parse(value));
}

function issue(code, issuePath, message) {
  return { code, path: issuePath, message };
}

function report(errors, warnings, strict, details = {}) {
  const ok = errors.length === 0 && (!strict || warnings.length === 0);
  return {
    schema_version: REPORT_VERSION,
    ok,
    status: ok ? "pass" : "fix",
    strict,
    counts: { errors: errors.length, warnings: warnings.length },
    errors,
    warnings,
    ...details,
  };
}

export function validateAudienceIntake(payload, { strict = false } = {}) {
  const errors = [];
  const warnings = [];
  const value = record(payload);
  if (value.schema_version !== SCHEMA_VERSION) {
    errors.push(issue("schema_version", "schema_version", `must equal ${SCHEMA_VERSION}`));
  }
  const scan = (candidate, issuePath = "$") => {
    if (typeof candidate === "string" && PLACEHOLDER_RE.test(candidate)) {
      errors.push(issue("template_placeholder", issuePath, "template placeholder is not allowed"));
    } else if (Array.isArray(candidate)) {
      candidate.forEach((item, index) => scan(item, `${issuePath}[${index}]`));
    } else if (candidate && typeof candidate === "object") {
      Object.entries(candidate).forEach(([key, item]) => scan(item, issuePath === "$" ? key : `${issuePath}.${key}`));
    }
  };
  scan(value);

  if (!isIsoDate(text(value.generated_at))) errors.push(issue("generated_at", "generated_at", "use an ISO date or datetime"));
  const origin = record(value.origin);
  if (text(origin.method) !== "merchant_wizard") errors.push(issue("origin_method", "origin.method", "must equal merchant_wizard"));
  if (!text(origin.generator_version)) errors.push(issue("generator_version", "origin.generator_version", "required"));

  const store = record(value.store);
  if (text(store.business_model) !== "b2b_inquiry") errors.push(issue("business_model", "store.business_model", "Opsy B2B intake requires b2b_inquiry"));
  if (!text(store.industry)) errors.push(issue("store_industry", "store.industry", "required"));
  for (const field of ["primary_markets", "content_languages", "product_families"]) {
    const values = stringList(store[field]);
    if (values === null || values.length === 0) errors.push(issue("store_list", `store.${field}`, "must contain at least one value"));
  }

  const evidenceRows = Array.isArray(value.evidence_log) ? value.evidence_log : [];
  if (!Array.isArray(value.evidence_log)) errors.push(issue("evidence_log", "evidence_log", "must be an array"));
  const evidenceById = new Map();
  evidenceRows.forEach((rawRow, index) => {
    const row = record(rawRow);
    const base = `evidence_log[${index}]`;
    const id = text(row.evidence_id);
    if (!ID_RE.test(id)) errors.push(issue("evidence_id", `${base}.evidence_id`, "use a stable lowercase identifier"));
    else if (evidenceById.has(id)) errors.push(issue("evidence_id_duplicate", `${base}.evidence_id`, `duplicate ${id}`));
    else evidenceById.set(id, row);
    if (!SOURCE_TYPES.has(text(row.source_type))) errors.push(issue("source_type", `${base}.source_type`, "unsupported source type"));
    if (!text(row.source_ref)) errors.push(issue("source_ref", `${base}.source_ref`, "required path or retained record reference"));
    if (!isIsoDate(text(row.observed_at))) errors.push(issue("observed_at", `${base}.observed_at`, "use an ISO date or datetime"));
    if (!EVIDENCE_THEMES.has(text(row.theme))) errors.push(issue("evidence_theme", `${base}.theme`, "unsupported evidence theme"));
    if (stringList(row.audience_ids) === null) errors.push(issue("evidence_audiences", `${base}.audience_ids`, "must be an array"));
    if (typeof row.prompted !== "boolean") errors.push(issue("evidence_prompted", `${base}.prompted`, "must be true or false"));
    for (const field of ["verbatim", "context", "bias_note"]) {
      if (typeof row[field] !== "string") errors.push(issue("evidence_text", `${base}.${field}`, "must be a string"));
    }
  });

  const audiences = Array.isArray(value.audiences) ? value.audiences : [];
  if (!Array.isArray(value.audiences) || audiences.length === 0) errors.push(issue("audiences", "audiences", "must contain at least one audience"));
  const audienceIds = new Set();
  audiences.forEach((rawAudience, index) => {
    const audience = record(rawAudience);
    const base = `audiences[${index}]`;
    const id = text(audience.audience_id);
    if (!AUDIENCE_ID_RE.test(id)) errors.push(issue("audience_id", `${base}.audience_id`, "use a stable lowercase snake_case identifier"));
    else if (audienceIds.has(id)) errors.push(issue("audience_id_duplicate", `${base}.audience_id`, `duplicate ${id}`));
    else audienceIds.add(id);
    for (const field of ["label", "company_type", "primary_job_to_be_done"]) {
      if (!text(audience[field])) errors.push(issue("audience_required", `${base}.${field}`, "required"));
    }
    for (const field of [
      "product_lines",
      "market_scope",
      "buying_triggers",
      "pain_points",
      "desired_outcomes",
      "objections",
      "alternatives",
      "customer_language",
      "search_term_candidates",
      "product_scope_keys",
      "blog_theme_candidates",
      "routes",
      "evidence_refs",
    ]) {
      if (stringList(audience[field]) === null) errors.push(issue("audience_list", `${base}.${field}`, "must be an array of strings"));
    }
    if (list(audience.product_lines).length === 0) errors.push(issue("product_lines", `${base}.product_lines`, "record at least one product line"));
    const routes = list(audience.routes);
    if (routes.length === 0 || routes.some((route) => !ROUTES.has(route))) {
      errors.push(issue("routes", `${base}.routes`, `use one or more of: ${[...ROUTES].join(", ")}`));
    }
    const roles = Array.isArray(audience.decision_roles) ? audience.decision_roles : [];
    if (!Array.isArray(audience.decision_roles)) errors.push(issue("decision_roles", `${base}.decision_roles`, "must be an array"));
    if (roles.length === 0) warnings.push(issue("decision_roles_missing", `${base}.decision_roles`, "buying committee is not recorded"));
    roles.forEach((rawRole, roleIndex) => {
      const role = record(rawRole);
      const roleBase = `${base}.decision_roles[${roleIndex}]`;
      if (!ROLE_TYPES.has(text(role.role_type))) errors.push(issue("decision_role_type", `${roleBase}.role_type`, "unsupported role type"));
      if (!text(role.title)) errors.push(issue("decision_role_title", `${roleBase}.title`, "required"));
    });
    const maturity = text(audience.evidence_maturity);
    if (!EVIDENCE_MATURITIES.has(maturity)) errors.push(issue("evidence_maturity", `${base}.evidence_maturity`, "unsupported maturity"));
    const refs = list(audience.evidence_refs);
    refs.forEach((ref) => {
      if (!evidenceById.has(ref)) errors.push(issue("evidence_ref_missing", `${base}.evidence_refs`, `unknown evidence id ${ref}`));
    });
    const resolved = refs.map((ref) => evidenceById.get(ref)).filter(Boolean);
    if (["first_party", "mixed"].includes(maturity) && !resolved.some((row) => text(row.source_type) === "first_party_trade")) {
      errors.push(issue("first_party_evidence_missing", `${base}.evidence_maturity`, "first_party or mixed requires first_party_trade evidence"));
    }
    if (list(audience.customer_language).length > 0 && refs.length === 0) warnings.push(issue("customer_language_unsourced", `${base}.customer_language`, "verbatim buyer language needs evidence"));
  });

  evidenceRows.forEach((rawRow, index) => {
    list(record(rawRow).audience_ids).forEach((audienceId) => {
      if (!audienceIds.has(audienceId)) errors.push(issue("evidence_audience_missing", `evidence_log[${index}].audience_ids`, `unknown audience id ${audienceId}`));
    });
  });

  const review = record(value.review);
  const reviewStatus = text(review.status);
  if (!REVIEW_STATUSES.has(reviewStatus)) errors.push(issue("review_status", "review.status", "unsupported review status"));
  if (["merchant_reviewed", "data_revised"].includes(reviewStatus)) {
    if (!text(review.reviewer)) errors.push(issue("reviewer", "review.reviewer", "reviewed intake requires reviewer"));
    if (!isIsoDate(text(review.reviewed_at))) errors.push(issue("reviewed_at", "review.reviewed_at", "reviewed intake requires an ISO date or datetime"));
  } else if (reviewStatus === "draft") {
    warnings.push(issue("review_pending", "review.status", "draft is planning input, not a confirmed audience profile"));
  }
  if (typeof review.notes !== "string") errors.push(issue("review_notes", "review.notes", "must be a string"));

  return report(errors, warnings, strict, {
    audience_count: audiences.length,
    evidence_count: evidenceRows.length,
    review_status: reviewStatus || "invalid",
    route_counts: audiences.reduce(
      (counts, audience) => {
        list(audience?.routes).forEach((route) => {
          if (Object.hasOwn(counts, route)) counts[route] += 1;
        });
        return counts;
      },
      { product: 0, blog: 0, provider_handoff: 0 },
    ),
  });
}

export function validateAudienceIntakeFile(filePath, options = {}) {
  try {
    const payload = JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
    return validateAudienceIntake(payload, options);
  } catch (error) {
    return report(
      [issue("unreadable", filePath, `Audience intake cannot be read: ${error.message}`)],
      [],
      Boolean(options.strict),
      { audience_count: 0, evidence_count: 0, review_status: "unreadable", route_counts: { product: 0, blog: 0, provider_handoff: 0 } },
    );
  }
}
