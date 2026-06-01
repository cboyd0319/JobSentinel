import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasActiveUserDocGlyphMarkers,
  hasBookmarkletDocStatusEmojiMarkers,
  hasConfusingApplicationTrackingAtsLabel,
  hasConfusingResumeMatcherAiLabel,
  hasConfusingSalaryAiLabel,
  collectMissingGrantFacingDocs,
  hasDeveloperArchitectureDocMarkers,
  hasDeveloperLayoutDocGlyphMarkers,
  hasDeveloperMaintenanceDocDrift,
  hasDeveloperTestingDocMarkers,
  hasDocsReadmeReleaseLogShape,
  hasFeatureDocMetadataFooter,
  hasFeaturePlainDocGlyphMarkers,
  hasFeatureStatusColorEmojiMarkers,
  hasFixedWaitInE2ePageObject,
  hasFrontDoorDocEmojiMarkers,
  hasMaintainedDocGlyphMarkers,
  hasMarketIntelligenceDocGlyphMarkers,
  hasNotificationsDocGlyphMarkers,
  hasOverbroadLocalStorageMigrationClaim,
  hasQuickStartEmojiMarkers,
  hasResumeOrSalaryFeatureDocEmojiMarkers,
  hasSmartScoringDocGlyphMarkers,
  hasSpeculativeCloudDeploymentDoc,
  hasStaleApplicationTrackingDocClaims,
  hasStaleE2eWaitGuidance,
  hasStaleGettingStartedToolingDocs,
  hasStaleHardcodedMigrationCount,
  hasStaleInformalMaintainerFooter,
  hasStaleMacosDeveloperDocs,
  hasStaleMarketIntelligenceDocShape,
  hasStaleResumeMatcherDocShape,
  hasStaleSalaryAiFutureUiClaim,
  hasStaleSqliteConfigurationDoc,
  hasStaleSmartScoringSalaryMarkerClaim,
  hasStaleTestQualityDocGuidance,
  hasSynonymOrRemotePreferenceDocDrift,
  hasTopLevelActiveDocDrift,
  hasTopLevelActiveDocGlyphMarkers,
} from "./harness/checks/docs-drift.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-docs-drift-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("docs drift check lists missing grant-facing docs", () => {
  withFixture((root) => {
    writeFixtureFile(root, "PRIVACY.md", "# Privacy\n");
    writeFixtureFile(root, "RESPONSIBLE_AI.md", "# Responsible AI\n");

    const missingDocs = collectMissingGrantFacingDocs(root);

    assert.ok(missingDocs.includes("ROADMAP.md"), missingDocs.join("\n"));
    assert.ok(
      missingDocs.includes("docs/research/pay-equity.md"),
      missingDocs.join("\n"),
    );
    assert.ok(!missingDocs.includes("PRIVACY.md"), missingDocs.join("\n"));
  });
});

test("docs drift check rejects speculative cloud deployment docs", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      "Cloud Architecture (not implemented)\n",
    );

    assert.equal(
      hasSpeculativeCloudDeploymentDoc(root, "docs/developer/ARCHITECTURE.md"),
      true,
    );
    assert.equal(hasSpeculativeCloudDeploymentDoc(root, "docs/README.md"), false);
  });
});

test("docs drift check rejects stale front-door doc shapes", () => {
  withFixture((root) => {
    writeFixtureFile(root, "README.md", `${String.fromCodePoint(0x2705)} ready\n`);
    writeFixtureFile(root, "docs/README.md", "### What's New in v2.7\n");

    assert.equal(hasFrontDoorDocEmojiMarkers(root, "README.md"), true);
    assert.equal(hasDocsReadmeReleaseLogShape(root, "docs/README.md"), true);
  });
});

test("docs drift check rejects stale user-facing markers", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      `${String.fromCodePoint(0x1f680)} Launch JobSentinel\n`,
    );
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      "Backend persistence for all user data (localStorage -> SQLite)\n",
    );

    assert.equal(hasQuickStartEmojiMarkers(root, "docs/user/QUICK_START.md"), true);
    assert.equal(hasOverbroadLocalStorageMigrationClaim(root, "docs/ROADMAP.md"), true);
  });
});

