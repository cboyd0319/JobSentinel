import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasApplicationAssistAutomationFraming,
  hasFeedbackLocalReportDrift,
  hasEngineerFirstResumeTemplateCopy,
  hasFeedbackTechnicalCompanyLabels,
  hasLegacyPreferenceListCopy,
  hasNonProtectiveScoreCopy,
  hasOverconfidentGhostCopy,
  hasOverconfidentPayGuidance,
  hasRawErrorBoundaryDetails,
  hasRawFeedbackDebugEventDetails,
  hasRawProblemHistoryContextDetails,
  hasStaleResumeOptimizerFraming,
  hasTechnicalRecoveryCopy,
  hasTechnicalFirstUserCopy,
} from "./harness/checks/product-copy.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-product-copy-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("product copy rejects stale Resume Optimizer framing", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/features/resume-matcher.md", "ATS Resume Optimizer\n");

    assert.equal(
      hasStaleResumeOptimizerFraming(root, "docs/features/resume-matcher.md"),
      true,
    );
    assert.equal(
      hasStaleResumeOptimizerFraming(root, "docs/features/ghost-detection.md"),
      false,
    );
  });
});

test("product copy rejects engineer-first resume template copy", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/features/resume-builder.md",
      "Technical Skills-First is perfect for engineering roles.\n",
    );

    assert.equal(
      hasEngineerFirstResumeTemplateCopy(root, "docs/features/resume-builder.md"),
      true,
    );
  });
});

test("product copy rejects application automation framing", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/features/one-click-apply.md",
      "One-Click Apply\nThis application platform supports form automation.\n",
    );
    writeFixtureFile(
      root,
      "src/components/automation/ApplyButton.tsx",
      "const badge = <span title={atsInfo?.automationNotes || undefined} />;\n",
    );

    assert.equal(
      hasApplicationAssistAutomationFraming(root, "docs/features/one-click-apply.md"),
      true,
    );
    assert.equal(
      hasApplicationAssistAutomationFraming(root, "src/components/automation/ApplyButton.tsx"),
      true,
    );
  });
});

test("product copy rejects overconfident ghost-risk copy", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/features/ghost-detection.md", "Likely Ghost\n");

    assert.equal(hasOverconfidentGhostCopy(root, "docs/features/ghost-detection.md"), true);
  });
});

test("product copy rejects overconfident pay guidance", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/features/salary-ai.md", "Always negotiate.\n");

    assert.equal(hasOverconfidentPayGuidance(root, "docs/features/salary-ai.md"), true);
  });
});

test("product copy rejects raw feedback report presentation", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/components/feedback/DebugInfoPreview.tsx",
      "JSON.stringify(event.details)",
    );
    writeFixtureFile(root, "src/services/feedbackService.ts", "Company blocklist\n");
    writeFixtureFile(root, "src/components/ErrorLogPanel.tsx", "JSON.stringify(error.context)");

    assert.equal(
      hasRawFeedbackDebugEventDetails(root, "src/components/feedback/DebugInfoPreview.tsx"),
      true,
    );
    assert.equal(
      hasFeedbackTechnicalCompanyLabels(root, "src/services/feedbackService.ts"),
      true,
    );
    assert.equal(
      hasRawProblemHistoryContextDetails(root, "src/components/ErrorLogPanel.tsx"),
      true,
    );
    assert.equal(hasRawFeedbackDebugEventDetails(root, "src/components/ErrorLogPanel.tsx"), false);
  });
});

