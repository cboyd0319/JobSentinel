import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  extractNextBestWork,
  formatHarnessSessionSummary,
  parseHarnessSessionArgs,
  summarizeHarnessSession,
} from "../harness-session.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-harness-session-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function fakeGit(command, args) {
  if (command !== "git") {
    throw new Error(`unexpected command: ${command}`);
  }

  if (args.join(" ") === "status --short --branch") {
    return "## main...origin/main [ahead 44]\n";
  }

  if (args.join(" ") === "log -1 --oneline") {
    return "abc1234 Example commit\n";
  }

  throw new Error(`unexpected git args: ${args.join(" ")}`);
}

test("extractNextBestWork reads numbered next-work items only", () => {
  const statusText = [
    "# Active Plan Status",
    "",
    "## Next Best Work",
    "",
    "1. Continue zero-technical UX review.",
    "2. Continue privacy-edge review.",
    "",
    "## Completion Bar",
    "",
  ].join("\n");

  assert.deepEqual(extractNextBestWork(statusText), [
    "Continue zero-technical UX review.",
    "Continue privacy-edge review.",
  ]);
});

test("summarizeHarnessSession reports branch, counts, audit path, and next work", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/plans/active/status.md", "## Next Best Work\n\n1. Keep going.\n");
    writeFixtureFile(root, "docs/plans/active/plan-one.md", "# Plan One\n");
    writeFixtureFile(
      root,
      "docs/plans/index.json",
      JSON.stringify({ activeWorkstreams: [{ id: "one", path: "docs/plans/active/plan-one.md" }] }),
    );
    writeFixtureFile(root, "scripts/harness/checks/a.mjs", "");
    writeFixtureFile(root, "scripts/harness/checks/b.mjs", "");
    writeFixtureFile(root, "scripts/tests/one.test.mjs", "");
    writeFixtureFile(root, "scripts/security/tests/two.test.mjs", "");
    writeFixtureFile(root, "scripts/checks/repo-bloat.mjs", "one\ntwo\n");
    writeFixtureFile(root, "docs/harness/archive/five-tuple-audit-2026-06-01.md", "# Audit\n");

    const summary = summarizeHarnessSession(root, {
      execFileSync: fakeGit,
      harnessScoreSummary: { overall: 100, allPerfect: true },
    });

    assert.equal(summary.branch, "## main...origin/main [ahead 44]");
    assert.equal(summary.latestCommit, "abc1234 Example commit");
    assert.equal(summary.activePlanCount, 2);
    assert.equal(summary.indexedWorkstreamCount, 1);
    assert.equal(summary.checkModuleCount, 2);
    assert.equal(summary.scriptTestCount, 2);
    assert.equal(summary.bloatRunnerLines, 2);
    assert.equal(summary.fiveTupleAudit, "docs/harness/archive/five-tuple-audit-2026-06-01.md");
    assert.deepEqual(summary.harnessScore, { overall: 100, status: "all subsystems 5/5" });
    assert.deepEqual(summary.nextBestWork, ["Keep going."]);
  });
});

test("formatHarnessSessionSummary prints one restart surface", () => {
  const output = formatHarnessSessionSummary({
    branch: "## main",
    latestCommit: "abc1234 Example commit",
    activePlanCount: 3,
    indexedWorkstreamCount: 4,
    checkModuleCount: 12,
    scriptTestCount: 31,
    bloatRunnerLines: 1176,
    harnessScore: { overall: 100, status: "all subsystems 5/5" },
    fiveTupleAudit: "docs/harness/archive/five-tuple-audit-2026-06-01.md",
    nextBestWork: ["Continue privacy review."],
  });

  assert.match(output, /Harness Session Snapshot/);
  assert.match(output, /Branch: ## main/);
  assert.match(output, /Indexed active workstreams: 4/);
  assert.match(output, /Five-tuple score: 100\/100 \(all subsystems 5\/5\)/);
  assert.match(output, /Bloat runner lines: 1176/);
  assert.match(output, /1\. Continue privacy review\./);
});

test("parseHarnessSessionArgs accepts json flag without treating it as root", () => {
  const parsed = parseHarnessSessionArgs(["--json"], "/repo");

  assert.deepEqual(parsed, { root: "/repo", json: true, nextWorkLimit: null });
});

test("parseHarnessSessionArgs accepts root and json flag in either order", () => {
  const requestedRoot = join(tmpdir(), "repo");
  const rootFirst = parseHarnessSessionArgs([requestedRoot, "--json"], "/repo");
  const flagFirst = parseHarnessSessionArgs(["--json", requestedRoot], "/repo");

  assert.equal(rootFirst.root, requestedRoot);
  assert.equal(rootFirst.json, true);
  assert.equal(rootFirst.nextWorkLimit, null);
  assert.equal(flagFirst.root, requestedRoot);
  assert.equal(flagFirst.json, true);
  assert.equal(flagFirst.nextWorkLimit, null);
});

test("parseHarnessSessionArgs accepts limit without treating it as root", () => {
  const parsed = parseHarnessSessionArgs(["--limit", "2"], "/repo");

  assert.deepEqual(parsed, { root: "/repo", json: false, nextWorkLimit: 2 });
});

test("parseHarnessSessionArgs rejects unknown flags", () => {
  assert.throws(
    () => parseHarnessSessionArgs(["--bad-flag"], "/repo"),
    /Unknown option: --bad-flag/,
  );
});

test("parseHarnessSessionArgs rejects invalid limits", () => {
  assert.throws(
    () => parseHarnessSessionArgs(["--limit"], "/repo"),
    /--limit requires a non-negative integer/,
  );
  assert.throws(
    () => parseHarnessSessionArgs(["--limit", "-1"], "/repo"),
    /--limit requires a non-negative integer/,
  );
});

test("extractNextBestWork joins wrapped numbered items", () => {
  const statusText = [
    "# Active Plan Status",
    "",
    "## Next Best Work",
    "",
    "1. Continue broad-audience fixture audit in less obvious fixture paths outside",
    "   current sensors, while preserving tech-specific cases only when they test",
    "   explicit branch behavior.",
    "2. Run final broad verification only when evidence is ready.",
    "",
    "## Completion Bar",
    "",
  ].join("\n");

  assert.deepEqual(extractNextBestWork(statusText), [
    "Continue broad-audience fixture audit in less obvious fixture paths outside current sensors, while preserving tech-specific cases only when they test explicit branch behavior.",
    "Run final broad verification only when evidence is ready.",
  ]);
});
