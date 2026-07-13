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
} from "../harness/checks/product-copy.mjs";

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
    writeFixtureFile(
      root,
      "docs/features/resume-matcher.md",
      "ATS Resume Optimizer\n",
    );
    writeFixtureFile(
      root,
      "src/features/resumes/matching/ResumeMatchPage.tsx",
      "Words To Add\n= Words to add\nPower Words\nStrong Resume Words\nView Strong Resume Words\n",
    );
    writeFixtureFile(
      root,
      "src/features/resumes/matching/ResumeMatchResultsPanel.tsx",
      "Words To Add\n= Words to add\n",
    );
    writeFixtureFile(
      root,
      "src/features/resumes/builder/AtsLiveScorePanel.tsx",
      "Only add these words when they honestly fit your experience.\n",
    );

    assert.equal(
      hasStaleResumeOptimizerFraming(root, "docs/features/resume-matcher.md"),
      true,
    );
    assert.equal(
      hasStaleResumeOptimizerFraming(
        root,
        "src/features/resumes/matching/ResumeMatchPage.tsx",
      ),
      true,
    );
    assert.equal(
      hasStaleResumeOptimizerFraming(
        root,
        "src/features/resumes/matching/ResumeMatchResultsPanel.tsx",
      ),
      true,
    );
    assert.equal(
      hasStaleResumeOptimizerFraming(
        root,
        "src/features/resumes/builder/AtsLiveScorePanel.tsx",
      ),
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
      "src/features/resumes/matching/ResumeMatchPage.tsx",
      "Choose a saved resume or upload one.\nChoose or Upload Resume\nChoose or upload a resume instead.\n",
    );
    writeFixtureFile(
      root,
      "src/components/ResumeMatchScoreBreakdown.tsx",
      "Upload a resume to see detailed match information\n",
    );
    writeFixtureFile(
      root,
      "src/features/resumes/builder/ResumeBuilderPage.tsx",
      "No resume uploaded\nPlease upload a resume in Resume Match first\nUpload and review a resume in Resume Match first\n",
    );

    assert.equal(
      hasStaleResumeOptimizerFraming(root, "docs/features/resume-matcher.md"),
      true,
    );
    assert.equal(
      hasStaleResumeOptimizerFraming(
        root,
        "src/features/resumes/matching/ResumeMatchPage.tsx",
      ),
      true,
    );
    assert.equal(
      hasStaleResumeOptimizerFraming(
        root,
        "src/components/ResumeMatchScoreBreakdown.tsx",
      ),
      true,
    );
    assert.equal(
      hasStaleResumeOptimizerFraming(
        root,
        "src/features/resumes/builder/ResumeBuilderPage.tsx",
      ),
      true,
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
      hasEngineerFirstResumeTemplateCopy(
        root,
        "docs/features/resume-builder.md",
      ),
      true,
    );
  });
});

test("product copy rejects application automation framing", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/features/application-assist.md",
      "One-Click Apply\nThis application platform supports form automation.\n",
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ApplyButton.tsx",
      "const badge = <span title={atsInfo?.automationNotes || undefined} />;\n",
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ApplicationPreview.tsx",
      "aria-label={`Application tracking system: ${atsPlatform}`}\n",
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ApplicationProfilePage.tsx",
      '"Submission Rate"\n',
    );

    assert.equal(
      hasApplicationAssistAutomationFraming(
        root,
        "docs/features/application-assist.md",
      ),
      true,
    );
    assert.equal(
      hasApplicationAssistAutomationFraming(
        root,
        "src/features/application-assist/ApplyButton.tsx",
      ),
      true,
    );
    assert.equal(
      hasApplicationAssistAutomationFraming(
        root,
        "src/features/application-assist/ApplicationPreview.tsx",
      ),
      true,
    );
    assert.equal(
      hasApplicationAssistAutomationFraming(
        root,
        "src/features/application-assist/ApplicationProfilePage.tsx",
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
        "Advanced controls are available.",
        "",
      ].join("\n"),
    );

    assert.equal(
      hasOverconfidentGhostCopy(root, "docs/features/ghost-detection.md"),
      true,
    );
  });
});

