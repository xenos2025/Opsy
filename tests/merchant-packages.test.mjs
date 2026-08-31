import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  validateBlogPackage,
  validateNextActions,
  validateProductPackage,
} from "../skills/opsy/scripts/lib/merchant-packages.mjs";
import { summarizeMerchantContext } from "../skills/opsy/scripts/lib/workspace.mjs";

function profile() {
  return {
    store: {
      primary_domain: "example.com",
      iana_timezone: "Asia/Shanghai",
    },
    profile: {
      primary_inquiry_cta: "Request a quote",
      store_role: {
        status: "ready",
        business_model: "b2b_inquiry",
        industry: "Industrial components",
        primary_audience: "Procurement engineers",
        secondary_audiences: [],
        primary_market: "United States",
        content_language: "en",
        conversion_goal: "Quote request",
        audience_status: "merchant_confirmed",
        audience_intake_path: null,
      },
      content_voice: {
        status: "ready",
        role: "We are sales engineers helping buyers confirm fit",
        must_not: ["Invent certifications"],
      },
      merchant_context: {
        status: "ready",
        product_families: ["Industrial components"],
        buyer_roles: ["Procurement engineer"],
        sales_questions: ["Does this fit the intended application?"],
        purchase_objections: ["Fit and lead time need confirmation"],
        confirmed_commercial_facts: ["Samples require application details"],
        restricted_claims: ["Do not claim certifications without documents"],
        product_owner: "Operations",
        content_owner: "Sales",
        publication_approver: "Owner",
        updated_at: "2026-08-31T12:00:00+08:00",
      },
      metafield_definitions: [
        {
          owner_type: "PRODUCT",
          namespace: "custom",
          key: "application",
          type: "single_line_text_field",
        },
      ],
    },
  };
}

function blogDataCenterValidation() {
  return {
    ok: true,
    manifest_path: "shopify-ops/data-center/manifest.json",
    errors: [],
    warnings: [],
    datasets: [
      { name: "gsc_queries", errors: [], warnings: [] },
      { name: "ga4_landing_pages", errors: [], warnings: [] },
    ],
  };
}

function emptyDataCenterValidation() {
  return {
    ok: true,
    manifest_path: "shopify-ops/data-center/manifest.json",
    errors: [],
    warnings: ["manifest contains no active datasets"],
    datasets: [],
  };
}

function buyerFaq(itemOverrides = {}) {
  return {
    schema_version: "buyer-faq-v1",
    status: "draft",
    generated_at: "2026-09-01T09:00:00+08:00",
    last_reviewed_at: null,
    reviewed_by: "",
    source_summary: "Sanitized sales FAQ intake",
    sources: [
      {
        source_id: "faq-source-001",
        source_kind: "staff_faq_pack",
        title: "Sanitized sales FAQ",
        source_ref: "inbox/faq/2026-09-01/source-001.docx",
        contributor: "sales owner",
        observed_at: "2026-09-01T08:00:00+08:00",
        languages: ["en"],
        extraction_notes: "",
        file_sha256: "",
      },
    ],
    audience_signals: [],
    faq_items: [
      {
        id: "faq-compare-inputs",
        canonical_question: "What should buyers compare before requesting a quote?",
        variants: [],
        scope: { type: "product_family", refs: ["industrial-components"] },
        category: "comparison",
        decision_stage: "evaluate",
        buyer_roles: ["procurement"],
        question_status: "staff_reported",
        source_refs: ["faq-source-001#Q1"],
        answer: {
          draft_answer: "Compare application fit, required proof, and the inputs needed for supplier confirmation.",
          answer_status: "staff_supplied",
          claim_refs: [],
          unresolved_claims: ["Merchant confirmation is required before publishing the answer."],
        },
        content_use: "question_only",
        primary_route: "blog",
        routes: ["blog"],
        seo_geo_topics: ["industrial component comparison"],
        conflict_refs: [],
        quarantine_refs: [],
        notes: "",
        ...itemOverrides,
      },
      {
        id: "faq-product-fit",
        canonical_question: "What should a buyer provide for a product fit review?",
        variants: [],
        scope: { type: "product_family", refs: ["industrial-components"] },
        category: "application",
        decision_stage: "validate",
        buyer_roles: ["procurement"],
        question_status: "staff_reported",
        source_refs: ["faq-source-001#Q2"],
        answer: {
          draft_answer: "Provide the application, quantity, and required option.",
          answer_status: "staff_supplied",
          claim_refs: [],
          unresolved_claims: ["Merchant confirmation is required before publishing the answer."],
        },
        content_use: "question_only",
        primary_route: "pdp",
        routes: ["pdp"],
        seo_geo_topics: [],
        conflict_refs: [],
        quarantine_refs: [],
        notes: "",
      },
    ],
    conflicts: [],
    quarantine: [],
  };
}

