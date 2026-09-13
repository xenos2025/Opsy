import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { inside } from "./product-intake.mjs";
import { validateGraphqlResponse, validateMutationVariables } from "./guard.mjs";

const digest = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const text = (v) => typeof v === "string" && v.trim().length > 0;
const id = (v) => typeof v === "string" && /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(v);
const states = new Set(["local_prepared", "pending_input", "pending_approval", "draft_verified", "published_verified", "analysis_complete", "partial", "failed", "pending_verification"]);
const statusLabel = (status) => ({ local_prepared: "本地材料已准备", pending_input: "等待补充资料", pending_approval: "等待确认", draft_verified: "店铺草稿已核验", published_verified: "已发布并核验", analysis_complete: "数据分析已完成", partial: "部分完成", failed: "执行失败", pending_verification: "结果待核验" })[status] ?? status;
const at = (value, key) => key.split(".").reduce((node, part) => node?.[part], value);
const cell = (v) => String(v ?? "—").replaceAll("|", "\\|").replace(/[\r\n]+/g, " ");

function approvedFieldsMatch(operation, variables, node) {
  if (operation === "product-variant-update") {
    return variables.variants.every((v) => {
      const found = node?.variants?.nodes?.find((item) => item.id === v.id);
      return found?.sku === v.inventoryItem.sku && (v.price == null || (found?.price != null && Number(found.price) === Number(v.price)));
    });
  }
  if (operation === "metafields-set") {
    return variables.metafields.every((v) => {
      const alias = v.namespace === "global" ? { title_tag: "seoTitle", description_tag: "seoDescription" }[v.key] : null;
      const found = alias ? node?.[alias] : node?.metafields?.nodes?.find((m) => m.namespace === v.namespace && m.key === v.key);
      return found?.value === v.value;
    });
  }
  const source = variables.product ?? variables.article;
  if (!source) return true;
  // Verify ordinary fields directly from the guarded operation; an incomplete
  // caller-supplied checks list cannot hide a failed title/body/SEO write.
  // Publication state is checked against the final recorded stage separately:
  // a complete published history can include the earlier DRAFT creation.
  const fields = ["title", "handle", "descriptionHtml", "vendor", "productType", "tags", "seo", "body", "summary"];
  return fields.filter((field) => Object.hasOwn(source, field)).every((field) => isDeepStrictEqual(source[field], node?.[field]));
}

