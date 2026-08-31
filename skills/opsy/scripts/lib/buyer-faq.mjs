import fs from "node:fs";

const SCHEMA_VERSION = "buyer-faq-v1";
const REPORT_VERSION = "buyer-faq-validation-v1";
const SELECTION_VERSION = "faq-selection-v1";
const FAQ_CONFIG_REF = "config/buyer_faq.json";
const STATUSES = new Set(["not_started", "draft", "reviewed", "data_revised"]);
const SOURCE_KINDS = new Set([
  "staff_faq_pack",
  "merchant_document",
  "buyer_chat",
  "rfq",
  "inquiry_record",
  "faq_page",
  "gsc_query",
  "serp",
  "other",
]);
const QUESTION_STATUSES = new Set([
  "simulated",
  "staff_reported",
  "staff_consensus",
  "buyer_observed",
  "search_observed",
  "data_revised",
]);
const COLD_START_QUESTION_STATUSES = new Set([
  "staff_reported",
  "staff_consensus",
  "buyer_observed",
  "search_observed",
  "data_revised",
]);
const ANSWER_STATUSES = new Set([
  "unverified",
  "staff_supplied",
  "merchant_confirmed",
  "verified",
  "mixed",
]);
const CONTENT_USES = new Set([
  "question_only",
  "draft_with_conditions",
  "eligible",
  "quarantined",
]);
const SCOPE_TYPES = new Set(["enterprise", "product_family", "product", "surface"]);
const CATEGORIES = new Set([
  "company",
  "product_definition",
  "application",
  "installation",
  "specification",
  "commercial_terms",
  "sampling",
  "customization",
  "quality",
  "certification",
  "logistics",
  "packaging",
  "maintenance",
  "warranty",
  "sustainability",
  "after_sales",
  "comparison",
  "other",
]);
const STAGES = new Set(["discover", "evaluate", "validate", "inquire"]);
const ROUTES = new Set(["faq_hub", "page", "collection", "pdp", "blog"]);
const SIGNAL_STATUSES = new Set(["hypothesis", "merchant_accepted", "data_revised"]);
const CONFLICT_STATUSES = new Set(["open", "resolved"]);
const QUARANTINE_REASONS = new Set([
  "competitor_contamination",
  "encoding_corruption",
  "pii",
  "irrelevant",
  "duplicate",
  "unsafe_claim",
  "other",
]);
const QUARANTINE_DISPOSITIONS = new Set(["excluded", "needs_review", "recovered"]);
const BUYER_SOURCE_KINDS = new Set(["buyer_chat", "rfq", "inquiry_record"]);
const SEARCH_SOURCE_KINDS = new Set(["gsc_query", "serp"]);
const ID_RE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const SHA256_RE = /^[a-fA-F0-9]{64}$/;
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

