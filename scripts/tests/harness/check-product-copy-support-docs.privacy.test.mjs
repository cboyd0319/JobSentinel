import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasFeedbackSetupJargon,
  hasTechnicalFirstUserCopy,
} from "../../harness/checks/product-copy.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(
    join(tmpdir(), "jobsentinel-product-copy-support-docs-"),
  );

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("product copy rejects first-run and Rule 0 privacy drift", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/onboarding/SetupWizard.tsx",
      "Career Path\nReview & Edit\nComplete setup wizard\n",
    );
    writeFixtureFile(
      root,
      "src/features/onboarding/CareerProfileSelector.tsx",
      "My Own Search\nStarts with {profile.keywordsBoost.length} helpful skills\n",
    );
    writeFixtureFile(
      root,
      "README.md",
      "Click Open Anyway.\nNo data is ever sent.\nuser-configured alerts\nmetadata logging\npayload minimization\npayload preview\n",
    );
    writeFixtureFile(
      root,
      "PRIVACY.md",
      [
        "Optional user-configured job-source addresses",
        "These addresses are off unless configured",
        "metadata only",
        "raw titles",
        "raw location",
        "raw local match reasons",
        "raw prompts",
        "Public ATS postings.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "RESPONSIBLE_AI.md",
      "payload minimization\npayload preview\nlocal metadata logging\n",
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "Click Run anyway.\nYour data stays yours. Always.\n",
    );
    writeFixtureFile(
      root,
      "SECURITY.md",
      "Works completely offline\nSensitive data never written to disk unencrypted\nemail the maintainer directly or use GitHub's private vulnerability\n",
    );
    writeFixtureFile(
      root,
      "CODE_OF_CONDUCT.md",
      "Instances of unacceptable behavior may be reported by opening an issue or contacting\nthe maintainer directly.\n",
    );
    writeFixtureFile(
      root,
      "src/app/errors/ErrorBoundary.tsx",
      "Your data is safe.\n",
    );

    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "src/features/onboarding/SetupWizard.tsx",
      ),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "src/features/onboarding/CareerProfileSelector.tsx",
      ),
      true,
    );
    assert.equal(hasTechnicalFirstUserCopy(root, "README.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "PRIVACY.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "RESPONSIBLE_AI.md"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/user/QUICK_START.md"),
      true,
    );
    assert.equal(hasTechnicalFirstUserCopy(root, "SECURITY.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "CODE_OF_CONDUCT.md"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/app/errors/ErrorBoundary.tsx"),
      true,
    );
  });
});

test("product copy rejects conflated alert and support channels", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      [
        "| Optional external channels | Slack, Discord, email, GitHub feedback, and Google Drive are user-configured only. |",
        "| External alerts | Slack, Discord, email, GitHub, and Google Drive are user-configured. |",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "PRIVACY.md",
      "Feedback or issue-report sharing through configured GitHub or Google Drive paths.\n",
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "README.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "PRIVACY.md"), true);
  });
});

test("product copy rejects technical source labels and unsafe public issue templates", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/settings/SettingsPage.tsx",
      [
        "Review before anything is sent",
        "<dt>Endpoint</dt>",
        "<dt>Remote filter</dt>",
        "<dt>Result limit</dt>",
        "Not remote-only",
        "Get optional USAJobs access code",
        "Settings backup saved",
        "Saved passwords and connection codes are left out for safety.",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      ".github/ISSUE_TEMPLATE/bug_report.yml",
      "Report the bug.\n",
    );
    writeFixtureFile(
      root,
      ".github/ISSUE_TEMPLATE/feature_request.yml",
      [
        "Please don't include personal information.",
        "JobSentinel can create a safe support report that redacts sensitive",
        "details before you share it.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      ".github/ISSUE_TEMPLATE/question.yml",
      [
        "Please don't include personal information.",
        "JobSentinel can create a safe support report that redacts known",
        "sensitive details before you share it.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      ".github/ISSUE_TEMPLATE/scraper_issue.yml",
      "Report a source issue.\n",
    );

    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/features/settings/SettingsPage.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, ".github/ISSUE_TEMPLATE/bug_report.yml"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        ".github/ISSUE_TEMPLATE/feature_request.yml",
      ),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, ".github/ISSUE_TEMPLATE/question.yml"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        ".github/ISSUE_TEMPLATE/scraper_issue.yml",
      ),
      true,
    );
  });
});

test("product copy rejects stale zero-technical resume and shortcut copy", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/resumes/library/ResumeLibraryPage.tsx",
      "Import Resume Data\nNo Resume Uploaded\nResume uploaded\nUpload Resume\nUpload New\nUploading...\nUploaded:\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/SettingsPage.tsx",
      "When enabled, job scores use skills from your uploaded resume.\nUpload your resume in the Resume tab first. If no resume is added, scoring uses your job titles.\n",
    );
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      "Uploaded resume skills\n",
    );
    writeFixtureFile(
      root,
      "src/features/resumes/matching/ResumeMatchPage.tsx",
      [
        "Improve Bullet Point",
        "Improved Version",
        "Could not improve bullet",
        "Tailor Resume for This Job",
        'ScoreItem label="Completeness"',
        "Paste resume details exported from JobSentinel or another supported tool.",
        "Paste resume app export here",
        "Resume app export not recognized",
        "Browser session storage is unavailable. Resume Builder cannot tailor against this job.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/DashboardFiltersBar.tsx",
      "Navigate: j/k, Open: o/Enter, Hide: h\nj/k/o/h\n",
    );

    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "src/features/resumes/library/ResumeLibraryPage.tsx",
      ),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/features/settings/SettingsPage.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/smart-scoring.md"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "src/features/resumes/matching/ResumeMatchPage.tsx",
      ),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "src/features/dashboard/components/DashboardFiltersBar.tsx",
      ),
      true,
    );
  });
});

test("product copy rejects technical backend error labels", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/errors.rs",
      [
        'Self::Database => "Database Error",',
        'Self::Configuration => "Configuration Error",',
        'Self::Validation => "Invalid Input",',
        'return Some("Database is busy. Close other apps using JobSentinel and try again.");',
        'return Some("SSL certificate error. Check your system clock and network settings.");',
        'return Some("Restart JobSentinel and contact support.");',
        "",
      ].join("\n"),
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src-tauri/src/ipc/errors.rs"),
      true,
    );
  });
});

test("product copy rejects non-protective no-response labels", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/applications/ApplicationsPage.tsx",
      "Detect Ghosted\n",
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/DashboardWidgets.tsx",
      'label="Ghosted"\n',
    );
    writeFixtureFile(
      root,
      "src/features/applications/AnalyticsPanel.tsx",
      'ghosted: "Ghosted"\n',
    );
    writeFixtureFile(
      root,
      "tests/e2e/playwright/application-tracking.spec.ts",
      '["ghosted", "Ghosted"]\n',
    );
    writeFixtureFile(
      root,
      "docs/features/application-tracking.md",
      "| Ghosted | No response |\nNo response after the configured quiet period.\nSlack, Discord, Teams, SMTP, or other channels are used only if the user configures them.\n",
    );

    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "src/features/applications/ApplicationsPage.tsx",
      ),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "src/features/dashboard/components/DashboardWidgets.tsx",
      ),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "src/features/applications/AnalyticsPanel.tsx",
      ),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "tests/e2e/playwright/application-tracking.spec.ts",
      ),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/application-tracking.md"),
      true,
    );
  });
});
