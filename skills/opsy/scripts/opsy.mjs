#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  build404Queue,
  buildKeywordSuggestions,
  buildMonthlySummary,
  dataCenterFromProject,
  validateDataCenter,
} from "./lib/data-center.mjs";
import { importAgencyHandoff } from "./lib/agency-handoff.mjs";
import { inspectEnvironment } from "./lib/environment.mjs";
import { validateDecisionBriefFile } from "./lib/buyer-decision.mjs";
import {
  buildFaqTopicSeeds,
  selectBuyerFaq,
  validateBuyerFaqFile,
} from "./lib/buyer-faq.mjs";
import { validateAudienceIntakeFile } from "./lib/audience-intake.mjs";
import { readProductTable } from "./lib/product-table.mjs";
import { importProductSources, assessBatch, inside, prepareProductDrafts } from "./lib/product-intake.mjs";
import { selectContentContext } from "./lib/content-reuse.mjs";
import { blogPreview } from "./lib/blog-media.mjs";
import {
  validateBlogPackageFile,
  validateNextActionsFile,
  validateProductPackageFile,
  validateProductBatch,
} from "./lib/merchant-packages.mjs";
import {
  validateGraphqlResponseFile,
  validateMutationFile,
} from "./lib/guard.mjs";
import {
  initializeWorkspace,
  inspectState,
  readJson,
  readProject,
  skillRoot,
} from "./lib/workspace.mjs";

function parseArgs(values) {
  const options = { _: [] };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) {
      options._.push(value);
      continue;
    }
    const key = value.slice(2);
    const next = values[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
    } else {
      options[key] = next;
      index += 1;
    }
  }
  return options;
}

function output(value, asJson) {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    return;
  }
  if (typeof value === "string") {
    process.stdout.write(value.endsWith("\n") ? value : `${value}\n`);
    return;
  }
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function requireOption(options, name) {
  if (!options[name]) throw new Error(`--${name} is required`);
  return options[name];
}

