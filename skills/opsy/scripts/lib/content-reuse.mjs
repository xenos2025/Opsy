import { selectBuyerFaq } from "./buyer-faq.mjs";
import { validateAudienceIntake } from "./audience-intake.mjs";
import { fingerprint } from "./product-intake.mjs";
import { resolveAudienceCard } from "./merchant-selection.mjs";

const list = (v) => Array.isArray(v) ? v : [];
const jobs = new Set(["pdp", "procurement_guide", "comparison", "application", "technical", "market_solution", "product_roundup"]);

function addIntakeCard(items, audienceIntake, cardId) {
  const index = list(audienceIntake?.audiences).findIndex((row) => row.audience_id === cardId);
  if (index < 0) return;
  const audience = audienceIntake.audiences[index];
  const add = (id, value, pointer) => {
    if (typeof value === "string" && value.trim()) items.push({ id, value, source: "audienceIntake", pointer, authority: "planning_only" });
  };
  add(`audience-${audience.audience_id}-job`, audience.primary_job_to_be_done, `/audiences/${index}/primary_job_to_be_done`);
  for (const field of ["pain_points", "objections", "customer_language"]) {
    list(audience[field]).forEach((value, offset) => add(`audience-${audience.audience_id}-${field}-${offset}`, value, `/audiences/${index}/${field}/${offset}`));
  }
}

export function selectContentContext({ profile = {}, buyerFaq = null, audienceIntake = null, audiencePath = null, task }) {
  if (!task || !["product", "blog"].includes(task.surface) || !jobs.has(task.job) || (task.surface === "product") !== (task.job === "pdp") || !task.market || !task.language || !list(task.scopeKeys).length) throw new Error("Content task needs surface, job, exact scopeKeys, market and language");
  const items = [], pending = [];
  const role = profile.profile?.store_role ?? {}, context = profile.profile?.merchant_context ?? {};
  const resolved = resolveAudienceCard({ profile, audienceIntake, task, cardId: task.cardId });
  pending.push(...resolved.pending);
  const audienceCard = resolved.card;
  const profileScope = role.primary_market === task.market && role.content_language === task.language && task.scopeKeys.every((key) => list(context.product_families).includes(key));
  const add = (id, value, source, pointer, authority) => {
    if (typeof value === "string" && value.trim()) items.push({ id, value, source, pointer, authority });
  };
  if (audienceCard?.source === "profile" && profileScope && ["merchant_confirmed", "data_revised"].includes(role.audience_status) && role.status === "ready") {
    add("profile-audience", role.primary_audience, "profile", "/profile/store_role/primary_audience", "planning_only");
    if (context.status === "ready" && context.updated_at) {
      for (const field of ["sales_questions", "purchase_objections"]) list(context[field]).forEach((v, i) => add(`profile-${field}-${i}`, v, "profile", `/profile/merchant_context/${field}/${i}`, "planning_only"));
    }
  } else if (!audienceIntake && !audienceCard) {
    pending.push("Profile scope or audience confirmation does not exactly match; confirm only the task-specific gaps");
  }
  if (audienceIntake) {
    const valid = validateAudienceIntake(audienceIntake);
    if (valid.ok && ["merchant_reviewed", "data_revised"].includes(audienceIntake.review?.status)) {
      if (audienceCard?.source === "intake") addIntakeCard(items, audienceIntake, audienceCard.id);
      else if (!audienceCard) pending.push(resolved.cards.length ? "Multiple audience rows match; retain ambiguity and confirm the task audience" : "No exact reviewed audience scope match");
    } else pending.push("Audience intake is invalid or unconfirmed; retain existing config and use confirmed profile/FAQ evidence");
  }
  if (buyerFaq) {
    const faq = selectBuyerFaq(buyerFaq, { surface: task.surface, scopeKeys: task.scopeKeys, language: task.language, includeSupporting: task.surface === "product" });
    if (faq.ok) faq.items.forEach((item) => add(`faq-${item.id}`, item.canonical_question, "buyerFaq", `/faq_items/${buyerFaq.faq_items.findIndex((row) => row.id === item.id)}/canonical_question`, "question_only"));
    else pending.push("Buyer FAQ validation failed; do not reuse its contents");
  }
  const resolvedTask = { ...task, cardId: audienceCard?.id ?? task.cardId ?? null };
  return {
    schema_version: "opsy-content-selection-v1",
    task: resolvedTask,
    audienceCard,
    audienceCards: resolved.cards,
    sourcePaths: { profile: "config/store-profile.json", buyerFaq: "config/buyer_faq.json", audienceIntake: audiencePath },
    sources: { profile: fingerprint(profile), buyerFaq: buyerFaq ? fingerprint(buyerFaq) : null, audienceIntake: audienceIntake ? fingerprint(audienceIntake) : null },
    items, pending, status: items.length && audienceCard ? "selected" : "needs_input",
  };
}

export function validateContentReuse(reuse, sources, { body, brief, surface, scopeKeys, job = null }) {
  if (!reuse) return [];
  const errors = [], fail = (message) => errors.push({ code: "content_reuse", path: "contentReuse", message });
  try {
    const selection = selectContentContext({ ...sources, task: reuse.selection?.task });
    if (fingerprint(selection) !== fingerprint(reuse.selection)) fail("Stored context selection is stale or modified; reselect from current retained sources");
    if (selection.task.surface !== surface || JSON.stringify([...selection.task.scopeKeys].sort()) !== JSON.stringify([...scopeKeys].sort())) fail("Context task scope differs from the package");
    if (job && selection.task.job !== job) fail("Context content job differs from the package");
    const seen = new Set();
    const strings = (value) => typeof value === "string" ? [value] : value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];
    for (const use of list(reuse.uses)) {
      const item = selection.items.find((i) => i.id === use.itemId);
      if (!item || seen.has(use.itemId)) { fail("Unknown or repeated context item"); continue; }
      seen.add(use.itemId);
      if (!use.rationale || !use.briefExcerpt || !use.contentExcerpt || !strings(brief).some((value) => value.includes(use.briefExcerpt)) || !body.includes(use.contentExcerpt)) fail("Reuse requires rationale and exact excerpts present in both buyer brief and content");
      if (use.use !== "buyer_context") fail("Audience and question reuse supplies buyer context, never merchant/product claims");
    }
    if (!list(reuse.uses).length && !reuse.nonUseReason) fail("Record context use or a non-use reason");
  } catch (error) { fail(error.message); }
  return errors;
}