export function validateTaskResult(root, result) {
  const errors = [];
  const fingerprints = new Map();
  const read = (reference, json = false) => {
    if (!text(reference) || /(^|[\\/])(\.env[^\\/]*|auth\.json|secrets?[^\\/]*)$/i.test(reference)) throw new Error("Use a non-sensitive workspace evidence path");
    const file = inside(root, reference);
    const bytes = fs.readFileSync(file);
    const relative = path.relative(root, file).replaceAll("\\", "/");
    fingerprints.set(relative, { path: relative, sha256: digest(bytes) });
    return json ? JSON.parse(bytes.toString("utf8")) : bytes;
  };
  if (result?.schema_version !== "opsy-task-result-v1") errors.push("Expected opsy-task-result-v1");
  for (const field of ["task_id", "run_id"]) if (!id(result?.[field])) errors.push(`${field} must be a safe identifier`);
  for (const field of ["goal", "summary", "timezone", "basis"]) if (!text(result?.[field])) errors.push(`${field} is required`);
  if (!["product", "blog", "data", "mixed"].includes(result?.workflow)) errors.push("workflow must be product, blog, data, or mixed");
  if (!states.has(result?.status)) errors.push("Unknown task status");
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(result?.recorded_at ?? "") || Number.isNaN(Date.parse(result?.recorded_at))) errors.push("recorded_at must include a timezone");
  if (!Array.isArray(result?.inputs) || !result.inputs.length) errors.push("Name the exact inputs");
  if (!Array.isArray(result?.artifacts) || !Array.isArray(result?.objects) || !Array.isArray(result?.next_actions)) errors.push("artifacts, objects, and next_actions arrays are required");
  try {
    for (const input of result?.inputs ?? []) read(input);
    for (const artifact of result?.artifacts ?? []) read(artifact);
    for (const action of result?.next_actions ?? []) {
      if (![action.owner, action.action, action.done_when].every(text)) errors.push("Each next action requires owner, action, and done_when");
    }
    const keys = new Set();
    for (const object of result?.objects ?? []) {
      if (!id(object.key) || keys.has(object.key)) errors.push("Object keys must be unique safe identifiers");
      keys.add(object.key);
      if (!states.has(object.status)) errors.push(`${object.key}: unknown status`);
      if (!text(object.summary)) errors.push(`${object.key}: summary required`);
      if (!["draft_verified", "published_verified"].includes(object.status)) continue;
      if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(result.store ?? "")) errors.push("Verified writes require the target store");
      if (!/^gid:\/\/shopify\/(Product|Article)\/\d+$/.test(object.id ?? "")) errors.push(`${object.key}: verified object ID required`);
      const readback = read(object.readback_ref, true);
      const prefix = object.id?.includes("/Product/") ? "data.product" : "data.article";
      const node = at(readback, prefix);
      if (!Array.isArray(object.operations) || !object.operations.length) errors.push(`${object.key}: operation evidence required`);
      for (const operation of object.operations ?? []) {
        read(operation.approval_ref);
        const variables = read(operation.variables_ref, true);
        const response = read(operation.response_ref, true);
        if (operation.exit_code !== 0 || !validateMutationVariables(operation.operation, variables).ok || !validateGraphqlResponse(response, operation.operation).ok) errors.push(`${object.key}: mutation evidence failed`);
        const containsId = (v) => v === object.id || (v && typeof v === "object" && Object.values(v).some(containsId));
        if (!containsId(variables) && !containsId(response?.data)) errors.push(`${object.key}: operation is not bound to the recorded object`);
        if (!approvedFieldsMatch(operation.operation, variables, node)) errors.push(`${object.key}: actual write fields differ from approved variables`);
      }
      if (readback?.errors?.length) errors.push(`${object.key}: readback contains GraphQL errors`);
      if (node?.id !== object.id) errors.push(`${object.key}: readback ID differs`);
      if (!text(node?.handle)) errors.push(`${object.key}: readback handle missing`);
      const expectedState = object.status === "draft_verified" ? (prefix.endsWith("product") ? "DRAFT" : false) : (prefix.endsWith("product") ? "ACTIVE" : true);
      if ((prefix.endsWith("product") ? node?.status : node?.isPublished) !== expectedState) errors.push(`${object.key}: readback publication state differs`);
      if (!Array.isArray(object.checks) || !object.checks.length) errors.push(`${object.key}: approved field expectations required`);
      for (const check of object.checks ?? []) {
        if (!text(check.path) || !check.path.startsWith(`${prefix}.`) || !Object.hasOwn(check, "expected") || !isDeepStrictEqual(at(readback, check.path), check.expected)) errors.push(`${object.key}: approved readback field mismatch`);
      }
      if (object.status === "published_verified") {
        const publicationOperation = prefix.endsWith("product") ? "publishable-publish" : "article-publish";
        if (!object.operations?.some((operation) => operation.operation === publicationOperation)) errors.push(`${object.key}: publication operation evidence required`);
        if (!/^https:\/\//.test(object.public_url ?? "")) errors.push(`${object.key}: public URL required`);
        const publicCheck = read(object.public_check_ref, true);
        if (publicCheck.url !== object.public_url || publicCheck.object_id !== object.id || publicCheck.ok !== true || !text(publicCheck.checked_at)) errors.push(`${object.key}: public URL verification missing`);
      }
    }
    if (["draft_verified", "published_verified"].includes(result?.status) && (!result.objects?.length || result.objects.some((object) => object.status !== result.status))) errors.push("Task success requires all objects verified at that stage; use partial otherwise");
    if (["local_prepared", "analysis_complete"].includes(result?.status) && !result.artifacts?.length) errors.push("A prepared or complete local task must have an artifact");
    if (result?.status === "analysis_complete" && !["data", "mixed"].includes(result.workflow)) errors.push("analysis_complete is a data outcome");
    if (["pending_input", "pending_approval", "partial", "failed", "pending_verification"].includes(result?.status) && !result.next_actions?.length) errors.push("Incomplete work requires an owner and next step");
  } catch (error) { errors.push(error.message); }
  return { ok: errors.length === 0, errors, evidence: [...fingerprints.values()] };
}

