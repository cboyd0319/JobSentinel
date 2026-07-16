import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasFrontendDirectOpenDeepLinkFallback,
  hasJobsWithGptMissingRequestLedger,
  hasJobsWithGptUnapprovedEndpointFlow,
  hasLinkedInAutomationBoundaryDrift,
  hasLinkedInNotificationBoundaryDrift,
  hasScraperDocEmojiMarkers,
  hasScraperHealthDocEmojiMarkers,
  hasStaleLinkedInCredentialDocs,
  hasStaleScraperDocReliabilityClaim,
  hasStaleScraperHealthCoverage,
  hasStaleStackOverflowJobsDeepLink,
  hasTechnicalSourceHealthUserCopy,
} from "../../harness/checks/source-boundaries.mjs";

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
      "docs/features/job-sources.md",
      "production-ready scrapers for 13 major job boards\n",
    );
    writeFixtureFile(
      root,
      "docs/features/job-source-status.md",
      "Source status → details\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/sources/health/ScraperHealthDashboard.tsx",
      [
        "Job Source Health",
        "Health summary statistics",
        'label: "Degraded"',
        "Check Speed",
        "Last Good Check",
        "Page Status",
        'getByText("Unknown")',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/settings/sources/health/ScraperHealthDashboard.test.tsx",
      'scraper_name: "linkedin"\ndisplay_name: "LinkedIn"\n',
    );
    writeFixtureFile(
      root,
      "src/features/settings/sources/health/scraperHealthDashboardModel.ts",
      'const staleStatus = { label: "Healthy" };\n',
    );

    assert.equal(
      hasScraperDocEmojiMarkers(root, "docs/features/job-sources.md"),
      false,
    );
    assert.equal(
      hasStaleScraperDocReliabilityClaim(root, "docs/features/job-sources.md"),
      true,
    );
    assert.equal(
      hasScraperHealthDocEmojiMarkers(
        root,
        "docs/features/job-source-status.md",
      ),
      true,
    );
    assert.equal(
      hasTechnicalSourceHealthUserCopy(
        root,
        "src/features/settings/sources/health/ScraperHealthDashboard.tsx",
      ),
      true,
    );
    assert.equal(
      hasTechnicalSourceHealthUserCopy(
        root,
        "src/features/settings/sources/health/scraperHealthDashboardModel.ts",
      ),
      true,
    );
    assert.equal(
      hasTechnicalSourceHealthUserCopy(
        root,
        "src/features/settings/sources/health/ScraperHealthDashboard.test.tsx",
      ),
      true,
    );
  });
});

test("source boundaries reject technical source-address user copy", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "PRIVACY.md",
      "Optional user-configured job-source endpoints use exact payload approval.\n",
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "Before scanning starts, JobSentinel shows your search answers.\n",
    );
    writeFixtureFile(
      root,
      "docs/features/job-sources.md",
      "Review the new payload before using the source endpoint.\n",
    );
    writeFixtureFile(
      root,
      "docs/features/job-source-status.md",
      "These endpoints must stay off until configured.\n",
    );

    assert.equal(hasTechnicalSourceHealthUserCopy(root, "PRIVACY.md"), true);
    assert.equal(
      hasTechnicalSourceHealthUserCopy(root, "docs/user/QUICK_START.md"),
      true,
    );
    assert.equal(
      hasTechnicalSourceHealthUserCopy(root, "docs/features/job-sources.md"),
      true,
    );
    assert.equal(
      hasTechnicalSourceHealthUserCopy(
        root,
        "docs/features/job-source-status.md",
      ),
      true,
    );
    assert.equal(
      hasTechnicalSourceHealthUserCopy(root, "docs/developer/ARCHITECTURE.md"),
      false,
    );
  });
});

