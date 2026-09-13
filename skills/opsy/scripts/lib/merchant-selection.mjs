import { validateAudienceIntake } from "./audience-intake.mjs";

const QUEUE_SOURCES = new Set(["suggest-keywords", "suggest-faq-topics", "merchant_materials"]);
const QUEUE_MODES = new Set(["data_backed", "faq_seeded", "merchant_materials"]);
const CARRIERS = new Set(["title", "seo_title", "seo_description", "h2", "body", "alt"]);
const FORBIDDEN_SEED_METRICS = new Set([
  "impressions",
  "clicks",
  "ctr",
  "position",
  "kd",
  "opportunity_score",
  "sessions",
  "engaged_sessions",
  "ga4_sessions",
  "ga4_engaged_sessions",
]);

const list = (value) => (Array.isArray(value) ? value : []);
const text = (value) => (typeof value === "string" ? value.trim() : "");
const record = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : {});
const issue = (code, issuePath, message) => ({ code, path: issuePath, message });

export function normalizeHaystack(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function fieldContainsQuery(field, query) {
  const haystack = normalizeHaystack(field);
  const needle = normalizeHaystack(query);
  return Boolean(needle) && haystack.includes(needle);
}

function headingText(body, names = ["h2", "h3"]) {
  return names
    .flatMap((name) => [...String(body ?? "").matchAll(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "gi"))])
    .map((match) => match[1])
    .join(" ");
}

