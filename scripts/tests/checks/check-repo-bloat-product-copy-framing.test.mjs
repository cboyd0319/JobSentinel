import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../../checks/repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-bloat-product-copy-framing-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects stale Resume Optimizer framing", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/app/Navigation.tsx",
      '{ id: "ats-optimizer", label: "Resume Optimizer", shortcut: "⌘8" }\n',
    );
    writeFixtureFile(
      root,
      "src/app/keyboard/KeyboardShortcutsProvider.tsx",
      'description: "Go to Resume Optimizer",\n',
    );
    writeFixtureFile(
      root,
      "src/app/App.tsx",
      '<PageErrorBoundary pageName="Resume Optimizer">\n',
    );
    writeFixtureFile(
      root,
      "src/features/resumes/builder/AtsLiveScorePanel.tsx",
      [
        '"ATS Score"',
        '"Fix format issues to improve ATS parsing"',
        '<Modal title="Full ATS Analysis" />',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/resumes/builder/ResumeBuilderPage.tsx",
      [
        '"ATS Format Score"',
        '"For detailed analysis and optimization recommendations, visit ATS"',
        '"Optimizer."',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/resumes/library/ResumeLibraryPage.tsx",
      '"AI-powered resume analysis and job matching"\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-documents/src/templates.rs",
      [
        "//! ATS-optimized resume templates for HTML rendering",
        "//! to ATS-parseable HTML. All templates follow ATS-safe design rules:",
        'description: "Clean, contemporary design with subtle styling. ATS-compatible."',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      [
        "Pick from 5 ATS-friendly templates",
        'ATS stands for "Applicant Tracking System"',
        "Get instant feedback on what keywords you're missing",
        "",
      ].join("\n"),
    );
    writeFixtureFile(root, "docs/releases/v2.0.md", "Resume Optimizer\n");
    writeFixtureFile(root, "docs/releases/v2.4.md", "Resume Optimizer\n");
    writeFixtureFile(root, "docs/releases/v2.6.0.md", "ATS score calculation\n");
    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/app/Navigation.tsx",
        "src/app/keyboard/KeyboardShortcutsProvider.tsx",
        "src/app/App.tsx",
        "src/features/resumes/builder/AtsLiveScorePanel.tsx",
        "src/features/resumes/library/ResumeLibraryPage.tsx",
        "src/features/resumes/builder/ResumeBuilderPage.tsx",
        "crates/jobsentinel-documents/src/templates.rs",
        "docs/user/QUICK_START.md",
        "docs/releases/v2.0.md",
        "docs/releases/v2.4.md",
        "docs/releases/v2.6.0.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src/app/Navigation.tsx",
      "src/app/keyboard/KeyboardShortcutsProvider.tsx",
      "src/app/App.tsx",
      "src/features/resumes/builder/AtsLiveScorePanel.tsx",
      "src/features/resumes/library/ResumeLibraryPage.tsx",
      "src/features/resumes/builder/ResumeBuilderPage.tsx",
      "crates/jobsentinel-documents/src/templates.rs",
      "docs/user/QUICK_START.md",
      "docs/releases/v2.0.md",
      "docs/releases/v2.4.md",
      "docs/releases/v2.6.0.md",
    ]) {
      assert.ok(
        violations.includes(`replace stale Resume Optimizer framing: ${path}`),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects application-assist automation framing", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/application-assist/ApplicationProfilePage.tsx",
      '"One-Click Apply Settings"; "Total Attempts"; "Success Rate"; "Submission Rate";\n',
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ApplyButton.tsx",
      '"Quick Apply"; "Prepare to apply - fills form fields automatically"; "Settings > Application Assist";\n',
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ApplicationPreview.tsx",
      '"Fields that will be auto-filled"; "Code profile";\n',
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ProfileForm.tsx",
      '"This information will be auto-filled when you apply to jobs"; "Automation Settings";\n',
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ScreeningAnswersForm.tsx",
      '"Add common answers to auto-fill screening questions during Quick Apply";\n',
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/DashboardHeader.tsx",
      '"Privacy-first job search automation";\n',
    );
    writeFixtureFile(
      root,
      "docs/features/application-assist.md",
      "# One-Click Apply\n\nFill out job applications in seconds, not minutes.\n",
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "Speed up applications with One-Click Apply.\n",
    );
    writeFixtureFile(root, "README.md", "One-click apply can fill supported forms.\n");
    writeFixtureFile(
      root,
      "index.html",
      '<meta name="description" content="Privacy-first job search automation" />\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/Cargo.toml",
      'description = "Privacy-first job search automation for Windows 11+"\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "README.md",
        "index.html",
        "src-tauri/Cargo.toml",
        "src/features/application-assist/ApplicationProfilePage.tsx",
        "src/features/application-assist/ApplyButton.tsx",
        "src/features/application-assist/ApplicationPreview.tsx",
        "src/features/application-assist/ProfileForm.tsx",
        "src/features/application-assist/ScreeningAnswersForm.tsx",
        "src/features/dashboard/components/DashboardHeader.tsx",
        "docs/features/application-assist.md",
        "docs/user/QUICK_START.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src/features/application-assist/ApplicationProfilePage.tsx",
      "src/features/application-assist/ApplyButton.tsx",
      "src/features/application-assist/ApplicationPreview.tsx",
      "src/features/application-assist/ProfileForm.tsx",
      "src/features/application-assist/ScreeningAnswersForm.tsx",
      "src/features/dashboard/components/DashboardHeader.tsx",
      "docs/features/application-assist.md",
      "docs/user/QUICK_START.md",
      "README.md",
      "index.html",
      "src-tauri/Cargo.toml",
    ]) {
      assert.ok(
        violations.includes(`replace application-assist automation framing: ${path}`),
        violations.join("\n"),
      );
    }
  });
});
