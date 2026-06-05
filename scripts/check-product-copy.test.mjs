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
    writeFixtureFile(
      root,
      "src/pages/ResumeOptimizer.tsx",
      "Words To Add\n= Words to add\nPower Words\nStrong Resume Words\nView Strong Resume Words\n",
    );
    writeFixtureFile(
      root,
      "src/pages/ResumeOptimizerResultsPanel.tsx",
      "Words To Add\n= Words to add\n",
    );
    writeFixtureFile(
      root,
      "src/components/AtsLiveScorePanel.tsx",
      "Only add these words when they honestly fit your experience.\n",
    );

    assert.equal(
      hasStaleResumeOptimizerFraming(root, "docs/features/resume-matcher.md"),
      true,
    );
    assert.equal(
      hasStaleResumeOptimizerFraming(root, "src/pages/ResumeOptimizer.tsx"),
      true,
    );
    assert.equal(
      hasStaleResumeOptimizerFraming(root, "src/pages/ResumeOptimizerResultsPanel.tsx"),
      true,
    );
    assert.equal(
      hasStaleResumeOptimizerFraming(root, "src/components/AtsLiveScorePanel.tsx"),
      true,
    );
    assert.equal(
      hasStaleResumeOptimizerFraming(root, "docs/features/ghost-detection.md"),
      false,
    );
  });
});

