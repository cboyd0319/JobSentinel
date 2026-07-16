import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

import { checkHarness } from "../checks/harness.mjs";
import { noCiExceptionId, validateHostedWorkflows } from "../harness/contract.mjs";
import { collectProductionExternalAiRequestFeatureIds } from "../harness-external-ai-features.mjs";
import { collectStateViolations, validateFeatureList } from "../harness/state.mjs";

const root = resolve(".");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeFixtureFile(fixtureRoot, path, content) {
  const fullPath = join(fixtureRoot, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "jobsentinel-harness-state-"));
  try {
    callback(fixtureRoot);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}

function validFeatureList() {
  return {
    schema: "jobsentinel.feature_list.v1",
    project: "Fixture",
    last_updated: "2026-07-14",
    active_status: "active",
    features: [
      {
        id: "one",
        priority: 1,
        area: "harness",
        title: "One feature",
        behavior: "One observable behavior.",
        user_visible_behavior: "One visible outcome.",
        status: "active",
        verification: ["npm test"],
        evidence: [],
        blocker: "",
        next_trigger: "Verify it.",
      },
    ],
  };
}

test("live harness satisfies the canonical semantic contract", () => {
  assert.deepEqual(checkHarness(root), []);
});

test("harness manifest names one owner per required subsystem and retired paths", () => {
  const manifest = readJson("harness-manifest.json");
  assert.equal(manifest.schema_version, 1);
  assert.deepEqual(Object.keys(manifest.owners).sort(), [
    "architecture", "environment", "feedback", "instructions", "state", "tools",
  ]);
  assert.ok(manifest.required_pack.includes("PROGRESS.md"));
  assert.ok(manifest.required_pack.includes("feature_list.json"));
  assert.ok(manifest.required_pack.includes("init.sh"));
  assert.ok(manifest.required_pack.includes("init.ps1"));
  assert.ok(manifest.retired_commands.includes("harness:score"));
  assert.equal(manifest.hosted_workflows.ci_enabled, false);
  assert.equal(manifest.hosted_workflows.authoritative_ci.length, 0);
  assert.equal(manifest.canonical_requirement_exceptions[0].id, noCiExceptionId);
  assert.match(manifest.canonical_requirement_exceptions[0].canonical_status, /nonconforming user override/);
});

test("hosted workflow policy rejects incomplete enabled CI", () => {
  withFixture((fixtureRoot) => {
    const path = ".github/workflows/ci.yml";
    writeFixtureFile(
      fixtureRoot,
      path,
      `name: CI

on:
  workflow_dispatch:

env:
  HOSTED_EXECUTION_DISABLED: "true"

jobs:
  unsafe:
    runs-on: ubuntu-latest
    steps:
      - if: \${{ false }}
        run: exit 0
`,
    );
    const violations = [];
    validateHostedWorkflows(
      fixtureRoot,
      { hosted_workflows: { ci_enabled: true, authoritative_ci: [path], manual_release: [] } },
      violations,
    );
    assert.match(violations.join("\n"), /must enable pull_request verification/);
    assert.match(violations.join("\n"), /must not contain a hosted-execution disable guard/);
  });
});

test("hosted workflow policy accepts only the exact active no-CI exception", () => {
  withFixture((fixtureRoot) => {
    writeFixtureFile(
      fixtureRoot,
      "docs/developer/CI_CD.md",
      "# Verification\n\nNo hosted continuous integration is configured.\n",
    );
    const liveManifest = readJson("harness-manifest.json");
    const violations = [];
    validateHostedWorkflows(
      fixtureRoot,
      {
        owners: { feedback: { hosted_workflow_root: ".github/workflows" } },
        hosted_workflows: {
          ci_enabled: false,
          authoritative_ci: [],
          manual_release: [],
          no_ci_projections: ["docs/developer/CI_CD.md"],
        },
        canonical_requirement_exceptions: liveManifest.canonical_requirement_exceptions,
      },
      violations,
    );
    assert.deepEqual(violations, []);
  });
});