function validateBlogForTest(payload, options = {}) {
  return validateBlogPackage(payload, {
    profile: profile(),
    mode: "write",
    dataCenterValidation: blogDataCenterValidation(),
    buyerFaq: buyerFaq(),
    ...options,
  });
}

function writeBlogDataCenter(project) {
  const directory = path.join(project, "shopify-ops", "data-center");
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(
    path.join(directory, "gsc_queries.csv"),
    "query,clicks,ctr,impressions,position\ncompare industrial components,4,0.04,100,8\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(directory, "ga4_landing_pages.csv"),
    "landingPagePlusQueryString,sessions,engagedSessions\n/blogs/news/compare-industrial-components,20,12\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(directory, "manifest.json"),
    JSON.stringify({
      schema_version: "data-center-manifest-v1",
      datasets: {
        gsc_queries: {
          path: "gsc_queries.csv",
          source_channel: "provider delivery",
          scope: "example property",
          date_range: { start_date: "2026-08-01", end_date: "2026-08-31" },
          timezone: "Asia/Shanghai",
          pulled_at: "2026-09-01T08:00:00+08:00",
          row_count: 1,
          columns: ["query", "clicks", "ctr", "impressions", "position"],
        },
        ga4_landing_pages: {
          path: "ga4_landing_pages.csv",
          source_channel: "provider delivery",
          scope: "example property",
          date_range: { start_date: "2026-08-01", end_date: "2026-08-31" },
          timezone: "Asia/Shanghai",
          pulled_at: "2026-09-01T08:00:00+08:00",
          row_count: 1,
          columns: ["landingPagePlusQueryString", "sessions", "engagedSessions"],
        },
      },
      updated_at: "2026-09-01T08:00:00+08:00",
    }),
    "utf8",
  );
}

function decisionBrief(surface = "pdp") {
  return {
    schema_version: "opsy-decision-brief-v1",
    surface,
    decision_stage: "evaluate",
    buyer: {
      role: "Procurement engineer",
      situation: "Evaluating an industrial component for a named application",
      decision: surface === "pdp" ? "Whether to request a sample" : "How to compare suitable options",
      desired_outcome: "Choose a suitable next step",
      constraints: ["Application and quantity must be confirmed"],
      questions: ["Does this fit the intended application?"],
    },
    primary_answer: {
      statement: "Use the verified application requirements to shortlist the option.",
      buyer_value: "The buyer avoids requesting an unsuitable sample.",
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
        why_it_blocks: "The buyer cannot finalize a request without it.",
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
      goal: "Request a fit review",
      cta_label: "Request a quote",
      cta_url: "/pages/request-a-quote",
      commitment: "low",
      buyer_inputs: ["application", "quantity", "required option"],
      buyer_receives: "Fit and sample follow-up",
    },
    evidence: [
      {
        id: "claim-1",
        kind: "claim",
        supports: [
          "primary_answer",
          "value_translations.value-1",
          "objections.objection-1.response",
        ],
        source_ref: "inbox/source-notes.md",
        status: "merchant_confirmed",
        verified_at: "2026-08-31T12:00:00+08:00",
      },
    ],
    unresolved: [],
  };
}

