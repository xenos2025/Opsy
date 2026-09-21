import fs from "node:fs";
import path from "node:path";
import { parseCsv, readUtf8 } from "./data-center.mjs";

export const promptColumns = "prompt_id,prompt,tier,language,market,surface,scope_key,status,source_ref,review_ref,notes".split(",");
const surfaces = ["product", "blog", "page", "collection", "monitor"];

function contained(root, ref) {
  if (typeof ref !== "string" || !ref || /[:\\]/.test(ref) || path.isAbsolute(ref)) throw new Error("Expected portable workspace-relative path");
  const base = fs.realpathSync(root), candidate = path.resolve(base, ref);
  // Resolve the nearest existing ancestor as well as the final file to reject junction escapes.
  let parent = candidate;
  while (!fs.existsSync(parent) && path.dirname(parent) !== parent) parent = path.dirname(parent);
  const real = fs.realpathSync(parent);
  const under = (value) => value === base || value.startsWith(`${base}${path.sep}`);
  if (!under(candidate) || !under(real)) throw new Error("Reference escapes the workspace");
  return candidate;
}

export function selectAiPrompts(root, { surface, language, market, scope }) {
  if (!surfaces.includes(surface) || ![language, market, scope].every((v) => typeof v === "string" && v.trim())) throw new Error("Select an exact surface, language, market and scope");
  const result = { schema_version: "ai-search-selection-v1", status: "not_configured", items: [], authority: "planning_only", write_authorized: false };
  const policyPath = contained(root, "config/ai_search_intent.json");
  if (!fs.existsSync(policyPath)) return result;
  const policy = JSON.parse(readUtf8(policyPath).replace(/^\uFEFF/, ""));
  if (policy?.schema_version !== "ai-search-intent-v1" || !["draft", "active", "disabled"].includes(policy.status)) throw new Error("Invalid AI-search policy");
  const library = contained(root, policy.prompts_path);
  const configRoot = contained(root, "config");
  if (!library.startsWith(`${configRoot}${path.sep}`) || path.extname(library) !== ".csv" || !fs.realpathSync(library).startsWith(`${fs.realpathSync(configRoot)}${path.sep}`)) throw new Error("Prompt library must be a CSV inside config");
  const evidence = (ref) => typeof ref === "string" && ref.trim() && fs.existsSync(contained(root, ref.split("#", 1)[0])) && fs.statSync(contained(root, ref.split("#", 1)[0])).isFile();
  if (policy.status === "active" && !evidence(policy.review_ref)) throw new Error("Active policy requires an existing local review_ref");
  const [header, ...data] = parseCsv(readUtf8(library));
  if (JSON.stringify(header) !== JSON.stringify(promptColumns)) throw new Error("Prompt library header does not match ai-search-intent-v1");
  const ids = new Set(), questions = new Set();
  const rows = data.map((values) => {
    if (values.length !== promptColumns.length) throw new Error("Malformed prompt CSV row");
    const row = Object.fromEntries(promptColumns.map((key, i) => [key, values[i]]));
    if (!promptColumns.slice(0, -3).every((key) => row[key].trim())) throw new Error("Prompt row has a missing required field");
    const identity = JSON.stringify([row.prompt.trim().toLowerCase(), row.language, row.market, row.surface, row.scope_key]);
    if (ids.has(row.prompt_id) || questions.has(identity)) throw new Error("Duplicate prompt id or scoped question");
    ids.add(row.prompt_id); questions.add(identity);
    if (!["buy", "solve", "learn"].includes(row.tier) || !surfaces.includes(row.surface) || !["draft", "approved", "retired"].includes(row.status)) throw new Error("Invalid prompt tier, surface or status");
    if (row.status === "approved" && !(evidence(row.source_ref) && evidence(row.review_ref))) throw new Error("Approved prompt requires existing local source_ref and review_ref");
    return row;
  });
  return { ...result, status: policy.status, library_path: policy.prompts_path, total_rows: rows.length,
    items: policy.status === "active" ? rows.filter((row) => row.status === "approved" && row.surface === surface && row.language === language && row.market === market && row.scope_key === scope) : [] };
}
