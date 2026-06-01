import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasApplicationAssistAutomationFraming,
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
    writeFixtureFile(root, "docs/features/one-click-apply.md", "One-Click Apply\n");

    assert.equal(
      hasApplicationAssistAutomationFraming(root, "docs/features/one-click-apply.md"),
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

    assert.equal(hasNonProtectiveScoreCopy(root, "src/components/ScoreDisplay.tsx"), true);
    assert.equal(
      hasLegacyPreferenceListCopy(root, "docs/features/application-tracking.md"),
      true,
    );
    assert.equal(hasNonProtectiveScoreCopy(root, "src/components/ErrorBoundary.tsx"), false);
  });
});

test("product copy rejects technical-first settings copy", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/pages/Settings.tsx", "Config imported\n");
    writeFixtureFile(root, "src/pages/Settings.test.tsx", "Config imported\n");

    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Settings.tsx"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Settings.test.tsx"), false);
  });
});

test("product copy rejects technical-first resume copy", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/pages/Resume.tsx", "Programming Languages\nGap Analysis\n");

    assert.equal(hasTechnicalFirstUserCopy(root, "src/pages/Resume.tsx"), true);
  });
});
