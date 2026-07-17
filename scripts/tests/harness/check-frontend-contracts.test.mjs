import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasStaleAtsKeywordMatchFrontendShape,
  hasStaleDeepLinkMockHandlers,
  hasStaleFeedbackMockHandlers,
  hasStaleFeedbackSystemInfoArchitecture,
  hasStaleInterviewFollowupFrontendShape,
  hasStaleResumeE2eMatchSeed,
  hasStaleResumeMatchSubscoreDisplay,
  hasStaleResumeOptimizerMockHandlers,
  hasResumeSuggestionCategoryDrift,
  hasStaleSalaryBenchmarkFrontendShape,
  hasStaleUserDataMockHandlers,
  hasUnsafeResumeMatchJsonParsing,
  missingRuntimeMockInvokeCases,
} from "../../harness/checks/frontend-contracts.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-frontend-contracts-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function trackFixtureFiles(root, paths) {
  execFileSync("git", ["add", ...paths], { cwd: root });
}

test("frontend contracts reject stale user-data, deep-link, and feedback mock handlers", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/dev-runtime/mocks/handlers.ts", 'case "save_search": return null;\n');

    assert.equal(hasStaleUserDataMockHandlers(root, "src/dev-runtime/mocks/handlers.ts"), true);
    assert.equal(hasStaleDeepLinkMockHandlers(root, "src/dev-runtime/mocks/handlers.ts"), true);
    assert.equal(hasStaleFeedbackMockHandlers(root, "src/dev-runtime/mocks/handlers.ts"), true);
  });
});

test("frontend contracts reject stale feedback system-info architecture fields", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/settings/support/feedback/feedbackReportFormatting.ts",
      "systemInfo.arch;\n",
    );
    writeFixtureFile(root, "src/dev-runtime/mocks/handlers.ts", 'case "get_system_info": return { arch: "x64" };\n');

    assert.equal(
      hasStaleFeedbackSystemInfoArchitecture(
        root,
        "src/features/settings/support/feedback/feedbackReportFormatting.ts",
      ),
      true,
    );
    assert.equal(
      hasStaleFeedbackSystemInfoArchitecture(root, "src/dev-runtime/mocks/handlers.ts"),
      true,
    );
    assert.equal(
      hasStaleFeedbackSystemInfoArchitecture(root, "src/app/Navigation.tsx"),
      false,
    );
  });
});

test("frontend contracts reject stale resume optimizer and ATS shapes", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/dev-runtime/mocks/handlers.ts",
      'case "analyze_resume_format": return { issues: [] };\n',
    );
    writeFixtureFile(
      root,
      "src/features/resumes/matching/ResumeMatchPage.tsx",
      "const resume: AtsResumeData = JSON.parse(resumeJson);\n",
    );
    writeFixtureFile(
      root,
      "src/features/resumes/builder/AtsLiveScorePanel.tsx",
      "type Keyword = { found_in: string; context: string; };\n",
    );
    writeFixtureFile(
      root,
      "src/features/resumes/matching/resumeMatchModel.ts",
      "type Keyword = { found_in: string; context: string; };\n",
    );

    assert.equal(hasStaleResumeOptimizerMockHandlers(root, "src/dev-runtime/mocks/handlers.ts"), true);
    assert.equal(
      hasUnsafeResumeMatchJsonParsing(root, "src/features/resumes/matching/ResumeMatchPage.tsx"),
      true,
    );
    assert.equal(
      hasStaleAtsKeywordMatchFrontendShape(root, "src/features/resumes/matching/resumeMatchModel.ts"),
      true,
    );
    assert.equal(
      hasStaleAtsKeywordMatchFrontendShape(root, "src/features/resumes/builder/AtsLiveScorePanel.tsx"),
      true,
    );
  });
});

test("frontend contracts accept split Resume Match validation ownership", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/resumes/matching/ResumeMatchPage.tsx",
      "const resume = parseAtsResumeInput(resumeJson);\n",
    );
    writeFixtureFile(
      root,
      "src/features/resumes/matching/resumeMatchModel.ts",
      'export { parseAtsResumeInput } from "./resumeMatchValidation";\n',
    );
    writeFixtureFile(
      root,
      "src/features/resumes/matching/resumeMatchValidation.ts",
      [
        "function isStructuredResume(value: unknown) { return Boolean(value); }",
        "export function parseAtsResumeInput(value: string) {",
        "  return isStructuredResume(JSON.parse(value));",
        "}",
      ].join("\n"),
    );

    assert.equal(
      hasUnsafeResumeMatchJsonParsing(
        root,
        "src/features/resumes/matching/resumeMatchValidation.ts",
      ),
      false,
    );
  });
});