function productPackage() {
  return {
    schema_version: "opsy-product-package-v1",
    title: "Precision Industrial Component for OEM Assembly",
    handle: "precision-industrial-component-oem-assembly",
    vendor: "Example",
    status: "DRAFT",
    productType: "Industrial component",
    descriptionHtml:
      "<p>We help procurement engineers confirm whether this component fits the documented application before requesting a sample.</p><h2>Specifications</h2><ul><li>Application: OEM assembly</li></ul><h2>Common Questions</h2><p><strong>What is this best used for?</strong></p><p>Use it only for the documented application range.</p><p><strong>What should a buyer provide?</strong></p><p>Provide the application, quantity, and required option.</p>",
    seo: {
      title: "Precision Industrial Component for OEM Assembly",
      description: "Review the documented application and prepare the details needed for a fit, sample, or quote request.",
    },
    tags: ["b2b"],
    collections: ["all"],
    variant: { sku: "EXAMPLE-1", price: "0.00" },
    metafields: { "custom.application": "OEM assembly" },
    media: [
      {
        path: "inbox/products/example/front-overview.jpg",
        role: "front_overview",
        alt: "Precision industrial component front overview",
      },
    ],
    sourceFacts: {
      sourceBasis: {
        mode: "merchant_materials",
        references: [
          "inbox/products/example/source-notes.md",
          "config/buyer_faq.json#faq-product-fit",
        ],
      },
      scopeKeys: ["industrial-components"],
      faqReview: {
        status: "applied",
        itemIds: ["faq-product-fit"],
        uses: ["buyer_question", "confirmation_item"],
        rationale: "The staff-reported question shapes the PDP question and inquiry inputs; its draft answer is not reused as a public fact.",
      },
      titleCandidates: [
        "Precision Industrial Component for OEM Assembly",
        "OEM Assembly Precision Industrial Component",
      ],
      titleChoice: "Precision Industrial Component for OEM Assembly",
      decisionBrief: decisionBrief("pdp"),
    },
  };
}

function blogPackage() {
  return {
    schema_version: "opsy-blog-package-v1",
    sourceBasis: {
      mode: "delivered_data",
      references: [
        "data-center/manifest.json",
        "data-center/gsc_queries.csv",
        "data-center/ga4_landing_pages.csv",
      ],
      dataWindow: { startDate: "2026-08-01", endDate: "2026-08-31" },
      timezone: "Asia/Shanghai",
    },
    topic: {
      selectionMode: "data_backed",
      primaryCluster: "how to compare industrial components",
      intentClass: "informational",
      articleFormat: "comparison",
      selectionBasis: "data_center_queue",
      scopeKeys: ["industrial-components"],
      commercialTargetUrl: "https://example.com/collections/components",
      createOrUpdate: "create",
      duplicateCheck: "clear",
      metrics: {},
      evidenceRefs: [
        "data-center/gsc_queries.csv",
        "data-center/ga4_landing_pages.csv",
        "config/buyer_faq.json#faq-compare-inputs",
      ],
      faqReview: {
        status: "applied",
        itemIds: ["faq-compare-inputs"],
        influence: ["cluster_expansion", "buyer_angle", "fan_out"],
        rationale: "The accepted sales question added comparison inputs and a buyer-question angle without changing the data rank or authorizing its answer.",
      },
    },
    buyerDecision: decisionBrief("blog"),
    article: {
      title: "How to Compare Industrial Components for OEM Assembly",
      handle: "compare-industrial-components-oem-assembly",
      summary: "A buyer-focused comparison of application fit, proof, and inquiry inputs.",
      bodyHtml:
        "<p>Start with application fit, required proof, and the information a supplier needs to answer clearly.</p><h2>What application must the component support?</h2><p>The application defines the first fit boundary and the facts that need confirmation.</p><h2>Which evidence should buyers compare?</h2><p>Compare documented facts rather than unsupported claims.</p><table><tr><th>Check</th><th>Buyer use</th></tr><tr><td>Application</td><td>Confirms fit</td></tr></table><p><img src=\"https://cdn.shopify.com/s/files/1/0000/guide-1.jpg\" alt=\"Application comparison\"></p><p><img src=\"https://cdn.shopify.com/s/files/1/0000/guide-2.jpg\" alt=\"Evidence checklist\"></p><p><a href=\"https://example.com/collections/components\">Review components</a> and <a href=\"https://example.com/pages/request-a-quote\">request a quote</a>.</p>",
      seoTitle: "Compare Industrial Components for OEM Assembly",
      metaDescription: "Compare application fit, documented proof, and inquiry inputs before shortlisting an industrial component for OEM assembly.",
      tags: ["comparison", "procurement"],
      featuredImage: {
        url: "https://cdn.shopify.com/s/files/1/0000/featured.jpg",
        alt: "Industrial component comparison guide",
      },
      internalLinks: [
        "https://example.com/collections/components",
        "https://example.com/pages/request-a-quote",
      ],
      cta: {
        label: "Request a quote",
        url: "https://example.com/pages/request-a-quote",
      },
    },
  };
}

