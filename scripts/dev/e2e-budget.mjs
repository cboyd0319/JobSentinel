#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { playwrightCliPath, preparePlaywrightEnv } from "./run-playwright.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultBudget = {
  maxDurationMs: 30000,
  maxTests: 25,
};

function parseArgs(argv) {
  const args = { _: [], playwrightArgs: [] };
  let afterSeparator = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (afterSeparator) {
      args.playwrightArgs.push(token);
      continue;
    }

    if (token === "--") {
      afterSeparator = true;
      continue;
    }

    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }

    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) =>
      letter.toUpperCase(),
    );
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

function readNumber(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function flattenSuites(suites = []) {
  return suites.flatMap((suite) => [
    suite,
    ...flattenSuites(suite.suites ?? []),
  ]);
}

function countTestsFromSuites(suites = []) {
  return flattenSuites(suites).reduce(
    (count, suite) =>
      count +
      (suite.specs ?? []).reduce(
        (specCount, spec) => specCount + (spec.tests ?? []).length,
        0,
      ),
    0,
  );
}

function countResults(report) {
  return flattenSuites(report.suites ?? []).reduce((counts, suite) => {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        const outcome = test.outcome ?? "unknown";
        counts[outcome] = (counts[outcome] ?? 0) + 1;
      }
    }
    return counts;
  }, {});
}

export function summarizePlaywrightReport(report) {
  const stats = report.stats ?? {};
  const tests = countTestsFromSuites(report.suites ?? []);
  const outcomes = countResults(report);
  const unexpected = Number(stats.unexpected ?? outcomes.unexpected ?? 0);
  const flaky = Number(stats.flaky ?? outcomes.flaky ?? 0);
  const skipped = Number(stats.skipped ?? outcomes.skipped ?? 0);
  const expected = Number(
    stats.expected ??
      outcomes.expected ??
      Math.max(0, tests - unexpected - flaky - skipped),
  );

  return {
    durationMs: Number(stats.duration ?? 0),
    tests,
    expected,
    unexpected,
    flaky,
    skipped,
  };
}

export function checkE2eBudget(summary, budget = defaultBudget) {
  const failures = [];

  if (summary.unexpected > 0) {
    failures.push(`${summary.unexpected} unexpected Playwright test result(s)`);
  }

  if (summary.durationMs > budget.maxDurationMs) {
    failures.push(
      `duration ${summary.durationMs}ms exceeds budget ${budget.maxDurationMs}ms`,
    );
  }

  if (summary.tests > budget.maxTests) {
    failures.push(
      `test count ${summary.tests} exceeds budget ${budget.maxTests}`,
    );
  }

  return failures;
}

export function formatE2eBudgetSummary(summary, budget, failures = []) {
  const lines = [
    "E2E Budget Summary",
    `Duration: ${summary.durationMs}ms / ${budget.maxDurationMs}ms`,
    `Tests: ${summary.tests} / ${budget.maxTests}`,
    `Outcomes: ${summary.expected} expected, ${summary.unexpected} unexpected, ${summary.flaky} flaky, ${summary.skipped} skipped`,
  ];

  if (failures.length > 0) {
    lines.push("Failures:");
    lines.push(...failures.map((failure) => `- ${failure}`));
  }

  return lines.join("\n");
}

export function extractJsonObject(output) {
  const trimmed = output.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end < start) {
    throw new Error("Playwright JSON output was not found.");
  }

  return JSON.parse(trimmed.slice(start, end + 1));
}

export function buildPlaywrightArgs(playwrightArgs = []) {
  const args =
    playwrightArgs.length > 0
      ? playwrightArgs
      : ["test", "--project=chromium", "--grep", "@smoke"];
  const hasReporter = args.some(
    (arg) => arg === "--reporter=json" || arg.startsWith("--reporter="),
  );

  return hasReporter ? args : [...args, "--reporter=json"];
}

async function runPlaywrightJson(playwrightArgs) {
  const cliPath = playwrightCliPath();
  const env = await preparePlaywrightEnv();
  const result = spawnSync(
    process.execPath,
    [cliPath, ...buildPlaywrightArgs(playwrightArgs)],
    {
      encoding: "utf8",
      env,
      maxBuffer: 1024 * 1024 * 20,
    },
  );

  if (result.error) {
    throw result.error;
  }

  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

if (process.argv[1] === scriptPath) {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(
      [
        "Usage: node scripts/dev/e2e-budget.mjs [--report FILE] [--write-report FILE] [--max-duration-ms N] [--max-tests N] -- [playwright args]",
        "",
        "Runs Playwright with JSON output or checks an existing Playwright JSON report against duration and test-count budgets.",
        "Default run: test --project=chromium --grep @smoke",
      ].join("\n"),
    );
    process.exit(0);
  }

  const budget = {
    maxDurationMs: readNumber(args.maxDurationMs, defaultBudget.maxDurationMs),
    maxTests: readNumber(args.maxTests, defaultBudget.maxTests),
  };
  let reportText = "";
  let playWrightExitCode = 0;

  if (args.report) {
    reportText = readFileSync(resolve(String(args.report)), "utf8");
  } else {
    const result = await runPlaywrightJson(args.playwrightArgs);
    playWrightExitCode = result.status;
    reportText = result.stdout;

    if (result.stderr.trim()) {
      process.stderr.write(result.stderr);
    }
  }

  if (args.writeReport) {
    const outputPath = resolve(String(args.writeReport));
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, reportText.trimEnd() + "\n", "utf8");
  }

  const report = extractJsonObject(reportText);
  const summary = summarizePlaywrightReport(report);
  const failures = checkE2eBudget(summary, budget);

  console.log(formatE2eBudgetSummary(summary, budget, failures));

  if (playWrightExitCode !== 0 || failures.length > 0) {
    process.exitCode = 1;
  }
}
