import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  validateAudienceIntake,
  validateAudienceIntakeFile,
} from "../skills/opsy/scripts/lib/audience-intake.mjs";

function intake(overrides = {}) {
  return {
    schema_version: "opsy-audience-intake-v1",
    generated_at: "2026-09-01T12:00:00+08:00",
    origin: { method: "merchant_wizard", generator_version: "1.0.0" },
    store: {
      business_model: "b2b_inquiry",
      industry: "Industrial components",
      primary_markets: ["United States"],
      content_languages: ["en"],
      product_families: ["sample-family"],
    },
    audiences: [
      {
        audience_id: "oem_procurement",
        label: "OEM procurement",
        company_type: "OEM manufacturer",
        product_lines: ["sample-family"],
        market_scope: ["United States"],
        decision_roles: [{ role_type: "procurement", title: "Procurement Manager" }],
        primary_job_to_be_done: "Qualify a supplier for an active sourcing project",
        buying_triggers: ["New project"],
        pain_points: ["Unclear lead time"],
        desired_outcomes: ["Comparable quote"],
        objections: ["Unverified performance claims"],
        alternatives: ["Existing supplier"],
        customer_language: ["Can you quote to this drawing?"],
        search_term_candidates: ["sample-family supplier for OEM"],
        product_scope_keys: ["sample-family"],
        blog_theme_candidates: ["supplier qualification checklist"],
        routes: ["product", "blog"],
        evidence_refs: ["ev-sales-01"],
        evidence_maturity: "first_party",
      },
    ],
    evidence_log: [
      {
        evidence_id: "ev-sales-01",
        source_type: "first_party_trade",
        source_ref: "inbox/profile/2026-09-01/sales-note-001.md",
        observed_at: "2026-08-31",
        audience_ids: ["oem_procurement"],
        theme: "role",
        verbatim: "Can you quote to this drawing?",
        context: "Retained RFQ note",
        prompted: false,
        bias_note: "One buyer record; no frequency claim.",
      },
    ],
    review: {
      status: "merchant_reviewed",
      reviewer: "sales owner",
      reviewed_at: "2026-09-01",
      notes: "Approved for Product and Blog planning.",
    },
    ...overrides,
  };
}

test("Opsy audience intake validates Product and Blog routes", () => {
  const result = validateAudienceIntake(intake());
  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(result.audience_count, 1);
  assert.equal(result.route_counts.product, 1);
  assert.equal(result.route_counts.blog, 1);
});

test("first_party maturity requires retained first-party evidence", () => {
  const payload = intake();
  payload.evidence_log[0].source_type = "merchant_interview";
  const result = validateAudienceIntake(payload);
  assert.equal(result.ok, false);
  assert.match(result.errors.map((finding) => finding.code).join(" "), /first_party_evidence_missing/);
});

test("unsupported routing cannot be hidden inside the Opsy intake", () => {
  const payload = intake();
  payload.audiences[0].routes = ["page"];
  const result = validateAudienceIntake(payload);
  assert.equal(result.ok, false);
  assert.match(result.errors.map((finding) => finding.code).join(" "), /routes/);
});

test("draft intake passes normal validation with warning and fails strict", () => {
  const payload = intake();
  payload.review = { status: "draft", reviewer: "", reviewed_at: "", notes: "" };
  assert.equal(validateAudienceIntake(payload).ok, true);
  assert.equal(validateAudienceIntake(payload, { strict: true }).ok, false);
});

test("CLI exposes the local wizard and validates downloaded JSON", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "opsy-audience-intake-"));
  try {
    const file = path.join(directory, "audience-intake.json");
    fs.writeFileSync(file, JSON.stringify(intake()), "utf8");
    assert.equal(validateAudienceIntakeFile(file).ok, true);

    const validate = spawnSync(
      process.execPath,
      [path.resolve("skills/opsy/scripts/opsy.mjs"), "validate-audience-intake", "--file", file, "--json"],
      { encoding: "utf8" },
    );
    assert.equal(validate.status, 0, validate.stderr);
    assert.equal(JSON.parse(validate.stdout).review_status, "merchant_reviewed");

    const wizard = spawnSync(
      process.execPath,
      [path.resolve("skills/opsy/scripts/opsy.mjs"), "audience-wizard", "--json"],
      { encoding: "utf8" },
    );
    assert.equal(wizard.status, 0, wizard.stderr);
    const result = JSON.parse(wizard.stdout);
    assert.equal(result.network_access, false);
    assert.equal(fs.existsSync(result.path), true);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