test("docs drift check rejects stale maintainer and migration claims", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/notes.md", "Maintained By**: The Rust Mac Overlord\n");
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      "Project currently has 42 SQLite migrations.\n",
    );

    assert.equal(hasStaleInformalMaintainerFooter(root, "docs/notes.md"), true);
    assert.equal(
      hasStaleHardcodedMigrationCount(root, "docs/developer/GETTING_STARTED.md"),
      true,
    );
  });
});

test("docs drift check rejects stale test guidance and fixed waits", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/developer/FRONTEND_TESTING.md",
      "Use test.skip() and waitForTimeout(ms) while debugging.\n",
    );
    writeFixtureFile(
      root,
      "tests/e2e/playwright/page-objects/JobsPage.ts",
      "await page.waitForTimeout(1000);\n",
    );

    assert.equal(
      hasStaleTestQualityDocGuidance(root, "docs/developer/FRONTEND_TESTING.md"),
      true,
    );
    assert.equal(
      hasStaleE2eWaitGuidance(root, "docs/developer/FRONTEND_TESTING.md"),
      true,
    );
    assert.equal(
      hasFixedWaitInE2ePageObject(root, "tests/e2e/playwright/page-objects/JobsPage.ts"),
      true,
    );
    assert.equal(hasFixedWaitInE2ePageObject(root, "tests/e2e/playwright/app.spec.ts"), false);
  });
});

test("docs drift check rejects developer doc stale markers", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/developer/TESTING.md", "**Last Updated**: yesterday\n");
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      "JobSentinel v2.7 System Architecture\n",
    );
    writeFixtureFile(root, "docs/developer/GETTING_STARTED.md", "**Version 2.1**\n");

    assert.equal(hasDeveloperTestingDocMarkers(root, "docs/developer/TESTING.md"), true);
    assert.equal(
      hasDeveloperArchitectureDocMarkers(root, "docs/developer/ARCHITECTURE.md"),
      true,
    );
    assert.equal(
      hasDeveloperMaintenanceDocDrift(root, "docs/developer/GETTING_STARTED.md"),
      true,
    );
  });
});

test("docs drift check rejects active doc and platform tooling drift", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/BOOKMARKLET.md", "**Status:** Ready\n");
    writeFixtureFile(root, "docs/ML_FEATURE.md", `${String.fromCodePoint(0x2713)} ready\n`);
    writeFixtureFile(root, "docs/developer/GETTING_STARTED.md", "cargo install tauri-cli@2.1\n");
    writeFixtureFile(
      root,
      "docs/developer/MACOS_DEVELOPMENT.md",
      "JobSentinel_1.0.0_aarch64.dmg\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/sqlite-configuration.md",
      "SQLite Maximum Protection & Performance Configuration\n",
    );

    assert.equal(hasTopLevelActiveDocDrift(root, "docs/BOOKMARKLET.md"), true);
    assert.equal(hasTopLevelActiveDocGlyphMarkers(root, "docs/ML_FEATURE.md"), true);
    assert.equal(
      hasStaleGettingStartedToolingDocs(root, "docs/developer/GETTING_STARTED.md"),
      true,
    );
    assert.equal(
      hasStaleMacosDeveloperDocs(root, "docs/developer/MACOS_DEVELOPMENT.md"),
      true,
    );
    assert.equal(
      hasStaleSqliteConfigurationDoc(root, "docs/developer/sqlite-configuration.md"),
      true,
    );
  });
});

