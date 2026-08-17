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
  validateGraphqlResponseFile,
  validateMutationFile,
} from "./lib/guard.mjs";
import {
  initializeWorkspace,
  inspectState,
  readJson,
  readProject,
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

function projectPath(options) {
  return path.resolve(options.project ?? process.cwd());
}

function help() {
  return `Opsy helper

Commands:
  doctor [--json]
  status [--project <path>] [--json]
  init --project <path> [--workspace <name>] [--agents auto|yes|no] [--apply] [--json]
  validate-data [--project <path>] [--json]
  summarize-data [--project <path>] [--output <path>] [--apply] [--json]
  suggest-keywords [--project <path>] [--limit <1-200>] [--output <path>] [--apply] [--json]
  import-agency-handoff --file <path> [--project <path>] [--output <path>] [--apply] [--json]
  refresh-404 [--project <path>] [--output <path>] [--apply] [--json]
  validate-decision-brief --file <path> [--surface page|pdp|blog] [--project <path>] [--json]
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

  if (command === "status") {
    const result = inspectState(projectPath(options));
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