test("merchant context reports a usable owner-operated profile", () => {
  const result = summarizeMerchantContext(profile());
  assert.equal(result.status, "ready");
  assert.deepEqual(result.missing, []);
});

test("product package passes without Google data when merchant evidence is named", () => {
  const result = validateProductPackage(productPackage(), {
    profile: profile(),
    mode: "draft",
    buyerFaq: buyerFaq(),
  });
  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
});

test("Product accepts explicitly routed supporting FAQ questions but not their answers", () => {
  const faq = buyerFaq();
  const productItem = faq.faq_items.find((item) => item.id === "faq-product-fit");
  productItem.primary_route = "page";
  productItem.routes = ["page", "pdp"];

  const questionResult = validateProductPackage(productPackage(), {
    profile: profile(),
    mode: "draft",
    buyerFaq: faq,
  });
  assert.equal(questionResult.ok, true, JSON.stringify(questionResult, null, 2));

  productItem.content_use = "eligible";
  productItem.answer = {
    draft_answer: "Provide the application, quantity, and required option.",
    answer_status: "merchant_confirmed",
    claim_refs: ["merchant-review#faq-product-fit"],
    unresolved_claims: [],
  };
  const payload = productPackage();
  payload.sourceFacts.faqReview.uses = ["answer_fact"];
  const answerResult = validateProductPackage(payload, {
    profile: profile(),
    mode: "draft",
    buyerFaq: faq,
  });
  assert.equal(answerResult.ok, false);
  assert.match(answerResult.errors.map((item) => item.code).join(" "), /faq_answer_ineligible/);
});

