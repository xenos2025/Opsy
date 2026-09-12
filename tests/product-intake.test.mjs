import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { deflateRawSync } from "node:zlib";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { readProductTable, parseProductCsv } from "../skills/opsy/scripts/lib/product-table.mjs";
import { importProductSources, assessBatch, fingerprint, validateIntakeBinding, inside, prepareProductDrafts } from "../skills/opsy/scripts/lib/product-intake.mjs";
import { initializeWorkspace } from "../skills/opsy/scripts/lib/workspace.mjs";

function temporary(t) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), "opsy-intake-")); t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir; }
function write(dir, name, data) { const file = path.join(dir, name); fs.writeFileSync(file, data); return file; }
function crc32(data) { let crc = -1; for (const b of data) { crc ^= b; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); } return (crc ^ -1) >>> 0; }
// Real deflated ZIP/OOXML fixture. Not a vendor spreadsheet or live acceptance.
function zip(entries) {
  const locals = [], central = []; let offset = 0;
  for (const [name, content] of Object.entries(entries)) {
    const data = Buffer.from(content), packed = deflateRawSync(data), n = Buffer.from(name);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8); local.writeUInt32LE(crc32(data), 14); local.writeUInt32LE(packed.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(n.length, 26);
    locals.push(local, n, packed);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(8, 10); c.writeUInt32LE(crc32(data), 16); c.writeUInt32LE(packed.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(offset, 42); central.push(c, n);
    offset += local.length + n.length + packed.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(central.length / 2, 8); end.writeUInt16LE(central.length / 2, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}
function workbook(extra = "") {
  return zip({
    "xl/workbook.xml": '<workbook><sheets><sheet name="商品" sheetId="1" r:id="r1"/><sheet name="Other" sheetId="2" r:id="r2"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels": '<Relationships><Relationship Id="r1" Target="worksheets/sheet1.xml"/><Relationship Id="r2" Target="worksheets/sheet2.xml"/></Relationships>',
    "xl/sharedStrings.xml": '<sst><si><t>SKU</t></si><si><r><t>规</t></r><r><t>格</t></r></si><si><t>图</t></si><si><t>001</t></si></sst>',
    "xl/worksheets/sheet1.xml": `<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c></row><row r="2"><c r="A2" t="s"><v>3</v></c><c r="B2" t="inlineStr"><is><t>Red &amp; blue</t></is></c><c r="C2" t="inlineStr"><is><t>front.png</t></is></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>002</t></is></c><c r="B3"><f>1+1</f><v>2</v></c></row></sheetData>${extra}</worksheet>`,
    "xl/worksheets/sheet2.xml": '<worksheet><sheetData/></worksheet>',
  });
}
function confirm(candidate) {
  candidate.media.forEach((m, i) => Object.assign(m, { primary: i === 0, assignmentConfirmed: true, rightsConfirmed: true }));
  candidate.confirmation = { reviewer: "Merchant", at: "2026-09-11T08:00:00Z", evidenceRef: "inbox/merchant-review.md", grouping: true, facts: Object.fromEntries(Object.entries(candidate.fields).map(([f, value]) => [f, { value, evidenceRef: "inbox/merchant-review.md", authority: "merchant_confirmed" }])), inputFingerprint: fingerprint({ fields: candidate.fields, sku: candidate.sku, group: candidate.group, media: candidate.media }) };
}

test("CSV handles BOM, multiline quoted fields and literal SKU zeros", () => {
  assert.deepEqual(parseProductCsv('\uFEFFSKU,Title\r\n001,"A, B\nC"\r\n'), [["SKU", "Title"], ["001", "A, B\nC"]]);
  assert.throws(() => parseProductCsv('SKU\n"unclosed'), /Unclosed/);
  assert.throws(() => parseProductCsv('SKU\n"a"x'), /Malformed/);
});

test("XLSX selects sheets, decodes shared/inline strings and isolates formula rows", (t) => {
  const dir = temporary(t), file = write(dir, "products.xlsx", workbook());
  assert.deepEqual(readProductTable(file).sheets, ["商品", "Other"]);
  assert.equal(readProductTable(file).sheet, null);
  const table = readProductTable(file, { sheet: "商品" });
  assert.deepEqual(table.headers, ["SKU", "规格", "图"]);
  assert.deepEqual(table.rows[0].cells, ["001", "Red & blue", "front.png"]);
  assert.equal(table.rows[1].errors.length, 1);
  write(dir, "front.png", "synthetic image bytes");
  const result = importProductSources({ workspaceRoot: dir, batchId: "xlsx", kind: "table", file, sheet: "商品", columns: { sku: "SKU", options: "规格", images: "图" }, apply: true });
  assert.equal(result.batch.candidates[0].sku, "001");
  assert.equal(result.results[1].status, "blocked");
  assert.ok(fs.existsSync(path.join(dir, result.batch.candidates[0].media[0].source)));
  confirm(result.batch.candidates[0]);
  assert.deepEqual(assessBatch(result.batch).readyIds, ["candidate-1"]);
  const prepared = prepareProductDrafts(result.batch, "inbox/products/xlsx/intake.json");
  assert.equal(prepared.packages.length, 1);
  assert.equal(prepared.packages[0].package.variant.sku, "001");
  assert.equal(prepared.packages[0].package.descriptionHtml, "");
  fs.writeFileSync(path.join(dir, result.batch.candidates[0].media[0].source), "changed image");
  assert.equal(assessBatch(result.batch, { workspaceRoot: dir }).readyIds.length, 0);
});

test("XLSX rejects merged cells, unsupported formats, ambiguous headers and malformed archives", (t) => {
  const dir = temporary(t);
  assert.throws(() => readProductTable(write(dir, "merge.xlsx", workbook('<mergeCells><mergeCell ref="A1:B1"/></mergeCells>')), { sheet: "商品" }), /Merged/);
  assert.throws(() => readProductTable(write(dir, "old.xls", "legacy")), /Supported/);
  assert.throws(() => readProductTable(write(dir, "broken.xlsx", "broken")));
  const corrupted = workbook();
  const cd = corrupted.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  corrupted.writeUInt32LE(0, cd + 16);
  assert.throws(() => readProductTable(write(dir, "corrupt.xlsx", corrupted)), /checksum/);
  const file = write(dir, "dupe.csv", "SKU,SKU\n1,2\n");
  assert.throws(() => importProductSources({ workspaceRoot: dir, batchId: "dupe", kind: "table", file, columns: { sku: "SKU" } }), /exactly once/);
});

test("1688 and Alibaba captures retain URL, evidence and unconfirmed supplier facts", (t) => {
  const dir = temporary(t);
  for (const [kind, url] of [["1688", "https://detail.1688.com/offer/123.html"], ["alibaba", "https://www.alibaba.com/product-detail/component_123.html"]]) {
    const file = write(dir, `${kind}.json`, JSON.stringify({ url, method: "browser visible text", observedAt: "2026-09-11T08:00:00Z", items: [{ sku: "A", title: "Component", moq: "500", images: ["https://example.com/front.png"] }] }));
    const result = importProductSources({ workspaceRoot: dir, batchId: `supplier-${kind}`, kind, file, url, access: "accessible", apply: true });
    assert.equal(result.batch.candidates[0].source.url, url);
    assert.ok(result.results[0].pending.includes("merchant_fact:moq"));
    assert.equal(result.results[0].status, "needs_input");
  }
  assert.throws(() => importProductSources({ workspaceRoot: dir, batchId: "bad", kind: "1688", url: "https://1688.com.example.com/x" }), /1688.com/);
});

test("restricted access stays pending; image intake never invents facts or ownership", (t) => {
  const dir = temporary(t), file = write(dir, "photo.jpg", "synthetic");
  for (const access of ["captcha", "login_required", "unavailable", "not_attempted"]) {
    const result = importProductSources({ workspaceRoot: dir, batchId: access.replaceAll("_", "-"), kind: "1688", url: "https://detail.1688.com/offer/123.html", access });
    assert.equal(result.batch.candidates[0].source.access, access);
    assert.equal(result.readyIds.length, 0);
  }
  const result = importProductSources({ workspaceRoot: dir, batchId: "image", kind: "image", file, apply: true });
  assert.deepEqual(result.batch.candidates[0].fields, {});
  assert.equal(result.batch.candidates[0].media[0].rightsConfirmed, false);
  assert.throws(() => importProductSources({ workspaceRoot: dir, batchId: "image", kind: "image", file, apply: true }), /already exists/);
  assert.throws(() => inside(dir, "../escape"), /leaves workspace/);
});

test("duplicates block only matching rows and changed facts/media invalidate confirmation", (t) => {
  const dir = temporary(t), file = write(dir, "rows.csv", "SKU,Group,Image,MOQ\na,g,https://example.com/a.png,3\na,g,https://example.com/b.png,4\nc,c,https://example.com/c.png,5\n");
  const { batch } = importProductSources({ workspaceRoot: dir, batchId: "batch", kind: "table", file, columns: { sku: "SKU", group: "Group", images: "Image", moq: "MOQ" } });
  batch.candidates.forEach(confirm);
  assert.deepEqual(assessBatch(batch).readyIds, ["candidate-3"]);
  assert.deepEqual(assessBatch(batch, { existing: [{ sku: "C" }] }).readyIds, []);
  const c = batch.candidates[2];
  const payload = { variant: { sku: c.sku }, media: [{ src: c.media[0].source }], sourceFacts: { intake: { candidateId: c.id, fingerprint: fingerprint(c) } } };
  assert.deepEqual(validateIntakeBinding(payload, batch), []);
  payload.variant.price = "1";
  assert.match(validateIntakeBinding(payload, batch)[0].message, /price/);
  delete payload.variant.price;
  c.fields.moq = "99";
  assert.equal(assessBatch(batch).readyIds.length, 0);
  assert.match(validateIntakeBinding(payload, batch)[0].message, /stale/);
});

test("CLI import safely adds to an existing customer workspace without replacing customer files", (t) => {
  const dir = temporary(t);
  write(dir, "AGENTS.md", "Customer rules\n");
  initializeWorkspace({ projectPath: dir, apply: true });
  const marker = fs.readFileSync(path.join(dir, "shopify-ops.json"), "utf8");
  const workspace = JSON.parse(marker).workspace;
  const file = write(dir, "products.csv", "SKU,Title\n001,Component\n");
  const columns = write(dir, "columns.json", JSON.stringify({ sku: "SKU", title: "Title" }));
  const cli = path.resolve("skills/opsy/scripts/opsy.mjs");
  const result = spawnSync(process.execPath, [cli, "import-product-sources", "--project", dir, "--kind", "table", "--batch", "smoke", "--file", file, "--columns", columns, "--apply", "--json"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).batch.candidates[0].sku, "001");
  assert.equal(fs.readFileSync(path.join(dir, "AGENTS.md"), "utf8"), "Customer rules\n");
  assert.equal(fs.readFileSync(path.join(dir, "shopify-ops.json"), "utf8"), marker);
  assert.ok(workspace);
  const intakePath = JSON.parse(result.stdout).outputPath;
  const batch = JSON.parse(fs.readFileSync(intakePath, "utf8"));
  const candidate = batch.candidates[0];
  candidate.media = [{ source: "https://example.com/front.png", candidateId: candidate.id }];
  confirm(candidate);
  fs.writeFileSync(intakePath, JSON.stringify(batch));
  const prepare = spawnSync(process.execPath, [cli, "prepare-product-packages", "--project", dir, "--file", "inbox/products/smoke/intake.json", "--apply", "--json"], { encoding: "utf8" });
  assert.equal(prepare.status, 0, prepare.stderr);
  assert.equal(JSON.parse(prepare.stdout).writeReady, false);
  assert.equal(JSON.parse(prepare.stdout).packages.length, 1);
});