function baseRef(value) {
  return text(value).split("#", 1)[0];
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

function validateConflicts(rows, errors) {
  const byId = new Map();
  rows.forEach((rawRow, index) => {
    const row = record(rawRow);
    const base = `conflicts[${index}]`;
    const id = text(row.id);
    if (!ID_RE.test(id)) errors.push(issue("conflict_id", `${base}.id`, "use a stable lowercase identifier"));
    else if (byId.has(id)) errors.push(issue("conflict_id_duplicate", `${base}.id`, `duplicate ${id}`));
    else byId.set(id, row);
    if (!text(row.topic)) errors.push(issue("conflict_topic", `${base}.topic`, "required"));
    if ((stringList(row.item_refs) ?? []).length < 2) {
      errors.push(issue("conflict_items", `${base}.item_refs`, "reference at least two FAQ items"));
    }
    if (!CONFLICT_STATUSES.has(text(row.status))) {
      errors.push(issue("conflict_status", `${base}.status`, "use open or resolved"));
    }
    if (!Array.isArray(row.notes) && typeof row.notes !== "string") {
      errors.push(issue("conflict_notes", `${base}.notes`, "use a string or array"));
    }
  });
  return byId;
}

function validateQuarantine(rows, sourceById, errors) {
  const byId = new Map();
  rows.forEach((rawRow, index) => {
    const row = record(rawRow);
    const base = `quarantine[${index}]`;
    const id = text(row.id);
    if (!ID_RE.test(id)) errors.push(issue("quarantine_id", `${base}.id`, "use a stable lowercase identifier"));
    else if (byId.has(id)) errors.push(issue("quarantine_id_duplicate", `${base}.id`, `duplicate ${id}`));
    else byId.set(id, row);
    const sourceRef = text(row.source_ref);
    if (!sourceRef || !sourceById.has(baseRef(sourceRef))) {
      errors.push(issue("quarantine_source", `${base}.source_ref`, "reference a declared source"));
    }
    if (!QUARANTINE_REASONS.has(text(row.reason))) {
      errors.push(issue("quarantine_reason", `${base}.reason`, "unsupported reason"));
    }
    if (!QUARANTINE_DISPOSITIONS.has(text(row.disposition))) {
      errors.push(issue("quarantine_disposition", `${base}.disposition`, "unsupported disposition"));
    }
    if (!text(row.text_excerpt)) errors.push(issue("quarantine_excerpt", `${base}.text_excerpt`, "required"));
    if (typeof row.notes !== "string") errors.push(issue("quarantine_notes", `${base}.notes`, "must be a string"));
  });
  return byId;
}

export function validateBuyerFaq(payload, { strict = false } = {}) {
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

  const artifactStatus = text(value.status);
  if (!STATUSES.has(artifactStatus)) errors.push(issue("status", "status", "unsupported review status"));
  const fields = ["sources", "audience_signals", "faq_items", "conflicts", "quarantine"];
  const arrays = Object.fromEntries(fields.map((field) => {
    if (!Array.isArray(value[field])) errors.push(issue("array_shape", field, "must be an array"));
    return [field, Array.isArray(value[field]) ? value[field] : []];
  }));
  if (typeof value.source_summary !== "string" || typeof value.reviewed_by !== "string") {
    errors.push(issue("text_shape", "$", "source_summary and reviewed_by must be strings"));
  }
  if (artifactStatus === "not_started") {
    if (
      text(value.generated_at) || text(value.last_reviewed_at) || text(value.reviewed_by) ||
      fields.some((field) => arrays[field].length > 0)
    ) {
      errors.push(issue("starter_state", "status", "not_started must keep dates, reviewer, and arrays empty"));
    }
    return report(errors, warnings, strict, {
      artifact_status: artifactStatus,
      source_count: 0,
      item_count: 0,
      signal_count: 0,
      conflict_count: 0,
      quarantine_count: 0,
      route_counts: emptyRouteCounts(),
    });
  }
  if (!isIsoDate(text(value.generated_at))) {
    errors.push(issue("generated_at", "generated_at", "active FAQ config requires an ISO date or datetime"));
  }
  if (["reviewed", "data_revised"].includes(artifactStatus)) {
    if (!text(value.reviewed_by)) errors.push(issue("reviewer", "reviewed_by", "reviewed state requires reviewer"));
    if (!isIsoDate(text(value.last_reviewed_at))) {
      errors.push(issue("reviewed_at", "last_reviewed_at", "reviewed state requires an ISO date or datetime"));
    }
  }

  const sourceById = new Map();
  arrays.sources.forEach((rawSource, index) => {
    const source = record(rawSource);
    const base = `sources[${index}]`;
    const sourceId = text(source.source_id);
    if (!ID_RE.test(sourceId)) errors.push(issue("source_id", `${base}.source_id`, "use a stable lowercase identifier"));
    else if (sourceById.has(sourceId)) errors.push(issue("source_id_duplicate", `${base}.source_id`, `duplicate ${sourceId}`));
    else sourceById.set(sourceId, source);
    if (!SOURCE_KINDS.has(text(source.source_kind))) errors.push(issue("source_kind", `${base}.source_kind`, "unsupported source kind"));
    for (const field of ["title", "source_ref"]) {
      if (!text(source[field])) errors.push(issue("source_required", `${base}.${field}`, "required"));
    }
    for (const field of ["contributor", "extraction_notes"]) {
      if (typeof source[field] !== "string") errors.push(issue("source_text", `${base}.${field}`, "must be a string"));
    }
    if (!isIsoDate(text(source.observed_at))) errors.push(issue("source_date", `${base}.observed_at`, "must be an ISO date or datetime"));
    if (stringList(source.languages) === null) errors.push(issue("source_languages", `${base}.languages`, "must be an array of strings"));
    if (text(source.file_sha256) && !SHA256_RE.test(text(source.file_sha256))) {
      errors.push(issue("source_sha256", `${base}.file_sha256`, "must be a 64-character SHA-256"));
    }
  });

  const conflictById = validateConflicts(arrays.conflicts, errors);
  const quarantineById = validateQuarantine(arrays.quarantine, sourceById, errors);
  const itemById = new Map();
  const itemSourceKinds = new Map();

  arrays.faq_items.forEach((rawItem, index) => {
    const item = record(rawItem);
    const base = `faq_items[${index}]`;
    const id = text(item.id);
    if (!ID_RE.test(id)) errors.push(issue("faq_id", `${base}.id`, "use a stable lowercase identifier"));
    else if (itemById.has(id)) errors.push(issue("faq_id_duplicate", `${base}.id`, `duplicate ${id}`));
    else itemById.set(id, item);
    if (!text(item.canonical_question)) errors.push(issue("question_required", `${base}.canonical_question`, "required"));
    if (stringList(item.variants) === null) errors.push(issue("variants", `${base}.variants`, "must be an array of strings"));
    const scope = record(item.scope);
    if (!SCOPE_TYPES.has(text(scope.type))) errors.push(issue("scope_type", `${base}.scope.type`, "unsupported scope type"));
    const scopeRefs = stringList(scope.refs);
    if (scopeRefs === null) errors.push(issue("scope_refs", `${base}.scope.refs`, "must be an array of strings"));
    else if (text(scope.type) !== "enterprise" && scopeRefs.length === 0) {
      warnings.push(issue("scope_unresolved", `${base}.scope.refs`, "non-enterprise item has no scoped product or surface"));
    }
    if (!CATEGORIES.has(text(item.category))) errors.push(issue("category", `${base}.category`, "unsupported category"));
    if (!STAGES.has(text(item.decision_stage))) errors.push(issue("decision_stage", `${base}.decision_stage`, "unsupported decision stage"));
    if (stringList(item.buyer_roles) === null) errors.push(issue("buyer_roles", `${base}.buyer_roles`, "must be an array of strings"));

    const questionStatus = text(item.question_status);
    if (!QUESTION_STATUSES.has(questionStatus)) errors.push(issue("question_status", `${base}.question_status`, "unsupported question status"));
    const sourceRefs = stringList(item.source_refs);
    if (sourceRefs === null) errors.push(issue("source_refs", `${base}.source_refs`, "must be an array of strings"));
    const sourceIds = new Set((sourceRefs ?? []).map(baseRef));
    sourceIds.forEach((sourceId) => {
      if (!sourceById.has(sourceId)) errors.push(issue("source_ref_missing", `${base}.source_refs`, `unknown source ${sourceId}`));
    });
    const sourceKinds = new Set([...sourceIds].map((sourceId) => text(sourceById.get(sourceId)?.source_kind)).filter(Boolean));
    itemSourceKinds.set(id, sourceKinds);
    if (questionStatus === "staff_reported" && sourceIds.size === 0) errors.push(issue("staff_source_missing", `${base}.source_refs`, "staff_reported requires a source"));
    if (questionStatus === "staff_consensus" && sourceIds.size < 2) errors.push(issue("staff_consensus", `${base}.source_refs`, "staff_consensus requires at least two source IDs"));
    if (questionStatus === "buyer_observed" && ![...sourceKinds].some((kind) => BUYER_SOURCE_KINDS.has(kind))) {
      errors.push(issue("buyer_source_missing", `${base}.source_refs`, "buyer_observed requires chat, RFQ, or inquiry evidence"));
    }
    if (questionStatus === "search_observed" && ![...sourceKinds].some((kind) => SEARCH_SOURCE_KINDS.has(kind))) {
      errors.push(issue("search_source_missing", `${base}.source_refs`, "search_observed requires GSC or SERP evidence"));
    }

    const answer = record(item.answer);
    if (typeof answer.draft_answer !== "string") errors.push(issue("answer_text", `${base}.answer.draft_answer`, "must be a string"));
    const answerStatus = text(answer.answer_status);
    if (!ANSWER_STATUSES.has(answerStatus)) errors.push(issue("answer_status", `${base}.answer.answer_status`, "unsupported answer status"));
    const claimRefs = stringList(answer.claim_refs);
    const unresolved = stringList(answer.unresolved_claims);
    if (claimRefs === null) errors.push(issue("claim_refs", `${base}.answer.claim_refs`, "must be an array of strings"));
    if (unresolved === null) errors.push(issue("unresolved_claims", `${base}.answer.unresolved_claims`, "must be an array of strings"));
    if (["merchant_confirmed", "verified"].includes(answerStatus) && (claimRefs ?? []).length === 0) {
      errors.push(issue("answer_evidence_missing", `${base}.answer.claim_refs`, `${answerStatus} requires evidence`));
    }

    const contentUse = text(item.content_use);
    if (!CONTENT_USES.has(contentUse)) errors.push(issue("content_use", `${base}.content_use`, "unsupported content use"));
    const routes = stringList(item.routes);
    if (routes === null) errors.push(issue("routes", `${base}.routes`, "must be an array of strings"));
    (routes ?? []).forEach((route) => {
      if (!ROUTES.has(route)) errors.push(issue("route", `${base}.routes`, `unsupported route ${route}`));
    });
    const primaryRoute = text(item.primary_route);
    if (contentUse !== "quarantined" && !ROUTES.has(primaryRoute)) errors.push(issue("primary_route", `${base}.primary_route`, "active item requires a supported primary route"));
    else if (primaryRoute && !(routes ?? []).includes(primaryRoute)) errors.push(issue("primary_route_membership", `${base}.primary_route`, "primary route must also appear in routes"));
    if (stringList(item.seo_geo_topics) === null) errors.push(issue("seo_geo_topics", `${base}.seo_geo_topics`, "must be an array of strings"));
    const conflictRefs = stringList(item.conflict_refs);
    const quarantineRefs = stringList(item.quarantine_refs);
    if (conflictRefs === null || quarantineRefs === null) errors.push(issue("cross_refs", base, "conflict_refs and quarantine_refs must be arrays"));
    (conflictRefs ?? []).forEach((ref) => {
      if (!conflictById.has(ref)) errors.push(issue("conflict_ref_missing", `${base}.conflict_refs`, `unknown conflict ${ref}`));
    });
    (quarantineRefs ?? []).forEach((ref) => {
      if (!quarantineById.has(ref)) errors.push(issue("quarantine_ref_missing", `${base}.quarantine_refs`, `unknown quarantine ${ref}`));
    });
    if (contentUse === "eligible") {
      if (!["merchant_confirmed", "verified"].includes(answerStatus)) errors.push(issue("eligible_answer_status", `${base}.answer.answer_status`, "eligible requires merchant_confirmed or verified"));
      if ((unresolved ?? []).length > 0) errors.push(issue("eligible_unresolved", `${base}.answer.unresolved_claims`, "eligible answer cannot keep unresolved claims"));
      if ((quarantineRefs ?? []).length > 0) errors.push(issue("eligible_quarantine", `${base}.quarantine_refs`, "eligible answer cannot reference quarantine"));
      const openConflicts = (conflictRefs ?? []).filter(
        (ref) => text(conflictById.get(ref)?.status) === "open",
      );
      if (openConflicts.length > 0) {
        errors.push(
          issue(
            "eligible_open_conflict",
            `${base}.conflict_refs`,
            `eligible answer cannot keep open conflicts: ${openConflicts.join(", ")}`,
          ),
        );
      }
    }
    if (contentUse === "quarantined" && (quarantineRefs ?? []).length === 0) errors.push(issue("quarantine_required", `${base}.quarantine_refs`, "quarantined content requires a quarantine row"));
    if (typeof item.notes !== "string") errors.push(issue("notes", `${base}.notes`, "must be a string"));
  });

  conflictById.forEach((conflict, conflictId) => {
    list(conflict.item_refs).forEach((itemRef) => {
      if (!itemById.has(itemRef)) errors.push(issue("conflict_item_missing", `conflicts.${conflictId}.item_refs`, `unknown FAQ item ${itemRef}`));
    });
  });

  const signalIds = new Set();
  arrays.audience_signals.forEach((rawSignal, index) => {
    const signal = record(rawSignal);
    const base = `audience_signals[${index}]`;
    const id = text(signal.id);
    if (!ID_RE.test(id)) errors.push(issue("signal_id", `${base}.id`, "use a stable lowercase identifier"));
    else if (signalIds.has(id)) errors.push(issue("signal_id_duplicate", `${base}.id`, `duplicate ${id}`));
    signalIds.add(id);
    if (!text(signal.label)) errors.push(issue("signal_label", `${base}.label`, "required"));
    if (stringList(signal.buyer_roles) === null || stringList(signal.decision_stages) === null || stringList(signal.faq_refs) === null) {
      errors.push(issue("signal_lists", base, "buyer_roles, decision_stages, and faq_refs must be arrays"));
    }
    list(signal.decision_stages).forEach((stage) => {
      if (!STAGES.has(stage)) errors.push(issue("signal_stage", `${base}.decision_stages`, `unsupported stage ${stage}`));
    });
    list(signal.faq_refs).forEach((ref) => {
      if (!itemById.has(ref)) errors.push(issue("signal_faq_missing", `${base}.faq_refs`, `unknown FAQ item ${ref}`));
    });
    if (!SIGNAL_STATUSES.has(text(signal.status))) errors.push(issue("signal_status", `${base}.status`, "unsupported signal status"));
    if (text(signal.status) !== "hypothesis" && !["reviewed", "data_revised"].includes(artifactStatus)) {
      errors.push(issue("signal_promotion", `${base}.status`, "promoted signal requires reviewed artifact"));
    }
    if (!text(signal.evidence_limit)) errors.push(issue("signal_limit", `${base}.evidence_limit`, "state what the linked FAQs do not prove"));
  });

  if (artifactStatus === "data_revised" && ![...itemSourceKinds.values()].some((kinds) => [...kinds].some((kind) => BUYER_SOURCE_KINDS.has(kind) || SEARCH_SOURCE_KINDS.has(kind)))) {
    errors.push(issue("data_revision_evidence", "status", "data_revised requires buyer or search evidence"));
  }
  if (arrays.faq_items.length === 0) warnings.push(issue("faq_empty", "faq_items", "active FAQ config contains no questions"));
  if (artifactStatus === "draft") warnings.push(issue("review_pending", "status", "draft supports question planning; only eligible answers are publishable"));

  return report(errors, warnings, strict, {
    artifact_status: artifactStatus,
    source_count: sourceById.size,
    item_count: itemById.size,
    signal_count: signalIds.size,
    conflict_count: conflictById.size,
    quarantine_count: quarantineById.size,
    route_counts: summarizeBuyerFaqRoutes(value),
  });
}

function emptyRouteCounts() {
  return { product: 0, blog: 0, provider_handoff: 0, route_review_required: 0 };
}

export function routeBuyerFaqItemForOpsy(rawItem) {
  const item = record(rawItem);
  if (text(item.content_use) === "quarantined") {
    return { handler: "route_review_required", reason: "quarantined" };
  }
  const primaryRoute = text(item.primary_route);
  if (primaryRoute === "pdp") return { handler: "product", reason: "primary_route_pdp" };
  if (primaryRoute === "blog") return { handler: "blog", reason: "primary_route_blog" };
  if (["page", "collection", "faq_hub"].includes(primaryRoute)) {
    return { handler: "provider_handoff", reason: `unsupported_primary_route_${primaryRoute}` };
  }
  return { handler: "route_review_required", reason: "missing_or_unsupported_primary_route" };
}

export function summarizeBuyerFaqRoutes(payload) {
  const counts = emptyRouteCounts();
  for (const item of Array.isArray(payload?.faq_items) ? payload.faq_items : []) {
    const route = routeBuyerFaqItemForOpsy(item);
    counts[route.handler] += 1;
  }
  return counts;
}

function itemLanguages(item, sourceById) {
  const languages = new Set();
  list(item.source_refs).forEach((reference) => {
    list(sourceById.get(baseRef(reference))?.languages).forEach((language) => languages.add(language.toLowerCase()));
  });
  return languages;
}

function scopeMatches(item, scopeKeys) {
  const scope = record(item.scope);
  if (text(scope.type) === "enterprise" || scopeKeys.size === 0) return true;
  return list(scope.refs).some((ref) => scopeKeys.has(ref));
}

function selectionFailure(status, validation, details = {}) {
  return {
    schema_version: SELECTION_VERSION,
    ok: false,
    status,
    config_ref: FAQ_CONFIG_REF,
    artifact_status: validation?.artifact_status ?? "invalid",
    summary: {
      surface: details.surface ?? null,
      route: details.route ?? null,
      route_ownership: details.includeSupporting ? "primary_and_supporting" : "primary_only",
      scope_keys: [...(details.scopeKeys ?? [])].sort(),
      language: details.language || null,
      selected_items: 0,
      eligible_answers: 0,
    },
    items: [],
    validation,
  };
}

function selectedItem(item, { sourceById, routeRole }) {
  const answer = record(item.answer);
  const eligible = text(item.content_use) === "eligible";
  const id = text(item.id);
  return {
    faq_ref: `${FAQ_CONFIG_REF}#${id}`,
    id,
    canonical_question: text(item.canonical_question),
    variants: list(item.variants),
    scope: {
      type: text(item.scope?.type),
      refs: list(item.scope?.refs),
    },
    source_languages: [...itemLanguages(item, sourceById)].sort(),
    category: text(item.category),
    decision_stage: text(item.decision_stage),
    buyer_roles: list(item.buyer_roles),
    question_status: text(item.question_status),
    source_refs: list(item.source_refs),
    primary_route: text(item.primary_route),
    routes: list(item.routes),
    route_role: routeRole,
    seo_geo_topics: list(item.seo_geo_topics),
    content_use: text(item.content_use),
    answer_use: eligible ? "eligible" : "confirmation_only",
    eligible_answer: eligible ? text(answer.draft_answer) : null,
    answer_status: text(answer.answer_status),
    claim_refs: list(answer.claim_refs),
    confirmation_items: list(answer.unresolved_claims),
    conflict_refs: list(item.conflict_refs),
  };
}

export function selectBuyerFaq(
  payload,
  {
    surface,
    language = null,
    scopeKeys = [],
    includeSupporting = false,
  } = {},
) {
  const route = surface === "product" ? "pdp" : surface === "blog" ? "blog" : null;
  const desiredLanguage = text(language).toLowerCase();
  const desiredScopes = new Set(list(scopeKeys));
  const selectionDetails = {
    surface: text(surface),
    route,
    includeSupporting: Boolean(includeSupporting),
    scopeKeys: desiredScopes,
    language: desiredLanguage,
  };
  const validation = validateBuyerFaq(payload);
  if (!route) return selectionFailure("unsupported_surface", validation, selectionDetails);
  if (surface === "blog" && includeSupporting) {
    return selectionFailure("supporting_not_allowed", validation, selectionDetails);
  }
  if (!validation.ok) return selectionFailure("invalid", validation, selectionDetails);
  if (validation.artifact_status === "not_started") {
    return selectionFailure("not_started", validation, selectionDetails);
  }

  const sourceById = new Map(
    (Array.isArray(payload?.sources) ? payload.sources : []).map((source) => [text(source?.source_id), source]),
  );
  const items = [];
  for (const rawItem of Array.isArray(payload?.faq_items) ? payload.faq_items : []) {
    const item = record(rawItem);
    if (!COLD_START_QUESTION_STATUSES.has(text(item.question_status))) continue;
    if (text(item.content_use) === "quarantined") continue;

    const primaryRoute = text(item.primary_route);
    const routes = list(item.routes);
    let routeRole = null;
    if (primaryRoute === route) routeRole = "primary";
    else if (includeSupporting && routes.includes(route)) routeRole = "supporting";
    if (!routeRole) continue;
    if (!scopeMatches(item, desiredScopes)) continue;

    const languages = itemLanguages(item, sourceById);
    if (desiredLanguage && !languages.has(desiredLanguage)) continue;
    items.push(selectedItem(item, { sourceById, routeRole }));
  }
  items.sort((left, right) => {
    if (left.route_role !== right.route_role) return left.route_role === "primary" ? -1 : 1;
    return left.id.localeCompare(right.id);
  });

  return {
    schema_version: SELECTION_VERSION,
    ok: true,
    status: items.length > 0 ? "ready" : "empty",
    config_ref: FAQ_CONFIG_REF,
    artifact_status: validation.artifact_status,
    summary: {
      surface,
      route,
      route_ownership: includeSupporting ? "primary_and_supporting" : "primary_only",
      scope_keys: [...desiredScopes].sort(),
      language: desiredLanguage || null,
      selected_items: items.length,
      eligible_answers: items.filter((item) => item.answer_use === "eligible").length,
    },
    items,
    validation,
  };
}

export function selectBuyerFaqQuestionSignals(
  payload,
  { handler = null, language = null, scopeKeys = [] } = {},
) {
  return selectBuyerFaq(payload, {
    surface: handler,
    language,
    scopeKeys,
  });
}

export function selectEligibleBuyerFaqAnswers(payload, options = {}) {
  const selected = selectBuyerFaqQuestionSignals(payload, options);
  if (!selected.ok) return selected;
  const items = selected.items.filter((item) => text(item.content_use) === "eligible");
  return {
    ...selected,
    status: items.length > 0 ? "ready" : "empty",
    summary: {
      ...selected.summary,
      selected_items: items.length,
      eligible_answers: items.length,
    },
    items,
  };
}

export function buildFaqTopicSeeds(payload, { language = null, scopeKeys = [] } = {}) {
  const selected = selectBuyerFaq(payload, {
    surface: "blog",
    language,
    scopeKeys,
  });
  if (!selected.ok) {
    return {
      schema_version: "opsy-faq-topic-seeds-v1",
      ok: false,
      status: "invalid",
      rows: [],
      errors: selected.validation.errors,
      warnings: selected.validation.warnings,
    };
  }
  return {
    schema_version: "opsy-faq-topic-seeds-v1",
    ok: true,
    status: selected.items.length > 0 ? "ready" : "empty",
    rows: selected.items.map((item) => ({
      item_id: text(item.id),
      faq_ref: text(item.faq_ref),
      question: text(item.canonical_question),
      category: text(item.category),
      decision_stage: text(item.decision_stage),
      buyer_roles: list(item.buyer_roles),
      scope_type: text(item.scope?.type),
      scope_refs: list(item.scope?.refs),
      seo_geo_topics: list(item.seo_geo_topics),
      source_refs: list(item.source_refs),
      question_status: text(item.question_status),
      content_use: text(item.content_use),
      route_role: text(item.route_role),
      answer_reuse_allowed: text(item.answer_use) === "eligible",
      selection_role: "faq_seed",
      numeric_demand_claim: false,
    })),
    route_counts: selected.validation.route_counts,
    errors: [],
    warnings: selected.validation.warnings,
  };
}

export function validateBuyerFaqFile(filePath, options = {}) {
  try {
    const value = JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
    return validateBuyerFaq(value, options);
  } catch (error) {
    return report(
      [issue("invalid_json", filePath, `Buyer FAQ config cannot be read: ${error.message}`)],
      [],
      Boolean(options.strict),
      {
        artifact_status: "unreadable",
        source_count: 0,
        item_count: 0,
        signal_count: 0,
        conflict_count: 0,
        quarantine_count: 0,
        route_counts: emptyRouteCounts(),
      },
    );
  }
}
