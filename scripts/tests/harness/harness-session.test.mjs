import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import {
  formatHarnessSessionSummary,
  parseHarnessSessionArgs,
  summarizeHarnessSession,
} from "../../harness/session.mjs";

function writeFixtureFile(root, path, content) {
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

function writeValidState(root) {
  writeFixtureFile(root, "package.json", '{"name":"jobsentinel","description":"Fixture purpose"}\n');
  writeFixtureFile(root, "harness-manifest.json", '{"owners":{"instructions":{"canonical":"AGENTS.md"}}}\n');
  writeFixtureFile(root, "PROGRESS.md", "# Progress\n\nLast updated: 2026-07-14\n\n- Active feature: `one`\n- Status: `active`\n");
  writeFixtureFile(root, "feature_list.json", `${JSON.stringify({
    schema: "jobsentinel.feature_list.v1",
    project: "Fixture",
    last_updated: "2026-07-14",
    active_status: "active",
    features: [{
      id: "one",
      priority: 1,
      area: "harness",
      title: "One feature",
      behavior: "Observable behavior.",
      user_visible_behavior: "Visible behavior.",
      status: "active",
      verification: ["npm test"],
      evidence: [],
      blocker: "",
      next_trigger: "Run npm test.",
    }, {
      id: "two",
      priority: 2,
      area: "product",
      title: "Blocked feature",
      behavior: "Blocked behavior.",
      user_visible_behavior: "Blocked visible behavior.",
      status: "blocked",
      verification: ["npm test"],
      evidence: [],
      blocker: "A verified prerequisite is missing.",
      next_trigger: "Verify the prerequisite.",
    }],
  }, null, 2)}\n`);
}

function fakeGit(_command, args) {
  if (args[0] === "status") return "## main\n";
  if (args[0] === "log") return "abc1234 Current\ndef5678 Prior\n";
  throw new Error(`unexpected git call: ${args.join(" ")}`);
}

test("session summary is derived only from canonical root state", () => {
  withFixture((root) => {
    writeValidState(root);
    const summary = summarizeHarnessSession(root, { execFileSync: fakeGit });
    assert.equal(summary.activeFeature.id, "one");
    assert.equal(summary.activeFeature.priority, 1);
    assert.equal(summary.projectPurpose, "Fixture purpose");
    assert.equal(summary.canonicalInstructionOwner, "AGENTS.md");
    assert.deepEqual(summary.recentCommits, ["abc1234 Current", "def5678 Prior"]);
    assert.match(formatHarnessSessionSummary(summary), /Active feature: one/);
    assert.match(formatHarnessSessionSummary(summary), /- npm test/);
    assert.match(formatHarnessSessionSummary(summary), /two: A verified prerequisite is missing/);
  });
});

test("session fails on invalid or contradictory state", () => {
  withFixture((root) => {
    writeValidState(root);
    writeFixtureFile(root, "feature_list.json", "{invalid\n");
    assert.throws(() => summarizeHarnessSession(root, { execFileSync: fakeGit }), /fix invalid feature_list.json/);
  });
});

test("session argument parser accepts one root and json", () => {
  assert.deepEqual(parseHarnessSessionArgs(["--json"], "/repo"), { root: "/repo", json: true });
  assert.throws(() => parseHarnessSessionArgs(["--unknown"], "/repo"), /Unknown option/);
});
