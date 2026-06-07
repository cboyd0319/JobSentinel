import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { formatHarnessScoreReport, summarizeHarnessScore } from "./harness-score.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-harness-score-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writeCompleteHarnessFixture(root) {
  writeFixtureFile(root, ".nvmrc", "20\n");
  writeFixtureFile(
    root,
    "rust-toolchain.toml",
    ['[toolchain]', 'channel = "stable"', 'components = ["clippy", "rustfmt"]'].join("\n"),
  );
  writeFixtureFile(
    root,
    "package.json",
    JSON.stringify({
      scripts: {
        build: "vite build",
        doctor: "node scripts/doctor.mjs",
        "doctor:e2e": "node scripts/doctor.mjs --e2e",
        "harness:benchmark": "node scripts/harness-benchmark.mjs",
        "harness:check": "node scripts/check-harness.mjs",
        "harness:plan": "node scripts/harness-plan.mjs",
        "harness:score": "node scripts/harness-score.mjs",
        "harness:session": "node scripts/harness-session.mjs",
        "lint:bloat": "node scripts/check-repo-bloat.mjs",
        "lint:external-ai": "node scripts/check-external-ai-gateway.mjs",
        "lint:security": "node scripts/check-security-sensors.mjs",
        "lint:tests": "node scripts/check-test-quality.mjs",
        "test:e2e": "playwright test",
        "test:run": "vitest run",
        "test:scripts": "node --test scripts/*.test.mjs",
      },
    }),
  );
  writeFixtureFile(root, "package-lock.json", "{}");
  writeFixtureFile(root, "src-tauri/Cargo.lock", "");
  writeFixtureFile(root, "src-tauri/.cargo/config.toml", 'SQLX_OFFLINE = "true"');

  writeFixtureFile(
    root,
    "AGENTS.md",
    [
      "docs/harness/README.md",
      "docs/harness/verification-matrix.md",
      "DESIGN.md",
      "docs/design/README.md",
      "docs/design/design-spec.md",
      "npm run harness:check",
    ].join("\n"),
  );
  writeFixtureFile(
    root,
    "DESIGN.md",
    [
      'name: "JobSentinel Quiet Shield"',
      "Protective Navy is the target dark theme.",
      "Responsive layouts must never create horizontal page scroll.",
      "theme tokens, contrast checks, screenshots, and native Computer Use validation",
    ].join("\n"),
  );
  writeFixtureFile(
    root,
    "docs/design/README.md",
    [
      "# JobSentinel Design Docs",
      "They are product contracts, not inspiration boards.",
      "Do not claim the full Protective Navy migration is complete until visual verification confirms every major route and state.",
    ].join("\n"),
  );
  writeFixtureFile(
    root,
    "docs/design/design-spec.md",
    [
      "# JobSentinel Design Spec",
      "Protective Navy is the target dark theme.",
      "Toasts and modals stay in viewport.",
      "full migration until all major routes are verified",
    ].join("\n"),
  );
  writeFixtureFile(
    root,
    "docs/developer/DESIGN_SPEC.md",
    [
      "# Design Spec Compatibility Pointer",
      "DESIGN.md",
      "docs/design/design-spec.md",
      "Harness checks require this file to stay a pointer",
    ].join("\n"),
  );
  writeFixtureFile(
    root,
    "docs/harness/README.md",
    [
      "## Rule 0",
      "User privacy and security are non-negotiable.",
      "Rule 0 wins",
      "## Current Standard",
      "Design contract",
      "DESIGN.md",
      "docs/",
      "PRIVACY.md",
      "RESPONSIBLE_AI.md",
      "## Operating Loop",
      "Update docs and plan state",
    ].join("\n"),
  );
  writeFixtureFile(
    root,
    "docs/harness/change-contract.md",
    ["Scope:", "Out of scope:", "Acceptance criteria:", "Rule 0 evidence:"].join("\n"),
  );
  writeFixtureFile(
    root,
    "docs/harness/agent-operating-model.md",
    ["docs/harness/README.md", "docs/harness/verification-matrix.md"].join("\n"),
  );
  writeFixtureFile(
    root,
    "docs/harness/verification-matrix.md",
    ["| Change | Required sensor |", "npm run harness:check", "npm run test:run"].join(
      "\n",
    ),
  );
  writeFixtureFile(
    root,
    "docs/harness/five-tuple-scorecard-2026-06-01.md",
    [
      "Before Current Slice",
      "After Current Slice",
      "100/100",
      "Observed performance change",
      "npm run harness:score",
    ].join("\n"),
  );
  writeFixtureFile(root, "docs/developer/ARCHITECTURE.md", "# Architecture\n");

  writeFixtureFile(
    root,
    "docs/plans/index.json",
    JSON.stringify({
      goal:
        "Move toward zero drift from the locked Quiet Shield redesign in DESIGN.md, docs/design/README.md, and docs/design/design-spec.md.",
      activeWorkstreams: [
        { id: "active-status", path: "docs/plans/active/status.md", state: "active", nextStep: "Next" },
        {
          id: "current-work",
          path: "docs/plans/active/current-work.md",
          state: "active",
          nextStep: "Next",
          verification: "Computer Use or Playwright screenshot proof",
        },
      ],
    }),
  );
  writeFixtureFile(
    root,
    "docs/plans/active/status.md",
    [
      "## Next Best Work",
      "1. Continue.",
      "Quiet Shield redesign is now part of the active repo-wide goal and the repo harness.",
      "DESIGN.md",
      "docs/design/README.md",
      "docs/design/design-spec.md",
      "## Completion Bar",
    ].join("\n"),
  );
  writeFixtureFile(
    root,
    "docs/plans/active/current-work.md",
    [
      "# Current Work",
      "Locked redesign: DESIGN.md, docs/design/README.md, and docs/design/design-spec.md.",
      "## Sensors",
      "## Handoff",
    ].join("\n"),
  );
  writeFixtureFile(root, "docs/plans/tech-debt-tracker.md", "# Debt\n");
  writeFixtureFile(
    root,
    "docs/plans/templates/exec-plan-template.md",
    ["In scope:", "Out of scope:", "User-ease result:", "Verification result:"].join("\n"),
  );

  writeFixtureFile(root, "scripts/doctor.mjs", ".nvmrc\nrust-toolchain.toml\n");
  writeFixtureFile(root, "scripts/harness-session.mjs", "nextBestWork\nactivePlanCount\n");
  writeFixtureFile(
    root,
    "scripts/check-harness.mjs",
    "checkExternalAiGateway\ncheckRepoBloat\ncheckTestQuality\nsummarizeHarnessScore\nfive-tuple\n",
  );
  writeFixtureFile(root, "scripts/check-harness-policy.test.mjs", "");
  writeFixtureFile(root, "scripts/harness-benchmark.mjs", "");
  writeFixtureFile(root, "scripts/harness-benchmark.test.mjs", "");
  writeFixtureFile(root, "scripts/harness-plan.mjs", "");
  writeFixtureFile(root, "scripts/harness-score.mjs", "");
  writeFixtureFile(root, "scripts/harness-score.test.mjs", "");
  writeFixtureFile(root, "scripts/harness-session.test.mjs", "");

  for (let index = 0; index < 20; index += 1) {
    writeFixtureFile(root, `scripts/generated-${index}.test.mjs`, "");
  }
}