test("hosted workflow policy rejects automatic CI while the exception is active", () => {
  withFixture((fixtureRoot) => {
    writeFixtureFile(
      fixtureRoot,
      ".github/workflows/rogue.yml",
      "name: Rogue\non:\n  pull_request:\njobs: {}\n",
    );
    const liveManifest = readJson("harness-manifest.json");
    const violations = [];
    validateHostedWorkflows(
      fixtureRoot,
      {
        owners: { feedback: { hosted_workflow_root: ".github/workflows" } },
        hosted_workflows: { ci_enabled: false, authoritative_ci: [], manual_release: [] },
        canonical_requirement_exceptions: liveManifest.canonical_requirement_exceptions,
      },
      violations,
    );
    assert.match(violations.join("\n"), /must not define automatic CI triggers/);
  });
});

test("hosted workflow policy rejects stale current CI documentation", () => {
  withFixture((fixtureRoot) => {
    writeFixtureFile(
      fixtureRoot,
      "docs/developer/TESTING.md",
      "# Testing\n\nTests run in CI with two retries.\n",
    );
    const liveManifest = readJson("harness-manifest.json");
    const violations = [];
    validateHostedWorkflows(
      fixtureRoot,
      {
        owners: { feedback: { hosted_workflow_root: ".github/workflows" } },
        hosted_workflows: {
          ci_enabled: false,
          authoritative_ci: [],
          manual_release: [],
          no_ci_projections: ["docs/developer/TESTING.md"],
        },
        canonical_requirement_exceptions: liveManifest.canonical_requirement_exceptions,
      },
      violations,
    );
    assert.match(violations.join("\n"), /must state the active pre-alpha-private-no-ci posture/);
    assert.match(violations.join("\n"), /must not claim tests run in hosted CI/);
  });
});

test("feature validator rejects ambiguous, unsupported, and unevidenced state", () => {
  const noActive = validFeatureList();
  noActive.features[0].status = "not_started";
  assert.match(validateFeatureList(root, noActive).join("\n"), /exactly one active feature; found 0/);

  const duplicate = validFeatureList();
  duplicate.features.push({ ...duplicate.features[0] });
  assert.match(validateFeatureList(root, duplicate).join("\n"), /feature id must be unique/);

  const passing = validFeatureList();
  passing.features[0].status = "passing";
  assert.match(validateFeatureList(root, passing).join("\n"), /passing requires evidence/);

  const blocked = validFeatureList();
  blocked.features[0].status = "blocked";
  blocked.features.push({ ...validFeatureList().features[0], id: "active-two" });
  assert.match(validateFeatureList(root, blocked).join("\n"), /blocked status requires blocker/);
});

test("progress markers must agree with the feature ledger", () => {
  withFixture((fixtureRoot) => {
    writeFixtureFile(fixtureRoot, "feature_list.json", `${JSON.stringify(validFeatureList(), null, 2)}\n`);
    writeFixtureFile(
      fixtureRoot,
      "PROGRESS.md",
      "# Progress\n\nLast updated: 2026-07-13\n\n- Active feature: `wrong`\n- Status: `active`\n",
    );
    const violations = collectStateViolations(fixtureRoot).join("\n");
    assert.match(violations, /active feature must match/);
    assert.match(violations, /last-updated dates must match/);
  });
});

test("feature privacy labels cover shipped external AI requests", () => {
  const labels = readJson("docs/harness/feature-privacy-labels.json");
  const featuresById = new Map(labels.features.map((feature) => [feature.id, feature]));
  for (const featureId of collectProductionExternalAiRequestFeatureIds()) {
    const feature = featuresById.get(featureId);
    assert.ok(feature, `missing privacy label manifest entry for ${featureId}`);
    assert.equal(feature.externalAi.allowed, true);
    assert.ok(feature.labels.includes("External AI optional") || feature.labels.includes("External AI required"));
  }
});

test("canonical state and manifest contain no local home paths", () => {
  const text = ["PROGRESS.md", "feature_list.json", "harness-manifest.json"]
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  assert.doesNotMatch(text, /(?:\/Users\/[^/<\s]+\/|[A-Za-z]:\\Users\\[^\\<\s]+\\)/);
});