test("product copy rejects local resume upload wording in resume match", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/features/resume-matcher.md",
      "Resume upload and parsing\nChoose a saved resume or upload a PDF resume.\n",
    );
    writeFixtureFile(
      root,
      "src/pages/ResumeOptimizer.tsx",
      "Choose a saved resume or upload one.\nChoose or Upload Resume\nChoose or upload a resume instead.\n",
    );
    writeFixtureFile(
      root,
      "src/components/ResumeMatchScoreBreakdown.tsx",
      "Upload a resume to see detailed match information\n",
    );
    writeFixtureFile(
      root,
      "src/pages/ResumeBuilder.tsx",
      "No resume uploaded\nPlease upload a resume in Resume Match first\nUpload and review a resume in Resume Match first\n",
    );

    assert.equal(hasStaleResumeOptimizerFraming(root, "docs/features/resume-matcher.md"), true);
    assert.equal(hasStaleResumeOptimizerFraming(root, "src/pages/ResumeOptimizer.tsx"), true);
    assert.equal(
      hasStaleResumeOptimizerFraming(root, "src/components/ResumeMatchScoreBreakdown.tsx"),
      true,
    );
    assert.equal(hasStaleResumeOptimizerFraming(root, "src/pages/ResumeBuilder.tsx"), true);
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
    writeFixtureFile(
      root,
      "src/pages/ApplicationProfile.tsx",
      '"Submission Rate"\n',
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
    assert.equal(
      hasApplicationAssistAutomationFraming(root, "src/pages/ApplicationProfile.tsx"),
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
        "Advanced controls are available.",
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
    writeFixtureFile(
      root,
      "src/pages/DashboardUI/noJobsEmptyStateCopy.ts",
      "If a search comes back empty, broaden the role title, location, or lowest pay you want.\n",
    );

    assert.equal(
      hasNonProtectivePayFloorRecoveryCopy(root, "docs/user/QUICK_START.md"),
      true,
    );
    assert.equal(
      hasNonProtectivePayFloorRecoveryCopy(root, "src/pages/DashboardUI/noJobsEmptyStateCopy.ts"),
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
      [
        "Company blocklist",
        "`Notifications: ${configSummary.notifications_configured} configured`",
        'has_resume ? "configured" : "not configured"',
        "`  Extra app details: ${sanitizeTextForStorage(error.stack)}`",
        "`  Screen details: ${sanitizeTextForStorage(error.componentStack)}`",
        "",
      ].join("\n"),
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
      "Save a safe report\nSafe report so you can paste it before submitting.\nThis opens GitHub in your browser.\n",
    );
    writeFixtureFile(
      root,
      "src/components/feedback/SuccessScreen.tsx",
      "GitHub should have opened in your browser.\nThe GitHub page keeps replies and updates in one place.\n",
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
    writeFixtureFile(
      root,
      "src-tauri/src/commands/feedback/mod.rs",
      "Could not show the saved debug report automatically.\n",
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
      hasFeedbackLocalReportDrift(root, "src/components/feedback/SuccessScreen.tsx"),
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
    assert.equal(
      hasFeedbackLocalReportDrift(root, "src-tauri/src/commands/feedback/mod.rs"),
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
        "Try reloading the app to continue.",
        "Reload App",
        "Reset App Window & Reload",
        "If reload does not work",
        "Support details (development only)",
        "Automatic error reporting and logging",
        "Capture error with error reporting system",
        "Clear Temporary App Data",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/PageErrorBoundary.tsx",
      "This keeps happening. This page may be temporarily unavailable.\nSupport details (development only)\nAutomatic error reporting",
    );
    writeFixtureFile(
      root,
      "src/components/ComponentErrorBoundary.tsx",
      "This section failed to load\nShow support details\nNo support details available\nAutomatic error reporting",
    );
    writeFixtureFile(
      root,
      "src/components/ModalErrorBoundary.tsx",
      "This window failed to load\nPlease close and try again later\nTry closing and checking back later\nSupport details (development only)\nNo support details available\nAutomatic error reporting\n",
    );
    writeFixtureFile(root, "src/components/ScraperHealthDashboard.tsx", "window state");
    writeFixtureFile(
      root,
      "src/utils/vitals.ts",
      "In production, you could send to analytics service\nsendToAnalytics(metric)\nwith analytics services or custom reporting\n",
    );

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
    assert.equal(hasTechnicalFirstUserCopy(root, "src/utils/vitals.ts"), true);
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
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      "Match Priority Guide\nThese percentages explain the default priority order.\n",
    );
    writeFixtureFile(root, "src/components/ScoreBreakdownModal.tsx", "40% influence\n");
    writeFixtureFile(
      root,
      "src/components/ResumeMatchScoreBreakdown.tsx",
      "(50% influence)\nOverall match uses these default priorities.\n",
    );
    writeFixtureFile(root, "src/components/GhostIndicator.tsx", "Posting Risk Warning\nGeneric Content\n");

    assert.equal(hasNonProtectiveScoreCopy(root, "src/components/ScoreDisplay.tsx"), true);
    assert.equal(hasNonProtectiveScoreCopy(root, "src/pages/DashboardUI/filterLabels.ts"), true);
    assert.equal(hasNonProtectiveScoreCopy(root, "docs/features/smart-scoring.md"), true);
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

test("product copy rejects stale match-ranking labels", () => {
  withFixture((root) => {
    for (const [path, copy] of [
      ["src/components/ScoreDisplay.tsx", "Strong Match"],
      ["src/components/ScoreDisplay.stories.tsx", "Excellent (90%+)"],
      ["src/components/ScoreDisplay.stories.tsx", "Average (50-69%)"],
      ["src/components/ScoreDisplay.stories.tsx", "Low (&lt;50%)"],
      ["src/components/ScoreDisplay.stories.tsx", "AllScoreRanges"],
      ["src/components/ScoreDisplay.stories.tsx", "HighScore"],
      ["src/components/ScoreBreakdownModal.tsx", "Match Details"],
      ["src/components/ScoreBreakdownModal.tsx", "Part of overall score"],
      ["src/components/ScoreDisplay.tsx", "Score factor weights"],
      ["src/components/ScoreDisplay.tsx", "<td>{factor.weight}%</td>"],
      ["src/components/ScoreBreakdownModal.tsx", "<span>{factorPercentage}%</span>"],
      ["src/pages/ResumeOptimizer.tsx", "Format result: ${Math.round(result.format_score)}%"],
      ["src/pages/ResumeOptimizer.tsx", "Overall Match"],
      ["src/pages/ResumeOptimizer.tsx", "<span>{Math.round(score)}%</span>"],
      ["src/pages/DashboardUI/filterLabels.ts", "Best Match First"],
      ["src/pages/DashboardUI/filterLabels.ts", "Lowest Match First"],
      ["src/pages/SetupWizard.tsx", "strongest matches"],
      ["docs/user/QUICK_START.md", "weaker or adjacent matches"],
      ["docs/features/smart-scoring.md", "Low Match"],
      ["docs/features/smart-scoring.md", "Match Factors"],
      ["docs/features/smart-scoring.md", "Smart Scoring System"],
      ["docs/features/smart-scoring.md", "Smart scoring should:"],
      ["docs/features/smart-scoring.md", "match percentage"],
      ["docs/style-guide/GLOSSARY.md", "match score"],
      ["docs/style-guide/WRITING-FOR-JOB-SEEKERS.md", "match scores"],
      ["docs/plans/active/current-work.md", "match scores"],
      ["PRIVACY.md", "Alert details may include public job details and match score"],
      ["RESPONSIBLE_AI.md", "Present match scores as hiring guarantees"],
      ["docs/features/resume-matcher.md", "How To Read Match Results"],
      ["docs/features/resume-matcher.md", "Overall match"],
      ["docs/features/resume-matcher.md", "Low match"],
    ]) {
      writeFixtureFile(root, path, `${copy}\n`);
      assert.equal(hasNonProtectiveScoreCopy(root, path), true);
    }
  });
});

test("product copy rejects user-doc sidecar drift", () => {
  withFixture((root) => {
    for (const [path, copy] of [
      ["docs/README.md", "Job Source Adapters"],
      ["docs/features/resume-builder.md", "../images/ats-optimizer.png"],
      ["docs/features/resume-builder.md", "**80-100** - Strong visible evidence"],
      ["docs/features/json-resume-import.md", "JSON Resume"],
      ["docs/features/json-resume-import.md", "raw JSON strings"],
      ["docs/features/json-resume-import.md", "malformed JSON errors"],
      ["docs/features/scrapers.md", "feeds or APIs"],
      ["docs/features/scrapers.md", "Requests/hour"],
      ["docs/features/scrapers.md", "Official/public board API"],
      ["docs/user/QUICK_START.md", "build JobSentinel from the source code"],
      ["docs/user/QUICK_START.md", "source-code setup guide"],
      ["docs/features/notifications.md", "fit label or percentage"],
    ]) {
      writeFixtureFile(root, path, `${copy}\n`);
      assert.equal(hasTechnicalFirstUserCopy(root, path), true);
    }
  });
});

test("product copy rejects stale settings alert and source setup copy", () => {
  withFixture((root) => {
    for (const staleCopy of [
      "Manual email setup",
      "Auto-enable Slack if valid connection link entered.",
      'placeholder="Paste Slack connection link"',
      "Request USAJobs access code",
      '<dt className="font-medium">Job-source link</dt>',
      "Paste a job-source link from a service you trust",
      "Recommended for you",
      "Share ${savedFile.fileName} only if you want help.",
    ]) {
      writeFixtureFile(root, "src/pages/Settings.tsx", `${staleCopy}\n`);
      assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Settings.tsx"), true);
    }

    writeFixtureFile(
      root,
      "docs/features/notifications.md",
      "Slack, Discord, and Teams give you a private connection link for chat alerts.\n",
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/notifications.md"),
      true,
    );
  });
});

test("product copy rejects raw alert threshold percentages", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/components/NotificationPreferences.tsx", "{config.minScoreThreshold}%\n");

    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/NotificationPreferences.tsx"),
      true,
    );
  });
});

