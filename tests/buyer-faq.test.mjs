import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildFaqTopicSeeds,
  routeBuyerFaqItemForOpsy,
  selectBuyerFaq,
  selectEligibleBuyerFaqAnswers,
  validateBuyerFaq,
  validateBuyerFaqFile,
} from "../skills/opsy/scripts/lib/buyer-faq.mjs";

function source(overrides = {}) {
  return {
    source_id: "faq-source-001",
    source_kind: "staff_faq_pack",
    title: "Sanitized sales FAQ",
    source_ref: "inbox/faq/2026-09-01/source-001.docx",
    contributor: "sales owner",
    observed_at: "2026-09-01T10:00:00+08:00",
    languages: ["en"],
    extraction_notes: "",
    file_sha256: "",
    ...overrides,
  };
}

function item(overrides = {}) {
  return {
    id: "sample-policy",
    canonical_question: "Can I request a sample?",
    variants: ["Can buyers request samples?"],
    scope: { type: "product_family", refs: ["sample-family"] },
    category: "sampling",
    decision_stage: "validate",
    buyer_roles: ["procurement"],
    question_status: "staff_reported",
    source_refs: ["faq-source-001#Q1"],
    answer: {
      draft_answer: "A sample may be available after application and delivery details are confirmed.",
      answer_status: "staff_supplied",
      claim_refs: [],
      unresolved_claims: ["sample availability and freight require merchant confirmation"],
    },
    content_use: "question_only",
    primary_route: "blog",
    routes: ["blog"],
    seo_geo_topics: ["sample request process"],
    conflict_refs: [],
    quarantine_refs: [],
    notes: "",
    ...overrides,
  };
}

function buyerFaq(items = [item()], overrides = {}) {
  return {
    schema_version: "buyer-faq-v1",
    status: "draft",
    generated_at: "2026-09-01T11:00:00+08:00",
    last_reviewed_at: null,
    reviewed_by: "",
    source_summary: "Sales FAQ intake",
    sources: [source()],
    audience_signals: [],
    faq_items: items,
    conflicts: [],
    quarantine: [],
    ...overrides,
  };
}

test("buyer-faq-v1 preserves question evidence separately from answer eligibility", () => {
  const result = validateBuyerFaq(buyerFaq());
  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(result.artifact_status, "draft");
  assert.equal(result.item_count, 1);
  assert.equal(result.route_counts.blog, 1);
  assert.match(result.warnings.map((finding) => finding.code).join(" "), /review_pending/);
});

test("staff-reported question_only row can seed a non-numeric Blog cold start", () => {
  const result = buildFaqTopicSeeds(buyerFaq(), {
    language: "en",
    scopeKeys: ["sample-family"],
  });
  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(result.status, "ready");
  assert.equal(result.rows[0].item_id, "sample-policy");
  assert.equal(result.rows[0].answer_reuse_allowed, false);
  assert.equal(result.rows[0].numeric_demand_claim, false);
  assert.equal(result.rows[0].faq_ref, "config/buyer_faq.json#sample-policy");
});

test("safe FAQ selection never exposes a non-eligible draft answer", () => {
  const result = selectBuyerFaq(buyerFaq(), {
    surface: "blog",
    language: "en",
    scopeKeys: ["sample-family"],
  });
  assert.equal(result.schema_version, "faq-selection-v1");
  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(result.items[0].answer_use, "confirmation_only");
  assert.equal(result.items[0].eligible_answer, null);
  assert.equal(JSON.stringify(result).includes("A sample may be available"), false);
});

test("Product may explicitly consume supporting routes while Blog stays primary-only", () => {
  const payload = buyerFaq([
    item({
      primary_route: "page",
      routes: ["page", "pdp"],
    }),
  ]);
  const primaryOnly = selectBuyerFaq(payload, {
    surface: "product",
    language: "en",
    scopeKeys: ["sample-family"],
  });
  assert.equal(primaryOnly.status, "empty");

  const withSupporting = selectBuyerFaq(payload, {
    surface: "product",
    language: "en",
    scopeKeys: ["sample-family"],
    includeSupporting: true,
  });
  assert.equal(withSupporting.status, "ready");
  assert.equal(withSupporting.items[0].route_role, "supporting");

  const invalidBlog = selectBuyerFaq(payload, {
    surface: "blog",
    includeSupporting: true,
  });
  assert.equal(invalidBlog.ok, false);
  assert.equal(invalidBlog.status, "supporting_not_allowed");
});

