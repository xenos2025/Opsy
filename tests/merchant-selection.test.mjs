import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveAudienceCard,
  validateAudienceCard,
  validatePlacement,
  validateTopicQueue,
} from "../skills/opsy/scripts/lib/merchant-selection.mjs";

const confirmedAt = "2026-09-01T09:00:00Z";

function profile() {
  return {
    profile: {
      store_role: {
        status: "ready",
        primary_audience: "Procurement engineers",
        primary_market: "United States",
        content_language: "en",
        audience_status: "merchant_confirmed",
      },
      merchant_context: { product_families: ["Industrial components"] },
    },
  };
}

test("implicit profile-primary is selected without intake even when family labels differ", () => {
  const result = resolveAudienceCard({
    profile: profile(),
    task: { surface: "blog", scopeKeys: ["industrial-components"], market: "United States", language: "en" },
  });
  assert.equal(result.card?.id, "profile-primary");
  assert.equal(result.pending.length, 0);
});

test("merchant_materials queues stay empty and named", () => {
  const errors = validateTopicQueue(
    {
      schema_version: "opsy-topic-queue-v1",
      source: "merchant_materials",
      selectionMode: "merchant_materials",
      merchantConfirmed: true,
      confirmedAt,
      rows: [],
      nonUseReason: "No delivered snapshot",
    },
    { surface: "product", selectionMode: "merchant_materials" },
  );
  assert.deepEqual(errors, []);
});

test("FAQ-seeded rows cannot invent search metrics", () => {
  const errors = validateTopicQueue(
    {
      schema_version: "opsy-topic-queue-v1",
      source: "suggest-faq-topics",
      selectionMode: "faq_seeded",
      merchantConfirmed: true,
      confirmedAt,
      rows: [
        {
          query: "compare industrial components",
          route_hint: "blog",
          faq_ref: "faq-compare-inputs",
          evidence_refs: ["config/buyer_faq.json#faq-compare-inputs"],
          selection_status: "selected",
          impressions: 12,
        },
      ],
    },
    { surface: "blog", selectionMode: "faq_seeded" },
  );
  assert.ok(errors.some((item) => item.code === "faq_seeded_metrics"));
});

test("placement requires the query in named carriers and rejects own-URL occupation", () => {
  const missing = validatePlacement(
    {
      schema_version: "opsy-placement-v1",
      primary: { query: "missing query", carriers: ["title"] },
      doNotOccupy: ["/blogs/news/compare-industrial-components"],
    },
    {
      surface: "blog",
      title: "How to Compare Industrial Components",
      seoTitle: "Compare Industrial Components",
      seoDescription: "Compare application fit",
      body: "<h2>What should buyers compare?</h2><p>Start with application fit.</p>",
      ownUrls: ["/blogs/news/compare-industrial-components"],
    },
  );
  assert.ok(missing.some((item) => item.code === "placement_missing"));
  assert.ok(missing.some((item) => item.code === "placement_conflict"));
});

test("profile audience cards must still match the confirmed store-role summary", () => {
  const errors = validateAudienceCard(
    { id: "profile-primary", source: "profile", label: "Other buyers", market: "United States", language: "en" },
    { profile: profile(), surface: "blog" },
  );
  assert.ok(errors.some((item) => item.code === "audience_card"));
});