test("product package blocks metafields absent from the verified profile", () => {
  const payload = productPackage();
  payload.metafields["custom.certification"] = "Certified";
  const result = validateProductPackage(payload, {
    profile: profile(),
    mode: "draft",
    buyerFaq: buyerFaq(),
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.map((item) => item.message).join(" "), /metafield definition/i);
});

test("product package rejects live Google source modes", () => {
  const payload = productPackage();
  payload.sourceFacts.sourceBasis.mode = "live_ga4";
  const result = validateProductPackage(payload, {
    profile: profile(),
    mode: "draft",
    buyerFaq: buyerFaq(),
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.map((item) => item.code).join(" "), /live_google_forbidden/);
});

test("blog package passes from a validated local data-center without Google API", () => {
  const result = validateBlogForTest(blogPackage(), {
    now: new Date("2026-08-31T12:00:00+08:00"),
  });
  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(result.data_center_status, "ready");
  assert.equal(result.faq_selection_status, "applied");
});

test("accepted FAQ question evidence can seed a cold-start Blog topic without search metrics", () => {
  const payload = blogPackage();
  payload.sourceBasis = {
    mode: "faq_seeded",
    references: ["config/buyer_faq.json"],
  };
  payload.topic.selectionMode = "faq_seeded";
  payload.topic.selectionBasis = "accepted_faq_question_cold_start";
  payload.topic.evidenceRefs = ["config/buyer_faq.json#faq-compare-inputs"];
  payload.topic.metrics = {};
  payload.topic.faqReview.influence = ["cluster_seed", "buyer_angle", "fan_out"];
  payload.topic.faqReview.rationale =
    "The accepted sales question is the cold-start topic seed; no search-demand score is claimed and its draft answer is not treated as a fact.";
  const result = validateBlogForTest(payload, {
    dataCenterValidation: emptyDataCenterValidation(),
  });
  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(result.topic_source_status, "faq_seeded");
  assert.equal(result.data_center_status, "scoring_blocked");
});

test("FAQ-seeded Blog topics cannot invent search metrics", () => {
  const payload = blogPackage();
  payload.sourceBasis = {
    mode: "faq_seeded",
    references: ["config/buyer_faq.json"],
  };
  payload.topic.selectionMode = "faq_seeded";
  payload.topic.selectionBasis = "accepted_faq_question_cold_start";
  payload.topic.evidenceRefs = ["config/buyer_faq.json#faq-compare-inputs"];
  payload.topic.metrics = { impressions: 100 };
  payload.topic.faqReview.influence = ["cluster_seed"];
  const result = validateBlogForTest(payload, {
    mode: "review",
    dataCenterValidation: emptyDataCenterValidation(),
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.map((item) => item.code).join(" "), /faq_seeded_metrics/);
});

test("Blog topic influence rejects a simulated FAQ question", () => {
  const result = validateBlogForTest(blogPackage(), {
    mode: "review",
    buyerFaq: buyerFaq({ question_status: "simulated", source_refs: [] }),
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.map((item) => item.code).join(" "), /faq_item_ineligible/);
});

test("Blog topic influence rejects a mismatched FAQ scope", () => {
  const result = validateBlogForTest(blogPackage(), {
    mode: "review",
    buyerFaq: buyerFaq({
      scope: { type: "product_family", refs: ["another-family"] },
    }),
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.map((item) => item.code).join(" "), /faq_item_ineligible/);
});

test("Blog does not turn a supporting FAQ route into a topic owner", () => {
  const result = validateBlogForTest(blogPackage(), {
    mode: "review",
    buyerFaq: buyerFaq({
      primary_route: "page",
      routes: ["page", "blog"],
    }),
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.map((item) => item.code).join(" "), /faq_item_ineligible/);
});

test("data-backed Blog selection cannot relabel an FAQ as the demand seed", () => {
  const payload = blogPackage();
  payload.topic.faqReview.influence = ["cluster_seed"];
  const result = validateBlogForTest(payload, { mode: "review" });
  assert.equal(result.ok, false);
  assert.match(result.errors.map((item) => item.code).join(" "), /faq_data_boundary/);
});

test("blog package blocks when data-center is missing", () => {
  const result = validateBlogPackage(blogPackage(), {
    profile: profile(),
    mode: "review",
  });
  assert.equal(result.ok, false);
  assert.equal(result.data_center_status, "scoring_blocked");
  assert.match(result.errors.map((item) => item.code).join(" "), /data_center_invalid/);
});

test("blog package requires GSC and GA4 evidence references", () => {
  const payload = blogPackage();
  payload.topic.evidenceRefs = ["data-center/gsc_queries.csv"];
  const result = validateBlogForTest(payload, {
    mode: "review",
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.map((item) => item.message).join(" "), /ga4_landing_pages/i);
});

test("blog write-ready blocks text-only packages", () => {
  const payload = blogPackage();
  payload.article.featuredImage = null;
  payload.article.bodyHtml = payload.article.bodyHtml.replace(/<img\b[^>]*>/gi, "");
  const result = validateBlogForTest(payload);
  assert.equal(result.ok, false);
  assert.match(result.errors.map((item) => item.message).join(" "), /featured image|inline images/i);
});

test("blog package accepts site-relative internal links and blocks guessed handles", () => {
  const payload = blogPackage();
  payload.article.internalLinks = [
    "/collections/components",
    "/pages/request-a-quote",
  ];
  assert.equal(
    validateBlogForTest(payload).ok,
    true,
  );
  payload.article.internalLinks[1] = "guessed-handle";
  const invalid = validateBlogForTest(payload);
  assert.equal(invalid.ok, false);
  assert.match(invalid.errors.map((item) => item.code).join(" "), /internal_link_url/);
});

test("simplified coach accepts exactly three concrete actions", () => {
  const result = validateNextActions({
    schema_version: "opsy-next-actions-v1",
    period: "2026-09-01",
    actions: [1, 2, 3].map((id) => ({
      id: String(id),
      action: `Confirm source material for item ${id}`,
      owner: id === 1 ? "sales" : "operations",
      target: `item-${id}`,
      source: "config/business-questionnaire.md",
      due: `2026-09-0${id}`,
      done_when: `Item ${id} has a named source and owner confirmation`,
      risk: "none",
    })),
  });
  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
});

test("simplified coach rejects backlog dumps", () => {
  const payload = {
    schema_version: "opsy-next-actions-v1",
    period: "2026-09-01",
    actions: [1, 2, 3, 4].map((id) => ({ id: String(id) })),
  };
  const result = validateNextActions(payload);
  assert.equal(result.ok, false);
  assert.match(result.errors.map((item) => item.message).join(" "), /exactly three/i);
});

test("CLI exposes the exactly-three action validator", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "opsy-actions-"));
  try {
    const file = path.join(directory, "actions.json");
    fs.writeFileSync(
      file,
      JSON.stringify({
        schema_version: "opsy-next-actions-v1",
        period: "2026-09-01",
        actions: [1, 2, 3].map((id) => ({
          id: String(id),
          action: `Confirm source material for item ${id}`,
          owner: "operations",
          target: `item-${id}`,
          source: "config/business-questionnaire.md",
          due: `2026-09-0${id}`,
          done_when: `Item ${id} has owner-confirmed evidence`,
          risk: "none",
        })),
      }),
      "utf8",
    );
    const command = spawnSync(
      process.execPath,
      [
        path.resolve("skills/opsy/scripts/opsy.mjs"),
        "validate-next-actions",
        "--file",
        file,
        "--json",
      ],
      { encoding: "utf8" },
    );
    assert.equal(command.status, 0, command.stderr);
    assert.equal(JSON.parse(command.stdout).ok, true);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("CLI validates Product and Blog packages against the project profile", () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), "opsy-packages-"));
  try {
    const configDirectory = path.join(project, "shopify-ops", "config");
    fs.mkdirSync(configDirectory, { recursive: true });
    fs.writeFileSync(
      path.join(project, "shopify-ops.json"),
      JSON.stringify({ workspace: "shopify-ops" }),
      "utf8",
    );
    fs.writeFileSync(
      path.join(configDirectory, "store-profile.json"),
      JSON.stringify(profile()),
      "utf8",
    );
    fs.writeFileSync(
      path.join(configDirectory, "buyer_faq.json"),
      JSON.stringify(buyerFaq()),
      "utf8",
    );
    writeBlogDataCenter(project);
    const fixtures = [
      ["product.json", productPackage(), "validate-product-package", "draft"],
      ["blog.json", blogPackage(), "validate-blog-package", "write"],
    ];
    for (const [name, payload, commandName, mode] of fixtures) {
      const file = path.join(project, name);
      fs.writeFileSync(file, JSON.stringify(payload), "utf8");
      const command = spawnSync(
        process.execPath,
        [
          path.resolve("skills/opsy/scripts/opsy.mjs"),
          commandName,
          "--project",
          project,
          "--file",
          file,
          "--mode",
          mode,
          "--json",
        ],
        { encoding: "utf8" },
      );
      assert.equal(command.status, 0, `${commandName}: ${command.stderr}`);
      assert.equal(JSON.parse(command.stdout).ok, true, commandName);
    }
  } finally {
    fs.rmSync(project, { recursive: true, force: true });
  }
});
