import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasApplicationAssistAutomationFraming,
  hasFeedbackLocalReportDrift,
  hasFeedbackSetupJargon,
  hasEngineerFirstResumeTemplateCopy,
  hasFeedbackTechnicalCompanyLabels,
  hasLegacyPreferenceListCopy,
  hasNonProtectivePayFloorRecoveryCopy,
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
    writeFixtureFile(
      root,
      "src/components/automation/ApplicationPreview.tsx",
      'aria-label={`Application tracking system: ${atsPlatform}`}\n',
    );

    assert.equal(
      hasApplicationAssistAutomationFraming(root, "docs/features/one-click-apply.md"),
      true,
    );
    assert.equal(
      hasApplicationAssistAutomationFraming(root, "src/components/automation/ApplyButton.tsx"),
      true,
    );
    assert.equal(
      hasApplicationAssistAutomationFraming(
        root,
        "src/components/automation/ApplicationPreview.tsx",
      ),
      true,
    );
  });
});

test("product copy rejects overconfident ghost-risk copy", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/features/ghost-detection.md",
      [
        "Likely Ghost",
        "The listing appears away from the company or ATS source.",
        "Check the company or ATS page.",
        "Company-site or ATS presence is stronger evidence.",
        "",
      ].join("\n"),
    );

    assert.equal(hasOverconfidentGhostCopy(root, "docs/features/ghost-detection.md"), true);
  });
});

test("product copy rejects overconfident pay guidance", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/features/salary-ai.md", "Always negotiate.\n");

    assert.equal(hasOverconfidentPayGuidance(root, "docs/features/salary-ai.md"), true);
  });
});

test("product copy rejects non-protective salary-floor troubleshooting", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "Lower your minimum salary to $0 temporarily\n",
    );

    assert.equal(
      hasNonProtectivePayFloorRecoveryCopy(root, "docs/user/QUICK_START.md"),
      true,
    );
    assert.equal(
      hasNonProtectivePayFloorRecoveryCopy(root, "docs/features/salary-ai.md"),
      false,
    );
  });
});

