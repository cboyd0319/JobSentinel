import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  staleSuggestionCategoryLabelsSource,
  staleSuggestionCategoryMockSource,
  suggestionCategoryRustSource,
} from "../lib/source-fixtures.mjs";
import { checkRepoBloat } from "../../checks/repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "js-bloat-resume-contracts-"));
  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects stale resume optimizer mock handlers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/dev-runtime/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'analyze_resume_format':",
        "      return { issues: [], recommendations: [] };",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );
    execFileSync("git", ["add", "package.json", "src/dev-runtime/mocks/handlers.ts"], {
      cwd: root,
    });
    const violations = checkRepoBloat(root);
    assert.ok(
      violations.includes(
        "sync resume optimizer mock command handlers: src/dev-runtime/mocks/handlers.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale resume suggestion category labels", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-documents/src/ats_analyzer.rs",
      suggestionCategoryRustSource,
    );
    writeFixtureFile(
      root,
      "src/features/resumes/shared/atsAnalysisLabels.ts",
      staleSuggestionCategoryLabelsSource,
    );
    writeFixtureFile(
      root,
      "src/features/resumes/builder/AtsLiveScorePanel.tsx",
      'type SuggestionCategory = "AddKeyword" | "RewordBullet" | "AddSection" | "ReorderContent" | "FormatFix";\n',
    );
    writeFixtureFile(
      root,
      "src/dev-runtime/mocks/handlers.ts",
      staleSuggestionCategoryMockSource,
    );
    execFileSync(
      "git",
      [
        "add",
        "crates/jobsentinel-documents/src/ats_analyzer.rs",
        "src/features/resumes/shared/atsAnalysisLabels.ts",
        "src/features/resumes/builder/AtsLiveScorePanel.tsx",
        "src/dev-runtime/mocks/handlers.ts",
      ],
      { cwd: root },
    );
    const violations = checkRepoBloat(root);
    assert.ok(
      violations.includes(
        "sync resume suggestion category labels: src/features/resumes/shared/atsAnalysisLabels.ts",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync resume suggestion category labels: src/dev-runtime/mocks/handlers.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale ATS keyword match frontend shape", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/resumes/matching/resumeMatchModel.ts",
      [
        "interface KeywordMatch {",
        "  keyword: string;",
        "  found_in: string;",
        "  context: string;",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/resumes/builder/AtsLiveScorePanel.tsx",
      [
        "interface KeywordMatch {",
        "  keyword: string;",
        "  found_in: string;",
        "  context: string;",
        "}",
        "",
      ].join("\n"),
    );
    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/features/resumes/matching/resumeMatchModel.ts",
        "src/features/resumes/builder/AtsLiveScorePanel.tsx",
      ],
      { cwd: root },
    );
    const violations = checkRepoBloat(root);
    assert.ok(
      violations.includes(
        "sync ATS keyword match frontend shape: src/features/resumes/matching/resumeMatchModel.ts",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync ATS keyword match frontend shape: src/features/resumes/builder/AtsLiveScorePanel.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unsafe Resume Match JSON parsing", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/resumes/matching/ResumeMatchPage.tsx",
      [
        "async function handleAnalyze() {",
        "  const resume: AtsResumeData = JSON.parse(resumeJson);",
        "  await invoke('analyze_resume_format', { resume });",
        "}",
        "",
      ].join("\n"),
    );
    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/features/resumes/matching/ResumeMatchPage.tsx",
      ],
      {
        cwd: root,
      },
    );
    const violations = checkRepoBloat(root);
    assert.ok(
      violations.includes(
        "validate Resume Match JSON before invoke: src/features/resumes/matching/ResumeMatchPage.tsx",
      ),
      violations.join("\n"),
    );
  });
});
