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
  hasUnsafeResumeOptimizerJsonParsing,
  missingRuntimeMockInvokeCases,
} from "./harness/checks/frontend-contracts.mjs";

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
    writeFixtureFile(root, "src/mocks/handlers.ts", 'case "save_search": return null;\n');

    assert.equal(hasStaleUserDataMockHandlers(root, "src/mocks/handlers.ts"), true);
    assert.equal(hasStaleDeepLinkMockHandlers(root, "src/mocks/handlers.ts"), true);
    assert.equal(hasStaleFeedbackMockHandlers(root, "src/mocks/handlers.ts"), true);
  });
});

test("frontend contracts reject stale feedback system-info architecture fields", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/services/feedbackService.ts", "systemInfo.arch;\n");
    writeFixtureFile(root, "src/mocks/handlers.ts", 'case "get_system_info": return { arch: "x64" };\n');

    assert.equal(
      hasStaleFeedbackSystemInfoArchitecture(root, "src/services/feedbackService.ts"),
      true,
    );
    assert.equal(
      hasStaleFeedbackSystemInfoArchitecture(root, "src/mocks/handlers.ts"),
      true,
    );
    assert.equal(
      hasStaleFeedbackSystemInfoArchitecture(root, "src/components/Navigation.tsx"),
      false,
    );
  });
});

test("frontend contracts reject stale resume optimizer and ATS shapes", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      'case "analyze_resume_format": return { issues: [] };\n',
    );
    writeFixtureFile(
      root,
      "src/pages/ResumeOptimizer.tsx",
      "const resume: AtsResumeData = JSON.parse(resumeJson);\n",
    );
    writeFixtureFile(
      root,
      "src/components/AtsLiveScorePanel.tsx",
      "type Keyword = { found_in: string; context: string; };\n",
    );

    assert.equal(hasStaleResumeOptimizerMockHandlers(root, "src/mocks/handlers.ts"), true);
    assert.equal(
      hasUnsafeResumeOptimizerJsonParsing(root, "src/pages/ResumeOptimizer.tsx"),
      true,
    );
    assert.equal(
      hasStaleAtsKeywordMatchFrontendShape(root, "src/components/AtsLiveScorePanel.tsx"),
      true,
    );
  });
});

test("frontend contracts reject resume suggestion category drift", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/resume/ats_analyzer.rs",
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
      "src/pages/ResumeOptimizer.tsx",
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
      "src/components/AtsLiveScorePanel.tsx",
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
      "src/mocks/handlers.ts",
      'type MockSuggestionCategory = "AddKeyword" | "RewordBullet" | "AddSection";\n',
    );

    assert.equal(
      hasResumeSuggestionCategoryDrift(root, "src/pages/ResumeOptimizer.tsx"),
      true,
    );
    assert.equal(hasResumeSuggestionCategoryDrift(root, "src/mocks/handlers.ts"), true);
    assert.equal(hasResumeSuggestionCategoryDrift(root, "src/pages/Salary.tsx"), false);
  });
});

test("frontend contracts detect runtime invokes missing dev mock cases", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/pages/Dashboard.tsx", 'invoke("search_jobs");\n');
    writeFixtureFile(root, "src/mocks/handlers.ts", 'case "get_jobs": return [];\n');
    trackFixtureFiles(root, ["src/pages/Dashboard.tsx", "src/mocks/handlers.ts"]);

    assert.deepEqual(missingRuntimeMockInvokeCases(root, "src/mocks/handlers.ts"), [
      "search_jobs",
    ]);
    assert.deepEqual(missingRuntimeMockInvokeCases(root, "src/pages/Dashboard.tsx"), []);
  });
});

test("frontend contracts ignore commented runtime invokes when checking mock cases", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/pages/Dashboard.tsx",
      '// invoke("commented_out");\nconst href = "https://example.com//not-a-comment";\n',
    );
    writeFixtureFile(root, "src/mocks/handlers.ts", "");
    trackFixtureFiles(root, ["src/pages/Dashboard.tsx", "src/mocks/handlers.ts"]);

    assert.deepEqual(missingRuntimeMockInvokeCases(root, "src/mocks/handlers.ts"), []);
  });
});

test("frontend contracts reject stale salary, interview, resume, and E2E match shapes", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/pages/Salary.tsx", "type Benchmark = { p50: number; };\n");
    writeFixtureFile(root, "src/components/InterviewScheduler.tsx", "thank_you_sent;\n");
    writeFixtureFile(root, "src/pages/Resume.tsx", "Math.round(match.skills_match_score);\n");
    writeFixtureFile(
      root,
      "tests/e2e/playwright/resume-upload-matching.spec.ts",
      "overall_match_score: 88,\n",
    );

    assert.equal(hasStaleSalaryBenchmarkFrontendShape(root, "src/pages/Salary.tsx"), true);
    assert.equal(
      hasStaleInterviewFollowupFrontendShape(root, "src/components/InterviewScheduler.tsx"),
      true,
    );
    assert.equal(hasStaleResumeMatchSubscoreDisplay(root, "src/pages/Resume.tsx"), true);
    assert.equal(
      hasStaleResumeE2eMatchSeed(root, "tests/e2e/playwright/resume-upload-matching.spec.ts"),
      true,
    );
  });
});