test("simulated questions and mismatched languages do not seed Blog topics", () => {
  const simulated = buildFaqTopicSeeds(
    buyerFaq([item({ question_status: "simulated", source_refs: [] })]),
    { language: "en", scopeKeys: ["sample-family"] },
  );
  assert.equal(simulated.status, "empty");

  const wrongLanguage = buildFaqTopicSeeds(
    buyerFaq(),
    { language: "zh-CN", scopeKeys: ["sample-family"] },
  );
  assert.equal(wrongLanguage.status, "empty");

  const unknownLanguage = buildFaqTopicSeeds(
    buyerFaq([item()], { sources: [source({ languages: [] })] }),
    { language: "en", scopeKeys: ["sample-family"] },
  );
  assert.equal(unknownLanguage.status, "empty");
});

test("only eligible answers may be reused as facts", () => {
  const eligible = item({
    content_use: "eligible",
    answer: {
      draft_answer: "Samples are available after the application and delivery details are confirmed.",
      answer_status: "merchant_confirmed",
      claim_refs: ["merchant-review/2026-09-01#sample-policy"],
      unresolved_claims: [],
    },
  });
  const selected = selectEligibleBuyerFaqAnswers(buyerFaq([eligible]), {
    handler: "blog",
    language: "en",
    scopeKeys: ["sample-family"],
  });
  assert.equal(selected.ok, true, JSON.stringify(selected, null, 2));
  assert.equal(selected.items.length, 1);
  assert.equal(
    selected.items[0].eligible_answer,
    "Samples are available after the application and delivery details are confirmed.",
  );

  const invalid = buyerFaq([item({ content_use: "eligible" })]);
  const result = validateBuyerFaq(invalid);
  assert.equal(result.ok, false);
  assert.match(result.errors.map((finding) => finding.code).join(" "), /eligible_answer_status eligible_unresolved/);
});

test("Opsy routes unsupported Page and FAQ Hub owners to provider handoff", () => {
  for (const route of ["page", "collection", "faq_hub"]) {
    const routed = routeBuyerFaqItemForOpsy(item({ primary_route: route, routes: [route] }));
    assert.equal(routed.handler, "provider_handoff", route);
  }
  assert.equal(routeBuyerFaqItemForOpsy(item({ primary_route: "pdp", routes: ["pdp"] })).handler, "product");
});

test("conflicts, quarantine, and audience signals remain explicit", () => {
  const conflictItems = [
    item({ id: "warranty-a", canonical_question: "How long is the warranty?", category: "warranty", conflict_refs: ["warranty-conflict"] }),
    item({ id: "warranty-b", canonical_question: "What warranty applies?", category: "warranty", conflict_refs: ["warranty-conflict"] }),
    item({
      id: "copied-claim",
      canonical_question: "Is this a competitor product?",
      content_use: "quarantined",
      primary_route: "",
      routes: [],
      quarantine_refs: ["copied-claim-row"],
    }),
  ];
  const payload = buyerFaq(conflictItems, {
    conflicts: [{ id: "warranty-conflict", topic: "warranty duration", item_refs: ["warranty-a", "warranty-b"], status: "open", notes: "" }],
    quarantine: [{
      id: "copied-claim-row",
      source_ref: "faq-source-001#Q9",
      reason: "competitor_contamination",
      disposition: "excluded",
      text_excerpt: "competitor product",
      notes: "",
    }],
    audience_signals: [{
      id: "procurement-signal",
      label: "Procurement evaluates warranty scope",
      buyer_roles: ["procurement"],
      decision_stages: ["validate"],
      faq_refs: ["warranty-a", "warranty-b"],
      status: "hypothesis",
      evidence_limit: "Staff FAQs do not prove buyer frequency or search demand.",
    }],
  });
  const result = validateBuyerFaq(payload);
  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(result.conflict_count, 1);
  assert.equal(result.quarantine_count, 1);
  assert.equal(result.signal_count, 1);
});