test("product copy rejects overconfident pay guidance", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/features/pay-protection.md",
      "Always negotiate.\n",
    );

    assert.equal(
      hasOverconfidentPayGuidance(root, "docs/features/pay-protection.md"),
      true,
    );
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
      "src/features/dashboard/components/noJobsEmptyStateCopy.ts",
      "If a search comes back empty, broaden the role title, location, or lowest pay you want.\n",
    );

    assert.equal(
      hasNonProtectivePayFloorRecoveryCopy(root, "docs/user/QUICK_START.md"),
      true,
    );
    assert.equal(
      hasNonProtectivePayFloorRecoveryCopy(
        root,
        "src/features/dashboard/components/noJobsEmptyStateCopy.ts",
      ),
      true,
    );
    assert.equal(
      hasNonProtectivePayFloorRecoveryCopy(
        root,
        "docs/features/pay-protection.md",
      ),
      false,
    );
  });
});

test("product copy rejects raw feedback report presentation", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/components/feedback/DebugInfoPreview.tsx",
      "JSON.stringify(event.details)\nvalue={`${configSummary.keywords_count} configured`}\n",
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
    writeFixtureFile(
      root,
      "src/components/ErrorLogPanel.tsx",
      "JSON.stringify(error.context)",
    );

    assert.equal(
      hasRawFeedbackDebugEventDetails(
        root,
        "src/components/feedback/DebugInfoPreview.tsx",
      ),
      true,
    );
    assert.equal(
      hasFeedbackTechnicalCompanyLabels(
        root,
        "src/services/feedbackService.ts",
      ),
      true,
    );
    assert.equal(
      hasFeedbackSetupJargon(
        root,
        "src/components/feedback/DebugInfoPreview.tsx",
      ),
      true,
    );
    assert.equal(
      hasFeedbackSetupJargon(root, "src/services/feedbackService.ts"),
      true,
    );
    assert.equal(
      hasRawProblemHistoryContextDetails(
        root,
        "src/components/ErrorLogPanel.tsx",
      ),
      true,
    );
    assert.equal(
      hasRawFeedbackDebugEventDetails(root, "src/components/ErrorLogPanel.tsx"),
      false,
    );
  });
});

