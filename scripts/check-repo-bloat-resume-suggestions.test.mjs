import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "./check-repo-bloat.mjs";

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
    writeFixtureFile(root, "src/pages/ResumeOptimizer.tsx", frontendText);
    writeFixtureFile(root, "src/components/AtsLiveScorePanelModel.ts", frontendText);
    writeFixtureFile(root, "src/mocks/handlers.ts", "export {}\n");
    writeFixtureFile(
      root,
      "src/mocks/handlers/resumeAnalysis.ts",
      'export type MockSuggestionCategory = "AddKeyword" | "RewordBullet" | "AddSection" | "ReorderContent" | "FormatFix";\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "src-tauri/src/core/resume/ats_analyzer.rs",
        "src/pages/ResumeOptimizer.tsx",
        "src/components/AtsLiveScorePanelModel.ts",
        "src/mocks/handlers.ts",
        "src/mocks/handlers/resumeAnalysis.ts",
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
