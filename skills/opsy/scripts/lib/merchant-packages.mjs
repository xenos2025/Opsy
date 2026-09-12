import fs from "node:fs";
import path from "node:path";
import { validateDecisionBrief } from "./buyer-decision.mjs";
import { selectBuyerFaq } from "./buyer-faq.mjs";
import { summarizeStoreRole } from "./workspace.mjs";
import { inside, validateIntakeBinding } from "./product-intake.mjs";
import { validateContentReuse } from "./content-reuse.mjs";
import { validateBlogMedia, htmlElements } from "./blog-media.mjs";

const HANDLE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TEMPLATE_MARKER_RE = /\{\{[^{}]+\}\}|\[(?:needs[^\]]*confirmation|placeholder|tbd)[^\]]*\]/i;
const AI_PHRASES = [
  "delve into",
  "in today's fast-paced",
  "in the ever-evolving",
  "elevate your",
  "unlock the",
  "unleash",
  "game-changer",
  "seamlessly",
  "look no further",
  "harness the power",
];
const SOURCE_MODES = new Set([
  "merchant_materials",
  "merchant_directed",
  "sales_questions",
  "delivered_data",
  "agency_handoff",
  "faq_seeded",
]);
const LIVE_GOOGLE_MODES = new Set([
  "google_api",
  "live_ga4",
  "live_gsc",
  "live_analytics",
]);
const BLOG_INTENTS = new Set([
  "procurement",
  "commercial",
  "brand",
  "informational",
]);
const BLOG_FORMATS = new Set([
  "procurement_guide",
  "comparison",
  "application",
  "technical",
  "market_solution",
  "product_roundup",
]);
const BLOG_REQUIRED_DATASETS = ["gsc_queries", "ga4_landing_pages"];
const BLOG_SELECTION_MODES = new Set(["data_backed", "faq_seeded"]);
const FAQ_REVIEW_STATUSES = new Set(["applied", "no_match", "not_available"]);
const PRODUCT_FAQ_USES = new Set([
  "buyer_question",
  "objection",
  "answer_fact",
  "confirmation_item",
]);
const FAQ_TOPIC_INFLUENCES = new Set([
  "cluster_seed",
  "cluster_expansion",
  "priority_tiebreak",
  "buyer_angle",
  "fan_out",
  "article_format",
  "surface_routing",
]);
const NEXT_ACTION_OWNERS = new Set([
  "owner",
  "sales",
  "operations",
  "ai_session",
  "needs_approval",
]);
const NEXT_ACTION_RISKS = new Set([
  "none",
  "needs_owner_fact",
  "needs_shopify_approval",
  "needs_design_or_media",
  "customer_sensitive",
]);

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stringList(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
    : [];
}

function issue(code, issuePath, message) {
  return { code, path: issuePath, message };
}

function addRequired(errors, value, issuePath) {
  if (!text(value)) {
    errors.push(issue("required", issuePath, `${issuePath} is required`));
  }
}

function report(schemaVersion, errors, warnings, details = {}) {
  return {
    schema_version: schemaVersion,
    ok: errors.length === 0,
    status: errors.length === 0 ? "pass" : "fix",
    counts: { errors: errors.length, warnings: warnings.length },
    errors,
    warnings,
    ...details,
  };
}

