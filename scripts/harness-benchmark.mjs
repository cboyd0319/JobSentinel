#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { summarizeHarnessScore } from "./harness-score.mjs";
import { summarizeHarnessSession } from "./harness-session.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");

function parseArgs(argv) {
  const args = { _: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }

    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    if (inlineValue !== undefined) {
      args[key] = inlineValue;
    } else if (argv[index + 1] && !argv[index + 1].startsWith("--")) {
      args[key] = argv[index + 1];
      index += 1;
    } else {
      args[key] = true;
    }
  }

  return args;
}

function subsystemRows(scoreSummary) {
  return scoreSummary.frameworks.flatMap((framework) =>
    framework.subsystems.map((subsystem) => ({
      framework: framework.name,
      frameworkId: framework.id,
      name: subsystem.name,
      score: subsystem.score,
      passed: subsystem.passed,
      total: subsystem.total,
    })),
  );
}

export function recommendHarnessAction(scoreSummary, sessionSummary) {
  const weakSubsystem = subsystemRows(scoreSummary).find((subsystem) => subsystem.score < 5);

  if (weakSubsystem) {
    return `Improve ${weakSubsystem.framework} ${weakSubsystem.name} first.`;
  }

  if (sessionSummary.bloatRunnerLines > 900) {
    return "Continue splitting oversized harness sensors while preserving current gates.";
  }

  if (sessionSummary.nextBestWork.length > 0) {
    return `Next: ${sessionSummary.nextBestWork[0]}`;
  }

  return "Harness is ready for the next focused implementation slice.";
}

export function summarizeHarnessBenchmark(root = defaultRoot, options = {}) {
  const scoreSummary = options.scoreSummary ?? summarizeHarnessScore(root);
  const sessionSummary =
    options.sessionSummary ??
    summarizeHarnessSession(root, {
      execFileSync: options.execFileSync,
      harnessScoreSummary: scoreSummary,
    });

  return {
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    root,
    branch: sessionSummary.branch,
    latestCommit: sessionSummary.latestCommit,
    score: {
      overall: scoreSummary.overall,
      allPerfect: scoreSummary.allPerfect,
      frameworks: scoreSummary.frameworks.map((framework) => ({
        id: framework.id,
        name: framework.name,
        source: framework.source,
        overall: framework.overall,
        bottleneck: framework.allPerfect ? "none" : framework.bottleneck,
      })),
      subsystems: subsystemRows(scoreSummary),
    },
    metrics: {
      activePlanDocs: sessionSummary.activePlanCount,
      indexedActiveWorkstreams: sessionSummary.indexedWorkstreamCount,
      harnessCheckModules: sessionSummary.checkModuleCount,
      scriptTestFiles: sessionSummary.scriptTestCount,
      bloatRunnerLines: sessionSummary.bloatRunnerLines,
    },
    fiveTupleAudit: sessionSummary.fiveTupleAudit,
    nextBestWork: sessionSummary.nextBestWork,
    recommendation: recommendHarnessAction(scoreSummary, sessionSummary),
  };
}

export function formatHarnessBenchmarkReport(benchmark) {
  return [
    "JobSentinel harness benchmark",
    `Generated: ${benchmark.generatedAt}`,
    `Branch: ${benchmark.branch}`,
    `Latest commit: ${benchmark.latestCommit}`,
    `Overall: ${benchmark.score.overall}/100`,
    `Status: ${benchmark.score.allPerfect ? "all subsystems 5/5" : "incomplete"}`,
    "Frameworks:",
    ...benchmark.score.frameworks.map(
      (framework) => `- ${framework.name}: ${framework.overall}/100, bottleneck ${framework.bottleneck}`,
    ),
    "Metrics:",
    `- Active plan docs: ${benchmark.metrics.activePlanDocs}`,
    `- Indexed active workstreams: ${benchmark.metrics.indexedActiveWorkstreams}`,
    `- Harness check modules: ${benchmark.metrics.harnessCheckModules}`,
    `- Script test files: ${benchmark.metrics.scriptTestFiles}`,
    `- Bloat runner lines: ${benchmark.metrics.bloatRunnerLines}`,
    `Five-tuple audit: ${benchmark.fiveTupleAudit}`,
    "Next best work:",
    ...(benchmark.nextBestWork.length > 0
      ? benchmark.nextBestWork.map((item, index) => `${index + 1}. ${item}`)
      : ["1. No next-best-work items found."]),
    `Recommendation: ${benchmark.recommendation}`,
  ].join("\n");
}

if (process.argv[1] === scriptPath) {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(
      [
        "Usage: node scripts/harness-benchmark.mjs [ROOT] [--json] [--output FILE]",
        "",
        "Creates a structural harness benchmark from current score and session state.",
        "Default output is text on stdout. --output writes JSON only to the chosen file.",
      ].join("\n"),
    );
    process.exit(0);
  }

  const root = args._[0] ? resolve(args._[0]) : defaultRoot;
  const benchmark = summarizeHarnessBenchmark(root);

  if (args.output) {
    const outputPath = resolve(String(args.output));
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(benchmark, null, 2)}\n`, "utf8");
    console.log(`Benchmark JSON written to ${outputPath}`);
  }

  if (args.json) {
    console.log(JSON.stringify(benchmark, null, 2));
  } else {
    console.log(formatHarnessBenchmarkReport(benchmark));
  }

  if (!benchmark.score.allPerfect) {
    process.exitCode = 1;
  }
}
