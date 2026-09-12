import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { readProductTable } from "./product-table.mjs";

const hash = (s) => createHash("sha256").update(s).digest("hex");
const str = (v) => typeof v === "string" ? v.trim() : "";
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const fields = new Set(["group", "sku", "title", "handle", "vendor", "productType", "options", "images", "material", "certification", "moq", "leadTime", "price"]);
export const fingerprint = (value) => hash(JSON.stringify(value));

export function inside(root, relative) {
  if (typeof relative !== "string" || !relative || path.isAbsolute(relative) || /^[A-Za-z]:/.test(relative)) throw new Error("Use a workspace-relative path");
  const base = path.resolve(root), target = path.resolve(base, relative);
  if (target === base || !target.startsWith(`${base}${path.sep}`)) throw new Error("Path leaves workspace");
  // Refuse symlink/junction traversal, including existing parent directories.
  let current = target;
  while (current !== path.dirname(base)) {
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error("Symlink/junction paths are unsupported");
    current = path.dirname(current);
  }
  return target;
}

function supplierUrl(value, kind) {
  const u = new URL(value);
  const domain = kind === "1688" ? "1688.com" : "alibaba.com";
  if (u.protocol !== "https:" || u.username || u.password || !(u.hostname === domain || u.hostname.endsWith(`.${domain}`))) throw new Error(`Use a public HTTPS ${domain} product URL`);
  return u.href;
}

export function mapProductRows(table, columns) {
  if (!table.sheet) throw new Error("Choose a worksheet before importing");
  if (!columns || !columns.sku) throw new Error("An explicit SKU column mapping is required");
  const indexes = Object.fromEntries(Object.entries(columns).map(([field, header]) => {
    if (!fields.has(field)) throw new Error(`Unsupported mapped field: ${field}`);
    const matches = table.headers.flatMap((h, i) => h === header ? [i] : []);
    if (matches.length !== 1) throw new Error(`Column must match exactly once: ${header}`);
    return [field, matches[0]];
  }));
  return table.rows.filter((row) => row.cells.some((c) => str(c))).map((row) => ({
    ...Object.fromEntries(Object.entries(indexes).map(([field, index]) => [field, str(row.cells[index] ?? "")])),
    sourceRow: row.row, errors: row.errors,
  }));
}

export function assessCandidate(candidate, { existing = [], workspaceRoot = null } = {}) {
  const errors = [...(candidate.importErrors ?? [])];
  const pending = [];
  if (!str(candidate.sku)) errors.push("missing_sku");
  if (candidate.source.access !== "accessible") pending.push("source_access: supply screenshots or an export; do not bypass login/CAPTCHA");
  if (!candidate.source.evidenceRef) pending.push("source_evidence");
  const confirmation = candidate.confirmation ?? {};
  if (!confirmation.reviewer || !Number.isFinite(Date.parse(confirmation.at)) || !confirmation.evidenceRef) pending.push("merchant_fact_confirmation");
  if (confirmation.inputFingerprint !== fingerprint({ fields: candidate.fields, sku: candidate.sku, group: candidate.group, media: candidate.media })) pending.push("confirmation_stale_or_missing");
  if (confirmation.grouping !== true) pending.push("product_and_variant_grouping");
  for (const [field, value] of Object.entries(candidate.fields)) {
    const fact = confirmation.facts?.[field];
    if (fact?.value !== value || !fact.evidenceRef || fact.authority !== "merchant_confirmed") pending.push(`merchant_fact:${field}`);
  }
  if (!candidate.media.length) pending.push("media");
  for (const media of candidate.media) {
    if (media.candidateId !== candidate.id || media.assignmentConfirmed !== true || media.rightsConfirmed !== true) pending.push(`media_assignment_or_rights:${media.source}`);
    if (workspaceRoot && !/^https:\/\//.test(media.source)) {
      try { if (!media.sha256 || hash(fs.readFileSync(inside(workspaceRoot, media.source))) !== media.sha256) errors.push(`media_file_changed:${media.source}`); }
      catch { errors.push(`media_file_missing:${media.source}`); }
    }
  }
  if (candidate.media.filter((m) => m.primary === true).length !== 1) pending.push("confirm_one_primary_image");
  const matches = existing.filter((p) => (candidate.sku && str(p.sku).toLowerCase() === candidate.sku.toLowerCase()) || (candidate.fields.handle && str(p.handle).toLowerCase() === candidate.fields.handle.toLowerCase()) || (candidate.source.url && p.sourceUrl === candidate.source.url && p.sku === candidate.sku));
  if (matches.length) errors.push("existing_product_duplicate");
  return { id: candidate.id, status: errors.length ? "blocked" : pending.length ? "needs_input" : "ready_for_copy", errors, pending: [...new Set(pending)], duplicates: matches };
}