test("open conflicts keep questions usable but block eligible answer reuse", () => {
  const conflict = {
    id: "warranty-conflict",
    topic: "warranty duration",
    item_refs: ["warranty-a", "warranty-b"],
    status: "open",
    notes: "",
  };
  const questionItems = [
    item({ id: "warranty-a", canonical_question: "How long is the warranty?", conflict_refs: ["warranty-conflict"] }),
    item({ id: "warranty-b", canonical_question: "What warranty applies?", conflict_refs: ["warranty-conflict"] }),
  ];
  const questionPayload = buyerFaq(questionItems, { conflicts: [conflict] });
  const selection = selectBuyerFaq(questionPayload, { surface: "blog", language: "en" });
  assert.equal(selection.ok, true, JSON.stringify(selection, null, 2));
  assert.equal(selection.items.length, 2);

  const answerPayload = buyerFaq([
    item({
      id: "warranty-a",
      canonical_question: "How long is the warranty?",
      conflict_refs: ["warranty-conflict"],
      content_use: "eligible",
      answer: {
        draft_answer: "The warranty is merchant confirmed.",
        answer_status: "merchant_confirmed",
        claim_refs: ["merchant-review#W1"],
        unresolved_claims: [],
      },
    }),
    questionItems[1],
  ], { conflicts: [conflict] });
  const validation = validateBuyerFaq(answerPayload);
  assert.equal(validation.ok, false);
  assert.match(validation.errors.map((finding) => finding.code).join(" "), /eligible_open_conflict/);
});

test("CLI validates buyer_faq.json and exposes Blog seeds", () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "opsy-buyer-faq-"));
  try {
    const workspace = path.join(project, "shopify-ops");
    const config = path.join(workspace, "config");
    fs.mkdirSync(config, { recursive: true });
    fs.writeFileSync(path.join(project, "shopify-ops.json"), JSON.stringify({ workspace: "shopify-ops" }), "utf8");
    fs.writeFileSync(
      path.join(config, "store-profile.json"),
      JSON.stringify({ profile: { store_role: { content_language: "en" } } }),
      "utf8",
    );
    const faqPath = path.join(config, "buyer_faq.json");
    fs.writeFileSync(faqPath, JSON.stringify(buyerFaq()), "utf8");
    assert.equal(validateBuyerFaqFile(faqPath).ok, true);

    const validate = spawnSync(
      process.execPath,
      [path.resolve("skills/opsy/scripts/opsy.mjs"), "validate-buyer-faq", "--file", faqPath, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(validate.status, 0, validate.stderr);
    assert.equal(JSON.parse(validate.stdout).artifact_status, "draft");

    const suggest = spawnSync(
      process.execPath,
      [path.resolve("skills/opsy/scripts/opsy.mjs"), "suggest-faq-topics", "--project", project, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(suggest.status, 0, suggest.stderr);
    assert.equal(JSON.parse(suggest.stdout).rows[0].item_id, "sample-policy");

    const select = spawnSync(
      process.execPath,
      [
        path.resolve("skills/opsy/scripts/opsy.mjs"),
        "select-faq",
        "--project",
        project,
        "--surface",
        "blog",
        "--scope",
        "sample-family",
        "--json",
      ],
      { encoding: "utf8" },
    );
    assert.equal(select.status, 0, select.stderr);
    const selection = JSON.parse(select.stdout);
    assert.equal(selection.schema_version, "faq-selection-v1");
    assert.equal(selection.items[0].faq_ref, "config/buyer_faq.json#sample-policy");
    assert.equal(JSON.stringify(selection).includes("A sample may be available"), false);
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});