test("product copy rejects stale recovery and login privacy copy", () => {
  withFixture((root) => {
    for (const [path, copy] of [
      ["src/components/ErrorLogPanel.tsx", "{displayMessage}"],
      ["src/components/ErrorLogPanel.tsx", "Save Extra Local Details"],
      ["src/components/ErrorLogPanel.tsx", "Save Full Local Problem Details"],
      ["docs/user/QUICK_START.md", "app password or sending details"],
      ["docs/user/DEEP_LINKS.md", "This is expected - log in to view results."],
      ["docs/user/DEEP_LINKS.md", "Bulk open (open multiple sites at once)"],
    ]) {
      writeFixtureFile(root, path, `${copy}\n`);
      assert.equal(hasTechnicalFirstUserCopy(root, path), true);
    }
  });
});

test("product copy rejects technical feedback preview labels", () => {
  withFixture((root) => {
    for (const staleCopy of ["App version", "Platform", "Device type"]) {
      writeFixtureFile(
        root,
        "src/components/feedback/DebugInfoPreview.tsx",
        `${staleCopy}\n`,
      );
      assert.equal(
        hasTechnicalFirstUserCopy(root, "src/components/feedback/DebugInfoPreview.tsx"),
        true,
      );
    }
  });
});

test("product copy rejects prescriptive resume review copy", () => {
  withFixture((root) => {
    for (const staleCopy of [
      "Overall match: ${Math.round(result.overall_score)}%",
      "Overall match: 84%",
      "How to fix: {issue.fix}",
      "How to fix: Use one short paragraph.",
    ]) {
      writeFixtureFile(root, "src/pages/ResumeOptimizer.tsx", `${staleCopy}\n`);
      assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/ResumeOptimizer.tsx"), true);
    }
  });
});

test("product copy rejects Application Profile send/sent stats", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/pages/ApplicationProfile.tsx",
      "Marked Sent\nReady to Send\nSubmission Rate\n",
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/ApplicationProfile.tsx"), true);
  });
});

test("product copy rejects raw connected-source metadata labels", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/pages/Settings.tsx", "<dt>Source host</dt>\n");
    writeFixtureFile(root, "PRIVACY.md", "contact time, source host, title count, work location mode, requested-job limit\n");
    writeFixtureFile(root, "docs/features/scraper-health.md", "contact time, source host, title count, work location mode, requested-job limit\n");
    writeFixtureFile(root, "docs/features/scrapers.md", "contact time, source host, title count, work location mode, requested-job limit\n");

    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Settings.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "PRIVACY.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/scraper-health.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/scrapers.md"), true);
  });
});

