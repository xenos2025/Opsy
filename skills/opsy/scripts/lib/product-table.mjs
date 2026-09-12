import fs from "node:fs";
import path from "node:path";
import { inflateRawSync } from "node:zlib";

const LIMIT = 16 * 1024 * 1024;
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, v) => {
  if (v[0] === "#") return String.fromCodePoint(v[1].toLowerCase() === "x" ? parseInt(v.slice(2), 16) : Number(v.slice(1)));
  return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[v];
});
const attrs = (s) => Object.fromEntries([...s.matchAll(/([\w:]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((m) => [m[1], decode(m[2] ?? m[3])]));
const textNodes = (s) => [...s.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join("");
const crcTable = Array.from({ length: 256 }, (_, n) => { for (let i = 0; i < 8; i++) n = (n >>> 1) ^ (0xedb88320 & -(n & 1)); return n >>> 0; });
function crc32(data) { let n = 0xffffffff; for (const b of data) n = (n >>> 8) ^ crcTable[(n ^ b) & 255]; return (n ^ 0xffffffff) >>> 0; }

// A bounded OOXML reader, not a general Excel engine. Never extract archive paths.
function unzip(buffer) {
  let end = buffer.length - 22;
  while (end >= Math.max(0, buffer.length - 65557) && buffer.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0 || buffer.readUInt32LE(end) !== 0x06054b50) throw new Error("Invalid XLSX ZIP directory");
  const count = buffer.readUInt16LE(end + 10);
  if (buffer.readUInt16LE(end + 4) || buffer.readUInt16LE(end + 6) || count > 500) throw new Error("Split/ZIP64 or oversized XLSX is unsupported");
  let pos = buffer.readUInt32LE(end + 16), total = 0;
  const files = new Map();
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(pos) !== 0x02014b50) throw new Error("Invalid XLSX ZIP entry");
    const flags = buffer.readUInt16LE(pos + 8), method = buffer.readUInt16LE(pos + 10);
    const size = buffer.readUInt32LE(pos + 20), unpacked = buffer.readUInt32LE(pos + 24);
    const nameLen = buffer.readUInt16LE(pos + 28), extra = buffer.readUInt16LE(pos + 30), comment = buffer.readUInt16LE(pos + 32);
    const offset = buffer.readUInt32LE(pos + 42);
    const name = buffer.subarray(pos + 46, pos + 46 + nameLen).toString("utf8");
    total += unpacked;
    if ((flags & 1) || ![0, 8].includes(method) || unpacked > LIMIT || total > LIMIT * 4 || files.has(name)) throw new Error("Encrypted, duplicate, oversized or unsupported XLSX entry");
    if (buffer.readUInt32LE(offset) !== 0x04034b50) throw new Error("Invalid XLSX local entry");
    const start = offset + 30 + buffer.readUInt16LE(offset + 26) + buffer.readUInt16LE(offset + 28);
    if (start + size > buffer.length) throw new Error("Truncated XLSX entry");
    const packed = buffer.subarray(start, start + size);
    const data = method === 8 ? inflateRawSync(packed, { maxOutputLength: LIMIT }) : packed;
    if (data.length !== unpacked) throw new Error("XLSX entry size mismatch");
    if (crc32(data) !== buffer.readUInt32LE(pos + 16)) throw new Error("XLSX entry checksum mismatch");
    files.set(name, data.toString("utf8"));
    pos += 46 + nameLen + extra + comment;
  }
  return files;
}

export function parseProductCsv(input) {
  const s = input.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [], cell = "", quoted = false, closed = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else cell += c;
    } else if (c === '"' && !cell && !closed) quoted = true;
    else if (c === "," || c === "\n" || c === "\r") {
      row.push(cell); cell = ""; closed = false;
      if (c !== ",") { rows.push(row); if (rows.length > 20000) throw new Error("Split tables larger than 20000 rows"); row = []; if (c === "\r" && s[i + 1] === "\n") i++; }
    } else {
      if (closed || c === '"') throw new Error("Malformed CSV quoting; export UTF-8 CSV again");
      cell += c;
    }
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  if (cell || row.length || closed) rows.push([...row, cell]);
  return rows;
}

export function readProductTable(file, { sheet = null, headerRow = 1 } = {}) {
  if (!Number.isInteger(headerRow) || headerRow < 1) throw new Error("headerRow must be a positive integer");
  if (fs.statSync(file).size > LIMIT) throw new Error("Product table exceeds 16 MiB");
  const buffer = fs.readFileSync(file), extension = path.extname(file).toLowerCase();
  if (extension === ".csv") {
    const rows = parseProductCsv(new TextDecoder("utf-8", { fatal: true }).decode(buffer));
    const headers = rows[headerRow - 1] ?? [];
    return { sheets: ["CSV"], sheet: "CSV", headers, rows: rows.slice(headerRow).map((cells, i) => ({ row: headerRow + i + 1, cells, errors: cells.length !== headers.length ? ["column_count"] : [] })), warnings: [] };
  }
  if (extension !== ".xlsx") throw new Error("Supported: UTF-8 .csv and ordinary .xlsx; export .xls/.xlsm/password-protected files to one of these formats");
  const files = unzip(buffer);
  const xml = (name) => {
    const value = files.get(name);
    if (!value || /<!DOCTYPE|<!ENTITY|<\w+:(?:worksheet|workbook|Relationships)\b/i.test(value)) throw new Error(`Unsupported or missing XLSX XML: ${name}`);
    return value;
  };
  const workbook = xml("xl/workbook.xml"), rels = xml("xl/_rels/workbook.xml.rels");
  const sheets = [...workbook.matchAll(/<sheet\b([^>]*?)\/?\s*>/g)].map((m) => attrs(m[1]));
  const names = sheets.map((s) => s.name);
  if (!sheet && sheets.length !== 1) return { sheets: names, sheet: null, headers: [], rows: [], warnings: ["Choose an exact worksheet with --sheet"] };
  const selected = sheets.find((s) => s.name === (sheet ?? names[0]));
  if (!selected) throw new Error("Worksheet not found");
  const relation = [...rels.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)].map((m) => attrs(m[1])).find((r) => r.Id === selected["r:id"]);
  if (!relation || relation.TargetMode === "External") throw new Error("Worksheet relationship is not local");
  const target = path.posix.normalize(relation.Target.startsWith("/") ? relation.Target.slice(1) : `xl/${relation.Target}`);
  if (!target.startsWith("xl/worksheets/")) throw new Error("Unsupported worksheet target");
  const content = xml(target);
  const shared = files.has("xl/sharedStrings.xml") ? [...xml("xl/sharedStrings.xml").matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => textNodes(m[1])) : [];
  const rows = [];
  for (const match of content.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const rowNumber = Number(attrs(match[1]).r);
    if (!Number.isInteger(rowNumber) || rowNumber < 1) throw new Error("Worksheet row has no valid coordinate");
    const cells = [], errors = [];
    for (const cell of match[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const a = attrs(cell[1]), inner = cell[2] ?? "";
      const coordinate = /^([A-Z]+)(\d+)$/.exec(a.r ?? "");
      if (!coordinate || Number(coordinate[2]) !== rowNumber) throw new Error("Invalid cell coordinate");
      const index = [...coordinate[1]].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
      if (index > 1023) throw new Error("More than 1024 columns unsupported");
      if (/<f\b/.test(inner) || a.t === "e") errors.push(`unsupported_formula_or_error:${a.r}`);
      const raw = decode(inner.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? "");
      if (a.t === "s" && shared[Number(raw)] === undefined) errors.push(`invalid_shared_string:${a.r}`);
      cells[index] = a.t === "s" ? shared[Number(raw)] ?? "" : a.t === "inlineStr" ? textNodes(inner) : raw;
    }
    rows.push({ row: rowNumber, cells, errors });
    if (rows.length > 20000) throw new Error("Split tables larger than 20000 rows");
  }
  const header = rows.find((r) => r.row === headerRow);
  if (header?.errors.length) throw new Error("Header contains unsupported formulas or errors");
  if (/<mergeCell\b/.test(content)) throw new Error("Merged cells unsupported; unmerge and repeat the values before import");
  return { sheets: names, sheet: selected.name, headers: header?.cells ?? [], rows: rows.filter((r) => r.row > headerRow), warnings: ["Uses stored cell values, not display formatting; use text SKU cells for leading zeros. Embedded drawings are not image mappings: supply image paths/URLs in columns."] };
}
