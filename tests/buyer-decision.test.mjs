import assert from "node:assert/strict";
import test from "node:test";
import { validateDecisionBrief } from "../skills/opsy/scripts/lib/buyer-decision.mjs";

function validBrief() {
  return {
    schema_version: "opsy-decision-brief-v1",
    surface: "pdp",
    decision_stage: "evaluate",
    buyer: {
      role: "Procurement manager",
      situation: "Evaluating a product for a commercial project",
      decision: "Whether to request a sample",
      desired_outcome: "Shortlist a suitable product",
      constraints: ["Application and quantity must be confirmed"],
      questions: ["Does this product fit the intended application?"],
    },
    primary_answer: {
      statement: "The product is suitable for the verified application range.",
      buyer_value: "The buyer can decide whether a sample is worth requesting.",
      reason: "The application and product form are documented.",
      scope: "Final fit depends on the project requirements.",
    },
    value_translations: [
      {
        id: "value-1",
        source_fact: "Verified application range",
        buyer_requirement: "Match product to project use",
        buyer_value: "Avoid sampling an unsuitable option",
        evidence_refs: ["claim-1"],
        priority: "primary",
      },
    ],
    objections: [
      {
        id: "objection-1",
        question: "Can the supplier confirm the requested option?",
        why_it_blocks: "The buyer cannot finalize a sample request without it.",
        response: "Provide the application and option requirement for confirmation.",
        evidence_refs: ["claim-1"],
        status: "answered",
      },
    ],
    boundary: {
      fit: ["Verified application range"],
      not_fit: ["Uses outside the verified range"],
      conditions: ["Confirm project requirements before ordering"],
      needs_confirmation: [],
    },
    next_step: {
      goal: "Request a sample review",
      cta_label: "Request a quote",
      cta_url: "/pages/request-a-quote",
      commitment: "low",
      buyer_inputs: ["application", "quantity", "required option"],
      buyer_receives: "Fit and sample follow-up",
    },
    evidence: [
      {
        id: "demand-1",
        kind: "demand",
        supports: ["buyer.questions"],
        source_ref: "data-center/gsc_queries.csv",
        status: "verified",
        verified_at: "2026-07-01T08:00:00+08:00",
      },
      {
        id: "claim-1",
        kind: "claim",
        supports: [
          "primary_answer",
          "value_translations.value-1",
          "objections.objection-1.response",
        ],
        source_ref: "inbox/products/example/source-notes.md",
        status: "merchant_confirmed",
        verified_at: "2026-07-01T08:00:00+08:00",
      },
    ],
    unresolved: [],
  };
}

test("valid decision brief passes all five readiness checks", () => {
  const result = validateDecisionBrief(validBrief(), {
    expectedSurface: "pdp",
    approvedCtaLabel: "Request a quote",
  });
  assert.equal(result.ok, true);
  assert.equal(result.status, "pass");
  assert.deepEqual(result.checks, {
    relevance: "pass",
    clarity: "pass",
    credibility: "pass",
    risk_boundary: "pass",
    next_step: "pass",
  });
});

test("demand evidence cannot support a product claim", () => {
  const brief = validBrief();
  brief.evidence[1].kind = "demand";
  const result = validateDecisionBrief(brief);
  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.match(result.errors.join(" "), /Demand evidence/);
});

test("claim evidence must explicitly support the field that cites it", () => {
  const brief = validBrief();
  brief.evidence[1].supports = ["primary_answer"];
  const result = validateDecisionBrief(brief);
  assert.equal(result.status, "blocked");
  assert.match(
    result.errors.join(" "),
    /does not declare support for value_translations\.value-1/,
  );
  assert.match(
    result.errors.join(" "),
    /does not declare support for objections\.objection-1\.response/,
  );
});

test("blocking unresolved items stop write readiness", () => {
  const brief = validBrief();
  brief.unresolved.push({
    field_ref: "primary_answer.statement",
    question: "Which application range is merchant-confirmed?",
    blocking: true,
  });
  const result = validateDecisionBrief(brief);
  assert.equal(result.status, "blocked");
  assert.match(result.errors.join(" "), /blocking unresolved/i);
});

test("incomplete fit boundary returns fix instead of pass", () => {
  const brief = validBrief();
  brief.boundary.not_fit = [];
  const result = validateDecisionBrief(brief);
  assert.equal(result.ok, false);
  assert.equal(result.status, "fix");
  assert.equal(result.checks.risk_boundary, "fix");
});