export function recordTaskResult(root, result, { apply = false } = {}) {
  const validation = validateTaskResult(root, result);
  if (!validation.ok) return { ...validation, applied: false };
  const directory = inside(root, `outputs/runs/${result.task_id}/${result.run_id}`);
  const sealed = { ...result, evidence: validation.evidence };
  const lines = [`# ${result.goal}`, "", `状态：${statusLabel(result.status)}。${result.summary}`, "", `记录：${result.recorded_at}；时区：${result.timezone}；依据：${result.basis}`, "", "## 对象结果", "", "| 对象 | 状态 | 已知 ID | 结果 |", "|---|---|---|---|", ...result.objects.map((o) => `| ${cell(o.key)} | ${cell(statusLabel(o.status))} | ${cell(o.id)} | ${cell(o.summary)} |`), "", "## 交付文件", "", ...result.artifacts.map((p) => `- ${p}`), "", "## 下一步与验收", "", ...result.next_actions.map((a) => `- ${a.owner}：${a.action}；完成条件：${a.done_when}`), "", "## 证据边界", "", "此记录校验本地保存的操作、回读和产物证据。真实渠道、批准范围和前台检查由执行者核实；未证实 SEO 排名或 GEO 引用增长。", ""];
  const handoff = [`# 接手 ${result.task_id}`, "", `最后一次记录：${result.run_id} / ${result.status}`, "", "先运行 resume-task，核对店铺和证据变化。沿用已知对象 ID；遇到未知写入结果，先回读确认，避免重复创建。批准只覆盖原来精确的操作；变量或目标改变需重新确认。", "", ...result.objects.map((o) => `- ${o.key}: ${o.status}; ID=${o.id ?? "unknown"}; ${o.summary}`), "", ...result.next_actions.map((a) => `- ${a.owner} → ${a.action} → 验收：${a.done_when}`), ""];
  if (apply) {
    fs.mkdirSync(path.dirname(directory), { recursive: true });
    fs.mkdirSync(directory); // Exclusive run: existing records are never overwritten.
    fs.writeFileSync(path.join(directory, "result.json"), JSON.stringify(sealed, null, 2), { flag: "wx" });
    fs.writeFileSync(path.join(directory, "report.md"), lines.join("\n"), { flag: "wx" });
    fs.writeFileSync(path.join(directory, "handoff.md"), handoff.join("\n"), { flag: "wx" });
  }
  return { ok: true, applied: apply, directory, result: sealed, report: lines.join("\n"), handoff: handoff.join("\n") };
}

export function resumeTask(root, taskId) {
  if (!id(taskId)) throw new Error("task must be a safe identifier");
  const directory = inside(root, `outputs/runs/${taskId}`);
  if (!fs.existsSync(directory)) return { ok: true, task_id: taskId, found: false };
  const runs = fs.readdirSync(directory, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => {
    const file = path.join(directory, e.name, "result.json");
    if (!fs.existsSync(file)) throw new Error("Incomplete run bundle; inspect it before continuing");
    return { file, result: JSON.parse(fs.readFileSync(file, "utf8")) };
  }).sort((a, b) => Date.parse(b.result.recorded_at) - Date.parse(a.result.recorded_at) || b.result.run_id.localeCompare(a.result.run_id));
  if (!runs.length) return { ok: true, task_id: taskId, found: false };
  const { result, file } = runs[0];
  const changed = [];
  for (const item of result.evidence ?? []) {
    try { if (digest(fs.readFileSync(inside(root, item.path))) !== item.sha256) changed.push(item.path); }
    catch { changed.push(item.path); }
  }
  return { ok: true, found: true, task_id: taskId, result_path: file, status: result.status, store: result.store ?? null, objects: result.objects, next_actions: result.next_actions, changed_evidence: changed, requires_refresh: changed.length > 0, instruction: "Refresh readiness and approvals before writes. Preserve known IDs; verify unknown outcomes before retrying. An old approval is not permission for changed variables." };
}