test("product copy rejects debug-report roadmap wording", () => {
  withFixture((root) => {
    writeFixtureFile(root, "README.md", "Use the in-app safe debug report.\n");
    writeFixtureFile(root, "ROADMAP.md", "One-click sanitized debug report flow\n");
    writeFixtureFile(root, "docs/README.md", "Safe debug reports\n");
    writeFixtureFile(root, "docs/ROADMAP.md", "| Debug reports | Sanitized reports |\n");
    writeFixtureFile(
      root,
      "docs/harness/verification-matrix.md",
      "Playwright flow that proves user can recover or copy a sanitized debug report\n",
    );
    writeFixtureFile(
      root,
      "src/components/ErrorLogPanel.tsx",
      "Copy Safe Report\nSafe report details\n",
    );
    writeFixtureFile(
      root,
      "src/components/ModalErrorBoundary.tsx",
      "Save Safe Report\nSafe report copied\n",
    );
    writeFixtureFile(
      root,
      "src/components/feedback/SubmitOptions.tsx",
      "Save a safe report\nSafe report so you can paste it before submitting.\n",
    );
    writeFixtureFile(
      root,
      "src/components/feedback/DescriptionInput.tsx",
      "Can you reproduce it?\nSelect a category first...\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/feedback/report.rs",
      "Report type: Bug Report\nformat!(\"[{}] {:?}\\n\")\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/feedback/debug_log.rs",
      "Debug Log ({} events):\n[COMMAND]\n",
    );

    assert.equal(hasFeedbackLocalReportDrift(root, "README.md"), true);
    assert.equal(hasFeedbackLocalReportDrift(root, "ROADMAP.md"), true);
    assert.equal(hasFeedbackLocalReportDrift(root, "docs/README.md"), true);
    assert.equal(hasFeedbackLocalReportDrift(root, "docs/ROADMAP.md"), true);
    assert.equal(
      hasFeedbackLocalReportDrift(root, "docs/harness/verification-matrix.md"),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(root, "src/components/ErrorLogPanel.tsx"),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(root, "src/components/ModalErrorBoundary.tsx"),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(root, "src/components/feedback/SubmitOptions.tsx"),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(root, "src/components/feedback/DescriptionInput.tsx"),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(root, "src-tauri/src/commands/feedback/report.rs"),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(root, "src-tauri/src/commands/feedback/debug_log.rs"),
      true,
    );
  });
});

test("product copy rejects technical recovery and raw error details", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/components/ErrorBoundary.tsx",
      [
        "const title = `${pageName || 'Page'} Error`;",
        "return this.state.error.message;",
        "",
      ].join("\n"),
    );
    writeFixtureFile(root, "src/components/ScraperHealthDashboard.tsx", "window state");

    assert.equal(hasRawErrorBoundaryDetails(root, "src/components/ErrorBoundary.tsx"), true);
    assert.equal(hasTechnicalRecoveryCopy(root, "src/components/ErrorBoundary.tsx"), true);
    assert.equal(
      hasTechnicalRecoveryCopy(root, "src/components/ScraperHealthDashboard.tsx"),
      true,
    );
    assert.equal(hasRawErrorBoundaryDetails(root, "src/components/ScraperHealthDashboard.tsx"), false);
  });
});

test("product copy rejects non-protective scoring and legacy preference copy", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/components/ScoreDisplay.tsx", "Great Match!");
    writeFixtureFile(root, "docs/features/application-tracking.md", "Company Whitelist");
    writeFixtureFile(
      root,
      "src/utils/scoreUtils.ts",
      'if (score >= 90) return "Excellent";\nif (score >= 80) return "Great";\nreturn "Poor";\n',
    );

    assert.equal(hasNonProtectiveScoreCopy(root, "src/components/ScoreDisplay.tsx"), true);
    assert.equal(
      hasLegacyPreferenceListCopy(root, "docs/features/application-tracking.md"),
      true,
    );
    assert.equal(hasNonProtectiveScoreCopy(root, "src/utils/scoreUtils.ts"), true);
    assert.equal(hasNonProtectiveScoreCopy(root, "src/components/ErrorBoundary.tsx"), false);
  });
});