test("product copy rejects raw feedback report presentation", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/components/feedback/DebugInfoPreview.tsx",
      'JSON.stringify(event.details)\nvalue={`${configSummary.keywords_count} configured`}\n',
    );
    writeFixtureFile(
      root,
      "src/services/feedbackService.ts",
      'Company blocklist\n`Notifications: ${configSummary.notifications_configured} configured`\nhas_resume ? "configured" : "not configured"\n',
    );
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
      hasFeedbackSetupJargon(root, "src/components/feedback/DebugInfoPreview.tsx"),
      true,
    );
    assert.equal(
      hasFeedbackSetupJargon(root, "src/services/feedbackService.ts"),
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
      "docs/developer/CONTRIBUTING.md",
      "### Bug Report Template\nError logs: (run with `RUST_LOG=debug`)\n",
    );
    writeFixtureFile(
      root,
      "docs/harness/verification-matrix.md",
      "Playwright flow that proves user can recover or copy a sanitized debug report\n",
    );
    writeFixtureFile(
      root,
      "src/components/ErrorLogPanel.tsx",
      "Copy Safe Report\nSafe report details\n<button>Clear All</button>\n",
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
    writeFixtureFile(
      root,
      "src-tauri/src/core/health/smoke_tests.rs",
      "This source check could not finish. Try again later or attach a safe debug report.\n",
    );

    assert.equal(hasFeedbackLocalReportDrift(root, "README.md"), true);
    assert.equal(hasFeedbackLocalReportDrift(root, "ROADMAP.md"), true);
    assert.equal(hasFeedbackLocalReportDrift(root, "docs/README.md"), true);
    assert.equal(hasFeedbackLocalReportDrift(root, "docs/ROADMAP.md"), true);
    assert.equal(hasFeedbackLocalReportDrift(root, "docs/developer/CONTRIBUTING.md"), true);
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
    assert.equal(
      hasFeedbackLocalReportDrift(root, "src-tauri/src/core/health/smoke_tests.rs"),
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
    writeFixtureFile(
      root,
      "src/components/PageErrorBoundary.tsx",
      "This keeps happening. This page may be temporarily unavailable.",
    );
    writeFixtureFile(
      root,
      "src/components/ComponentErrorBoundary.tsx",
      "This section failed to load",
    );
    writeFixtureFile(
      root,
      "src/components/ModalErrorBoundary.tsx",
      "This window failed to load\nPlease close and try again later\nTry closing and checking back later\n",
    );
    writeFixtureFile(root, "src/components/ScraperHealthDashboard.tsx", "window state");

    assert.equal(hasRawErrorBoundaryDetails(root, "src/components/ErrorBoundary.tsx"), true);
    assert.equal(hasTechnicalRecoveryCopy(root, "src/components/ErrorBoundary.tsx"), true);
    assert.equal(
      hasTechnicalRecoveryCopy(root, "src/components/ComponentErrorBoundary.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalRecoveryCopy(root, "src/components/PageErrorBoundary.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalRecoveryCopy(root, "src/components/ModalErrorBoundary.tsx"),
      true,
    );
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
    writeFixtureFile(root, "src/pages/DashboardUI/filterLabels.ts", "Strong (70%+)\n");
    writeFixtureFile(root, "src/components/ScoreBreakdownModal.tsx", "40% priority\n");
    writeFixtureFile(root, "src/components/ResumeMatchScoreBreakdown.tsx", "(50% priority)\n");
    writeFixtureFile(root, "src/components/GhostIndicator.tsx", "Posting Risk Warning\n");

    assert.equal(hasNonProtectiveScoreCopy(root, "src/components/ScoreDisplay.tsx"), true);
    assert.equal(hasNonProtectiveScoreCopy(root, "src/pages/DashboardUI/filterLabels.ts"), true);
    assert.equal(hasNonProtectiveScoreCopy(root, "src/components/ScoreBreakdownModal.tsx"), true);
    assert.equal(
      hasNonProtectiveScoreCopy(root, "src/components/ResumeMatchScoreBreakdown.tsx"),
      true,
    );
    assert.equal(hasNonProtectiveScoreCopy(root, "src/components/GhostIndicator.tsx"), true);
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
      [
        'placeholder="https://hooks.slack.com/services/..." label="Slack connection link"',
        "Start with in-app alerts now",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
      [
        "Config imported",
        "Advanced Settings",
        "Greenhouse, Lever, and other popular job boards",
        "Get native OS notifications",
        "Show even when app is focused",
        "SMTP server",
        "SMTP port",
        "Connection Number",
        "For automatic monitoring",
        "Advanced federal monitoring",
        "Advanced chat alert",
        "(Tech hubs)",
        "HN Who's Hiring",
        "(Tech careers)",
        "This site sometimes blocks automatic checks",
        "New scans use this warning behavior",
        "Browser Integration",
        "low-trust job postings",
        "Stale-posting warning after (days)",
        "Repeated-posting warning count",
        "Very short description limit (characters)",
        "Hide risky postings",
        "Resume-Based Scoring",
        "70% resume match + 30% search words",
        "",
      ].join("\n"),
    );
    writeFixtureFile(root, "src/pages/Settings.test.tsx", "Config imported\n");
    writeFixtureFile(
      root,
      "src/components/BookmarkletGenerator.tsx",
      "Create a new bookmark in your browser (Cmd/Ctrl+D)\nbookmark address field\n",
    );
    writeFixtureFile(
      root,
      "src/components/JobImportModal.tsx",
      "Missing details: {preview.missing_fields.join(', ')}\n",
    );
    writeFixtureFile(root, "docs/features/smart-scoring.md", "Settings > Advanced Settings\n");
    writeFixtureFile(
      root,
      "src/components/NotificationPreferences.tsx",
      [
        "setLoadError('Failed to load notification preferences')",
        "toast.error('Failed to save', 'Your changes have been reverted')",
        "Your last change was undone. Try again.",
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
    writeFixtureFile(
      root,
      "src/components/AnalyticsPanel.tsx",
      [
        "Application Funnel",
        "No funnel data yet",
        "Performance by Job Source",
        "Weekly Application Goal",
        "Goal achieved this week!",
        "Failed to load analytics data. Please try again.",
        "Could not load application summary. Please try again.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(root, "src/pages/DashboardUI/filterLabels.ts", "Weakest Match First\n");
    writeFixtureFile(
      root,
      "src/pages/DashboardUI/DashboardFiltersBar.tsx",
      [
        "Use AND for words that must both appear",
        "Start with a minus sign to leave out a word: -intern",
        'placeholder="Min $K"',
        'aria-label="Minimum salary in thousands"',
        'label: source === "all" ? "All Sources" : source',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/automation/ScreeningAnswersForm.tsx",
      [
        "<code>{a.questionPattern}</code>",
        "{Math.round(a.confidenceScore * 100)}% confident",
        "Modified {a.timesModified}× ({Math.round((a.timesModified / a.timesUsed) * 100)}%)",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/automation/ScreeningAnswerSuggestions.tsx",
      [
        "Smart Suggestions",
        "Based on your history",
        "{confidencePercent}% confident",
        "(modified {Math.round(suggestion.modificationRate * 100)}%)",
        "Failed to load suggestions",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/automation/ApplyButton.tsx",
      "CAPTCHA detected\nForm preparation error\nForm preparation failed\n",
    );
    writeFixtureFile(
      root,
      "src/components/automation/ApplicationPreview.tsx",
      "CAPTCHA verification (if present)\n",
    );
    writeFixtureFile(
      root,
      "docs/features/one-click-apply.md",
      [
        "### CAPTCHA Keeps Appearing",
        "Require manual approval",
        "Complete CAPTCHA verification yourself.",
        "- It does not solve CAPTCHAs.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/user/DEEP_LINKS.md",
      [
        "## Privacy And Source Boundaries",
        "JobSentinel does not collect session cookies.",
        "Some sites limit background collection.",
        "- Rate limiting",
        "JobSentinel does not bypass CAPTCHA, login, or anti-bot controls",
        "- CAPTCHA challenges",
        "| Login and CAPTCHA | Handled by you on the site | Not bypassed |",
        "| Best for | Sites with login, anti-bot, or policy limits |",
        "[developer guide](../developer/ADDING_DEEP_LINK_SITES.md)",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      [
        "Yes. JobSentinel is free and MIT licensed.",
        "Look for the Assets section.",
        "<summary><strong>For developers: build from source</strong></summary>",
        "<summary><strong>Need developer setup?</strong></summary>",
        "Developers can build locally after installing Node, Rust, and the Tauri requirements.",
        "npm run tauri:build",
        "Stale, reposted, or low-trust postings",
        "scan allowed sources immediately",
        "### Ghost Job Detection",
        "force a refresh",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/scraper-health.md",
      [
        "Source health must follow the same source boundaries as adapters.",
        "Use rate limits and bounded response reads.",
        "## Implementation Notes",
        "## Verification",
        "Prefer official APIs, public feeds, and official company or ATS postings.",
        "Do not add hidden endpoint checks.",
        "Do not attempt CAPTCHA bypass or platform-control evasion.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/scrapers.md",
      [
        "# Job Source Adapters",
        "public, bounded source adapters",
        "hidden LinkedIn endpoints",
        "HTML, RSS, JSON",
        "## Adapter Flow",
        "SHA256(",
        "public ATS APIs such as Greenhouse",
        "understand HTTP, selectors, credentials, or logs",
        "Public JSON endpoint",
        "Public job endpoint",
        "Best-effort public source; anti-bot prone",
        "This reduces duplicate postings across ATS feeds",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/utils/errorMessages.ts",
      [
        "Something Went Wrong",
        "An unexpected error occurred.",
        "Bot Detection Triggered",
        "The website thinks you're a bot and blocked the request.",
        "This is a safety measure. Reduce search frequency or try again later.",
        "Notification Setup Failed",
        "Slack Notification Failed",
        "Discord Notification Failed",
        "Teams Notification Failed",
        "Email Notification Failed",
        "Reminder Setup Failed",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
      "Turn this on to never miss a new posting.\nAuto-scan job boards\nCompany preference (if configured)\nSave failed\nTest failed\nsaved connection detail(s) failed to save\nRestart JobSentinel\n",
    );
    writeFixtureFile(
      root,
      "src/pages/ApplicationProfile.tsx",
      "Failed to load application history\nRestart JobSentinel\n",
    );
    writeFixtureFile(
      root,
      "src/pages/Dashboard.tsx",
      [
        "<li>Source: {filters.sourceFilter}</li>",
        "<span>{job.source}</span>",
        "Min salary: ${filters.salaryMinFilter}K",
        "Max salary: ${filters.salaryMaxFilter}K",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/CoverLetterTemplates.tsx",
      [
        "Available placeholders (click to insert):",
        "<button>{placeholder}</button>",
        "Remember to replace the placeholders",
        "Check for [bracketed] placeholders that need manual editing",
        "Failed to Load Templates",
        "Failed to copy",
        "Please try again",
        "Copied to clipboard",
        "Template filled and copied!",
        "Check any bracketed blanks before sending",
        "",
      ].join("\n"),
    );
    writeFixtureFile(root, "src/pages/Market.tsx", "Failed to Load Market Data\n");
    writeFixtureFile(
      root,
      "src/components/CompanyResearchPanel.tsx",
      [
        "Information about TestCo is being gathered. Check back later for more details.",
        "Request timed out. The company lookup is taking too long.",
        "Failed to load company information",
        "Taking longer than expected...",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/MarketSnapshotCard.tsx",
      [
        'aria-label={`Market sentiment: ${snapshot.market_sentiment}`}',
        "<span>{snapshot.market_sentiment}</span>",
        "<p>Market Sentiment</p>",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/MarketSnapshotCard.test.tsx",
      "expect(screen.getByRole('status', { name: /market sentiment: bullish/i })).toBeInTheDocument();\n",
    );
    writeFixtureFile(
      root,
      "src/components/AsyncButton.tsx",
      'toast.success("Success", successMessage);\ntoast.error("Error", errorMessage || safeMessage);\ntoast.error("Something went wrong", errorMessage || safeMessage);\n',
    );
    writeFixtureFile(
      root,
      "src/services/aiGateway.ts",
      "External AI transport is not configured.\n",
    );
    writeFixtureFile(
      root,
      "src/utils/safeErrorCopy.ts",
      'const GENERIC_ERROR_TITLE = "Something Went Wrong";\n',
    );
    writeFixtureFile(
      root,
      "src/utils/errorHelpers.ts",
      [
        "Network connection issue.",
        "Service temporarily unavailable.",
        "Invalid input.",
        "Data format error.",
        "The requested resource was not found.",
        "You do not have permission to access this.",
        "Request timed out.",
        "Please try again later.",
        "This took too long. Please try again.",
        "JobSentinel ran into a problem. Please try again.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/utils/formValidation.ts",
      "URL must use http:// or https://\nURL must not include credentials\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/error.rs",
      [
        "pub fn user_message(&self) -> String {",
        "  \"CAPTCHA detected. Please complete the challenge in your browser.\".to_string()",
        "  \"Request timed out after 30 seconds. Please check your connection.\".to_string()",
        "}",
        "/// Sanitize URL for display",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/automation/error.rs",
      [
        "pub fn user_message(&self) -> String {",
        "  \"Failed to launch browser. Please ensure Chrome is installed.\".to_string()",
        "  \"An automation error occurred. Please try again.\".to_string()",
        "}",
        "/// Sanitize URL for display",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/ScoreBreakdownModal.tsx",
      "Company preference (if configured)\nconfigured preferences\n",
    );
    writeFixtureFile(
      root,
      "src/components/ErrorLogPanel.tsx",
      "Save Extra Support Details\n",
    );
    writeFixtureFile(
      root,
      "src/components/feedback/SubmitOptions.tsx",
      "Optional maintainer issue\n",
    );
    writeFixtureFile(
      root,
      "src/pages/DashboardUI/noJobsEmptyStateCopy.ts",
      "pay floor\n",
    );
    writeFixtureFile(root, "src/components/JobCard.tsx", "Below your pay floor\n");
    writeFixtureFile(
      root,
      "src/pages/DashboardUI/DashboardHeader.tsx",
      "Currently scanning job boards\nReady to scan\nScanning job boards\nScanning...\nAuto-refresh in 5m\n",
    );
    writeFixtureFile(
      root,
      "src/pages/Dashboard.tsx",
      'Scanning job boards...\nScan complete!\ntoast.error("Failed to open link", "Unable to open the job link")\nFailed to load company research\n',
    );
    writeFixtureFile(
      root,
      "src/components/JobCard.tsx",
      'toast.error("Failed to open link", "Unable to open the job link")\n',
    );
    writeFixtureFile(
      root,
      "src/components/automation/ApplicationPreview.tsx",
      "No profile configured. Please set up your application profile first.\n",
    );
    writeFixtureFile(
      root,
      "src/components/automation/ProfileForm.tsx",
      [
        "Require manual approval",
        "Failed to load profile",
        "Failed to select file",
        "Please fix the errors",
        "Failed to save",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/automation/ScreeningAnswersForm.tsx",
      "Dropdown selection\nPlease fix the errors\nFailed to load answers\nPlease try again\n",
    );
    writeFixtureFile(
      root,
      "src/components/InterviewScheduler.tsx",
      'fallbackTitle: "Failed to load interviews"\nMark as Complete\n>Failed<\nfeedbackOutcome.charAt(0).toUpperCase()\nInterview Outcome:\n',
    );
    writeFixtureFile(
      root,
      "src/pages/DashboardUI/noJobsEmptyStateCopy.ts",
      "Scan allowed sources\nLocal checks run on your schedule\npay floor\n",
    );
    writeFixtureFile(
      root,
      "src/pages/Applications.tsx",
      "{reminder.reminder_type} - Due: {formatEventDate(reminder.reminder_time)}\nYour applications list failed to load\nStatus update failed\nRestart JobSentinel\n",
    );
    writeFixtureFile(
      root,
      "src/pages/dashboardErrorCopy.ts",
      "Job Search Failed\n",
    );
    writeFixtureFile(
      root,
      "src/hooks/useFeedback.ts",
      "Failed to load system information\nPlease try again or copy the report instead\n",
    );
    writeFixtureFile(
      root,
      "src/utils/api.ts",
      "Operation Failed\n",
    );
    writeFixtureFile(
      root,
      "src/pages/hooks/useDashboardJobOps.ts",
      "Undo failed\nRedo failed\nBookmark Failed\nBulk Hide Failed\nBulk Bookmark Failed\nBulk Merge Failed\n3 failed\nCouldn't update bookmark. Try again.\nTry refreshing.\nrefresh and try again\nrestart the app\nNone of the duplicate groups could be merged. Try merging them individually.\n",
    );
    writeFixtureFile(
      root,
      "src/contexts/UndoContext.tsx",
      "Undo failed\nRedo failed\nTry refreshing if the change looks wrong.\n",
    );
    writeFixtureFile(
      root,
      "src/pages/hooks/useDashboardAutoRefresh.ts",
      "Auto-refreshing...\nScanning for new jobs\nJob scanning has failed 3 times in a row. Check your connection or try a manual search.\nJobSentinel couldn't check for new jobs automatically. Check your connection, then click Search Now.\n",
    );
    writeFixtureFile(
      root,
      "src/utils/errorMessages.ts",
      [
        "Something Went Wrong",
        "An unexpected error occurred.",
        "Too Many Requests",
        "You've made too many requests to this job board.",
        "Consider increasing the delay between searches.",
        "configured channel",
        "Data Relationship Error",
        "title: 'Invalid Email'",
        "Permission Denied",
        "Resume Parsing Failed",
        "Notification Setup Failed",
        "Slack Notification Failed",
        "Discord Notification Failed",
        "Teams Notification Failed",
        "Email Notification Failed",
        "Reminder Setup Failed",
        "Document Too Large",
        "too long for processing",
        "Try refreshing your job list.",
        "restart the app",
        "contact support",
        "action: 'Check your internet connection and try again.'",
        "system date/time",
        "Try again in 10-15 minutes",
        "action: 'Check your notification settings and try again.'",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/AtsLiveScorePanel.tsx",
      [
        "analyzing...",
        ">Job Context<",
        "View Full Analysis",
        "Format Issues",
        "<Badge>{issue.severity}</Badge>",
        "Fix: {issue.fix}",
        "Impact: {suggestion.impact}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/NotificationPreferences.tsx",
      'placeholder="e.g., 90"\nthousand per year\n',
    );
    writeFixtureFile(
      root,
      "src/components/ErrorLogPanel.tsx",
      "Advanced: Save Support Details\nSave Extra Support Details\n",
    );
    writeFixtureFile(
      root,
      "docs/BOOKMARKLET.md",
      "choose another port in advanced settings\nadvanced connection settings\nafter restarting JobSentinel\n",
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Settings.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/ApplicationProfile.tsx"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/BookmarkletGenerator.tsx"),
      true,
    );
    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/JobImportModal.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/AnalyticsPanel.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/DashboardUI/filterLabels.ts"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/pages/DashboardUI/DashboardFiltersBar.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/automation/ScreeningAnswersForm.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/automation/ScreeningAnswerSuggestions.tsx"),
      true,
    );
    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/automation/ApplyButton.tsx"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/automation/ApplicationPreview.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/one-click-apply.md"),
      true,
    );
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/user/QUICK_START.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/user/DEEP_LINKS.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/scraper-health.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/scrapers.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/utils/errorMessages.ts"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Settings.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Dashboard.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/JobCard.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/InterviewScheduler.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/DashboardUI/DashboardHeader.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/ResumeOptimizer.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/SetupWizard.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Market.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Settings.test.tsx"), false);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/smart-scoring.md"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/CoverLetterTemplates.tsx"),
      true,
    );
    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/AsyncButton.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/ScoreBreakdownModal.tsx"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/CompanyResearchPanel.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/MarketSnapshotCard.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/MarketSnapshotCard.test.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/automation/ApplicationPreview.tsx"),
      true,
    );
    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/automation/ProfileForm.tsx"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/automation/ScreeningAnswersForm.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/pages/DashboardUI/noJobsEmptyStateCopy.ts"),
      true,
    );
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Applications.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/dashboardErrorCopy.ts"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/hooks/useFeedback.ts"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/utils/api.ts"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/pages/hooks/useDashboardJobOps.ts"),
      true,
    );
    assert.equal(hasTechnicalFirstUserCopy(root, "src/contexts/UndoContext.tsx"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/pages/hooks/useDashboardAutoRefresh.ts"),
      true,
    );
    assert.equal(hasTechnicalFirstUserCopy(root, "src/utils/errorMessages.ts"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/utils/errorHelpers.ts"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/utils/formValidation.ts"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/utils/safeErrorCopy.ts"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/services/aiGateway.ts"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src-tauri/src/core/scrapers/error.rs"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src-tauri/src/core/automation/error.rs"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/feedback/SubmitOptions.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/AtsLiveScorePanel.tsx"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/NotificationPreferences.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/ErrorLogPanel.tsx"),
      true,
    );
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/BOOKMARKLET.md"), true);
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
      "src/components/BookmarkletGenerator.tsx",
      "Advanced connection settings\nlocal safety code\nIf this feels hard\nblock page import\nAllow clipboard access and try again.\nwhen JobSentinel restarts\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/bookmarklet.rs",
      '"Could not copy browser button. Allow clipboard access and try again.".to_string()',
    );
    writeFixtureFile(
      root,
      "src/components/DeepLinkGenerator.tsx",
      "JobSentinel does not monitor directly.\nLogin required\n",
    );
    writeFixtureFile(
      root,
      "src/components/feedback/DebugInfoPreview.tsx",
      "Helps troubleshoot faster.",
    );
    writeFixtureFile(
      root,
      "src/components/ScraperHealthDashboard.tsx",
      ">Page Check<\n>Access<\n>Source Type<\n>Recent Success<\nCheck All Sources\nOfficial feed\n(retry ${retryAttempt})\nSource Controls\nJob Source Check Results\nSource Check Results\nNeeds update\n'Turn this source off'\n'Check this source now'\n",
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Settings.tsx"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/BookmarkletGenerator.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src-tauri/src/commands/bookmarklet.rs"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/DeepLinkGenerator.tsx"),
      true,
    );
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
        "Looks up your approximate city from your internet address. Not saved unless added.",
      ].join("\n"),
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Settings.tsx"), true);
  });
});

test("product copy rejects market-intel jargon in hiring trends surfaces", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/components/Navigation.tsx", "Market Intel\n");
    writeFixtureFile(root, "src/pages/Market.tsx", "Market Intelligence\nRefresh Market Data\n");
    writeFixtureFile(root, "src/pages/marketErrorCopy.ts", "Market data unavailable\n");
    writeFixtureFile(root, "src/components/MarketSnapshotCard.tsx", "No market snapshot yet. Refresh market data to create one.\n");
    writeFixtureFile(root, "src/components/MarketAlertCard.tsx", "Loading market alerts\nNo market alerts at this time.\n");
    writeFixtureFile(root, "src/components/LocationHeatmap.tsx", "Job Market by Location\nNo location data yet\n");
    writeFixtureFile(root, "docs/features/market-intelligence.md", "# Market Intelligence\nMarket snapshots\nMarket alerts\nMarket data is only as good as the sources.\n");

    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/Navigation.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Market.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/marketErrorCopy.ts"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/MarketSnapshotCard.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/MarketAlertCard.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/LocationHeatmap.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/market-intelligence.md"), true);
  });
});

