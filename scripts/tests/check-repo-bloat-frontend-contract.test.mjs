import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../checks/repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-bloat-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function lineFixture(count) {
  return Array.from(
    { length: count },
    (_, index) => `const fixtureLine${index} = ${index};`,
  ).join("\n");
}


test("checkRepoBloat rejects runtime frontend invokes missing dev mock cases", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/RuntimeInvoke.tsx",
      [
        "import { invoke } from '@tauri-apps/api/core';",
        "export async function load() {",
        "  return await invoke('missing_runtime_command');",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/dev-runtime/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'known_command':",
        "      return undefined;",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/components/RuntimeInvoke.tsx",
        "src/dev-runtime/mocks/handlers.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync dev mock handlers for runtime invokes: src/dev-runtime/mocks/handlers.ts missing missing_runtime_command",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale salary benchmark frontend shape", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/salary/model.ts",
      [
        "interface SalaryBenchmark {",
        "  role: string;",
        "  p50: number;",
        "  p90: number;",
        "}",
        "export function Salary({ benchmark }) {",
        "  return benchmark.role + benchmark.p90;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src/features/salary/model.ts"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync salary benchmark frontend shape: src/features/salary/model.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unsupported salary seniority option values", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/salary/model.ts",
      [
        "const SENIORITY_LEVELS = [",
        '  { value: "executive", label: "Executive/Director" },',
        "];",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src/features/salary/model.ts"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync salary benchmark frontend shape: src/features/salary/model.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale interview follow-up frontend shape", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/applications/InterviewScheduler.tsx",
      [
        "export function mapFollowup(result) {",
        "  return { thankYouSent: result.thank_you_sent, sentAt: result.sent_at };",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/features/applications/InterviewScheduler.tsx",
      ],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync interview follow-up frontend shape: src/features/applications/InterviewScheduler.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale resume match sub-score display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/resumes/library/ResumeLibraryPage.tsx",
      [
        "export function Resume({ match }) {",
        "  return <div style={{ width: `${match.skills_match_score}%` }}>{Math.round(match.experience_match_score)}%</div>;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/features/resumes/library/ResumeLibraryPage.tsx",
      ],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "render resume match sub-scores from backend fractions: src/features/resumes/library/ResumeLibraryPage.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale resume E2E match seeds", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "tests/e2e/playwright/resume-upload-matching.spec.ts",
      [
        "const seededMatches = [{",
        "  overall_match_score: 86,",
        "  skills_match_score: 88,",
        '  gap_analysis: "✓ React experience matches",',
        "}];",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "tests/e2e/playwright/resume-upload-matching.spec.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync resume E2E match seeds with backend fraction shape: tests/e2e/playwright/resume-upload-matching.spec.ts",
      ),
      violations.join("\n"),
    );
  });
});