test("summarizeHarnessScore reports all repo-managed subsystems at 5/5", () => {
  withFixture((root) => {
    writeCompleteHarnessFixture(root);

    const summary = summarizeHarnessScore(root);

    assert.equal(summary.overall, 100);
    assert.equal(summary.allPerfect, true);
    for (const framework of summary.frameworks) {
      assert.equal(framework.overall, 100);
      for (const subsystem of framework.subsystems) {
        assert.equal(subsystem.score, 5, `${framework.name} ${subsystem.name}`);
      }
    }
  });
});

test("summarizeHarnessScore catches stubbed design contract docs", () => {
  withFixture((root) => {
    writeCompleteHarnessFixture(root);
    writeFixtureFile(root, "DESIGN.md", "# Design\n");

    const summary = summarizeHarnessScore(root);
    const creator = summary.frameworks.find(
      (framework) => framework.id === "walkinglabs-harness-creator",
    );
    const instructions = creator.subsystems.find(
      (subsystem) => subsystem.name === "Instructions",
    );

    assert.equal(summary.allPerfect, false);
    assert.equal(instructions.score < 5, true);
    assert.equal(
      instructions.checks.find((item) => item.label === "Design contract docs carry Quiet Shield rules").pass,
      false,
    );
  });
});

test("summarizeHarnessScore catches missing environment pins", () => {
  withFixture((root) => {
    writeCompleteHarnessFixture(root);
    writeFixtureFile(root, ".nvmrc", "26\n");

    const summary = summarizeHarnessScore(root);
    const lecture = summary.frameworks.find((framework) => framework.id === "walkinglabs-lecture");
    const environment = lecture.subsystems.find((subsystem) => subsystem.name === "Environment");

    assert.equal(summary.allPerfect, false);
    assert.equal(environment.score < 5, true);
    assert.ok(
      environment.checks.some(
        (item) => item.label === "Node runtime target is pinned" && item.pass === false,
      ),
    );
  });
});

test("formatHarnessScoreReport shows both five-tuple frameworks", () => {
  withFixture((root) => {
    writeCompleteHarnessFixture(root);

    const output = formatHarnessScoreReport(summarizeHarnessScore(root));

    assert.match(output, /Overall: 100\/100/);
    assert.match(output, /WalkingLabs Lecture Tuple: 100\/100/);
    assert.match(output, /WalkingLabs Harness Creator Tuple: 100\/100/);
    assert.match(output, /Status: all subsystems 5\/5/);
  });
});