export function assessBatch(batch, options = {}) {
  if (batch?.schema_version !== "opsy-product-intake-v1" || !Array.isArray(batch.candidates) || !batch.candidates.length) throw new Error("Invalid or empty product intake batch");
  if (new Set(batch.candidates.map((c) => c.id)).size !== batch.candidates.length) throw new Error("Duplicate candidate IDs");
  const results = batch.candidates.map((c) => assessCandidate(c, options));
  const keys = new Map();
  batch.candidates.forEach((c, i) => {
    if (batch.candidates.filter((other) => other.group === c.group).length > 1 && c.confirmation?.listingStrategy !== "separate_products") {
      results[i].pending.push("variant_group: confirm separate products or retain for a separately supported variant workflow");
      if (results[i].status !== "blocked") results[i].status = "needs_input";
    }
    for (const key of [c.sku && `sku:${c.sku.toLowerCase()}`, c.fields.handle && `handle:${c.fields.handle.toLowerCase()}`].filter(Boolean)) {
      const prior = keys.get(key);
      if (prior !== undefined) {
        for (const idx of [prior, i]) { results[idx].status = "blocked"; results[idx].errors.push(`batch_duplicate:${key}`); }
      } else keys.set(key, i);
    }
  });
  return { ok: results.every((r) => r.status === "ready_for_copy"), status: "local_intake", results, readyIds: results.filter((r) => r.status === "ready_for_copy").map((r) => r.id) };
}

export function importProductSources({ workspaceRoot, batchId, kind, file, url, access = "not_attempted", columns, sheet, headerRow = 1, apply = false }) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(batchId ?? "")) throw new Error("batch must be a unique lowercase identifier");
  if (!["table", "image", "1688", "alibaba"].includes(kind)) throw new Error("kind must be table, image, 1688 or alibaba");
  const batchDir = inside(workspaceRoot, `inbox/products/${batchId}`);
  if (fs.existsSync(batchDir)) throw new Error("Batch already exists; use a new batch ID (existing files are preserved)");
  const copies = [], warnings = [];
  const retain = (source, destination) => {
    if (!fs.statSync(source).isFile() || fs.statSync(source).size > 16 * 1024 * 1024) throw new Error("Source must be a file up to 16 MiB");
    const relative = `inbox/products/${batchId}/${destination}`;
    copies.push({ source: path.resolve(source), target: inside(workspaceRoot, relative) });
    return relative;
  };
  let rows = [], evidenceRef = "", sourceUrl = null, sheetName = null;
  if (kind === "table") {
    const table = readProductTable(file, { sheet, headerRow });
    rows = mapProductRows(table, columns); warnings.push(...table.warnings); sheetName = table.sheet;
    evidenceRef = retain(file, `source${path.extname(file).toLowerCase()}`); access = "accessible";
  } else if (kind === "image") {
    if (!imageExtensions.has(path.extname(file).toLowerCase())) throw new Error("Use JPEG, PNG, WebP or GIF images");
    evidenceRef = retain(file, `source${path.extname(file).toLowerCase()}`);
    rows = [{ images: path.resolve(file) }]; access = "accessible";
  } else {
    sourceUrl = supplierUrl(url, kind);
    if (!["accessible", "login_required", "captcha", "unavailable", "not_attempted"].includes(access)) throw new Error("Unsupported source access state");
    if (file) {
      evidenceRef = retain(file, `capture${path.extname(file).toLowerCase()}`);
      if (path.extname(file).toLowerCase() === ".json" && access === "accessible") {
        const capture = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
        if (capture.url !== sourceUrl || !capture.method || !Number.isFinite(Date.parse(capture.observedAt)) || !Array.isArray(capture.items) || !capture.items.length) throw new Error("Capture requires the exact URL, method, observedAt and nonempty items");
        rows = capture.items;
      }
    }
    if (!rows.length) rows = [{}];
    warnings.push("Supplier terms and capabilities are unconfirmed external observations, never merchant promises. No automatic browser or login bypass is performed.");
  }
  const candidates = rows.map((rawRow, index) => {
    const row = rawRow && typeof rawRow === "object" && !Array.isArray(rawRow) ? rawRow : {};
    const id = `candidate-${index + 1}`;
    const errors = Array.isArray(row.errors) ? row.errors.filter((e) => typeof e === "string") : [];
    if (row !== rawRow) errors.push("invalid_source_row");
    for (const field of fields) if (row[field] != null && typeof row[field] !== "string" && !(field === "images" && Array.isArray(row[field]))) errors.push(`unsupported_field_type:${field}`);
    const media = [];
    const sources = Array.isArray(row.images) ? row.images : str(row.images).split("|").filter(Boolean);
    sources.forEach((source, imageIndex) => {
      try {
        source = str(source);
        let retained = source, sha256 = null;
        if (/^https:\/\//i.test(source)) {
          const parsed = new URL(source); if (!parsed.hostname || parsed.username || parsed.password) throw new Error("Invalid image URL");
        } else {
          if (!imageExtensions.has(path.extname(source).toLowerCase())) throw new Error("Unsupported image file");
          const resolved = path.isAbsolute(source) ? source : path.resolve(path.dirname(file), source);
          retained = retain(resolved, `${id}/image-${imageIndex + 1}${path.extname(source).toLowerCase()}`);
          sha256 = hash(fs.readFileSync(resolved));
        }
        media.push({ source: retained, sha256, originalSource: source, candidateId: id, primary: false, assignmentConfirmed: false, rightsConfirmed: false });
      } catch (error) { errors.push(`image:${imageIndex + 1}:${error.message}`); }
    });
    return {
      id, sku: str(row.sku), group: str(row.group) || str(row.sku) || id,
      fields: Object.fromEntries([...fields].filter((f) => !["sku", "group", "images"].includes(f) && str(row[f])).map((f) => [f, str(row[f])])),
      source: { kind, url: sourceUrl, access, evidenceRef, sheet: sheetName, row: row.sourceRow ?? null, observedAt: new Date().toISOString(), authority: kind === "1688" || kind === "alibaba" ? "supplier_observation" : "unconfirmed_material" },
      media, importErrors: errors, confirmation: null,
    };
  });
  const batch = { schema_version: "opsy-product-intake-v1", batchId, candidates, warnings };
  if (!candidates.length) throw new Error("No product rows found");
  const target = inside(workspaceRoot, `inbox/products/${batchId}/intake.json`);
  if (apply) {
    fs.mkdirSync(batchDir, { recursive: true });
    for (const copy of copies) { fs.mkdirSync(path.dirname(copy.target), { recursive: true }); fs.copyFileSync(copy.source, copy.target, fs.constants.COPYFILE_EXCL); }
    fs.writeFileSync(target, `${JSON.stringify(batch, null, 2)}\n`, { flag: "wx" });
  }
  return { applied: apply, outputPath: target, batch, ...assessBatch(batch) };
}