test("product copy rejects technical-first settings copy", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/pages/Settings.tsx", "Config imported\nAdvanced Settings\n");
    writeFixtureFile(
      root,
      "src/pages/ResumeOptimizer.tsx",
      [
        "Exported resume details",
        "Paste exported resume details here",
        "Please paste your resume details first",
        "Resume details not recognized",
        "For a PDF resume, upload it on Resume Match first.",
        "Paste a job post and resume details, then choose Review Match",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/SetupWizard.tsx",
      'placeholder="https://hooks.slack.com/services/..." label="Slack connection link"',
    );
    writeFixtureFile(root, "src/pages/Settings.test.tsx", "Config imported\n");
    writeFixtureFile(root, "docs/features/smart-scoring.md", "Settings > Advanced Settings\n");
    writeFixtureFile(
      root,
      "src/components/NotificationPreferences.tsx",
      [
        "setLoadError('Failed to load notification preferences')",
        "toast.error('Failed to save', 'Your changes have been reverted')",
        "Source Alert Rules",
        "Which Jobs Alert You",
        "Choose which sources and filters can interrupt you",
        "Detailed rules currently apply to Indeed, Greenhouse, Lever, and JobsWithGPT",
        "Minimum Salary",
        "K/year",
        "e.g., Senior, Lead, Staff",
        "",
      ].join("\n"),
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Settings.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/ResumeOptimizer.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/SetupWizard.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Settings.test.tsx"), false);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/smart-scoring.md"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/NotificationPreferences.tsx"),
      true,
    );
  });
});

test("product copy rejects support troubleshooting jargon", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/pages/Settings.tsx", "These logs can help diagnose it.\n");
    writeFixtureFile(
      root,
      "src/components/feedback/DebugInfoPreview.tsx",
      "Helps troubleshoot faster.",
    );
    writeFixtureFile(
      root,
      "src/components/ScraperHealthDashboard.tsx",
      ">Page Check<\n>Actions<\nNeeds update\n'Turn this source off'\n'Check this source now'\n",
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Settings.tsx"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/feedback/DebugInfoPreview.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/ScraperHealthDashboard.tsx"),
      true,
    );
  });
});

test("product copy rejects GitHub-first support and overbroad privacy copy", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      [
        "[Report a problem](https://github.com/cboyd0319/JobSentinel/issues/new)",
        "- Found a bug? [Open an issue](https://github.com/cboyd0319/JobSentinel/issues/new).",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/user/DEEP_LINKS.md",
      [
        "If you notice a broken link, save a safe support report and share it only if you want help:",
        "<https://github.com/cboyd0319/JobSentinel/issues>",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/SetupWizard.tsx",
      "Nothing is sent anywhere unless you set up notifications.",
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "Everything stays on your computer. No cloud, no accounts, no tracking.",
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "README.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/user/DEEP_LINKS.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/SetupWizard.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/user/QUICK_START.md"), true);
  });
});

test("product copy rejects technical provider setup shortcuts", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
      [
        "Message @BotFather to create a private alert bot.",
        "Quick Setup (2 minutes)",
        "Get USAJobs Access Code",
        "USAJobs uses a free access code.",
      ].join("\n"),
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Settings.tsx"), true);
  });
});

test("product copy rejects stale zero-technical resume and shortcut copy", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/pages/Resume.tsx", "Import Resume Data\n");
    writeFixtureFile(
      root,
      "src/pages/ResumeOptimizer.tsx",
      [
        "Paste resume details exported from JobSentinel or another supported tool.",
        "Browser session storage is unavailable. Resume Builder cannot tailor against this job.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/DashboardUI/DashboardFiltersBar.tsx",
      "Navigate: j/k, Open: o/Enter, Hide: h\nj/k/o/h\n",
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Resume.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/ResumeOptimizer.tsx"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/pages/DashboardUI/DashboardFiltersBar.tsx"),
      true,
    );
  });
});