test("product copy rejects first-run and Rule 0 privacy drift", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/pages/SetupWizard.tsx", "Career Path\nReview & Edit\nComplete setup wizard\n");
    writeFixtureFile(root, "src/components/CareerProfileSelector.tsx", "My Own Search\nStarts with {profile.keywordsBoost.length} helpful skills\n");
    writeFixtureFile(root, "README.md", "Click Open Anyway.\nNo data is ever sent.\n");
    writeFixtureFile(root, "docs/user/QUICK_START.md", "Click Run anyway.\nYour data stays yours. Always.\n");
    writeFixtureFile(root, "SECURITY.md", "Works completely offline\nSensitive data never written to disk unencrypted\n");
    writeFixtureFile(root, "src/components/ErrorBoundary.tsx", "Your data is safe.\n");

    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/SetupWizard.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/CareerProfileSelector.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "README.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/user/QUICK_START.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "SECURITY.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/ErrorBoundary.tsx"), true);
  });
});

test("product copy rejects technical source labels and unsafe public issue templates", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
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
    writeFixtureFile(root, ".github/ISSUE_TEMPLATE/bug_report.yml", "Report the bug.\n");
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
    writeFixtureFile(root, ".github/ISSUE_TEMPLATE/scraper_issue.yml", "Report a source issue.\n");

    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Settings.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, ".github/ISSUE_TEMPLATE/bug_report.yml"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, ".github/ISSUE_TEMPLATE/feature_request.yml"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, ".github/ISSUE_TEMPLATE/question.yml"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, ".github/ISSUE_TEMPLATE/scraper_issue.yml"), true);
  });
});