test("docs drift check rejects feature doc metadata and glyph drift", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/BOOKMARKLET.md", "Saved ✓\n");
    writeFixtureFile(root, "docs/features/ghost-detection.md", "🟢 **Ready**\n");
    writeFixtureFile(root, "docs/features/json-resume-import.md", "Flow → next\n");
    writeFixtureFile(root, "docs/features/resume-builder.md", "**Status:** Done\n");
    writeFixtureFile(root, "docs/style-guide/GLOSSARY.md", "Done ✓\n");
    writeFixtureFile(root, "docs/developer/TESTING.md", "A → B\n");

    assert.equal(hasBookmarkletDocStatusEmojiMarkers(root, "docs/BOOKMARKLET.md"), true);
    assert.equal(
      hasFeatureStatusColorEmojiMarkers(root, "docs/features/ghost-detection.md"),
      true,
    );
    assert.equal(
      hasFeatureDocMetadataFooter(root, "docs/features/resume-builder.md"),
      true,
    );
    assert.equal(
      hasFeaturePlainDocGlyphMarkers(root, "docs/features/json-resume-import.md"),
      true,
    );
    assert.equal(hasMaintainedDocGlyphMarkers(root, "docs/style-guide/GLOSSARY.md"), true);
    assert.equal(hasDeveloperLayoutDocGlyphMarkers(root, "docs/developer/TESTING.md"), true);
  });
});

test("docs drift check rejects feature doc stale product shapes", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/features/market-intelligence.md",
      "Technical Documentation\nseverity_emoji\n",
    );
    writeFixtureFile(
      root,
      "docs/features/resume-matcher.md",
      "# AI Resume-Job Matcher\nStop manually comparing job requirements. Flow → match.\n",
    );
    writeFixtureFile(root, "docs/features/salary-ai.md", "Salary AI\n- [ ] UI components\n");
    writeFixtureFile(root, "docs/README.md", "Resume Matcher\n");

    assert.equal(
      hasMarketIntelligenceDocGlyphMarkers(root, "docs/features/market-intelligence.md"),
      true,
    );
    assert.equal(
      hasStaleMarketIntelligenceDocShape(root, "docs/features/market-intelligence.md"),
      true,
    );
    assert.equal(
      hasResumeOrSalaryFeatureDocEmojiMarkers(root, "docs/features/resume-matcher.md"),
      true,
    );
    assert.equal(hasStaleResumeMatcherDocShape(root, "docs/features/resume-matcher.md"), true);
    assert.equal(hasStaleSalaryAiFutureUiClaim(root, "docs/features/salary-ai.md"), true);
    assert.equal(hasConfusingResumeMatcherAiLabel(root, "docs/README.md"), true);
    assert.equal(hasConfusingSalaryAiLabel(root, "docs/features/salary-ai.md"), true);
  });
});

test("docs drift check rejects active feature labels and stale claims", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/features/application-tracking.md",
      "Application Tracking System (ATS)\nPhase 2 (Future)\n",
    );
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      "Predicted salaries are marked with a $ icon. ✓\n",
    );
    writeFixtureFile(root, "docs/features/notifications.md", "provider → channel\n");
    writeFixtureFile(root, "docs/features/user-data-management.md", "data ├─ saved\n");
    writeFixtureFile(root, "docs/features/synonym-matching.md", "Custom Synonyms (v2.1+)\n");

    assert.equal(
      hasStaleApplicationTrackingDocClaims(root, "docs/features/application-tracking.md"),
      true,
    );
    assert.equal(
      hasConfusingApplicationTrackingAtsLabel(root, "docs/features/application-tracking.md"),
      true,
    );
    assert.equal(hasStaleSmartScoringSalaryMarkerClaim(root, "docs/features/smart-scoring.md"), true);
    assert.equal(hasSmartScoringDocGlyphMarkers(root, "docs/features/smart-scoring.md"), true);
    assert.equal(hasNotificationsDocGlyphMarkers(root, "docs/features/notifications.md"), true);
    assert.equal(
      hasActiveUserDocGlyphMarkers(root, "docs/features/user-data-management.md"),
      true,
    );
    assert.equal(
      hasSynonymOrRemotePreferenceDocDrift(root, "docs/features/synonym-matching.md"),
      true,
    );
  });
});
