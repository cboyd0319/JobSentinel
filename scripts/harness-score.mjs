#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildFrameworks } from "./harness/score-frameworks.mjs";
import { scoreFramework } from "./harness/score-utils.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");

export function summarizeHarnessScore(root = defaultRoot) {
  const frameworks = buildFrameworks(root).map(scoreFramework);
  const overall = Math.round(
    frameworks.reduce((sum, framework) => sum + framework.overall, 0) / frameworks.length,
  );

  return {
    overall,
    frameworks,
    allPerfect: frameworks.every((framework) => framework.allPerfect),
  };
}

export function formatHarnessScoreReport(summary) {
  const lines = [
    "JobSentinel five-tuple harness score",
    `Overall: ${summary.overall}/100`,
    `Status: ${summary.allPerfect ? "all subsystems 5/5" : "incomplete"}`,
    "",
  ];

  for (const framework of summary.frameworks) {
    lines.push(`${framework.name}: ${framework.overall}/100`);
    lines.push(`Source: ${framework.source}`);
    lines.push(`Tuple: ${framework.tuple.join(", ")}`);
    lines.push(`Bottleneck: ${framework.allPerfect ? "none" : framework.bottleneck}`);

    for (const subsystem of framework.subsystems) {
      lines.push(`- ${subsystem.name}: ${subsystem.score}/5 (${subsystem.passed}/${subsystem.total})`);
      for (const item of subsystem.checks) {
        lines.push(`  ${item.pass ? "PASS" : "FAIL"} ${item.label} [${item.evidence}]`);
      }
    }

    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

if (process.argv[1] === scriptPath) {
  const rootArg = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  const root = rootArg ? resolve(rootArg) : defaultRoot;
  const summary = summarizeHarnessScore(root);

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(formatHarnessScoreReport(summary));
  }

  if (!summary.allPerfect && !process.argv.includes("--allow-incomplete")) {
    process.exitCode = 1;
  }
}
