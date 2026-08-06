import fs from "node:fs";

const SURFACES = new Set(["page", "pdp", "blog"]);
const DECISION_STAGES = new Set(["discover", "evaluate", "validate", "inquire"]);
const EVIDENCE_KINDS = new Set(["demand", "claim"]);
const EVIDENCE_STATUSES = new Set([
  "verified",
  "merchant_confirmed",
  "general_context",
  "unresolved",
]);
const PRIORITIES = new Set(["primary", "supporting"]);
const OBJECTION_STATUSES = new Set(["answered", "needs_confirmation"]);
const CHECK_NAMES = [
  "relevance",
  "clarity",
  "credibility",
  "risk_boundary",
  "next_step",
];

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function stringArray(value, { allowEmpty = false } = {}) {
  return (
    Array.isArray(value) &&
    (allowEmpty || value.length > 0) &&
    value.every((item) => text(item))
  );
}

function dateTimeOrNull(value) {
  return value === null || (typeof value === "string" && !Number.isNaN(Date.parse(value)));
}

function safeUrl(value) {
  return text(value) && /^(?:https:\/\/|mailto:|tel:|\/)/i.test(value.trim());
}

function sameText(left, right) {
  return String(left ?? "").trim().toLocaleLowerCase() ===
    String(right ?? "").trim().toLocaleLowerCase();
}