test("product copy rejects stale zero-technical resume and shortcut copy", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/pages/Resume.tsx", "Import Resume Data\n");
    writeFixtureFile(
      root,
      "src/pages/ResumeOptimizer.tsx",
      [
        "Improve Bullet Point",
        "Improved Version",
        "Could not improve bullet",
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
        'return Some("Restart JobSentinel and contact support.");',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/error.rs",
      [
        '"Could not open local job data. Restart JobSentinel and try again."',
        '"contact support"',
        "",
      ].join("\n"),
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src-tauri/src/commands/errors.rs"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src-tauri/src/core/db/error.rs"), true);
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

test("product copy rejects non-advisory resume and pay guidance", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/resume/matcher.rs",
      "Recommendation: Strong match. Apply immediately.\nStudy the missing skills.\nConsider upskilling.\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/resume/ats_analyzer.rs",
      "improved.push_str(\" (add specific metrics)\");\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/salary/analyzer.rs",
      "Excellent offer! Accept or negotiate equity.\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/migrations/00000000000000_initial_schema.sql",
      "I was hoping for a compensation package. Make this an easy decision. I would love to have more skin in the game.\n",
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src-tauri/src/core/resume/matcher.rs"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src-tauri/src/core/resume/ats_analyzer.rs"),
      true,
    );
    assert.equal(hasTechnicalFirstUserCopy(root, "src-tauri/src/core/salary/analyzer.rs"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src-tauri/migrations/00000000000000_initial_schema.sql"),
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
    writeFixtureFile(
      root,
      "src/pages/Resume.tsx",
      [
        "Programming Languages",
        "Gap Analysis",
        "Math.round(skill.confidence_score * 100)",
        'const PROFICIENCY_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];',
        "Proficiency Distribution",
        "Proficiency level",
        "Failed to load resume",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/ResumeBuilder.tsx",
      'const PROFICIENCY_LEVELS = ["beginner", "intermediate", "advanced", "expert"]; Proficiency Select level Failed to import skills Failed to generate preview Export failed Try restarting JobSentinel Try restarting the app',
    );
    writeFixtureFile(
      root,
      "src/components/resume-builder/steps/SkillsStep.tsx",
      "Proficiency\nSelect level\nlevel.charAt(0).toUpperCase() + level.slice(1)\n",
    );
    writeFixtureFile(
      root,
      "src/pages/Salary.tsx",
      "Seniority Level\nEntry Level (0-2 years)\nPrincipal/Executive\n25th %\nStrong target (75th percentile)\n",
    );
    writeFixtureFile(
      root,
      "docs/features/resume-builder.md",
      "Include proficiency levels if you want (expert, intermediate, etc.)\n",
    );
    writeFixtureFile(root, "docs/features/salary-ai.md", "Enter seniority level.\n");
    writeFixtureFile(
      root,
      "src/pages/ResumeOptimizer.tsx",
      [
        "{suggestion.category}",
        "Navigating to Resume Builder",
        "Job context has been saved",
        "Format Issues",
        "<Badge>{issue.severity}</Badge>",
        "Fix: {issue.fix}",
        "Impact: {suggestion.impact}",
        "",
      ].join("\n"),
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Resume.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/ResumeBuilder.tsx"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/resume-builder/steps/SkillsStep.tsx"),
      true,
    );
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Salary.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/resume-builder.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/salary-ai.md"), true);
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
        "JobSentinel does not bypass site controls.",
        "JobSentinel does not bypass human checks, login, or site limits.",
        "| Login and human checks | Handled by you on the site | Not bypassed |",
        "[technical contributor guide](../developer/ADDING_DEEP_LINK_SITES.md)",
        "## Comparison with Scrapers",
        "**Use scanners for:** Sites that allow it",
        "",
      ].join("\n"),
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/DeepLinkGenerator.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/user/DEEP_LINKS.md"), true);
  });
});

test("product copy rejects first-run scanning copy in README", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      "Review the search before scanning starts.\nAfter setup, JobSentinel starts scanning.\n",
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "README.md"), true);
  });
});
