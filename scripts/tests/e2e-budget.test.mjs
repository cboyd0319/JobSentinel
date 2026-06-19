import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPlaywrightArgs,
  checkE2eBudget,
  extractJsonObject,
  formatE2eBudgetSummary,
  summarizePlaywrightReport,
} from "../e2e-budget.mjs";

const report = {
  stats: {
    duration: 12000,
    expected: 9,
    unexpected: 0,
    flaky: 0,
    skipped: 1,
  },
  suites: [
    {
      specs: [
        {
          tests: [{ outcome: "expected" }, { outcome: "expected" }],
        },
      ],
      suites: [
        {
          specs: [
            {
              tests: [{ outcome: "expected" }, { outcome: "skipped" }],
            },
          ],
        },
      ],
    },
  ],
};

test("summarizePlaywrightReport counts nested tests and stats", () => {
  assert.deepEqual(summarizePlaywrightReport(report), {
    durationMs: 12000,
    tests: 4,
    expected: 9,
    unexpected: 0,
    flaky: 0,
    skipped: 1,
  });
});

test("checkE2eBudget rejects duration, count, and unexpected result drift", () => {
  assert.deepEqual(
    checkE2eBudget(
      {
        durationMs: 45000,
        tests: 31,
        expected: 30,
        unexpected: 1,
        flaky: 0,
        skipped: 0,
      },
      { maxDurationMs: 30000, maxTests: 25 },
    ),
    [
      "1 unexpected Playwright test result(s)",
      "duration 45000ms exceeds budget 30000ms",
      "test count 31 exceeds budget 25",
    ],
  );
});

test("formatE2eBudgetSummary prints budget evidence", () => {
  const output = formatE2eBudgetSummary(
    summarizePlaywrightReport(report),
    { maxDurationMs: 30000, maxTests: 25 },
    [],
  );

  assert.match(output, /E2E Budget Summary/);
  assert.match(output, /Duration: 12000ms \/ 30000ms/);
  assert.match(output, /Tests: 4 \/ 25/);
});

test("extractJsonObject tolerates surrounding process output", () => {
  assert.deepEqual(extractJsonObject(`warning\n${JSON.stringify(report)}\n`), report);
});

test("buildPlaywrightArgs defaults to chromium smoke with JSON reporter", () => {
  assert.deepEqual(buildPlaywrightArgs(), [
    "test",
    "--project=chromium",
    "--grep",
    "@smoke",
    "--reporter=json",
  ]);
});

test("buildPlaywrightArgs preserves caller reporter", () => {
  assert.deepEqual(buildPlaywrightArgs(["test", "--reporter=json"]), ["test", "--reporter=json"]);
});