export function validateDecisionBrief(
  brief,
  { expectedSurface = null, approvedCtaLabel = null } = {},
) {
  const issues = [];
  const add = (check, severity, message) => issues.push({ check, severity, message });

  if (!record(brief)) {
    add("relevance", "blocked", "Decision brief root must be an object.");
  } else {
    if (brief.schema_version !== "opsy-decision-brief-v1") {
      add(
        "relevance",
        "blocked",
        "schema_version must be opsy-decision-brief-v1.",
      );
    }
    if (!SURFACES.has(brief.surface)) {
      add("relevance", "blocked", "surface must be page, pdp, or blog.");
    } else if (expectedSurface && brief.surface !== expectedSurface) {
      add(
        "relevance",
        "blocked",
        `surface ${brief.surface} does not match expected ${expectedSurface}.`,
      );
    }
    if (!DECISION_STAGES.has(brief.decision_stage)) {
      add(
        "relevance",
        "blocked",
        "decision_stage must be discover, evaluate, validate, or inquire.",
      );
    }

    const buyer = brief.buyer;
    if (!record(buyer)) {
      add("relevance", "blocked", "buyer must be an object.");
    } else {
      for (const field of ["role", "situation", "decision", "desired_outcome"]) {
        if (!text(buyer[field])) {
          add("relevance", "blocked", `buyer.${field} is required.`);
        }
      }
      if (!stringArray(buyer.constraints)) {
        add("relevance", "blocked", "buyer.constraints requires at least one item.");
      }
      if (!stringArray(buyer.questions)) {
        add("relevance", "blocked", "buyer.questions requires at least one item.");
      }
    }

    const answer = brief.primary_answer;
    if (!record(answer)) {
      add("clarity", "blocked", "primary_answer must be an object.");
    } else {
      for (const field of ["statement", "buyer_value", "reason", "scope"]) {
        if (!text(answer[field])) {
          add("clarity", "blocked", `primary_answer.${field} is required.`);
        }
      }
    }

    const translations = Array.isArray(brief.value_translations)
      ? brief.value_translations
      : [];
    if (translations.length === 0) {
      add(
        "clarity",
        "blocked",
        "value_translations requires at least one fact-to-buyer-value mapping.",
      );
    }
    const translationIds = new Set();
    for (const [index, item] of translations.entries()) {
      const label = `value_translations[${index}]`;
      if (!record(item)) {
        add("clarity", "blocked", `${label} must be an object.`);
        continue;
      }
      for (const field of ["id", "source_fact", "buyer_requirement", "buyer_value"]) {
        if (!text(item[field])) add("clarity", "blocked", `${label}.${field} is required.`);
      }
      if (text(item.id)) {
        if (translationIds.has(item.id)) {
          add("clarity", "blocked", `Duplicate value translation id: ${item.id}.`);
        }
        translationIds.add(item.id);
      }
      if (!stringArray(item.evidence_refs)) {
        add("credibility", "blocked", `${label}.evidence_refs is required.`);
      }
      if (!PRIORITIES.has(item.priority)) {
        add("clarity", "blocked", `${label}.priority must be primary or supporting.`);
      }
    }

    const objections = Array.isArray(brief.objections) ? brief.objections : [];
    if (objections.length === 0) {
      add("risk_boundary", "fix", "At least one blocking buyer objection should be recorded.");
    }
    const objectionIds = new Set();
    for (const [index, item] of objections.entries()) {
      const label = `objections[${index}]`;
      if (!record(item)) {
        add("risk_boundary", "blocked", `${label} must be an object.`);
        continue;
      }
      for (const field of ["id", "question", "why_it_blocks", "response"]) {
        if (!text(item[field])) add("risk_boundary", "blocked", `${label}.${field} is required.`);
      }
      if (text(item.id)) {
        if (objectionIds.has(item.id)) {
          add("risk_boundary", "blocked", `Duplicate objection id: ${item.id}.`);
        }
        objectionIds.add(item.id);
      }
      if (!OBJECTION_STATUSES.has(item.status)) {
        add(
          "risk_boundary",
          "blocked",
          `${label}.status must be answered or needs_confirmation.`,
        );
      }
      if (item.status === "answered" && !stringArray(item.evidence_refs)) {
        add("credibility", "blocked", `${label}.evidence_refs is required when answered.`);
      }
      if (item.status === "needs_confirmation") {
        add("risk_boundary", "fix", `${label} still needs merchant confirmation.`);
      }
    }

    const boundary = brief.boundary;
    if (!record(boundary)) {
      add("risk_boundary", "blocked", "boundary must be an object.");
    } else {
      for (const field of ["fit", "not_fit", "conditions"]) {
        if (!Array.isArray(boundary[field])) {
          add("risk_boundary", "blocked", `boundary.${field} must be an array.`);
        } else if (!stringArray(boundary[field])) {
          add("risk_boundary", "fix", `boundary.${field} should name at least one item.`);
        }
      }
      if (!stringArray(boundary.needs_confirmation, { allowEmpty: true })) {
        add(
          "risk_boundary",
          "blocked",
          "boundary.needs_confirmation must be an array of strings.",
        );
      }
    }

    const nextStep = brief.next_step;
    if (!record(nextStep)) {
      add("next_step", "blocked", "next_step must be an object.");
    } else {
      for (const field of [
        "goal",
        "cta_label",
        "cta_url",
        "commitment",
        "buyer_receives",
      ]) {
        if (!text(nextStep[field])) add("next_step", "blocked", `next_step.${field} is required.`);
      }
      if (text(nextStep.cta_url) && !safeUrl(nextStep.cta_url)) {
        add(
          "next_step",
          "blocked",
          "next_step.cta_url must be an https, relative, mailto, or tel route.",
        );
      }
      if (!stringArray(nextStep.buyer_inputs)) {
        add("next_step", "blocked", "next_step.buyer_inputs requires at least one item.");
      }
      if (approvedCtaLabel && !sameText(nextStep.cta_label, approvedCtaLabel)) {
        add(
          "next_step",
          "blocked",
          "next_step.cta_label does not match the approved store-profile CTA.",
        );
      }
    }

    const evidence = Array.isArray(brief.evidence) ? brief.evidence : [];
    if (evidence.length === 0) {
      add("credibility", "blocked", "evidence requires at least one named source.");
    }
    const evidenceById = new Map();
    const validSupportTargets = new Set([
      "buyer.questions",
      "buyer.decision",
      "decision_stage",
      "primary_answer",
      "boundary",
      "next_step",
      ...[...translationIds].map((id) => `value_translations.${id}`),
      ...[...objectionIds].map((id) => `objections.${id}.response`),
    ]);
    for (const [index, item] of evidence.entries()) {
      const label = `evidence[${index}]`;
      if (!record(item)) {
        add("credibility", "blocked", `${label} must be an object.`);
        continue;
      }
      if (!text(item.id)) {
        add("credibility", "blocked", `${label}.id is required.`);
      } else if (evidenceById.has(item.id)) {
        add("credibility", "blocked", `Duplicate evidence id: ${item.id}.`);
      } else {
        evidenceById.set(item.id, item);
      }
      if (!EVIDENCE_KINDS.has(item.kind)) {
        add("credibility", "blocked", `${label}.kind must be demand or claim.`);
      }
      if (!stringArray(item.supports)) {
        add("credibility", "blocked", `${label}.supports requires at least one target.`);
      } else {
        for (const target of item.supports) {
          if (!validSupportTargets.has(target)) {
            add("credibility", "blocked", `${label}.supports has unknown target ${target}.`);
          }
          if (
            item.kind === "demand" &&
            !["buyer.questions", "buyer.decision", "decision_stage"].includes(target)
          ) {
            add(
              "credibility",
              "blocked",
              `Demand evidence ${item.id ?? index} cannot support claim target ${target}.`,
            );
          }
        }
      }
      if (!text(item.source_ref)) {
        add("credibility", "blocked", `${label}.source_ref is required.`);
      }
      if (!EVIDENCE_STATUSES.has(item.status)) {
        add(
          "credibility",
          "blocked",
          `${label}.status must be verified, merchant_confirmed, general_context, or unresolved.`,
        );
      }
      if (!dateTimeOrNull(item.verified_at)) {
        add("credibility", "blocked", `${label}.verified_at must be ISO date-time or null.`);
      } else if (
        ["verified", "merchant_confirmed"].includes(item.status) &&
        item.verified_at === null
      ) {
        add(
          "credibility",
          "fix",
          `${label}.verified_at should be recorded for ${item.status} evidence.`,
        );
      }
      if (item.status === "unresolved") {
        add("credibility", "fix", `${label} remains unresolved.`);
      }
    }

    const claimSupportsPrimary = evidence.some(
      (item) =>
        record(item) &&
        item.kind === "claim" &&
        Array.isArray(item.supports) &&
        item.supports.includes("primary_answer") &&
        item.status !== "unresolved",
    );
    if (!claimSupportsPrimary) {
      add(
        "credibility",
        "blocked",
        "primary_answer requires non-unresolved claim evidence.",
      );
    }

    for (const item of translations) {
      if (!record(item) || !Array.isArray(item.evidence_refs)) continue;
      const target = `value_translations.${item.id}`;
      for (const ref of item.evidence_refs) {
        const source = evidenceById.get(ref);
        if (!source) {
          add("credibility", "blocked", `Unknown evidence ref ${ref} in ${item.id ?? "value translation"}.`);
        } else if (source.kind !== "claim" || source.status === "unresolved") {
          add(
            "credibility",
            "blocked",
            `Value translation ${item.id} requires resolved claim evidence; ${ref} is not eligible.`,
          );
        } else if (!Array.isArray(source.supports) || !source.supports.includes(target)) {
          add(
            "credibility",
            "blocked",
            `Evidence ${ref} does not declare support for ${target}.`,
          );
        }
      }
    }
    for (const item of objections) {
      if (!record(item) || item.status !== "answered" || !Array.isArray(item.evidence_refs)) {
        continue;
      }
      const target = `objections.${item.id}.response`;
      for (const ref of item.evidence_refs) {
        const source = evidenceById.get(ref);
        if (!source) {
          add("credibility", "blocked", `Unknown evidence ref ${ref} in ${item.id ?? "objection"}.`);
        } else if (source.kind !== "claim" || source.status === "unresolved") {
          add(
            "credibility",
            "blocked",
            `Answered objection ${item.id} requires resolved claim evidence; ${ref} is not eligible.`,
          );
        } else if (!Array.isArray(source.supports) || !source.supports.includes(target)) {
          add(
            "credibility",
            "blocked",
            `Evidence ${ref} does not declare support for ${target}.`,
          );
        }
      }
    }

    if (!Array.isArray(brief.unresolved)) {
      add("credibility", "blocked", "unresolved must be an array.");
    } else {
      for (const [index, item] of brief.unresolved.entries()) {
        const label = `unresolved[${index}]`;
        if (!record(item) || !text(item.field_ref) || !text(item.question)) {
          add(
            "credibility",
            "blocked",
            `${label} requires field_ref and question.`,
          );
          continue;
        }
        if (typeof item.blocking !== "boolean") {
          add("credibility", "blocked", `${label}.blocking must be boolean.`);
        } else if (item.blocking) {
          add(
            "credibility",
            "blocked",
            `Decision brief has blocking unresolved item at ${item.field_ref}.`,
          );
        }
      }
    }
  }

  const checks = Object.fromEntries(
    CHECK_NAMES.map((name) => {
      const relevant = issues.filter((issue) => issue.check === name);
      if (relevant.some((issue) => issue.severity === "blocked")) return [name, "blocked"];
      if (relevant.some((issue) => issue.severity === "fix")) return [name, "fix"];
      return [name, "pass"];
    }),
  );
  const status = issues.some((issue) => issue.severity === "blocked")
    ? "blocked"
    : issues.some((issue) => issue.severity === "fix")
      ? "fix"
      : "pass";
  return {
    ok: status === "pass",
    status,
    checks,
    errors: issues
      .filter((issue) => issue.severity === "blocked")
      .map((issue) => issue.message),
    warnings: issues
      .filter((issue) => issue.severity === "fix")
      .map((issue) => issue.message),
    issues,
  };
}

export function validateDecisionBriefFile(filePath, options = {}) {
  let brief;
  try {
    const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    brief = JSON.parse(raw);
  } catch (error) {
    return {
      ok: false,
      status: "blocked",
      checks: Object.fromEntries(CHECK_NAMES.map((name) => [name, "blocked"])),
      errors: [`Decision brief cannot be read as JSON: ${error.message}`],
      warnings: [],
      issues: [],
    };
  }
  return validateDecisionBrief(brief, options);
}