test("product copy rejects technical backend error labels", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/commands/errors.rs",
      [
        'Self::Database => "Database Error",',
        'Self::Configuration => "Configuration Error",',
        'Self::Validation => "Invalid Input",',
        'return Some("Database is busy. Close other apps using JobSentinel and try again.");',
        'return Some("SSL certificate error. Check your system clock and network settings.");',
        "",
      ].join("\n"),
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src-tauri/src/commands/errors.rs"), true);
  });
});

test("product copy rejects non-protective no-response labels", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/pages/Applications.tsx", "Detect Ghosted\n");
    writeFixtureFile(root, "src/components/DashboardWidgets.tsx", 'label="Ghosted"\n');
    writeFixtureFile(root, "src/components/AnalyticsPanel.tsx", 'ghosted: "Ghosted"\n');
    writeFixtureFile(root, "tests/e2e/playwright/application-tracking.spec.ts", '["ghosted", "Ghosted"]\n');
    writeFixtureFile(root, "docs/features/application-tracking.md", "| Ghosted | No response |\n");

    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Applications.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/DashboardWidgets.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/AnalyticsPanel.tsx"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "tests/e2e/playwright/application-tracking.spec.ts"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/application-tracking.md"),
      true,
    );
  });
});

test("product copy rejects technical issue-template support wording", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      ".github/ISSUE_TEMPLATE/bug_report.yml",
      [
        "In JobSentinel, click Settings, then Copy Debug Report.",
        "label: Debug Information",
        "description: Paste the ANONYMIZED debug report from JobSentinel.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      ".github/ISSUE_TEMPLATE/scraper_issue.yml",
      [
        "name: Scraper Issue",
        "label: Affected Scraper",
        "description: Which job board scraper is affected?",
        "label: Scraper Health Dashboard Output",
        "",
      ].join("\n"),
    );

    assert.equal(hasTechnicalFirstUserCopy(root, ".github/ISSUE_TEMPLATE/bug_report.yml"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, ".github/ISSUE_TEMPLATE/scraper_issue.yml"),
      true,
    );
  });
});

test("product copy rejects command-first profile docs", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "profiles/README.md",
      [
        "Pre-configured job search profiles for different career paths. Copy one to use as your starting point.",
        "",
        "### Option 1: Use a Profile Directly",
        "Direct scraping from Greenhouse company pages",
        "**Company (10%)**: (Future: company allowlist)",
        "",
      ].join("\n"),
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "profiles/README.md"), true);
  });
});

test("product copy rejects technical-first resume copy", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/pages/Resume.tsx", "Programming Languages\nGap Analysis\n");
    writeFixtureFile(root, "src/pages/ResumeOptimizer.tsx", "{suggestion.category}\n");

    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Resume.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/ResumeOptimizer.tsx"), true);
  });
});

test("product copy rejects overbroad browser import promises", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/components/BookmarkletGenerator.tsx",
      [
        "Browse to any job posting (LinkedIn, Indeed, etc.)",
        "Supported Sites:",
        "Major Job Boards:",
        "Most modern career sites",
        "Official ATS job pages",
        "public ATS sources",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/BOOKMARKLET.md",
      [
        "The browser import button works best on individual job pages from:",
        "",
        "- LinkedIn",
        "- Indeed",
        "- Glassdoor",
        "",
      ].join("\n"),
    );

    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/BookmarkletGenerator.tsx"),
      true,
    );
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/BOOKMARKLET.md"), true);
  });
});

test("product copy rejects automated-scan deep-link wording", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/components/DeepLinkGenerator.tsx",
      "Create ready-to-use searches for job sites that JobSentinel cannot scan automatically.\n",
    );
    writeFixtureFile(
      root,
      "docs/user/DEEP_LINKS.md",
      [
        "# Job Site Search Links",
        "Access sites that block automated scans",
        "**100% Legal:**",
        "Search links let you search these sites legally without automated scans.",
        "## Comparison with Scrapers",
        "**Use scanners for:** Sites that allow it",
        "",
      ].join("\n"),
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/DeepLinkGenerator.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/user/DEEP_LINKS.md"), true);
  });
});