function altText(body, featuredAlt = "") {
  const inline = [...String(body ?? "").matchAll(/<img\b[^>]*\balt\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map((match) => match[1] ?? match[2] ?? "");
  return [featuredAlt, ...inline].join(" ");
}

function hasForbiddenMetrics(row) {
  return Object.keys(record(row)).some((key) => FORBIDDEN_SEED_METRICS.has(key) && row[key] !== null && row[key] !== "");
}

export function listAudienceCards({ profile = {}, audienceIntake = null } = {}) {
  const cards = [];
  const role = record(profile.profile?.store_role);
  if (role.status === "ready" && ["merchant_confirmed", "data_revised"].includes(text(role.audience_status)) && text(role.primary_audience)) {
    cards.push({
      id: "profile-primary",
      source: "profile",
      label: text(role.primary_audience),
      market: text(role.primary_market),
      language: text(role.content_language),
      scopeKeys: list(profile.profile?.merchant_context?.product_families).map(text).filter(Boolean),
      routes: ["product", "blog"],
      status: text(role.audience_status),
    });
  }
  if (!audienceIntake) return cards;
  const valid = validateAudienceIntake(audienceIntake);
  if (!valid.ok || !["merchant_reviewed", "data_revised"].includes(text(audienceIntake.review?.status))) return cards;
  const languages = list(audienceIntake.store?.content_languages).map(text);
  for (const audience of list(audienceIntake.audiences)) {
    cards.push({
      id: text(audience.audience_id),
      source: "intake",
      label: text(audience.label),
      market: list(audience.market_scope).map(text)[0] ?? "",
      markets: list(audience.market_scope).map(text),
      language: languages[0] ?? "",
      languages,
      scopeKeys: [...list(audience.product_scope_keys), ...list(audience.product_lines)].map(text).filter(Boolean),
      routes: list(audience.routes).map(text),
      status: text(audienceIntake.review.status),
    });
  }
  return cards;
}

export function matchingAudienceCards(cards, task = {}) {
  const scopeKeys = list(task.scopeKeys).map(text);
  return list(cards).filter((card) => {
    if (card.source === "intake") {
      const markets = list(card.markets).length ? card.markets : [card.market];
      const languages = list(card.languages).length ? card.languages : [card.language];
      return (
        list(card.routes).includes(task.surface) &&
        markets.includes(task.market) &&
        languages.includes(task.language) &&
        scopeKeys.every((key) => list(card.scopeKeys).includes(key))
      );
    }
    return card.market === task.market && card.language === task.language;
  });
}

export function resolveAudienceCard({ profile = {}, audienceIntake = null, task, cardId = null } = {}) {
  const pending = [];
  const all = listAudienceCards({ profile, audienceIntake });
  const intakeCards = matchingAudienceCards(all.filter((card) => card.source === "intake"), task);
  const profileCards = matchingAudienceCards(all.filter((card) => card.source === "profile"), task);
  const cards = intakeCards.length ? intakeCards : profileCards;
  const requested = text(cardId);
  if (requested) {
    const card = cards.find((item) => item.id === requested) ?? null;
    if (!card) pending.push("Named audience card is not an exact confirmed match for this task");
    return { card, cards, pending };
  }
  if (cards.length === 1) return { card: cards[0], cards, pending };
  if (cards.length > 1) pending.push("Multiple confirmed audience cards match; pass --card and confirm one card");
  else pending.push("No confirmed audience card matches this task; confirm the questionnaire or profile audience");
  return { card: null, cards, pending };
}

export function validateAudienceCard(card, { profile = {}, audienceIntake = null, surface } = {}) {
  const errors = [];
  const value = record(card);
  const fail = (message) => errors.push(issue("audience_card", "audienceCard", message));
  if (!text(value.id) || !text(value.label) || !["profile", "intake"].includes(text(value.source))) {
    fail("Drafting requires one confirmed audience card with id, source and label");
    return errors;
  }
  if (value.source === "profile") {
    const role = record(profile.profile?.store_role);
    if (!["merchant_confirmed", "data_revised"].includes(text(role.audience_status)) || text(role.primary_audience) !== text(value.label)) {
      fail("Profile audience card is missing or no longer matches the confirmed store-role summary");
    }
    if (text(value.market) && text(value.market) !== text(role.primary_market)) fail("Audience card market differs from the confirmed store role");
    if (text(value.language) && text(value.language) !== text(role.content_language)) fail("Audience card language differs from the confirmed store role");
    return errors;
  }
  const valid = audienceIntake ? validateAudienceIntake(audienceIntake) : { ok: false };
  const row = list(audienceIntake?.audiences).find((item) => text(item.audience_id) === text(value.id));
  if (!valid.ok || !row || !["merchant_reviewed", "data_revised"].includes(text(audienceIntake.review?.status))) {
    fail("Intake audience card is missing, unconfirmed, or stale");
    return errors;
  }
  if (surface && !list(row.routes).includes(surface)) fail("Selected audience card is not routed to this surface");
  return errors;
}

export function validateTopicQueue(queue, { surface, selectionMode } = {}) {
  const errors = [];
  const value = record(queue);
  const fail = (code, message) => errors.push(issue(code, surface === "blog" ? "topicQueue" : "sourceFacts.topicQueue", message));
  if (value.schema_version !== "opsy-topic-queue-v1") {
    fail("topic_queue", "Record an opsy-topic-queue-v1 selection before drafting");
    return errors;
  }
  if (!QUEUE_SOURCES.has(text(value.source))) fail("topic_queue_source", "Topic queue source must be suggest-keywords, suggest-faq-topics, or merchant_materials");
  if (!QUEUE_MODES.has(text(value.selectionMode))) fail("topic_queue_mode", "Topic queue selectionMode must be data_backed, faq_seeded, or merchant_materials");
  if (value.merchantConfirmed !== true || !Number.isFinite(Date.parse(text(value.confirmedAt)))) {
    fail("topic_queue_confirm", "Merchant must confirm the topic queue with an ISO confirmedAt");
  }
  if (selectionMode && text(value.selectionMode) !== selectionMode) {
    fail("topic_queue_mode_mismatch", "Topic queue selectionMode must match the package topic source");
  }
  const rows = list(value.rows);
  if (text(value.selectionMode) === "merchant_materials") {
    if (rows.length) fail("topic_queue_materials", "merchant_materials queues keep rows empty and name a nonUseReason");
    if (!text(value.nonUseReason)) fail("topic_queue_reason", "Without delivered demand data, record why the listing proceeds from merchant materials");
    return errors;
  }
  if (rows.length < 1 || rows.length > 3) fail("topic_queue_rows", "Confirm one to three topic-queue rows");
  if (text(value.selectionMode) === "data_backed" && text(value.source) !== "suggest-keywords") {
    fail("topic_queue_source", "data_backed selection uses the suggest-keywords queue");
  }
  if (text(value.selectionMode) === "faq_seeded" && text(value.source) !== "suggest-faq-topics") {
    fail("topic_queue_source", "faq_seeded selection uses suggest-faq-topics only");
  }
  if (surface === "blog" && text(value.selectionMode) === "data_backed" && !text(value.sourcePath)) {
    fail("topic_queue_path", "Retain the keyword-suggestions file path on a data-backed Blog queue");
  }
  for (const [index, raw] of rows.entries()) {
    const row = record(raw);
    if (!text(row.query) || text(row.selection_status) !== "selected") {
      fail("topic_queue_row", `Queue row ${index + 1} needs a query and selection_status selected`);
    }
    if (surface === "blog" && !["blog", "review"].includes(text(row.route_hint))) {
      fail("topic_queue_route", "Blog may only select route_hint blog or review rows");
    }
    if (surface === "product" && text(row.route_hint) === "blog") {
      fail("topic_queue_route", "Product may not consume a blog-owned queue row as a new listing topic");
    }
    if (!list(row.evidence_refs).length) fail("topic_queue_evidence", `Queue row ${index + 1} needs evidence_refs`);
    if (text(value.selectionMode) === "faq_seeded") {
      if (hasForbiddenMetrics(row)) fail("faq_seeded_metrics", "FAQ-seeded queue rows cannot claim search or opportunity metrics");
      if (!text(row.faq_ref)) fail("topic_queue_faq", `FAQ-seeded row ${index + 1} needs faq_ref`);
    }
  }
  return errors;
}

export function validatePlacement(placement, { surface, selectionMode, title, seoTitle, seoDescription, body, alt, ownUrls = [], queue = null } = {}) {
  const errors = [];
  const value = record(placement);
  const pathName = surface === "blog" ? "placement" : "sourceFacts.placement";
  const fail = (code, message) => errors.push(issue(code, pathName, message));
  if (value.schema_version !== "opsy-placement-v1") {
    fail("placement", "Record an opsy-placement-v1 single-object placement before drafting");
    return errors;
  }
  const primary = record(value.primary);
  const secondary = list(value.secondary);
  if (!text(primary.query) || !list(primary.carriers).length) fail("placement_primary", "Primary placement needs a query and at least one carrier");
  if (secondary.length > 2) fail("placement_secondary", "At most two secondary placement rows");
  const fields = {
    title,
    seo_title: seoTitle,
    seo_description: seoDescription,
    h2: headingText(body),
    body,
    alt,
  };
  const queueQueries = list(record(queue).rows).map((row) => text(row.query));
  for (const [index, raw] of [primary, ...secondary].entries()) {
    const row = record(raw);
    const label = index === 0 ? "primary" : `secondary ${index}`;
    if (list(row.carriers).some((carrier) => !CARRIERS.has(carrier))) fail("placement_carrier", `${label} uses an unsupported carrier`);
    if (list(row.carriers).some((carrier) => !fieldContainsQuery(fields[carrier], row.query))) {
      fail("placement_missing", `${label} query is absent from a declared carrier`);
    }
    if (queueQueries.length && index === 0 && !queueQueries.includes(text(row.query))) {
      fail("placement_queue", "Primary placement query must be one of the confirmed topic-queue rows");
    }
  }
  const occupied = list(value.doNotOccupy).map(text).filter(Boolean);
  if (!occupied.length && !text(value.occupiedReason)) {
    fail("placement_occupied", "Name colliding owned URLs in doNotOccupy, or record occupiedReason when none exist");
  }
  const own = new Set(list(ownUrls).map((url) => text(url).replace(/\/$/, "").toLowerCase()));
  if (occupied.some((url) => own.has(url.replace(/\/$/, "").toLowerCase()))) {
    fail("placement_conflict", "doNotOccupy cannot include this package's own product or article URL");
  }
  if (selectionMode === "faq_seeded" && hasForbiddenMetrics(value)) {
    fail("faq_seeded_metrics", "FAQ-seeded placement cannot claim search metrics");
  }
  return errors;
}