test("product copy rejects debug-report roadmap wording", () => {
  withFixture((root) => {
    writeFixtureFile(root, "README.md", "Use the in-app safe debug report.\n");
    writeFixtureFile(
      root,
      "ROADMAP.md",
      "One-click sanitized debug report flow\n",
    );
    writeFixtureFile(root, "docs/README.md", "Safe debug reports\n");
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      "| Debug reports | Sanitized reports |\n",
    );
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
      'Report type: Bug Report\nformat!("[{}] {:?}\\n")\n',
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
    assert.equal(
      hasFeedbackLocalReportDrift(root, "docs/developer/CONTRIBUTING.md"),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(root, "docs/harness/verification-matrix.md"),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(root, "src/components/ErrorLogPanel.tsx"),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(
        root,
        "src/components/ModalErrorBoundary.tsx",
      ),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(
        root,
        "src/components/feedback/SubmitOptions.tsx",
      ),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(
        root,
        "src/components/feedback/SuccessScreen.tsx",
      ),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(
        root,
        "src/components/feedback/DescriptionInput.tsx",
      ),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(
        root,
        "src-tauri/src/commands/feedback/report.rs",
      ),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(
        root,
        "src-tauri/src/commands/feedback/debug_log.rs",
      ),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(
        root,
        "src-tauri/src/core/health/smoke_tests.rs",
      ),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(
        root,
        "src-tauri/src/commands/feedback/mod.rs",
      ),
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
    writeFixtureFile(
      root,
      "src/components/ScraperHealthDashboard.tsx",
      "window state",
    );
    writeFixtureFile(
      root,
      "src/utils/vitals.ts",
      "In production, you could send to analytics service\nsendToAnalytics(metric)\nwith analytics services or custom reporting\n",
    );

    assert.equal(
      hasRawErrorBoundaryDetails(root, "src/components/ErrorBoundary.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalRecoveryCopy(root, "src/components/ErrorBoundary.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalRecoveryCopy(
        root,
        "src/components/ComponentErrorBoundary.tsx",
      ),
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
      hasTechnicalRecoveryCopy(
        root,
        "src/components/ScraperHealthDashboard.tsx",
      ),
      true,
    );
    assert.equal(
      hasRawErrorBoundaryDetails(
        root,
        "src/components/ScraperHealthDashboard.tsx",
      ),
      false,
    );
  });
});

test("product copy rejects non-protective scoring and legacy preference copy", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/components/ScoreDisplay.tsx", "Great Match!");
    writeFixtureFile(
      root,
      "docs/features/application-tracking.md",
      "Job-word boosters",
    );
    writeFixtureFile(
      root,
      "src/utils/scoreUtils.ts",
      'if (score >= 90) return "Excellent";\nif (score >= 80) return "Great";\nreturn "Poor";\n',
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/filterLabels.ts",
      "Strong (70%+)\n",
    );
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      "Match Priority Guide\nThese percentages explain the default priority order.\n",
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/ScoreBreakdownModal.tsx",
      "40% influence\n",
    );
    writeFixtureFile(
      root,
      "src/components/ResumeMatchScoreBreakdown.tsx",
      "(50% influence)\nOverall match uses these default priorities.\n",
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/GhostIndicator.tsx",
      "Posting Risk Warning\nGeneric Content\n",
    );

    assert.equal(
      hasNonProtectiveScoreCopy(root, "src/components/ScoreDisplay.tsx"),
      true,
    );
    assert.equal(
      hasNonProtectiveScoreCopy(
        root,
        "src/features/dashboard/components/filterLabels.ts",
      ),
      true,
    );
    assert.equal(
      hasNonProtectiveScoreCopy(root, "docs/features/smart-scoring.md"),
      true,
    );
    assert.equal(
      hasNonProtectiveScoreCopy(
        root,
        "src/features/dashboard/components/ScoreBreakdownModal.tsx",
      ),
      true,
    );
    assert.equal(
      hasNonProtectiveScoreCopy(
        root,
        "src/components/ResumeMatchScoreBreakdown.tsx",
      ),
      true,
    );
    assert.equal(
      hasNonProtectiveScoreCopy(
        root,
        "src/features/dashboard/components/GhostIndicator.tsx",
      ),
      true,
    );
    assert.equal(
      hasLegacyPreferenceListCopy(
        root,
        "docs/features/application-tracking.md",
      ),
      true,
    );
    assert.equal(
      hasNonProtectiveScoreCopy(root, "src/utils/scoreUtils.ts"),
      true,
    );
    assert.equal(
      hasNonProtectiveScoreCopy(root, "src/components/ErrorBoundary.tsx"),
      false,
    );
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
      [
        "src/features/dashboard/components/ScoreBreakdownModal.tsx",
        "Match Details",
      ],
      [
        "src/features/dashboard/components/ScoreBreakdownModal.tsx",
        "Part of overall score",
      ],
      ["src/components/ScoreDisplay.tsx", "Score factor weights"],
      ["src/components/ScoreDisplay.tsx", "<td>{factor.weight}%</td>"],
      [
        "src/features/dashboard/components/ScoreBreakdownModal.tsx",
        "<span>{factorPercentage}%</span>",
      ],
      [
        "src/features/resumes/matching/ResumeMatchPage.tsx",
        "Format result: ${Math.round(result.format_score)}%",
      ],
      ["src/features/resumes/matching/ResumeMatchPage.tsx", "Overall Match"],
      [
        "src/features/resumes/matching/ResumeMatchPage.tsx",
        "<span>{Math.round(score)}%</span>",
      ],
      ["src/features/dashboard/components/filterLabels.ts", "Best Match First"],
      [
        "src/features/dashboard/components/filterLabels.ts",
        "Lowest Match First",
      ],
      ["src/features/onboarding/SetupWizard.tsx", "strongest matches"],
      ["docs/user/QUICK_START.md", "weaker or adjacent matches"],
      ["docs/features/smart-scoring.md", "Low Match"],
      ["docs/features/smart-scoring.md", "Match Factors"],
      ["docs/features/smart-scoring.md", "Smart Scoring System"],
      ["docs/features/smart-scoring.md", "Smart scoring should:"],
      ["docs/features/smart-scoring.md", "match percentage"],
      ["docs/style-guide/GLOSSARY.md", "match score"],
      ["docs/style-guide/WRITING-FOR-JOB-SEEKERS.md", "match scores"],
      ["docs/plans/active/current-work.md", "match scores"],
      [
        "PRIVACY.md",
        "Alert details may include public job details and match score",
      ],
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