test("product copy rejects technical source-check flow wording", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      [
        "Source checks use bounded requests, source-specific limits, and shared retry helpers.",
        "duplicate handling, health checks, and bounded website reads",
        "local search, follows source-specific boundaries",
        "job source health docs",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/scrapers.md",
      [
        "Every source check must use source-specific limits and shared retry helpers where feasible",
        "Page, feed, source-check, and import requests cap decoded bodies at 16 MiB",
        "The job source health dashboard tracks source status",
        "Source health must never leak credentials",
        "  -> source-boundary check",
        "  -> bounded public request",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/scraper-health.md",
      [
        "Scheduled source health",
        "The Settings troubleshooting dashboard should show:",
        "Source health must follow the same rules for job sources:",
        "",
      ].join("\n"),
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "README.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/scrapers.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/scraper-health.md"), true);
  });
});

test("product copy rejects bare dashboard summary recovery", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/components/DashboardWidgets.tsx",
      [
        'setError("Could not load application summary");',
        'aria-label="Analytics charts"',
        ">Analytics Dashboard<",
        "Weekly Activity",
        "Jobs by Source",
        "Salary Distribution",
        "Quick Stats",
        "",
      ].join("\n"),
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "src/components/DashboardWidgets.tsx"), true);
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
      [
        "Create ready-to-use searches for job sites that JobSentinel cannot scan automatically.",
        "JobSentinel does not check automatically.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/user/DEEP_LINKS.md",
      [
        "# Job Site Search Links",
        "Access sites that block automated scans",
        "**100% Legal:**",
        "Search links let you search these sites legally without automated scans.",
        "Some sites limit automatic checking or require you to view results in your own browser.",
        "JobSentinel does not bypass site controls.",
        "JobSentinel does not bypass human checks, login, or site limits.",
        "| Login and human checks | Handled by you on the site | Not bypassed |",
        "[technical contributor guide](../developer/ADDING_DEEP_LINK_SITES.md)",
        "## Comparison with Scrapers",
        "**Use scanners for:** Sites that allow it",
        "## Supported Sites (18)",
        "| Feature | Search Links | Monitored sources |",
        "Saved locally when a monitored source returns a job",
        "Official or public sources that allow local monitoring",
        "- Advanced filters (salary, experience level)",
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
      [
        "Review the search before scanning starts.",
        "After setup, JobSentinel starts scanning.",
        "JobSentinel supports scheduled source adapters through a common source HTTP client.",
        "ATS platforms include Greenhouse and Lever.",
        "USAJobs can use an access code for background monitoring.",
        "Read the full job source adapter guide.",
        "",
      ].join("\n"),
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "README.md"), true);
  });
});

test("product copy rejects front-door pay jargon", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      "What does it optimize for?\nunder-leveling cues\ndoes not optimize for application volume\n",
    );
    writeFixtureFile(root, "ROADMAP.md", "under-anchoring guidance\n");
    writeFixtureFile(root, "src/pages/Salary.tsx", "role is under-leveled\n");
    writeFixtureFile(root, "docs/features/salary-ai.md", "offer may be under-leveled\n");
    writeFixtureFile(root, "docs/research/pay-equity.md", "under-leveling\n");
    writeFixtureFile(root, "docs/features/market-intelligence.md", "spot under-leveling\n");
    writeFixtureFile(root, "docs/features/resume-matcher.md", "Notice under-leveled roles\n");
    writeFixtureFile(
      root,
      "docs/harness/readme-information-design.md",
      "optimization target\n",
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "README.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "ROADMAP.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Salary.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/salary-ai.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/research/pay-equity.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/market-intelligence.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/features/resume-matcher.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/harness/readme-information-design.md"), true);
  });
});

test("product copy rejects front-door ATS jargon", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      "ATS transparency\nofficial ATS postings\npublic ATS postings\n",
    );
    writeFixtureFile(root, "ROADMAP.md", "Company-site and ATS verification\nATS pages\n");
    writeFixtureFile(
      root,
      "RESPONSIBLE_AI.md",
      "ATS-readable application clarity\nManipulate ATS systems\n",
    );
    writeFixtureFile(
      root,
      "docs/harness/readme-information-design.md",
      "ATS transparency\n",
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "README.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "ROADMAP.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "RESPONSIBLE_AI.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "docs/harness/readme-information-design.md"), true);
  });
});
