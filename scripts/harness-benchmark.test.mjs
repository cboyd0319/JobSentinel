import assert from "node:assert/strict";
import test from "node:test";
import {
  formatHarnessBenchmarkReport,
  recommendHarnessAction,
  summarizeHarnessBenchmark,
} from "./harness-benchmark.mjs";

const perfectScoreSummary = {
  overall: 100,
  allPerfect: true,
  frameworks: [
    {
      id: "walkinglabs-lecture",
      name: "WalkingLabs Lecture Tuple",
      source:
        "https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-02-what-a-harness-actually-is/",
      overall: 100,
      allPerfect: true,
      bottleneck: "Instructions",
      subsystems: [
        { name: "Instructions", score: 5, passed: 5, total: 5 },
        { name: "Tools", score: 5, passed: 5, total: 5 },
      ],
    },
    {
      id: "walkinglabs-harness-creator",
      name: "WalkingLabs Harness Creator Tuple",
      source:
        "https://github.com/walkinglabs/learn-harness-engineering/tree/main/skills/harness-creator/scripts",
      overall: 100,
      allPerfect: true,
      bottleneck: "Lifecycle",
      subsystems: [
        { name: "Verification", score: 5, passed: 5, total: 5 },
        { name: "Lifecycle", score: 5, passed: 5, total: 5 },
      ],
    },
  ],
};

const sessionSummary = {
  branch: "## main...origin/main",
  latestCommit: "abc1234 Example commit",
  activePlanCount: 5,
  indexedWorkstreamCount: 5,
  checkModuleCount: 16,
  scriptTestCount: 28,
  bloatRunnerLines: 921,
  harnessScore: { overall: 100, status: "all subsystems 5/5" },
  fiveTupleAudit: "docs/harness/five-tuple-audit-2026-06-01.md",
  nextBestWork: ["Continue broad-audience fixture audit."],
};

test("summarizeHarnessBenchmark combines score, session metrics, and recommendation", () => {
  const benchmark = summarizeHarnessBenchmark("/tmp/repo", {
    generatedAt: "2026-06-01T00:00:00.000Z",
    scoreSummary: perfectScoreSummary,
    sessionSummary,
  });

  assert.equal(benchmark.generatedAt, "2026-06-01T00:00:00.000Z");
  assert.equal(benchmark.score.overall, 100);
  assert.equal(benchmark.score.frameworks[0].bottleneck, "none");
  assert.equal(benchmark.metrics.activePlanDocs, 5);
  assert.equal(benchmark.metrics.scriptTestFiles, 28);
  assert.equal(
    benchmark.recommendation,
    "Continue splitting oversized harness sensors while preserving current gates.",
  );
});

test("recommendHarnessAction points at weak subsystem before next work", () => {
  const weakScoreSummary = {
    ...perfectScoreSummary,
    allPerfect: false,
    frameworks: [
      {
        ...perfectScoreSummary.frameworks[0],
        allPerfect: false,
        subsystems: [
          { name: "Instructions", score: 5, passed: 5, total: 5 },
          { name: "Tools", score: 4, passed: 4, total: 5 },
        ],
      },
    ],
  };

  assert.equal(
    recommendHarnessAction(weakScoreSummary, sessionSummary),
    "Improve WalkingLabs Lecture Tuple Tools first.",
  );
});

test("formatHarnessBenchmarkReport prints portable restart evidence", () => {
  const benchmark = summarizeHarnessBenchmark("/tmp/repo", {
    generatedAt: "2026-06-01T00:00:00.000Z",
    scoreSummary: perfectScoreSummary,
    sessionSummary,
  });
  const output = formatHarnessBenchmarkReport(benchmark);

  assert.match(output, /JobSentinel harness benchmark/);
  assert.match(output, /Overall: 100\/100/);
  assert.match(output, /Status: all subsystems 5\/5/);
  assert.match(output, /WalkingLabs Lecture Tuple: 100\/100, bottleneck none/);
  assert.match(output, /Bloat runner lines: 921/);
  assert.match(output, /Continue broad-audience fixture audit\./);
});