function commaList(value) {
  if (typeof value !== "string") return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function projectPath(options) {
  return path.resolve(options.project ?? process.cwd());
}

function projectProfile(options) {
  const project = readProject(projectPath(options));
  if (!project.workspaceRoot) {
    throw new Error("No Opsy workspace is configured for this project");
  }
  const profilePath = path.join(
    project.workspaceRoot,
    "config",
    "store-profile.json",
  );
  if (!fs.existsSync(profilePath)) {
    throw new Error(`Store profile is missing: ${profilePath}`);
  }
  return readJson(profilePath);
}

function projectBuyerFaq(options, { required = false } = {}) {
  const project = readProject(projectPath(options));
  if (!project.workspaceRoot) {
    throw new Error("No Opsy workspace is configured for this project");
  }
  const faqPath = path.join(project.workspaceRoot, "config", "buyer_faq.json");
  if (!fs.existsSync(faqPath)) {
    if (required) throw new Error(`Buyer FAQ config is missing: ${faqPath}`);
    return null;
  }
  return readJson(faqPath);
}

function workspaceRoot(options) {
  const root = readProject(projectPath(options)).workspaceRoot;
  if (!root) throw new Error("No Opsy workspace is configured");
  return root;
}

function audienceSource(options, profile) {
  const reference = options.audience ?? profile.profile?.store_role?.audience_intake_path;
  if (!reference) return null;
  const file = inside(workspaceRoot(options), reference);
  if (!options.audience && !fs.existsSync(file)) return null;
  return readJson(file);
}

function help() {
  return `Opsy helper

Commands:
  prepare-product-packages --file <workspace-relative-intake.json> [--project <path>] [--apply] [--json]
  validate-product-batch --file <queue.json> [--mode draft|public] [--project <path>] [--json]
  inspect-product-table --file <csv|xlsx> [--sheet <name>] [--header-row <n>] [--json]
  import-product-sources --kind table|image|1688|alibaba --batch <id> [--file <path>] [--url <url>] [--access accessible|login_required|captcha|unavailable|not_attempted] [--columns <agent-mapping.json>] [--sheet <name>] [--header-row <n>] [--project <path>] [--apply] [--json]
  check-product-intake --file <intake.json> [--existing <local-products.json>] [--json]
  select-content-context --surface product|blog --job <pdp|article-format> --scope <ref,ref> --market <market> --language <code> [--audience <workspace-relative-file>] [--project <path>] [--json]
  preview-blog-package --file <package.json> [--output <workspace-relative.html>] [--project <path>] [--apply] [--json]
  doctor [--json]
  status [--project <path>] [--json]
  init --project <path> [--workspace <name>] [--agents auto|yes|no] [--apply] [--json]
  validate-data [--project <path>] [--json]
  summarize-data [--project <path>] [--output <path>] [--apply] [--json]
  suggest-keywords [--project <path>] [--limit <1-200>] [--output <path>] [--apply] [--json]
  select-faq --surface product|blog [--scope <ref,ref>] [--language <code>] [--include-supporting] [--project <path>] [--json]
  suggest-faq-topics [--project <path>] [--json]
  audience-wizard [--json]
  import-agency-handoff --file <path> [--project <path>] [--output <path>] [--apply] [--json]
  refresh-404 [--project <path>] [--output <path>] [--apply] [--json]
  validate-decision-brief --file <path> [--surface page|pdp|blog] [--project <path>] [--json]
  validate-product-package --file <path> [--mode draft|public] [--project <path>] [--json]
  validate-blog-package --file <path> [--mode review|write] [--project <path>] [--json]
  validate-next-actions --file <path> [--json]
  validate-buyer-faq --file <path> [--strict] [--json]
  validate-faq-library --file <path> [--strict] [--json]  Deprecated alias
  validate-audience-intake --file <path> [--strict] [--json]
  guard-mutation --operation <name> --variables <file> [--json]
  check-response --operation <name> --response <file> [--json]
`;
}

async function main() {
  const [command = "help", ...rest] = process.argv.slice(2);
  const options = parseArgs(rest);
  const asJson = Boolean(options.json);

  if (command === "help" || command === "--help" || command === "-h") {
    output(help(), false);
    return;
  }

  if (command === "doctor") {
    const result = inspectEnvironment();
    output(result, asJson);
    process.exitCode = result.ok ? 0 : 2;
    return;
  }

  if (command === "inspect-product-table") {
    const table = readProductTable(path.resolve(requireOption(options, "file")), { sheet: options.sheet, headerRow: Number(options["header-row"] ?? 1) });
    output({ ...table, rows: table.rows.slice(0, 10), totalRows: table.rows.length }, asJson);
    return;
  }

  if (command === "prepare-product-packages") {
    const root = workspaceRoot(options), relative = requireOption(options, "file");
    const batch = readJson(inside(root, relative)), result = prepareProductDrafts(batch, relative);
    const queue = { packages: [] };
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(batch.batchId)) throw new Error("Invalid batch identifier");
    const directory = inside(root, `outputs/products/${batch.batchId}`);
    if (options.apply && fs.existsSync(directory)) throw new Error("Output batch exists; preserve it and choose a new batch");
    for (const item of result.packages) {
      if (!/^candidate-\d+$/.test(item.candidateId)) throw new Error("Invalid candidate identifier");
      const target = `outputs/products/${batch.batchId}/${item.candidateId}.json`;
      queue.packages.push({ candidateId: item.candidateId, path: target });
      if (options.apply) { fs.mkdirSync(directory, { recursive: true }); fs.writeFileSync(inside(root, target), `${JSON.stringify(item.package, null, 2)}\n`, { flag: "wx" }); }
    }
    if (options.apply && queue.packages.length) fs.writeFileSync(path.join(directory, "queue.json"), `${JSON.stringify(queue, null, 2)}\n`, { flag: "wx" });
    output({ ...result, packageQueue: queue, applied: Boolean(options.apply), writeReady: false }, asJson);
    return;
  }

  if (command === "validate-product-batch") {
    const profile = projectProfile(options);
    const result = validateProductBatch(readJson(path.resolve(requireOption(options, "file"))), { workspaceRoot: workspaceRoot(options), profile, mode: options.mode ?? "draft", buyerFaq: projectBuyerFaq(options), audienceIntake: audienceSource(options, profile) });
    output(result, asJson); process.exitCode = result.ok ? 0 : 2; return;
  }

  if (command === "import-product-sources") {
    const result = importProductSources({ workspaceRoot: workspaceRoot(options), batchId: requireOption(options, "batch"), kind: requireOption(options, "kind"), file: options.file ? path.resolve(options.file) : undefined, url: options.url, access: options.access, columns: options.columns ? readJson(path.resolve(options.columns)) : undefined, sheet: options.sheet, headerRow: Number(options["header-row"] ?? 1), apply: Boolean(options.apply) });
    output(result, asJson);
    return;
  }

  if (command === "check-product-intake") {
    const result = assessBatch(readJson(path.resolve(requireOption(options, "file"))), { existing: options.existing ? readJson(path.resolve(options.existing)) : [] });
    output({ ...result, storeDuplicateStatus: options.existing ? "local_snapshot_only" : "pending_live" }, asJson);
    process.exitCode = result.ok ? 0 : 2;
    return;
  }

  if (command === "select-content-context") {
    const profile = projectProfile(options);
    const audienceIntake = audienceSource(options, profile);
    output(selectContentContext({ profile, buyerFaq: projectBuyerFaq(options), audienceIntake, audiencePath: audienceIntake ? options.audience ?? profile.profile?.store_role?.audience_intake_path ?? null : null, task: { surface: requireOption(options, "surface"), job: requireOption(options, "job"), scopeKeys: commaList(requireOption(options, "scope")), market: requireOption(options, "market"), language: requireOption(options, "language") } }), asJson);
    return;
  }

  if (command === "preview-blog-package") {
    const root = workspaceRoot(options), file = path.resolve(requireOption(options, "file")), profile = projectProfile(options);
    const validation = validateBlogPackageFile(file, { workspaceRoot: root, profile, buyerFaq: projectBuyerFaq(options), audienceIntake: audienceSource(options, profile), mode: "write", dataCenterValidation: validateDataCenter(path.join(root, "data-center")) });
    const preview = blogPreview(readJson(file), validation);
    const target = inside(root, options.output ?? `outputs/blog/${path.basename(file, path.extname(file))}-preview.html`);
    if (options.apply) { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, preview, { flag: "wx" }); }
    output({ ok: validation.ok, applied: Boolean(options.apply), outputPath: target, validation }, asJson);
    return;
  }

  if (command === "status") {
    const requestedProject = projectPath(options);
    let dataCenterValidation = null;
    try {
      const { dataCenterPath } = dataCenterFromProject(requestedProject);
      dataCenterValidation = validateDataCenter(dataCenterPath);
    } catch {
      // inspectState owns workspace/config errors; data validation is supplemental.
    }
    const result = inspectState(requestedProject, { dataCenterValidation });
    output(result, asJson);
    process.exitCode = result.ok ? 0 : 2;
    return;
  }

  if (command === "init") {
    const agents = options.agents ?? "auto";
    if (!["auto", "yes", "no"].includes(agents)) {
      throw new Error("--agents must be auto, yes, or no");
    }
    const result = initializeWorkspace({
      projectPath: projectPath(options),
      workspaceName: options.workspace,
      agents,
      apply: Boolean(options.apply),
    });
    output(result, asJson);
    return;
  }

  if (command === "validate-data") {
    const { dataCenterPath } = dataCenterFromProject(projectPath(options));
    const result = validateDataCenter(dataCenterPath);
    output(result, asJson);
    process.exitCode = result.ok ? 0 : 2;
    return;
  }

  if (command === "summarize-data") {
    const project = readProject(projectPath(options));
    if (!project.workspaceRoot) throw new Error("No workspace is configured");
    const result = buildMonthlySummary(path.join(project.workspaceRoot, "data-center"));
    const target = path.resolve(
      options.output ??
        path.join(
          project.workspaceRoot,
          "outputs",
          "monthly",
          `monthly-summary-${result.period}.md`,
        ),
    );
    if (options.apply) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, result.markdown, "utf8");
    }
    output(
      asJson
        ? { ok: true, applied: Boolean(options.apply), output_path: target, period: result.period }
        : options.apply
          ? `Saved: ${target}`
          : result.markdown,
      asJson,
    );
    return;
  }

  if (command === "suggest-keywords") {
    const project = readProject(projectPath(options));
    if (!project.workspaceRoot) throw new Error("No workspace is configured");
    const limit = Number(options.limit ?? 50);
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
      throw new Error("--limit must be an integer from 1 to 200");
    }
    const result = buildKeywordSuggestions(
      path.join(project.workspaceRoot, "data-center"),
      { limit },
    );
    const target = path.resolve(
      options.output ??
        path.join(
          project.workspaceRoot,
          "outputs",
          "monthly",
          `keyword-suggestions-${result.period ?? "unknown"}.csv`,
        ),
    );
    if (!result.ok) {
      output(result, asJson);
      process.exitCode = 2;
      return;
    }
    if (options.apply) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, result.csv, "utf8");
    }
    if (asJson) {
      const { csv: _csv, ...jsonResult } = result;
      output(
        {
          ...jsonResult,
          applied: Boolean(options.apply),
          output_path: target,
        },
        true,
      );
    } else {
      output(
        options.apply
          ? `Saved ${result.rows.length} suggestion(s): ${target}`
          : result.csv,
        false,
      );
    }
    return;
  }

  if (command === "select-faq") {
    const profile = projectProfile(options);
    const result = selectBuyerFaq(projectBuyerFaq(options, { required: true }), {
      surface: requireOption(options, "surface"),
      language: options.language ?? profile?.profile?.store_role?.content_language ?? null,
      scopeKeys: commaList(options.scope),
      includeSupporting: Boolean(options["include-supporting"]),
    });
    output(result, asJson);
    process.exitCode = result.ok ? 0 : 2;
    return;
  }

  if (command === "suggest-faq-topics") {
    const profile = projectProfile(options);
    const result = buildFaqTopicSeeds(projectBuyerFaq(options, { required: true }), {
      language: profile?.profile?.store_role?.content_language ?? null,
    });
    output(result, asJson);
    process.exitCode = result.ok ? 0 : 2;
    return;
  }

  if (command === "audience-wizard") {
    const wizardPath = path.join(skillRoot, "assets", "audience-intake-wizard", "index.html");
    if (!fs.existsSync(wizardPath)) throw new Error(`Audience wizard is missing: ${wizardPath}`);
    output(
      asJson
        ? { ok: true, path: wizardPath, network_access: false, output_schema: "opsy-audience-intake-v1" }
        : wizardPath,
      asJson,
    );
    return;
  }

  if (command === "import-agency-handoff") {
    const project = readProject(projectPath(options));
    if (!project.workspaceRoot) throw new Error("No workspace is configured");
    const result = importAgencyHandoff(path.resolve(requireOption(options, "file")));
    const target = path.resolve(
      options.output ??
        path.join(
          project.workspaceRoot,
          "outputs",
          "agency-handoff",
          `merchant-action-queue-${result.period ?? "unknown"}.csv`,
        ),
    );
    if (!result.ok) {
      output(result, asJson);
      process.exitCode = 2;
      return;
    }
    if (options.apply) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, result.csv, "utf8");
    }
    if (asJson) {
      const { csv: _csv, ...jsonResult } = result;
      output(
        {
          ...jsonResult,
          applied: Boolean(options.apply),
          output_path: target,
        },
        true,
      );
    } else {
      output(
        options.apply
          ? `Saved ${result.rows.length} agency task(s): ${target}`
          : result.csv,
        false,
      );
    }
    return;
  }

  if (command === "refresh-404") {
    const project = readProject(projectPath(options));
    if (!project.workspaceRoot) throw new Error("No workspace is configured");
    const result = build404Queue(project.workspaceRoot);
    const target = path.resolve(options.output ?? result.output_path);
    if (options.apply) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, result.csv, "utf8");
    }
    output(
      asJson
        ? { ok: true, applied: Boolean(options.apply), output_path: target, count: result.count }
        : options.apply
          ? `Saved ${result.count} candidate(s): ${target}`
          : result.csv,
      asJson,
    );
    return;
  }

  if (command === "validate-decision-brief") {
    const filePath = path.resolve(requireOption(options, "file"));
    let approvedCtaLabel = null;
    const project = readProject(projectPath(options));
    if (project.workspaceRoot) {
      const profilePath = path.join(
        project.workspaceRoot,
        "config",
        "store-profile.json",
      );
      if (fs.existsSync(profilePath)) {
        approvedCtaLabel = readJson(profilePath)?.profile?.primary_inquiry_cta ?? null;
      }
    }
    const result = validateDecisionBriefFile(filePath, {
      expectedSurface: options.surface ?? null,
      approvedCtaLabel,
    });
    output(result, asJson);
    process.exitCode = result.ok ? 0 : 2;
    return;
  }

  if (command === "validate-product-package") {
    const mode = options.mode ?? "draft";
    if (!["draft", "public"].includes(mode)) {
      throw new Error("--mode must be draft or public");
    }
    const result = validateProductPackageFile(
      path.resolve(requireOption(options, "file")),
      { profile: projectProfile(options), mode, buyerFaq: projectBuyerFaq(options), workspaceRoot: workspaceRoot(options), audienceIntake: audienceSource(options, projectProfile(options)) },
    );
    output(result, asJson);
    process.exitCode = result.ok ? 0 : 2;
    return;
  }

  if (command === "validate-blog-package") {
    const mode = options.mode ?? "review";
    if (!["review", "write"].includes(mode)) {
      throw new Error("--mode must be review or write");
    }
    const { dataCenterPath } = dataCenterFromProject(projectPath(options));
    const dataCenterValidation = validateDataCenter(dataCenterPath);
    const result = validateBlogPackageFile(
      path.resolve(requireOption(options, "file")),
      {
        profile: projectProfile(options),
        mode,
        dataCenterValidation,
        buyerFaq: projectBuyerFaq(options),
        workspaceRoot: workspaceRoot(options),
        audienceIntake: audienceSource(options, projectProfile(options)),
      },
    );
    output(result, asJson);
    process.exitCode = result.ok ? 0 : 2;
    return;
  }

  if (command === "validate-next-actions") {
    const result = validateNextActionsFile(
      path.resolve(requireOption(options, "file")),
    );
    output(result, asJson);
    process.exitCode = result.ok ? 0 : 2;
    return;
  }

  if (command === "validate-buyer-faq" || command === "validate-faq-library") {
    const result = validateBuyerFaqFile(
      path.resolve(requireOption(options, "file")),
      { strict: Boolean(options.strict) },
    );
    output(result, asJson);
    process.exitCode = result.ok ? 0 : 2;
    return;
  }

  if (command === "validate-audience-intake") {
    const result = validateAudienceIntakeFile(
      path.resolve(requireOption(options, "file")),
      { strict: Boolean(options.strict) },
    );
    output(result, asJson);
    process.exitCode = result.ok ? 0 : 2;
    return;
  }

  if (command === "guard-mutation") {
    const result = validateMutationFile(
      requireOption(options, "operation"),
      path.resolve(requireOption(options, "variables")),
    );
    output(result, asJson);
    process.exitCode = result.ok ? 0 : 2;
    return;
  }

  if (command === "check-response") {
    const result = validateGraphqlResponseFile(
      requireOption(options, "operation"),
      path.resolve(requireOption(options, "response")),
    );
    output(result, asJson);
    process.exitCode = result.ok ? 0 : 2;
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  process.stderr.write(`Opsy error: ${error.message}\n`);
  process.exitCode = 1;
});
