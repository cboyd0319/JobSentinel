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
} from "../../harness/checks/product-copy.mjs";
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
      "src/features/settings/support/feedback/DebugInfoPreview.tsx",
      "JSON.stringify(event.details)\nvalue={`${configSummary.keywords_count} configured`}\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/support/feedback/feedbackReportFormatting.ts",
      [
        "Company exclusion list",
        "`Notifications: ${configSummary.notifications_configured} configured`",
        'has_resume ? "configured" : "not configured"',
        "`  Extra app details: ${sanitizeTextForStorage(error.stack)}`",
        "`  Screen details: ${sanitizeTextForStorage(error.componentStack)}`",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/settings/support/ErrorLogPanel.tsx",
      "JSON.stringify(error.context)",
    );

    assert.equal(
      hasRawFeedbackDebugEventDetails(
        root,
        "src/features/settings/support/feedback/DebugInfoPreview.tsx",
      ),
      true,
    );
    assert.equal(
      hasFeedbackTechnicalCompanyLabels(
        root,
        "src/features/settings/support/feedback/feedbackReportFormatting.ts",
      ),
      true,
    );
    assert.equal(
      hasFeedbackSetupJargon(
        root,
        "src/features/settings/support/feedback/DebugInfoPreview.tsx",
      ),
      true,
    );
    assert.equal(
      hasFeedbackSetupJargon(
        root,
        "src/features/settings/support/feedback/feedbackReportFormatting.ts",
      ),
      true,
    );
    assert.equal(
      hasRawProblemHistoryContextDetails(
        root,
        "src/features/settings/support/ErrorLogPanel.tsx",
      ),
      true,
    );
    assert.equal(
      hasRawFeedbackDebugEventDetails(root, "src/features/settings/support/ErrorLogPanel.tsx"),
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
      "src/features/settings/support/ErrorLogPanel.tsx",
      "Copy Safe Report\nSafe report details\n<button>Clear All</button>\n",
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/errors/ModalErrorBoundary.tsx",
      "Save Safe Report\nSafe report copied\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/support/feedback/SubmitOptions.tsx",
      "Save a safe report\nSafe report so you can paste it before submitting.\nThis opens GitHub in your browser.\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/support/feedback/SuccessScreen.tsx",
      "GitHub should have opened in your browser.\nThe GitHub page keeps replies and updates in one place.\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/support/feedback/DescriptionInput.tsx",
      "Can you reproduce it?\nSelect a category first...\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/feedback/report.rs",
      'Report type: Bug Report\nformat!("[{}] {:?}\\n")\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/feedback/debug_log.rs",
      "Debug Log ({} events):\n[COMMAND]\n",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/health/smoke_checks/mod.rs",
      "This source check could not finish. Try again later or attach a safe debug report.\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/feedback/mod.rs",
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
      hasFeedbackLocalReportDrift(root, "src/features/settings/support/ErrorLogPanel.tsx"),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(
        root,
        "src/features/dashboard/errors/ModalErrorBoundary.tsx",
      ),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(
        root,
        "src/features/settings/support/feedback/SubmitOptions.tsx",
      ),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(
        root,
        "src/features/settings/support/feedback/SuccessScreen.tsx",
      ),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(
        root,
        "src/features/settings/support/feedback/DescriptionInput.tsx",
      ),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(
        root,
        "src-tauri/src/ipc/feedback/report.rs",
      ),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(
        root,
        "src-tauri/src/ipc/feedback/debug_log.rs",
      ),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(
        root,
        "crates/jobsentinel-application/src/health/smoke_checks/mod.rs",
      ),
      true,
    );
    assert.equal(
      hasFeedbackLocalReportDrift(
        root,
        "src-tauri/src/ipc/feedback/mod.rs",
      ),
      true,
    );
  });
});