export function validateIntakeBinding(payload, batch, options = {}) {
  const ref = payload.sourceFacts?.intake;
  if (!ref) return [];
  const fail = (message) => [{ code: "intake_binding", path: "sourceFacts.intake", message }];
  if (batch?.schema_version !== "opsy-product-intake-v1") return fail("Load the retained intake batch before package validation");
  const candidate = batch.candidates.find((c) => c.id === ref.candidateId);
  if (!candidate || ref.fingerprint !== fingerprint(candidate)) return fail("Candidate is missing or package intake fingerprint is stale");
  const result = assessBatch(batch, options).results.find((r) => r.id === candidate.id);
  if (result.status !== "ready_for_copy") return fail(`Candidate needs confirmation: ${[...result.errors, ...result.pending].join(", ")}`);
  if (payload.variant?.sku !== candidate.sku) return fail("Package SKU differs from confirmed intake");
  for (const field of ["vendor", "productType"]) {
    if (candidate.fields[field] && payload[field] !== candidate.fields[field]) return fail(`Package ${field} differs from confirmed intake`);
  }
  if (payload.variant?.price != null && String(payload.variant.price) !== candidate.fields.price) return fail("Package price has no matching confirmed intake fact");
  const ordered = [...candidate.media].sort((a, b) => Number(b.primary) - Number(a.primary));
  if (JSON.stringify((payload.media ?? []).map((m) => m.path || m.src)) !== JSON.stringify(ordered.map((m) => m.source))) return fail("Package media/order differs from confirmed product assignment");
  for (const use of payload.sourceFacts.factUses ?? []) {
    const fact = candidate.confirmation.facts?.[use.field];
    if (!fact || !use.excerpt || !String(payload.descriptionHtml).includes(use.excerpt) || use.confirmedValue !== fact.value) return fail("Fact use differs from its confirmed value or body excerpt");
  }
  return [];
}

export function prepareProductDrafts(batch, intakePath) {
  const queue = assessBatch(batch);
  return { queue, packages: batch.candidates.filter((c) => queue.readyIds.includes(c.id)).map((c) => ({
    candidateId: c.id,
    package: {
      schema_version: "opsy-product-package-v1", status: "DRAFT",
      title: c.fields.title ?? "", handle: c.fields.handle ?? "", vendor: c.fields.vendor ?? "", productType: c.fields.productType ?? "",
      descriptionHtml: "", seo: { title: "", description: "" }, tags: [], collections: [], metafields: {},
      variant: { sku: c.sku, ...(c.fields.price ? { price: c.fields.price } : {}) },
      media: [...c.media].sort((a, b) => Number(b.primary) - Number(a.primary)).map((m) => ({ [/^https:\/\//.test(m.source) ? "src" : "path"]: m.source, role: "", alt: "" })),
      sourceFacts: {
        intake: { path: intakePath, candidateId: c.id, fingerprint: fingerprint(c) },
        sourceBasis: { mode: "merchant_materials", references: [c.source.evidenceRef, c.confirmation.evidenceRef] },
        confirmedInput: c.fields, scopeKeys: [], titleCandidates: [], titleChoice: "", decisionBrief: null, factUses: [],
        preparationStatus: "needs_copy_and_validation",
      },
    },
  })) };
}