test("frontend contracts reject resume suggestion category drift", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-documents/src/ats_analyzer.rs",
      `
pub enum SuggestionCategory {
    AddKeyword,
    RewordBullet,
    AddSection,
    ReorderContent,
    FormatFix,
}
`,
    );
    writeFixtureFile(
      root,
      "src/features/resumes/matching/resumeMatchModel.ts",
      `
type SuggestionCategory = "AddKeyword" | "RewordBullet" | "AddSection" | "RemoveItem";
function formatSuggestionCategory(category: SuggestionCategory): string {
  switch (category) {
    case "AddKeyword": return "Add job words";
    case "RewordBullet": return "Rewrite bullet";
    case "AddSection": return "Add section";
    case "RemoveItem": return "Remove item";
  }
}
`,
    );
    writeFixtureFile(
      root,
      "src/features/resumes/builder/AtsLiveScorePanelModel.ts",
      `
interface AtsSuggestion {
  category: "AddKeyword" | "RewordBullet" | "AddSection" | "ReorderContent" | "FormatFix";
}
function formatSuggestionCategory(category: AtsSuggestion["category"]): string {
  switch (category) {
    case "AddKeyword": return "Add job words";
    case "RewordBullet": return "Rewrite bullet";
    case "AddSection": return "Add section";
    case "ReorderContent": return "Reorder content";
    case "FormatFix": return "Safety check";
  }
}
`,
    );
    writeFixtureFile(
      root,
      "src/dev-runtime/mocks/handlers.ts",
      'type MockSuggestionCategory = "AddKeyword" | "RewordBullet" | "AddSection";\n',
    );

    assert.equal(
      hasResumeSuggestionCategoryDrift(root, "src/features/resumes/matching/resumeMatchModel.ts"),
      true,
    );
    assert.equal(
      hasResumeSuggestionCategoryDrift(root, "src/features/resumes/builder/AtsLiveScorePanelModel.ts"),
      true,
    );
    assert.equal(hasResumeSuggestionCategoryDrift(root, "src/dev-runtime/mocks/handlers.ts"), true);
    assert.equal(hasResumeSuggestionCategoryDrift(root, "src/features/salary/SalaryPage.tsx"), false);
  });
});

test("frontend contracts detect runtime invokes missing dev mock cases", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/features/dashboard/DashboardPage.tsx", 'invoke("search_jobs");\n');
    writeFixtureFile(root, "src/dev-runtime/mocks/handlers.ts", 'case "get_jobs": return [];\n');
    trackFixtureFiles(root, ["src/features/dashboard/DashboardPage.tsx", "src/dev-runtime/mocks/handlers.ts"]);

    assert.deepEqual(missingRuntimeMockInvokeCases(root, "src/dev-runtime/mocks/handlers.ts"), [
      "search_jobs",
    ]);
    assert.deepEqual(missingRuntimeMockInvokeCases(root, "src/features/dashboard/DashboardPage.tsx"), []);
  });
});

test("frontend contracts ignore commented runtime invokes when checking mock cases", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/dashboard/DashboardPage.tsx",
      '// invoke("commented_out");\nconst href = "https://example.com//not-a-comment";\n',
    );
    writeFixtureFile(root, "src/dev-runtime/mocks/handlers.ts", "");
    trackFixtureFiles(root, ["src/features/dashboard/DashboardPage.tsx", "src/dev-runtime/mocks/handlers.ts"]);

    assert.deepEqual(missingRuntimeMockInvokeCases(root, "src/dev-runtime/mocks/handlers.ts"), []);
  });
});

test("frontend contracts reject stale salary, interview, resume, and E2E match shapes", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/features/salary/model.ts", "type Benchmark = { p50: number; };\n");
    writeFixtureFile(root, "src/features/applications/InterviewScheduler.tsx", "thank_you_sent;\n");
    writeFixtureFile(root, "src/features/resumes/library/ResumeLibraryPage.tsx", "Math.round(match.skills_match_score);\n");
    writeFixtureFile(
      root,
      "tests/e2e/playwright/resume-upload-matching.spec.ts",
      "overall_match_score: 88,\n",
    );

    assert.equal(hasStaleSalaryBenchmarkFrontendShape(root, "src/features/salary/model.ts"), true);
    assert.equal(
      hasStaleInterviewFollowupFrontendShape(root, "src/features/applications/InterviewScheduler.tsx"),
      true,
    );
    assert.equal(hasStaleResumeMatchSubscoreDisplay(root, "src/features/resumes/library/ResumeLibraryPage.tsx"), true);
    assert.equal(
      hasStaleResumeE2eMatchSeed(root, "tests/e2e/playwright/resume-upload-matching.spec.ts"),
      true,
    );
  });
});
