import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { skillRoot } from "./workspace.mjs";
import { inside } from "./product-intake.mjs";
import { validateMutationVariables, validateGraphqlResponse } from "./guard.mjs";
import { runShopify } from "./shopify-cli-runtime.mjs";

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const https = (value) => { try { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password; } catch { return false; } };

export function imageUploadPlan({ workspaceRoot, file, store, alt }) {
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(store ?? "")) throw new Error("An explicit myshopify.com store is required");
  if (typeof alt !== "string" || !alt.trim()) throw new Error("Confirmed image alt text is required");
  const local = inside(workspaceRoot, file);
  const ext = path.extname(local).toLowerCase();
  const mimeType = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" }[ext];
  if (!mimeType || !fs.statSync(local).isFile() || fs.statSync(local).size > 16 * 1024 * 1024) throw new Error("Use a local PNG, JPEG, or WebP image up to 16 MiB");
  const bytes = fs.readFileSync(local);
  const signatureOk = mimeType === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : mimeType === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!signatureOk) throw new Error("Image extension and file signature differ");
  const plan = { schema_version: "opsy-image-upload-v1", store, file: path.relative(workspaceRoot, local).replaceAll("\\", "/"), sha256: hash(bytes), bytes: bytes.length, mimeType, alt: alt.trim(), operations: ["staged-image-upload", "storage-upload", "image-file-create"] };
  return { ...plan, plan_sha256: hash(JSON.stringify(plan)) };
}

function cliExecute(workspaceRoot, store, query, variables) {
  // Variables for fileCreate contain a temporary resource URL: keep them in
  // process arguments only. Never persist staged targets or signed parameters.
  const queryFile = path.join(skillRoot, "assets", "graphql", query);
  const args = ["store", "execute", "--store", store, "--version", "2026-07", "--query-file", queryFile, "--variables", JSON.stringify(variables), "--json"];
  if (!query.includes("readback")) args.push("--allow-mutations");
  const result = runShopify(args);
  if (result.error_code || result.status !== 0) throw new Error("Shopify CLI operation failed or timed out; inspect store state before retrying");
  try { return JSON.parse(result.stdout); } catch { throw new Error("Shopify CLI returned an unreadable response; outcome needs verification"); }
}