test("source boundaries reject stale source health coverage claims", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/ROADMAP.md", "Testing 13 scrapers\n");
    writeFixtureFile(
      root,
      "src/features/settings/sources/health/ScraperHealthDashboard.tsx",
      "interface SmokeTestResult { success: boolean }\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/sources/health/scraperHealthDashboardModel.ts",
      "interface SmokeTestResult { success: boolean }\n",
    );

    assert.equal(hasStaleScraperHealthCoverage(root, "docs/ROADMAP.md"), true);
    assert.equal(
      hasStaleScraperHealthCoverage(
        root,
        "src/features/settings/sources/health/ScraperHealthDashboard.tsx",
      ),
      true,
    );
    assert.equal(
      hasStaleScraperHealthCoverage(
        root,
        "src/features/settings/sources/health/scraperHealthDashboardModel.ts",
      ),
      true,
    );
    assert.equal(
      hasStaleScraperHealthCoverage(root, "docs/features/notifications.md"),
      false,
    );
  });
});

test("source boundaries reject LinkedIn credential and automation drift", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/features/job-sources.md", "Open DevTools\n");
    writeFixtureFile(root, "docs/security/KEYRING.md", "voyager/api\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/config/types.rs",
      "pub struct LinkedInConfig {\n  pub session_cookie: String,\n}\n",
    );
    writeFixtureFile(
      root,
      "Cargo.toml",
      'objc2-web-kit = { version = "=0.3.2", features = ["WKHTTPCookieStore"] }\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-sources/src/scrapers/linkedin.rs",
      'debug.field("session_cookie_configured", &true);\n',
    );
    writeFixtureFile(
      root,
      "src/features/settings/notifications/notificationPreferencesStore.ts",
      "linkedin: { enabled: true, name: 'LinkedIn' }\n",
    );

    assert.equal(
      hasStaleLinkedInCredentialDocs(root, "docs/features/job-sources.md"),
      true,
    );
    assert.equal(
      hasLinkedInAutomationBoundaryDrift(root, "docs/security/KEYRING.md"),
      true,
    );
    assert.equal(
      hasLinkedInAutomationBoundaryDrift(
        root,
        "crates/jobsentinel-application/src/config/types.rs",
      ),
      true,
    );
    assert.equal(
      hasLinkedInAutomationBoundaryDrift(root, "Cargo.toml"),
      true,
    );
    assert.equal(
      hasLinkedInAutomationBoundaryDrift(
        root,
        "crates/jobsentinel-sources/src/scrapers/linkedin.rs",
      ),
      true,
    );
    assert.equal(
      hasLinkedInNotificationBoundaryDrift(
        root,
        "src/features/settings/notifications/notificationPreferencesStore.ts",
      ),
      true,
    );
  });
});

test("source boundaries reject direct-open fallbacks", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/dashboard/components/JobCard.tsx",
      "openDeepLink(job.url); window.open(job.url);\n",
    );

    assert.equal(
      hasFrontendDirectOpenDeepLinkFallback(
        root,
        "src/features/dashboard/components/JobCard.tsx",
      ),
      true,
    );
    assert.equal(
      hasFrontendDirectOpenDeepLinkFallback(root, "src/app/Navigation.tsx"),
      false,
    );
  });
});

test("source boundaries reject discontinued source references", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/user/DEEP_LINKS.md", "Stack Overflow Jobs\n");

    assert.equal(
      hasStaleStackOverflowJobsDeepLink(root, "docs/user/DEEP_LINKS.md"),
      true,
    );
    assert.equal(
      hasStaleStackOverflowJobsDeepLink(root, "docs/user/QUICK_START.md"),
      false,
    );
  });
});