function readJsonFile(filePath, schemaVersion) {
  try {
    return { value: JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")), error: null };
  } catch (error) {
    return {
      value: null,
      error: report(schemaVersion, [issue("unreadable", "$", `Cannot read JSON: ${error.message}`)], []),
    };
  }
}

function validateSourceBasis(value, errors, warnings, issuePath) {
  const basis = record(value);
  const mode = text(basis.mode);
  if (LIVE_GOOGLE_MODES.has(mode)) {
    errors.push(
      issue(
        "live_google_forbidden",
        `${issuePath}.mode`,
        "Opsy does not connect to Google APIs; use merchant input or a delivered local data package",
      ),
    );
  } else if (!SOURCE_MODES.has(mode)) {
    errors.push(
      issue(
        "source_mode",
        `${issuePath}.mode`,
        `Use one of: ${[...SOURCE_MODES].join(", ")}`,
      ),
    );
  }
  const references = stringList(basis.references);
  if (references.length === 0) {
    errors.push(
      issue("source_references", `${issuePath}.references`, "Name at least one merchant, sales, file, or delivered-data source"),
    );
  }
  if (mode === "delivered_data") {
    const window = record(basis.dataWindow ?? basis.data_window);
    if (!text(window.startDate ?? window.start_date) || !text(window.endDate ?? window.end_date)) {
      errors.push(
        issue("data_window", `${issuePath}.dataWindow`, "Delivered data must name its start and end dates"),
      );
    }
    if (!text(basis.timezone)) {
      warnings.push(
        issue("data_timezone", `${issuePath}.timezone`, "Delivered data should name its timezone"),
      );
    }
  }
  return { mode, references };
}

function validateRole(profile, errors) {
  const role = summarizeStoreRole(profile);
  if (role.status !== "ready") {
    errors.push(
      issue(
        "store_role",
        "profile.store_role",
        "B2B store role and merchant-confirmed content voice must be ready before buyer-visible package approval",
      ),
    );
  }
  return role;
}

function addDecisionIssues(brief, surface, profile, errors) {
  const result = validateDecisionBrief(brief, {
    expectedSurface: surface,
    approvedCtaLabel: profile?.profile?.primary_inquiry_cta ?? null,
  });
  if (!result.ok) {
    for (const decisionIssue of result.issues) {
      errors.push(
        issue(
          `decision_${decisionIssue.code}`,
          `decision_brief.${decisionIssue.check}`,
          decisionIssue.message,
        ),
      );
    }
  }
  return result;
}

function profileMetafieldKeys(profile) {
  return new Set(
    (Array.isArray(profile?.profile?.metafield_definitions)
      ? profile.profile.metafield_definitions
      : [])
      .filter((item) => record(item).owner_type === "PRODUCT")
      .map((item) => `${text(item.namespace)}.${text(item.key)}`)
      .filter((key) => !key.startsWith(".")),
  );
}

function firstMediaLooksLikeOverview(media) {
  const first = record(media?.[0]);
  const role = text(first.role).toLowerCase();
  const source = `${text(first.path)} ${text(first.src)}`.toLowerCase();
  if (!new Set(["front_overview", "front_plus_option_card", "pack_overview"]).has(role)) {
    return false;
  }
  return /overview|front[-_ ]?view|front[-_ ]?overview|full[-_ ]?view|pack[-_ ]?overview/.test(source);
}

function aiPhraseHits(value) {
  const lowered = text(value).toLowerCase();
  return AI_PHRASES.filter((phrase) => lowered.includes(phrase));
}

function markerCheck(value, errors, warnings, issuePath, blocking) {
  if (!TEMPLATE_MARKER_RE.test(String(value ?? ""))) return;
  const target = blocking ? errors : warnings;
  target.push(
    issue(
      "unresolved_marker",
      issuePath,
      blocking
        ? "Unresolved confirmation markers are not allowed in a write-ready package"
        : "Package still contains an unresolved confirmation marker",
    ),
  );
}

function validateProductFaqUse(sourceFacts, profile, buyerFaq, errors, warnings) {
  const review = record(sourceFacts.faqReview);
  const status = text(review.status);
  const itemIds = stringList(review.itemIds);
  const uses = stringList(review.uses);
  const rationale = text(review.rationale);
  const scopeKeys = stringList(sourceFacts.scopeKeys);
  const contentLanguage = profile?.profile?.store_role?.content_language ?? null;

  if (!FAQ_REVIEW_STATUSES.has(status)) {
    errors.push(issue("faq_review_status", "sourceFacts.faqReview.status", `Use one of: ${[...FAQ_REVIEW_STATUSES].join(", ")}`));
  }
  if (!rationale) {
    errors.push(issue("faq_review_rationale", "sourceFacts.faqReview.rationale", "Record how buyer FAQ evidence affected the PDP, or why no row matched"));
  }
  if (uses.some((use) => !PRODUCT_FAQ_USES.has(use))) {
    errors.push(issue("faq_use", "sourceFacts.faqReview.uses", `Use only: ${[...PRODUCT_FAQ_USES].join(", ")}`));
  }

  const selected = buyerFaq
    ? selectBuyerFaq(buyerFaq, {
        surface: "product",
        language: contentLanguage,
        scopeKeys,
        includeSupporting: true,
      })
    : null;
  const selectedItems = selected?.ok ? selected.items : [];
  const selectedById = new Map(selectedItems.map((item) => [text(item.id), record(item)]));

  if (buyerFaq && selected && !selected.ok) {
    const target = status === "applied" ? errors : warnings;
    target.push(issue("buyer_faq_invalid", "config/buyer_faq.json", "Buyer FAQ evidence cannot be used until the config passes validation"));
  }

  if (status === "applied") {
    if (!buyerFaq) errors.push(issue("buyer_faq_missing", "config/buyer_faq.json", "Applied FAQ use requires the workspace buyer FAQ config"));
    if (itemIds.length === 0) errors.push(issue("faq_item_ids", "sourceFacts.faqReview.itemIds", "Applied FAQ use requires at least one item id"));
    if (uses.length === 0) errors.push(issue("faq_uses", "sourceFacts.faqReview.uses", "Applied FAQ use must name its PDP role"));
    const refs = stringList(sourceFacts.sourceBasis?.references).map((reference) => reference.replaceAll("\\", "/").toLowerCase());
    for (const [index, itemId] of itemIds.entries()) {
      const item = selectedById.get(itemId);
      if (!item) {
        errors.push(issue("faq_item_ineligible", `sourceFacts.faqReview.itemIds[${index}]`, `Buyer FAQ item is not an accepted Product question for this route, language, or scope: ${itemId}`));
      }
      if (
        item &&
        uses.includes("answer_fact") &&
        (text(item.answer_use) !== "eligible" || text(item.route_role) !== "primary")
      ) {
        errors.push(issue("faq_answer_ineligible", `sourceFacts.faqReview.itemIds[${index}]`, "Only eligible answers owned by the Product primary route may be reused as Product facts"));
      }
      const requiredSuffix = text(item?.faq_ref || `config/buyer_faq.json#${itemId}`).toLowerCase();
      if (!refs.some((reference) => reference.endsWith(requiredSuffix))) {
        errors.push(issue("faq_evidence_ref", "sourceFacts.sourceBasis.references", `Cite config/buyer_faq.json#${itemId}`));
      }
    }
  } else {
    if (itemIds.length > 0 || uses.length > 0) {
      errors.push(issue("faq_review_unused", "sourceFacts.faqReview", "no_match and not_available must not carry item ids or use labels"));
    }
    if (status === "not_available" && selectedItems.length > 0) {
      errors.push(issue("faq_review_mismatch", "sourceFacts.faqReview.status", "Matching Product FAQ questions exist; use applied or no_match and explain the decision"));
    }
  }

  return {
    status,
    item_count: itemIds.length,
    uses,
    selected_count: selectedItems.length,
    eligible_count: selectedItems.filter((item) => text(item.answer_use) === "eligible").length,
    library_status: selected?.artifact_status ?? (buyerFaq ? "invalid" : "not_loaded"),
  };
}

export function validateProductPackage(
  payload,
  { profile = {}, mode = "draft", buyerFaq = null, intakeBatch = null, audienceIntake = null, audiencePath = null, workspaceRoot = null } = {},
) {
  const errors = [];
  const warnings = [];
  const value = record(payload);
  const publicMode = mode === "public";
  if (!new Set(["draft", "public"]).has(mode)) {
    errors.push(issue("mode", "mode", "mode must be draft or public"));
  }
  if (value.schema_version !== "opsy-product-package-v1") {
    errors.push(issue("schema_version", "schema_version", "must equal opsy-product-package-v1"));
  }

  const requiredFields = ["title", "handle", "vendor", "productType", "descriptionHtml"];
  for (const field of requiredFields) addRequired(errors, value[field], field);
  if (text(value.handle) && !HANDLE_RE.test(text(value.handle))) {
    errors.push(issue("handle", "handle", "handle must be lowercase kebab-case"));
  }
  const expectedStatus = publicMode ? "ACTIVE" : "DRAFT";
  if (text(value.status).toUpperCase() !== expectedStatus) {
    errors.push(issue("status", "status", `${mode} mode requires status ${expectedStatus}`));
  }
  addRequired(errors, value?.seo?.title, "seo.title");
  addRequired(errors, value?.seo?.description, "seo.description");
  addRequired(errors, value?.variant?.sku, "variant.sku");

  const role = validateRole(profile, errors);
  const sourceFacts = record(value.sourceFacts);
  errors.push(...validateIntakeBinding(value, intakeBatch, { workspaceRoot }));
  errors.push(...validateContentReuse(sourceFacts.contentReuse, { profile, buyerFaq, audienceIntake, audiencePath }, { body: String(value.descriptionHtml ?? ""), brief: sourceFacts.decisionBrief, surface: "product", scopeKeys: stringList(sourceFacts.scopeKeys) }));
  const sourceBasis = validateSourceBasis(sourceFacts.sourceBasis, errors, warnings, "sourceFacts.sourceBasis");
  if (sourceBasis.mode === "faq_seeded") {
    errors.push(
      issue(
        "product_source_mode",
        "sourceFacts.sourceBasis.mode",
        "Product packages use merchant_materials or sales_questions for FAQ-backed facts; faq_seeded is reserved for Blog topic selection",
      ),
    );
  }
  const faqSelection = validateProductFaqUse(
    sourceFacts,
    profile,
    buyerFaq,
    errors,
    warnings,
  );
  const candidates = stringList(sourceFacts.titleCandidates);
  if (candidates.length < 2 || candidates.length > 3) {
    errors.push(issue("title_candidates", "sourceFacts.titleCandidates", "Provide 2-3 evidence-based title candidates"));
  }
  if (!text(sourceFacts.titleChoice) || text(sourceFacts.titleChoice) !== text(value.title)) {
    errors.push(issue("title_choice", "sourceFacts.titleChoice", "Chosen title must equal the package title"));
  } else if (!candidates.includes(text(sourceFacts.titleChoice))) {
    errors.push(issue("title_choice_candidate", "sourceFacts.titleChoice", "Chosen title must be one of titleCandidates"));
  }

  const decision = addDecisionIssues(sourceFacts.decisionBrief, "pdp", profile, errors);
  const description = String(value.descriptionHtml ?? "");
  if (/<h1\b/i.test(description)) {
    errors.push(issue("description_h1", "descriptionHtml", "Shopify product body must not contain an H1"));
  }
  const faqCount = (description.match(/<p[^>]*>\s*<strong[^>]*>[^<]*\?\s*<\/strong>\s*<\/p>/gi) ?? []).length;
  if (faqCount < (publicMode ? 2 : 1) || (!publicMode && faqCount === 1 && !text(sourceFacts.faqCaveat))) {
    errors.push(issue("faq_count", "descriptionHtml", "Public packages need two buyer questions; a draft may use one with sourceFacts.faqCaveat"));
  } else if (!publicMode && faqCount === 1) {
    warnings.push(issue("faq_count", "descriptionHtml", "Thin-material draft has one FAQ; public mode still requires two"));
  }
  if (/href=["'][^"']*\/pages\/contact/i.test(description)) {
    errors.push(issue("hardcoded_contact", "descriptionHtml", "Do not hardcode a contact-page route; use the configured theme inquiry CTA"));
  }
  const phraseHits = aiPhraseHits(description);
  if (phraseHits.length > 0) {
    const target = publicMode ? errors : warnings;
    target.push(issue("ai_phrases", "descriptionHtml", `Rewrite stock phrases: ${phraseHits.join(", ")}`));
  }
  markerCheck(description, errors, warnings, "descriptionHtml", publicMode);

  const tags = stringList(value.tags);
  if (tags.length === 0) errors.push(issue("tags", "tags", "Provide at least one routing tag"));
  const collections = stringList(value.collections);
  if (collections.length === 0) warnings.push(issue("collections", "collections", "No collection target is recorded"));

  const definitions = profileMetafieldKeys(profile);
  const metafields = record(value.metafields);
  for (const [key, metafieldValue] of Object.entries(metafields)) {
    if (!text(metafieldValue)) continue;
    if (key.startsWith("specs.")) {
      errors.push(issue("legacy_metafield", `metafields.${key}`, "Do not write legacy specs.* metafields"));
    } else if (!definitions.has(key)) {
      errors.push(issue("metafield_definition", `metafields.${key}`, `No verified PRODUCT metafield definition exists for ${key}`));
    }
    markerCheck(metafieldValue, errors, warnings, `metafields.${key}`, publicMode);
  }

  const media = Array.isArray(value.media) ? value.media : [];
  if (media.length === 0) {
    errors.push(issue("media", "media", "Provide at least one product image"));
  } else {
    for (const [index, rawItem] of media.entries()) {
      const item = record(rawItem);
      if (!text(item.path) && !text(item.src)) {
        errors.push(issue("media_source", `media[${index}]`, "Each media item needs a path or src"));
      }
      addRequired(errors, item.alt, `media[${index}].alt`);
    }
    if (!firstMediaLooksLikeOverview(media)) {
      const hasCaveat = text(sourceFacts.mediaCaveat);
      if (!publicMode && hasCaveat) {
        warnings.push(issue("first_media", "media[0]", "Draft keeps an explicit first-media gap"));
      } else {
        errors.push(issue("first_media", "media[0]", "First media must be an honestly named front or pack overview"));
      }
    }
  }

  return report("opsy-product-package-validation-v1", errors, warnings, {
    mode,
    source_mode: sourceBasis.mode,
    store_role_status: role.status,
    decision_status: decision.status,
    faq_selection_status: faqSelection.status,
    faq_item_count: faqSelection.item_count,
    faq_uses: faqSelection.uses,
    faq_count: faqCount,
  });
}

export function validateProductPackageFile(filePath, options = {}) {
  const parsed = readJsonFile(filePath, "opsy-product-package-validation-v1");
  if (parsed.error) return parsed.error;
  try {
    const intakeRef = parsed.value.sourceFacts?.intake?.path;
    const intakeBatch = intakeRef && options.workspaceRoot ? JSON.parse(fs.readFileSync(inside(options.workspaceRoot, intakeRef), "utf8")) : options.intakeBatch;
    return validateProductPackage(parsed.value, { ...loadReuseSource(parsed.value.sourceFacts?.contentReuse, options), intakeBatch });
  } catch (error) { return report("opsy-product-package-validation-v1", [issue("intake_unreadable", "sourceFacts.intake", error.message)], []); }
}

function loadReuseSource(reuse, options) {
  const audiencePath = reuse?.selection?.sourcePaths?.audienceIntake ?? options.audiencePath ?? null;
  const audienceIntake = audiencePath && options.workspaceRoot ? JSON.parse(fs.readFileSync(inside(options.workspaceRoot, audiencePath), "utf8")) : options.audienceIntake;
  return { ...options, audiencePath, audienceIntake };
}

export function validateProductBatch(queue, options = {}) {
  if (!Array.isArray(queue?.packages) || !queue.packages.length) throw new Error("A product queue requires packages with candidateId and workspace-relative path");
  const seenKeys = new Map();
  const results = queue.packages.map((entry) => {
    try {
      if (!entry?.candidateId || queue.packages.filter((other) => other?.candidateId === entry.candidateId).length !== 1) throw new Error("Missing or duplicate queue candidate ID");
      const file = inside(options.workspaceRoot, entry.path);
      const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
      if (parsed.sourceFacts?.intake && parsed.sourceFacts.intake.candidateId !== entry.candidateId) throw new Error("Queue candidate does not match package intake");
      const validation = validateProductPackageFile(file, options);
      const result = { candidateId: entry.candidateId, path: entry.path, status: validation.ok ? "passed" : "needs_input", validation };
      for (const [field, value] of [["variant.sku", text(parsed.variant?.sku)], ["handle", text(parsed.handle)]]) {
        const key = `${field}:${value.toLowerCase()}`;
        if (value && seenKeys.has(key)) {
          const earlier = seenKeys.get(key);
          for (const item of [earlier, result]) { item.status = "blocked"; item.validation.ok = false; item.validation.status = "fix"; item.validation.errors.push(issue("batch_duplicate", field, `Duplicate ${field} across packages`)); item.validation.counts.errors = item.validation.errors.length; }
        } else if (value) seenKeys.set(key, result);
      }
      return result;
    } catch (error) { return { candidateId: entry?.candidateId ?? null, status: "blocked", error: error.message }; }
  });
  return { ok: results.every((r) => r.status === "passed"), results, passedIds: results.filter((r) => r.status === "passed").map((r) => r.candidateId), approvalGranted: false };
}

function safeUrl(value) {
  const candidate = text(value);
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return true;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

function imageTags(body) {
  return [...String(body ?? "").matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
}

function imageTagReady(tag) {
  const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ?? "";
  const alt = tag.match(/\balt=["']([^"']+)["']/i)?.[1] ?? "";
  return /^https:\/\//i.test(src) && Boolean(text(alt));
}

function normalizedHost(value) {
  const raw = text(value);
  if (raw.startsWith("/") && !raw.startsWith("//")) return "";
  const candidate = raw.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
  return candidate.replace(/^www\./, "");
}

function validateBlogDataCenter(validation, errors) {
  const dataCenter = record(validation);
  if (!dataCenter.ok) {
    errors.push(
      issue(
        "data_center_invalid",
        "data-center/manifest.json",
        "Blog planning requires a valid provider-delivered data-center snapshot",
      ),
    );
  }
  const datasets = new Map(
    (Array.isArray(dataCenter.datasets) ? dataCenter.datasets : [])
      .map((item) => record(item))
      .map((item) => [text(item.name), item]),
  );
  const missing = BLOG_REQUIRED_DATASETS.filter((name) => {
    const dataset = datasets.get(name);
    return !dataset || (Array.isArray(dataset.errors) && dataset.errors.length > 0);
  });
  for (const name of missing) {
    errors.push(
      issue(
        "data_center_dataset",
        `data-center.${name}`,
        `Blog planning requires a valid ${name} dataset`,
      ),
    );
  }
  return {
    status: dataCenter.ok && missing.length === 0 ? "ready" : "scoring_blocked",
    manifest_path: text(dataCenter.manifest_path) || null,
    required_datasets: BLOG_REQUIRED_DATASETS,
    missing,
  };
}

function validateFaqTopicInfluence(
  topic,
  profile,
  buyerFaq,
  selectionMode,
  errors,
  warnings,
) {
  const review = record(topic.faqReview);
  const status = text(review.status);
  const itemIds = stringList(review.itemIds);
  const influences = stringList(review.influence);
  const rationale = text(review.rationale);
  const scopeKeys = stringList(topic.scopeKeys);
  const contentLanguage = profile?.profile?.store_role?.content_language ?? null;

  if (!FAQ_REVIEW_STATUSES.has(status)) {
    errors.push(
      issue(
        "faq_review_status",
        "topic.faqReview.status",
        `Use one of: ${[...FAQ_REVIEW_STATUSES].join(", ")}`,
      ),
    );
  }
  if (!rationale) {
    errors.push(
      issue(
        "faq_review_rationale",
        "topic.faqReview.rationale",
        "Record how FAQ evidence affected topic selection, or why no entry matched",
      ),
    );
  }
  if (influences.some((item) => !FAQ_TOPIC_INFLUENCES.has(item))) {
    errors.push(
      issue(
        "faq_influence",
        "topic.faqReview.influence",
        `Use only: ${[...FAQ_TOPIC_INFLUENCES].join(", ")}`,
      ),
    );
  }

  const selected = buyerFaq
    ? selectBuyerFaq(buyerFaq, {
        surface: "blog",
        language: contentLanguage,
        scopeKeys,
      })
    : null;
  const eligibleItems = selected?.ok ? selected.items : [];
  if (buyerFaq && selected && !selected.ok) {
      const target = status === "applied" || selectionMode === "faq_seeded" ? errors : warnings;
      target.push(
        issue(
          "buyer_faq_invalid",
          "config/buyer_faq.json",
          "FAQ topic evidence cannot be trusted until the buyer FAQ config passes validation",
        ),
      );
  }

  if (status === "applied") {
    if (itemIds.length === 0) {
      errors.push(issue("faq_item_ids", "topic.faqReview.itemIds", "Applied FAQ influence requires at least one FAQ item id"));
    }
    if (influences.length === 0) {
      errors.push(issue("faq_influence", "topic.faqReview.influence", "Applied FAQ influence must name its topic-selection role"));
    }
    if (!buyerFaq) {
      errors.push(issue("buyer_faq_missing", "config/buyer_faq.json", "Applied FAQ influence requires the workspace buyer FAQ config"));
    }
    if (selectionMode === "faq_seeded" && !influences.includes("cluster_seed")) {
      errors.push(issue("faq_cluster_seed", "topic.faqReview.influence", "faq_seeded selection must include cluster_seed"));
    }
    if (selectionMode === "data_backed" && influences.includes("cluster_seed")) {
      errors.push(
        issue(
          "faq_data_boundary",
          "topic.faqReview.influence",
          "Data-backed selection may use cluster_expansion or priority_tiebreak; cluster_seed is reserved for cold start",
        ),
      );
    }

    const selectedById = new Map(eligibleItems.map((item) => [text(item.id), record(item)]));
    const evidenceRefs = stringList(topic.evidenceRefs).map((reference) =>
      reference.replaceAll("\\", "/").toLowerCase(),
    );
    for (const [index, itemId] of itemIds.entries()) {
      const item = selectedById.get(itemId);
      if (!item) {
        errors.push(
          issue(
            "faq_item_ineligible",
            `topic.faqReview.itemIds[${index}]`,
            `FAQ item is not an accepted Blog-primary question for this language or scope: ${itemId}`,
          ),
        );
      }
      const requiredSuffix = text(item?.faq_ref || `config/buyer_faq.json#${itemId}`).toLowerCase();
      if (!evidenceRefs.some((reference) => reference.endsWith(requiredSuffix))) {
        errors.push(
          issue(
            "faq_evidence_ref",
            "topic.evidenceRefs",
            `Cite config/buyer_faq.json#${itemId} as topic-selection evidence`,
          ),
        );
      }
    }
  } else {
    if (itemIds.length > 0 || influences.length > 0) {
      errors.push(
        issue(
          "faq_review_unused",
          "topic.faqReview",
          "no_match and not_available reviews must not carry entry ids or influence labels",
        ),
      );
    }
    if (selectionMode === "faq_seeded") {
      errors.push(issue("faq_seed_required", "topic.faqReview.status", "faq_seeded selection requires an applied FAQ review"));
    }
    if (status === "not_available" && eligibleItems.length > 0) {
      errors.push(
        issue(
          "faq_review_mismatch",
          "topic.faqReview.status",
          "Accepted Blog FAQ questions are available; mark applied or no_match and explain the topic decision",
        ),
      );
    }
  }

  return {
    status,
    item_count: itemIds.length,
    influences,
    selected_count: eligibleItems.length,
    eligible_count: eligibleItems.filter((item) => text(item.answer_use) === "eligible").length,
    library_status: selected?.artifact_status ?? (buyerFaq ? "invalid" : "not_loaded"),
  };
}

export function validateBlogPackage(
  payload,
  {
    profile = {},
    mode = "review",
    now = new Date(),
    dataCenterValidation = null,
    buyerFaq = null,
    audienceIntake = null,
    audiencePath = null,
    productEvidence = null,
  } = {},
) {
  const errors = [];
  const warnings = [];
  const value = record(payload);
  const writeMode = mode === "write";
  if (!new Set(["review", "write"]).has(mode)) {
    errors.push(issue("mode", "mode", "mode must be review or write"));
  }
  if (value.schema_version !== "opsy-blog-package-v1") {
    errors.push(issue("schema_version", "schema_version", "must equal opsy-blog-package-v1"));
  }

  const role = validateRole(profile, errors);
  const sourceBasis = validateSourceBasis(value.sourceBasis, errors, warnings, "sourceBasis");
  const topic = record(value.topic);
  const selectionMode = text(topic.selectionMode);
  if (!BLOG_SELECTION_MODES.has(selectionMode)) {
    errors.push(
      issue(
        "selection_mode",
        "topic.selectionMode",
        `Use one of: ${[...BLOG_SELECTION_MODES].join(", ")}`,
      ),
    );
  }

  const dataIssues = [];
  const blogData = validateBlogDataCenter(dataCenterValidation, dataIssues);
  if (selectionMode === "data_backed") {
    errors.push(...dataIssues);
    if (!new Set(["delivered_data", "agency_handoff"]).has(sourceBasis.mode)) {
      errors.push(
        issue(
          "blog_data_source",
          "sourceBasis.mode",
          "data_backed Blog selection requires the provider-delivered local data-center or an agency handoff",
        ),
      );
    }
    if (!sourceBasis.references.some((reference) => /data-center[\\/]manifest\.json$/i.test(reference))) {
      errors.push(
        issue(
          "data_manifest_ref",
          "sourceBasis.references",
          "Data-backed Blog package must cite data-center/manifest.json",
        ),
      );
    }
  } else if (selectionMode === "faq_seeded") {
    if (sourceBasis.mode !== "faq_seeded") {
      errors.push(issue("faq_source_mode", "sourceBasis.mode", "faq_seeded topic selection requires sourceBasis.mode faq_seeded"));
    }
    if (dataCenterValidation?.ok !== true) {
      errors.push(
        issue(
          "data_center_baseline",
          "data-center/manifest.json",
          "Cold-start FAQ selection still requires a valid, possibly empty, local data-center manifest",
        ),
      );
    }
    if (!sourceBasis.references.some((reference) => /config[\\/]buyer_faq\.json$/i.test(reference))) {
      errors.push(issue("buyer_faq_ref", "sourceBasis.references", "FAQ-seeded Blog package must cite config/buyer_faq.json"));
    }
    if (blogData.status === "ready") {
      warnings.push(
        issue(
          "data_available",
          "topic.selectionMode",
          "GSC/GA4 data is ready; prefer data_backed selection unless the merchant explicitly chose an FAQ-led editorial topic",
        ),
      );
    }
  }

  addRequired(errors, topic.primaryCluster, "topic.primaryCluster");
  if (!BLOG_INTENTS.has(text(topic.intentClass))) {
    errors.push(issue("intent", "topic.intentClass", "Record procurement, commercial, brand, or informational intent"));
  }
  if (!BLOG_FORMATS.has(text(topic.articleFormat))) {
    errors.push(issue("format", "topic.articleFormat", `Use one of: ${[...BLOG_FORMATS].join(", ")}`));
  }
  addRequired(errors, topic.selectionBasis, "topic.selectionBasis");
  if (!safeUrl(topic.commercialTargetUrl)) {
    errors.push(issue("commercial_target", "topic.commercialTargetUrl", "Name a real site-relative or HTTPS commercial target"));
  }
  if (!new Set(["clear", "update_existing", "blocked"]).has(text(topic.duplicateCheck))) {
    errors.push(issue("duplicate_check", "topic.duplicateCheck", "Record clear, update_existing, or blocked"));
  } else if (text(topic.duplicateCheck) === "blocked") {
    errors.push(issue("duplicate_blocked", "topic.duplicateCheck", "A duplicate or cannibalization conflict must be resolved before drafting"));
  }
  if (!new Set(["create", "update"]).has(text(topic.createOrUpdate))) {
    errors.push(issue("create_update", "topic.createOrUpdate", "Record create or update"));
  }

  const evidenceRefs = stringList(topic.evidenceRefs);
  if (selectionMode === "data_backed") {
    for (const datasetName of BLOG_REQUIRED_DATASETS) {
      if (!evidenceRefs.some((reference) => reference.toLowerCase().includes(datasetName))) {
        errors.push(
          issue(
            "data_evidence_ref",
            "topic.evidenceRefs",
            `Data-backed Blog package must cite ${datasetName} evidence from data-center`,
          ),
        );
      }
    }
  }

  const faqSelection = validateFaqTopicInfluence(
    topic,
    profile,
    buyerFaq,
    selectionMode,
    errors,
    warnings,
  );

  const metrics = record(topic.metrics);
  const hasMetrics = Object.values(metrics).some((metric) => metric !== null && metric !== "");
  if (selectionMode === "faq_seeded" && hasMetrics) {
    errors.push(
      issue(
        "faq_seeded_metrics",
        "topic.metrics",
        "FAQ-seeded topics cannot claim impressions, clicks, position, opportunity score, or other search metrics",
      ),
    );
  } else if (hasMetrics) {
    if (!new Set(["delivered_data", "agency_handoff"]).has(sourceBasis.mode)) {
      errors.push(issue("metric_source", "topic.metrics", "Numeric metrics require delivered data or an agency handoff, never model inference"));
    }
    if (evidenceRefs.length === 0) {
      errors.push(issue("metric_evidence", "topic.evidenceRefs", "Numeric metrics require delivered data evidence references"));
    }
  }

  if (text(topic.createOrUpdate) === "update") {
    addRequired(errors, topic.lastContentUpdate, "topic.lastContentUpdate");
    addRequired(errors, topic.cooldownUntil, "topic.cooldownUntil");
    const cooldown = Date.parse(text(topic.cooldownUntil));
    const exception = text(topic.cooldownException);
    if (!Number.isNaN(cooldown) && now.getTime() < cooldown && !exception) {
      errors.push(issue("cooldown", "topic.cooldownUntil", "Ranking-driven rewrites must wait until cooldown ends or name an allowed correction exception"));
    }
  }

  const decision = addDecisionIssues(value.buyerDecision, "blog", profile, errors);
  const article = record(value.article);
  for (const field of ["title", "handle", "summary", "bodyHtml", "seoTitle", "metaDescription"]) {
    addRequired(errors, article[field], `article.${field}`);
  }
  if (text(article.handle) && !HANDLE_RE.test(text(article.handle))) {
    errors.push(issue("handle", "article.handle", "handle must be lowercase kebab-case"));
  }
  if (stringList(article.tags).length === 0) {
    errors.push(issue("tags", "article.tags", "Provide concise article tags"));
  }
  const body = String(article.bodyHtml ?? "");
  errors.push(...validateContentReuse(value.contentReuse, { profile, buyerFaq, audienceIntake, audiencePath }, { body, brief: value.buyerDecision, surface: "blog", scopeKeys: stringList(topic.scopeKeys), job: topic.articleFormat }));
  const mediaValidation = validateBlogMedia(value, { profile, mode, productEvidence });
  errors.push(...mediaValidation.errors);
  warnings.push(...mediaValidation.warnings);
  if (/<h1\b/i.test(body)) errors.push(issue("body_h1", "article.bodyHtml", "Article body must not contain an H1"));
  const headingCount = (body.match(/<h[23]\b/gi) ?? []).length;
  if (headingCount < 2) errors.push(issue("buyer_headings", "article.bodyHtml", "Use at least two buyer-question H2/H3 sections"));
  if (new Set(["procurement_guide", "comparison", "technical"]).has(text(topic.articleFormat)) && !/<table\b/i.test(body)) {
    errors.push(issue("decision_table", "article.bodyHtml", `${topic.articleFormat} requires a useful decision table`));
  }
  const phraseHits = aiPhraseHits(body);
  if (phraseHits.length > 0) {
    const target = writeMode ? errors : warnings;
    target.push(issue("ai_phrases", "article.bodyHtml", `Rewrite stock phrases: ${phraseHits.join(", ")}`));
  }
  markerCheck(body, errors, warnings, "article.bodyHtml", writeMode);

  const inlineImages = imageTags(body);
  const readyInlineImages = inlineImages.filter(imageTagReady);
  const featured = record(article.featuredImage);
  if (writeMode) {
    if (!/^https:\/\//i.test(text(featured.url)) || !text(featured.alt)) {
      errors.push(issue("featured_image", "article.featuredImage", "Write-ready Blog needs an HTTPS featured image and alt text"));
    }
    if (readyInlineImages.length < 2) {
      errors.push(issue("inline_images", "article.bodyHtml", "Write-ready Blog needs at least two HTTPS inline images with alt text"));
    }
  } else if (!text(featured.url) || readyInlineImages.length < 2) {
    warnings.push(issue("media_pending", "article", "Review package is not Shopify write-ready until featured and two inline images exist"));
  }

  const links = stringList(article.internalLinks);
  if (links.length < 2) {
    errors.push(issue("internal_links", "article.internalLinks", "Provide at least two verified internal links"));
  }
  const publicHost = normalizedHost(profile?.store?.primary_domain);
  if (publicHost) {
    for (const [index, link] of links.entries()) {
      if (!safeUrl(link)) {
        errors.push(issue("internal_link_url", `article.internalLinks[${index}]`, "Internal links must be site-relative or HTTPS URLs"));
        continue;
      }
      const host = normalizedHost(link);
      if (host && host !== publicHost) {
        errors.push(issue("internal_link_host", `article.internalLinks[${index}]`, "Internal links must use the active store domain"));
      }
    }
  }
  const cta = record(article.cta);
  if (text(cta.label) !== text(profile?.profile?.primary_inquiry_cta) || !safeUrl(cta.url)) {
    errors.push(issue("cta", "article.cta", "Use the profile-approved CTA label and a real site-relative or HTTPS URL"));
  }
  const bodyLinks = htmlElements(body, "a").map((a) => a.href);
  const absolute = (url) => { try { return new URL(url, `https://${publicHost}`).href; } catch { return ""; } };
  for (const link of [...links, cta.url]) {
    if (!bodyLinks.some((href) => absolute(href) === absolute(link))) errors.push(issue("body_link_missing", "article.bodyHtml", `Declared internal link or CTA is absent from body: ${link}`));
  }

  return report("opsy-blog-package-validation-v1", errors, warnings, {
    mode,
    source_mode: sourceBasis.mode,
    selection_mode: selectionMode,
    topic_source_status: selectionMode === "faq_seeded" ? "faq_seeded" : blogData.status,
    data_center_status: blogData.status,
    data_center_manifest: blogData.manifest_path,
    faq_selection_status: faqSelection.status,
    faq_item_count: faqSelection.item_count,
    faq_influences: faqSelection.influences,
    store_role_status: role.status,
    decision_status: decision.status,
    heading_count: headingCount,
    inline_image_count: inlineImages.length,
    media_status: mediaValidation.needsMedia ? "needs_media" : "mapped",
  });
}

export function validateBlogPackageFile(filePath, options = {}) {
  const parsed = readJsonFile(filePath, "opsy-blog-package-validation-v1");
  if (parsed.error) return parsed.error;
  try {
    const evidenceRef = parsed.value.productEvidence?.path;
    const productEvidence = evidenceRef && options.workspaceRoot ? JSON.parse(fs.readFileSync(inside(options.workspaceRoot, evidenceRef), "utf8")) : options.productEvidence;
    return validateBlogPackage(parsed.value, { ...loadReuseSource(parsed.value.contentReuse, options), productEvidence });
  } catch (error) { return report("opsy-blog-package-validation-v1", [issue("evidence_unreadable", "productEvidence", error.message)], []); }
}

export function validateNextActions(payload) {
  const errors = [];
  const warnings = [];
  const value = record(payload);
  if (value.schema_version !== "opsy-next-actions-v1") {
    errors.push(issue("schema_version", "schema_version", "must equal opsy-next-actions-v1"));
  }
  if (!ISO_DATE_RE.test(text(value.period)) || Number.isNaN(Date.parse(`${text(value.period)}T00:00:00Z`))) {
    errors.push(issue("period", "period", "period must be a valid YYYY-MM-DD date"));
  }
  const actions = Array.isArray(value.actions) ? value.actions : [];
  if (actions.length !== 3) {
    errors.push(issue("action_count", "actions", "Provide exactly three actions, not a backlog dump"));
  }
  const ids = new Set();
  const vague = /^(?:improve seo|optimize website|提升seo|优化网站)$/i;
  const risky = /\b(?:publish|delete|bulk|theme|metafield|redirect)\b|发布|删除|批量|主题|元字段|重定向/i;
  for (const [index, rawAction] of actions.entries()) {
    const action = record(rawAction);
    const base = `actions[${index}]`;
    for (const field of ["id", "action", "target", "source", "due", "done_when"]) {
      addRequired(errors, action[field], `${base}.${field}`);
    }
    const id = text(action.id);
    if (id && ids.has(id)) errors.push(issue("duplicate_id", `${base}.id`, `Duplicate action id ${id}`));
    ids.add(id);
    if (vague.test(text(action.action))) {
      errors.push(issue("vague_action", `${base}.action`, "Name one concrete verb and target"));
    }
    if (!NEXT_ACTION_OWNERS.has(text(action.owner))) {
      errors.push(issue("owner", `${base}.owner`, `Use one of: ${[...NEXT_ACTION_OWNERS].join(", ")}`));
    }
    if (!ISO_DATE_RE.test(text(action.due)) || Number.isNaN(Date.parse(`${text(action.due)}T00:00:00Z`))) {
      errors.push(issue("due", `${base}.due`, "due must be a valid YYYY-MM-DD date"));
    }
    if (!NEXT_ACTION_RISKS.has(text(action.risk))) {
      errors.push(issue("risk", `${base}.risk`, `Use one of: ${[...NEXT_ACTION_RISKS].join(", ")}`));
    }
    if (risky.test(text(action.action)) && text(action.risk) !== "needs_shopify_approval") {
      errors.push(issue("risky_action", `${base}.risk`, "Shopify or theme changes must be labeled needs_shopify_approval"));
    }
  }
  return report("opsy-next-actions-validation-v1", errors, warnings, {
    action_count: actions.length,
  });
}

export function validateNextActionsFile(filePath) {
  const parsed = readJsonFile(filePath, "opsy-next-actions-validation-v1");
  return parsed.error ?? validateNextActions(parsed.value);
}

export function defaultPackageOutput(workspaceRoot, kind, sourcePath) {
  const stem = path.basename(sourcePath, path.extname(sourcePath));
  return path.join(workspaceRoot, "outputs", kind, `${stem}-validation.json`);
}