async function storageUpload(target, bytes, plan) {
  if (!https(target?.url) || !https(target?.resourceUrl) || !Array.isArray(target?.parameters)) throw new Error("Invalid staged upload target");
  const host = new URL(target.url).hostname;
  if (!(host === plan.store || host === "storage.googleapis.com" || host.endsWith(".storage.googleapis.com") || host.endsWith(".amazonaws.com"))) throw new Error("Unrecognized Shopify storage host; refresh official upload evidence");
  const form = new FormData();
  for (const item of target.parameters) {
    if (typeof item.name !== "string" || typeof item.value !== "string" || item.name === "file") throw new Error("Invalid staged form parameters");
    form.append(item.name, item.value);
  }
  form.append("file", new Blob([bytes], { type: plan.mimeType }), `${plan.sha256}${path.extname(plan.file)}`);
  try {
    const response = await fetch(target.url, { method: "POST", body: form, redirect: "error", signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error("Upload failed");
  } catch { throw new Error("Storage upload failed or timed out; verify before any retry"); }
}

export async function uploadImage(options, adapters = {}) {
  const plan = imageUploadPlan(options);
  const receiptPath = inside(options.workspaceRoot, `outputs/media/${plan.plan_sha256}.json`);
  if (!options.apply) return { ok: true, applied: false, plan, receipt_path: receiptPath };
  const approval = options.approval;
  if (approval?.plan_sha256 !== plan.plan_sha256 || approval?.store !== plan.store || !approval?.evidence_ref || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(approval?.approved_at ?? "") || Number.isNaN(Date.parse(approval.approved_at))) throw new Error("Exact image upload approval is required");
  const execute = adapters.execute ?? ((query, variables) => cliExecute(options.workspaceRoot, plan.store, query, variables));
  const upload = adapters.upload ?? storageUpload;
  const wait = adapters.wait ?? (() => new Promise((resolve) => setTimeout(resolve, 1000)));
  const receipt = { schema_version: "opsy-image-upload-result-v1", plan, status: "pending_verification", phase: "stage_image", file_id: null, public_url: null, approval_ref: approval.evidence_ref, started_at: new Date().toISOString() };
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true });
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2), { flag: "wx" });
  const run = async (operation, query, variables) => {
    if (!validateMutationVariables(operation, variables).ok) throw new Error("Image operation failed its variable guard");
    const response = await execute(query, variables);
    if (!validateGraphqlResponse(response, operation).ok) throw new Error("Image operation response requires verification");
    return response;
  };
  try {
    const stage = await run("staged-image-upload", "staged-image-upload.graphql", { input: [{ filename: `${plan.sha256}${path.extname(plan.file)}`, mimeType: plan.mimeType, resource: "IMAGE", httpMethod: "POST" }] });
    const target = stage.data.stagedUploadsCreate.stagedTargets[0];
    const bytes = fs.readFileSync(inside(options.workspaceRoot, plan.file));
    if (hash(bytes) !== plan.sha256) throw new Error("Image changed after approval");
    receipt.phase = "upload_bytes";
    await upload(target, bytes, plan);
    receipt.phase = "create_file";
    const created = await run("image-file-create", "image-file-create.graphql", { files: [{ originalSource: target.resourceUrl, contentType: "IMAGE", alt: plan.alt }] });
    receipt.file_id = created.data.fileCreate.files[0]?.id;
    if (!/^gid:\/\/shopify\/MediaImage\/\d+$/.test(receipt.file_id ?? "")) throw new Error("Expected an image file ID");
    fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
    receipt.phase = "readback";
    for (let attempt = 0; attempt < 3; attempt++) {
      const readback = await execute("image-file-readback.graphql", { id: receipt.file_id });
      const image = readback?.data?.node;
      if (readback?.errors?.length || image?.id !== receipt.file_id) throw new Error("Image readback failed");
      if (image.fileStatus === "FAILED") throw new Error("Shopify image processing failed");
      if (image.fileStatus === "READY" && https(image.image?.url)) {
        const publicUrl = new URL(image.image.url);
        if (/signature|credential|token|policy/i.test(publicUrl.search)) throw new Error("Expected a public image URL");
        receipt.status = "ready";
        receipt.phase = "complete";
        receipt.public_url = image.image.url;
        break;
      }
      if (attempt < 2) await wait();
    }
  } catch {
    receipt.status = "pending_verification";
    receipt.note = "Upload or processing outcome needs verification. Read the recorded file ID or check Shopify Files by the image hash filename before considering another upload.";
  }
  receipt.updated_at = new Date().toISOString();
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  return { ok: receipt.status === "ready", applied: true, receipt_path: receiptPath, ...receipt };
}

export async function refreshImageUpload({ workspaceRoot, receiptFile, store, apply }, adapters = {}) {
  const receiptPath = inside(workspaceRoot, receiptFile);
  const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
  if (receipt.schema_version !== "opsy-image-upload-result-v1" || receipt.plan?.store !== store || !/^gid:\/\/shopify\/MediaImage\/\d+$/.test(receipt.file_id ?? "")) throw new Error("Receipt needs the matching store and a known MediaImage ID; inspect Shopify Files before retrying an unknown upload");
  const execute = adapters.execute ?? ((query, variables) => cliExecute(workspaceRoot, store, query, variables));
  const readback = await execute("image-file-readback.graphql", { id: receipt.file_id });
  const node = readback?.data?.node;
  if (readback?.errors?.length || node?.id !== receipt.file_id) throw new Error("Image readback failed; receipt preserved");
  receipt.status = "pending_verification";
  receipt.public_url = null;
  if (node.fileStatus === "READY" && https(node.image?.url) && !/signature|credential|token|policy/i.test(new URL(node.image.url).search)) {
    receipt.status = "ready";
    receipt.phase = "complete";
    receipt.public_url = node.image.url;
  }
  receipt.updated_at = new Date().toISOString();
  if (apply) fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  return { ok: receipt.status === "ready", applied: Boolean(apply), receipt_path: receiptPath, ...receipt };
}
