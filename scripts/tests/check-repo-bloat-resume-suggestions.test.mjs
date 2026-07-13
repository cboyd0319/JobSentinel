import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../check-repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-resume-suggestions-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat accepts split mock resume suggestion category labels", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/resume/ats_analyzer.rs",
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
    const frontendText = `
type SuggestionCategory = "AddKeyword" | "RewordBullet" | "AddSection" | "ReorderContent" | "FormatFix";
function label(category: SuggestionCategory): string {
  switch (category) {
    case "FormatFix":
      return "Safety check";
    case "ReorderContent":
      return "Reorder content";
    default:
      return category;
  }
}
`;
    writeFixtureFile(root, "src/features/resumes/matching/ResumeMatchPage.tsx", frontendText);
    writeFixtureFile(root, "src/features/resumes/builder/AtsLiveScorePanelModel.ts", frontendText);
    writeFixtureFile(root, "src/mocks/handlers.ts", "export {}\n");
    writeFixtureFile(
      root,
      "src/features/resumes/mocks/resumeAnalysis.ts",
      'export type MockSuggestionCategory = "AddKeyword" | "RewordBullet" | "AddSection" | "ReorderContent" | "FormatFix";\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "crates/jobsentinel-core/src/core/resume/ats_analyzer.rs",
        "src/features/resumes/matching/ResumeMatchPage.tsx",
        "src/features/resumes/builder/AtsLiveScorePanelModel.ts",
        "src/mocks/handlers.ts",
        "src/features/resumes/mocks/resumeAnalysis.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.equal(
      violations.some((violation) =>
        violation.startsWith("sync resume suggestion category labels:")
      ),
      false,
      violations.join("\n"),
    );
  });
});
