import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasFrontendDirectOpenDeepLinkFallback,
  hasLinkedInAutomationBoundaryDrift,
  hasLinkedInNotificationBoundaryDrift,
  hasScraperDocEmojiMarkers,
  hasScraperHealthDocEmojiMarkers,
  hasStaleCacheUsageDoc,
  hasStaleLinkedInCredentialDocs,
  hasStaleScraperDocReliabilityClaim,
  hasStaleScraperHealthCoverage,
  hasStaleStackOverflowJobsDeepLink,
  hasTechnicalSourceHealthUserCopy,
} from "./harness/checks/source-boundaries.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-source-boundaries-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("source boundaries reject stale scraper docs and source health copy", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/features/scrapers.md",
      "production-ready scrapers for 13 major job boards\n",
    );
    writeFixtureFile(root, "docs/features/scraper-health.md", "Source status → details\n");
    writeFixtureFile(root, "src/components/ScraperHealthDashboard.tsx", "Total Scrapers\n");

    assert.equal(hasScraperDocEmojiMarkers(root, "docs/features/scrapers.md"), false);
    assert.equal(
      hasStaleScraperDocReliabilityClaim(root, "docs/features/scrapers.md"),
      true,
    );
    assert.equal(
      hasScraperHealthDocEmojiMarkers(root, "docs/features/scraper-health.md"),
      true,
    );
    assert.equal(
      hasTechnicalSourceHealthUserCopy(root, "src/components/ScraperHealthDashboard.tsx"),
      true,
    );
  });
});

test("source boundaries reject stale source health coverage claims", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/ROADMAP.md", "Testing 13 scrapers\n");
    writeFixtureFile(
      root,
      "src/components/ScraperHealthDashboard.tsx",
      "interface SmokeTestResult { success: boolean }\n",
    );

    assert.equal(hasStaleScraperHealthCoverage(root, "docs/ROADMAP.md"), true);
    assert.equal(
      hasStaleScraperHealthCoverage(root, "src/components/ScraperHealthDashboard.tsx"),
      true,
    );
    assert.equal(hasStaleScraperHealthCoverage(root, "docs/features/notifications.md"), false);
  });
});

test("source boundaries reject LinkedIn credential and automation drift", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/features/scrapers.md", "Open DevTools\n");
    writeFixtureFile(root, "docs/security/KEYRING.md", "voyager/api\n");
    writeFixtureFile(
      root,
      "src/utils/notificationPreferences.ts",
      "linkedin: { enabled: true, name: 'LinkedIn' }\n",
    );

    assert.equal(hasStaleLinkedInCredentialDocs(root, "docs/features/scrapers.md"), true);
    assert.equal(hasLinkedInAutomationBoundaryDrift(root, "docs/security/KEYRING.md"), true);
    assert.equal(
      hasLinkedInNotificationBoundaryDrift(root, "src/utils/notificationPreferences.ts"),
      true,
    );
  });
});

test("source boundaries reject cache docs and direct-open fallbacks", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/CACHE_USAGE.md", 'tracing::info!("Cache hit for: {}", url)\n');
    writeFixtureFile(
      root,
      "src/components/JobCard.tsx",
      "openDeepLink(job.url); window.open(job.url);\n",
    );

    assert.equal(hasStaleCacheUsageDoc(root, "docs/CACHE_USAGE.md"), true);
    assert.equal(hasFrontendDirectOpenDeepLinkFallback(root, "src/components/JobCard.tsx"), true);
    assert.equal(hasFrontendDirectOpenDeepLinkFallback(root, "src/components/Navigation.tsx"), false);
  });
});

test("source boundaries reject discontinued source references", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/user/DEEP_LINKS.md", "Stack Overflow Jobs\n");

    assert.equal(hasStaleStackOverflowJobsDeepLink(root, "docs/user/DEEP_LINKS.md"), true);
    assert.equal(hasStaleStackOverflowJobsDeepLink(root, "docs/user/QUICK_START.md"), false);
  });
});