test("source boundaries reject unapproved JobsWithGPT endpoint flows", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/scheduler/workers/scrapers.rs",
      "let jobswithgpt = JobsWithGptScraper::new(config.jobswithgpt_endpoint.clone(), query);\n",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/health/smoke_checks/sources.rs",
      "let endpoint = validate_external_http_url_for_fetch(&config.jobswithgpt_endpoint).await?;\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/sources/SettingsConnectedJobSource.tsx",
      "value={config.jobswithgpt_endpoint}\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/SettingsPage.tsx",
      "value={config.jobswithgpt_endpoint}\n",
    );
    writeFixtureFile(
      root,
      "src/dev-runtime/mocks/handlers.ts",
      "const endpoint = configRecord.jobswithgpt_endpoint;\n",
    );

    assert.equal(
      hasJobsWithGptUnapprovedEndpointFlow(
        root,
        "crates/jobsentinel-application/src/scheduler/workers/scrapers.rs",
      ),
      true,
    );
    assert.equal(
      hasJobsWithGptUnapprovedEndpointFlow(
        root,
        "crates/jobsentinel-application/src/health/smoke_checks/sources.rs",
      ),
      true,
    );
    assert.equal(
      hasJobsWithGptUnapprovedEndpointFlow(
        root,
        "src/features/settings/SettingsPage.tsx",
      ),
      true,
    );
    assert.equal(
      hasJobsWithGptUnapprovedEndpointFlow(
        root,
        "src/features/settings/sources/SettingsConnectedJobSource.tsx",
      ),
      true,
    );
    assert.equal(
      hasJobsWithGptUnapprovedEndpointFlow(root, "src/dev-runtime/mocks/handlers.ts"),
      true,
    );
    assert.equal(
      hasJobsWithGptUnapprovedEndpointFlow(
        root,
        "docs/features/job-sources.md",
      ),
      false,
    );
  });
});

test("source boundaries reject missing JobsWithGPT request ledger", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-storage/migrations/00000000000006_source_request_log.sql",
      "CREATE TABLE source_request_log (id INTEGER, raw_title TEXT);\n",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-storage/src/health/tracking.rs",
      "pub async fn start_run() {}\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/health.rs",
      "pub async fn get_scraper_runs() {}\n",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/scheduler/workers/scrapers.rs",
      "let jobswithgpt = JobsWithGptScraper::new(endpoint, query);\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/bootstrap/mod.rs",
      "ipc::health::get_scraper_runs,\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/sources/SettingsConnectedJobSource.tsx",
      "value={config.jobswithgpt_endpoint}\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/SettingsPage.tsx",
      "value={config.jobswithgpt_endpoint}\n",
    );

    assert.equal(
      hasJobsWithGptMissingRequestLedger(
        root,
        "crates/jobsentinel-storage/migrations/00000000000006_source_request_log.sql",
      ),
      true,
    );
    assert.equal(
      hasJobsWithGptMissingRequestLedger(
        root,
        "crates/jobsentinel-storage/src/health/tracking.rs",
      ),
      true,
    );
    assert.equal(
      hasJobsWithGptMissingRequestLedger(
        root,
        "src-tauri/src/ipc/health.rs",
      ),
      true,
    );
    assert.equal(
      hasJobsWithGptMissingRequestLedger(
        root,
        "crates/jobsentinel-application/src/scheduler/workers/scrapers.rs",
      ),
      true,
    );
    assert.equal(
      hasJobsWithGptMissingRequestLedger(root, "src-tauri/src/bootstrap/mod.rs"),
      true,
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/registry.rs",
      "jobsentinel::ipc::health::get_latest_source_request,\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/bootstrap/mod.rs",
      ".invoke_handler(crate::ipc::jobsentinel_command_handlers!())\n",
    );
    assert.equal(
      hasJobsWithGptMissingRequestLedger(root, "src-tauri/src/ipc/registry.rs"),
      false,
    );
    assert.equal(
      hasJobsWithGptMissingRequestLedger(root, "src-tauri/src/bootstrap/mod.rs"),
      false,
    );
    assert.equal(
      hasJobsWithGptMissingRequestLedger(
        root,
        "src/features/settings/SettingsPage.tsx",
      ),
      true,
    );
    assert.equal(
      hasJobsWithGptMissingRequestLedger(
        root,
        "src/features/settings/sources/SettingsConnectedJobSource.tsx",
      ),
      true,
    );
    assert.equal(
      hasJobsWithGptMissingRequestLedger(root, "docs/features/job-sources.md"),
      false,
    );
  });
});
