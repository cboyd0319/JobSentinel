import { readFileSync } from "node:fs";
import { join } from "node:path";

const linkedInCredentialDocsPaths = new Set([
  "crates/jobsentinel-sources/src/scrapers/linkedin.rs",
  "docs/features/job-sources.md",
  "docs/features/job-source-status.md",
]);

const linkedInAutomationBoundaryPaths = new Set([
  "Cargo.toml",
  "crates/jobsentinel-application/src/config/types.rs",
  "crates/jobsentinel-sources/src/scrapers/linkedin.rs",
  "crates/jobsentinel-application/src/scheduler/workers/scrapers.rs",
  "crates/jobsentinel-application/src/health/smoke_checks/sources.rs",
  "src/features/settings/sources/SettingsJobSourcesSection.tsx",
  "src/features/settings/SettingsPage.tsx",
  "docs/features/job-sources.md",
  "docs/features/job-source-status.md",
  "docs/features/saved-secrets.md",
  "docs/security/KEYRING.md",
]);

const linkedInNotificationBoundaryPaths = new Set([
  "src/features/settings/notifications/notificationPreferencesStore.ts",
  "src/features/settings/notifications/NotificationPreferences.tsx",
  "src/dev-runtime/mocks/handlers.ts",
  "src/dev-runtime/features/settings/notificationCommands.ts",
  "docs/features/user-data-management.md",
  "crates/jobsentinel-application/src/user_data/mod.rs",
]);

const frontendJobUrlOpenPaths = new Set([
  "src/features/dashboard/components/JobCard.tsx",
  "src/features/dashboard/DashboardPage.tsx",
]);

const staleStackOverflowJobsPaths = new Set([
  "docs/user/DEEP_LINKS.md",
  "src/dev-runtime/mocks/handlers.ts",
  "src/dev-runtime/features/search-links/commands.ts",
  "src/shared/search-links/model.ts",
  "crates/jobsentinel-assistance/src/deeplinks/generator.rs",
  "crates/jobsentinel-assistance/src/deeplinks/mod.rs",
  "crates/jobsentinel-assistance/src/deeplinks/sites.rs",
  "crates/jobsentinel-assistance/src/deeplinks/types.rs",
]);

const userFacingSourceAddressCopyPaths = new Set([
  "PRIVACY.md",
  "docs/features/job-source-status.md",
  "docs/features/job-sources.md",
  "docs/user/QUICK_START.md",
]);

const jobsWithGptApprovalPaths = new Set([
  "crates/jobsentinel-application/src/scheduler/workers/scrapers.rs",
  "crates/jobsentinel-application/src/health/smoke_checks/sources.rs",
  "src/features/settings/sources/SettingsConnectedJobSource.tsx",
  "src/features/settings/sources/SettingsJobSourcesSection.tsx",
  "src/features/settings/SettingsPage.tsx",
  "src/dev-runtime/mocks/handlers.ts",
  "src/dev-runtime/features/settings/commands.ts",
  "src/dev-runtime/features/settings/sources/commands.ts",
  "src/dev-runtime/features/settings/sources/scraperHealth.ts",
]);

const jobsWithGptRequestLedgerPaths = new Set([
  "crates/jobsentinel-storage/migrations/00000000000006_source_request_log.sql",
  "crates/jobsentinel-storage/src/health/tracking.rs",
  "src-tauri/src/ipc/health.rs",
  "crates/jobsentinel-application/src/scheduler/workers/scrapers.rs",
  "crates/jobsentinel-application/src/scheduler/workers/scrapers/jobswithgpt_worker.rs",
  "src-tauri/src/ipc/registry.rs",
  "src-tauri/src/bootstrap/mod.rs",
  "src/features/settings/sources/SettingsConnectedJobSource.tsx",
  "src/features/settings/sources/SettingsJobSourcesSection.tsx",
  "src/features/settings/SettingsPage.tsx",
]);

const scraperHealthDashboardPaths = new Set([
  "src/features/settings/sources/health/ScraperHealthDashboard.tsx",
  "src/features/settings/sources/health/scraperHealthDashboardModel.ts",
]);

export function hasScraperDocEmojiMarkers(root, path) {
  if (path !== "docs/features/job-sources.md") {
    return false;
  }

  return /[\u{2014}\u{2192}\u{2500}-\u{257f}\u{25bc}\u{2705}\u{274c}\u{26a0}\u{23f3}\u{26a1}\u{23f1}\u{1f517}\u{1f512}\u{1f4c4}\u{1f4dd}\u{1f7e2}\u{1f7e1}\u{1f534}\u{1f4ca}\u{1f4e7}\u{1f4c8}\u{1f4c9}\u{1f3af}\u{1f680}\u{1f4a1}\u{1f50d}\u{1f539}\u{1f3d7}\u{1f9ee}\u{1f3e5}\u{1f9ea}\u{1f527}\u{1f51c}\u{1f1fa}\u{1f1f8}\u{1f4cb}\u{2b50}]/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleScraperDocReliabilityClaim(root, path) {
  if (path !== "docs/features/job-sources.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const staleAllSourcesClaim = new RegExp(
    ["All 13 job board", "scrapers \\(production-ready\\)"].join(" "),
  );
  return (
    /production-ready scrapers for 13 major job boards/.test(text) ||
    staleAllSourcesClaim.test(text) ||
    /CAPTCHA Solver|CAPTCHA solver integration|Proxy rotation for large-scale scraping/.test(
      text,
    ) ||
    /Rotate cookies if multiple accounts/.test(text) ||
    /Conservative 5-second delays/.test(text) ||
    /limits::USAJOBS\)\.await;\s*\/\/ 60\/hour/.test(text) ||
    /\*\*USAJobs\*\*\s*\|\s*60\s*\|/.test(text) ||
    /\*\*RemoteOK\*\*\s*\|\s*1000\s*\|/.test(text) ||
    /\*\*WeWorkRemotely\*\*\s*\|\s*500\s*\|/.test(text) ||
    /\*\*HN Who's Hiring\*\*\s*\|\s*100\s*\|/.test(text) ||
    /\*\*YC Startup Jobs\*\*\s*\|\s*200\s*\|/.test(text)
  );
}

export function hasScraperHealthDocEmojiMarkers(root, path) {
  if (path !== "docs/features/job-source-status.md") {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|[\u{1f1e6}-\u{1f1ff}\u{2014}\u{2192}\u{2500}-\u{257f}\u{25bc}])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleScraperHealthCoverage(root, path) {
  if (
    path !== "docs/features/job-sources.md" &&
    path !== "docs/features/job-source-status.md" &&
    path !== "docs/ROADMAP.md" &&
    path !== "docs/user/QUICK_START.md" &&
    path !== "docs/style-guide/WRITING-FOR-JOB-SEEKERS.md" &&
    path !== "docs/developer/WHY_TAURI.md" &&
    path !== "docs/releases/v2.1.md" &&
    path !== "src/dev-runtime/mocks/handlers.ts" &&
    path !== "src/dev-runtime/features/settings/sources/commands.ts" &&
    path !== "src/dev-runtime/features/settings/sources/scraperHealth.ts" &&
    path !== "src/features/dashboard/DashboardPage.tsx" &&
    !scraperHealthDashboardPaths.has(path)
  ) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  if (
    /13 scrapers|13 job boards|13 job sources|Testing 13 scrapers|updated with 13 scrapers|usa_jobs/.test(
      text,
    )
  ) {
    return true;
  }

  return (
    /interface SmokeTestResult[\s\S]{0,180}success:\s*boolean/.test(text) ||
    /interface MockSmokeTestResult[\s\S]{0,180}success:\s*boolean/.test(text) ||
    /response_time_ms/.test(text)
  );
}

export function hasTechnicalSourceHealthUserCopy(root, path) {
  if (
    path !== "README.md" &&
    path !== "PRIVACY.md" &&
    path !== "docs/README.md" &&
    path !== "docs/ROADMAP.md" &&
    path !== "docs/features/job-source-status.md" &&
    path !== "docs/features/job-sources.md" &&
    path !== "docs/releases/v2.1.md" &&
    path !== "docs/user/QUICK_START.md" &&
    !scraperHealthDashboardPaths.has(path) &&
    path !== "src/features/settings/sources/health/ScraperHealthDashboard.test.tsx" &&
    path !== "src/features/settings/SettingsPage.tsx"
  ) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  if (userFacingSourceAddressCopyPaths.has(path)) {
    const staleSourceAddressCopy =
      /Before scanning starts|user-configured (?:job-source )?endpoints|These endpoints|source endpoints|exact payload|new payload|job-source endpoint|source endpoint/.test(
        text,
      );
    if (staleSourceAddressCopy) {
      return true;
    }
  }

  const staleGlobalCopy =
    /Scraper Health (?:Dashboard|Monitoring)|Job Source Health|Loading scraper health|Total Scrapers|Credential Warnings|Monitor scraper status|run smoke tests|Run smoke test|Smoke Test Results|Test All|scraper health status|job source health status|\(auth\)|recent runs|No recent runs found|\/ \d+ runs|\b(?:PASS|FAIL)\b|\b[Ss]moke[- ]tests?\b/.test(
      text,
    );

  if (staleGlobalCopy) {
    return true;
  }

  if (
    !scraperHealthDashboardPaths.has(path) &&
    path !== "src/features/settings/sources/health/ScraperHealthDashboard.test.tsx"
  ) {
    return false;
  }

  return /Health summary statistics|Total Sources|Current State|Check Speed|Last Good Check|Page Status|Jobs \(24h\)|Needs review|label:\s*["'`](?:Healthy|Degraded|Down|Disabled|Unknown)["'`]|getByText\(["'`](?:Healthy|Degraded|Down|Disabled|Unknown)["'`]\)|scraper_name:\s*["'`]linkedin["'`]|display_name:\s*["'`]LinkedIn["'`]/.test(
    text,
  );
}

export function hasStaleLinkedInCredentialDocs(root, path) {
  if (!linkedInCredentialDocsPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /session cookie\s+via the config file|no credential storage|No credentials stored|Cookie expires after ~90 days|Open DevTools|Find and copy\s+\*\*?li_at|Paste into Settings > Scrapers > LinkedIn|Paste the new cookie|Update LinkedIn Cookie/.test(
      text,
    ) ||
    /\[\s\]\s+\*\*Interactive Login:\*\* No manual cookie extraction/.test(text)
  );
}

export function hasLinkedInAutomationBoundaryDrift(root, path) {
  if (!linkedInAutomationBoundaryPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const linkedInAutomationCopyPattern = new RegExp(
    [
      ["Connect", "LinkedIn"].join(" "),
      ["LinkedIn", "Connected"].join(" "),
      ["LinkedIn", "Session Cookie"].join(" "),
      ["Authenticated LinkedIn", "scraping"].join(" "),
    ].join("|"),
  );
  return (
    /voyager\/api|jobs-guest\/jobs\/api|parse_linkedin_html|fetch_linkedin_html|csrf-token/.test(
      text,
    ) ||
    linkedInAutomationCopyPattern.test(text) ||
    /objc2-web-kit|WKHTTPCookieStore|WKWebsiteDataStore|Native macOS cookie extraction/.test(
      text,
    ) ||
    /pub\s+session_cookie:\s*String/.test(text) ||
    /session_cookie_configured/.test(text) ||
    /linkedin_login|get_linkedin_expiry_status|CredentialKey::LinkedInCookie/.test(
      text,
    ) ||
    /start_run\(db,\s*"linkedin"\)|scraper_name:\s*"linkedin"/.test(text) ||
    /LinkedIn\s+(?:scraper|cookie health|cookie expiry)/i.test(text) ||
    /SMOKE_TEST_SCRAPERS[\s\S]*"linkedin"/.test(text)
  );
}

export function hasLinkedInNotificationBoundaryDrift(root, path) {
  if (!linkedInNotificationBoundaryPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /linkedin:\s*\{\s*enabled:\s*true/.test(text) ||
    /\blinkedin\s*[:=]\s*SourceNotificationConfig\s*\{\s*enabled:\s*true/.test(
      text,
    ) ||
    /linkedin:\s*\{[^}]*name:\s*['"]LinkedIn['"]/.test(text)
  );
}

export function hasFrontendDirectOpenDeepLinkFallback(root, path) {
  if (!frontendJobUrlOpenPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /\bopenDeepLink\(/.test(text) && /\bwindow\.open\(/.test(text);
}

export function hasStaleStackOverflowJobsDeepLink(root, path) {
  if (!staleStackOverflowJobsPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /Stack Overflow Jobs|stackoverflow\.com\/jobs|\bstackoverflow\b/i.test(
    text,
  );
}

export function hasJobsWithGptUnapprovedEndpointFlow(root, path) {
  if (!jobsWithGptApprovalPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");

  if (path === "crates/jobsentinel-application/src/scheduler/workers/scrapers.rs") {
    return (
      /JobsWithGptScraper::new/.test(text) &&
      !/jobswithgpt_payload_approved\(\)/.test(text)
    );
  }

  if (path === "crates/jobsentinel-application/src/health/smoke_checks/sources.rs") {
    return (
      /validate_external_http_url_for_fetch\(&config\.jobswithgpt_endpoint\)/.test(text) ||
      (/async fn test_jobswithgpt/.test(text) &&
        !/jobswithgpt_payload_approved\(\)/.test(text))
    );
  }

  if (
    path === "src/features/settings/SettingsPage.tsx" ||
    path === "src/features/settings/sources/SettingsJobSourcesSection.tsx"
  ) {
    return (
      /jobswithgpt_endpoint/.test(text) &&
      !/SettingsConnectedJobSource/.test(text) &&
      !/SettingsJobSourcesSection/.test(text) &&
      !/Approve these exact details/.test(text)
    );
  }

  if (path === "src/features/settings/sources/SettingsConnectedJobSource.tsx") {
    return (
      /jobswithgpt_endpoint/.test(text) &&
      !/Approve these exact details/.test(text)
    );
  }

  if (
    path === "src/dev-runtime/mocks/handlers.ts" ||
    path === "src/dev-runtime/features/settings/commands.ts" ||
    path === "src/dev-runtime/features/settings/sources/commands.ts" ||
    path === "src/dev-runtime/features/settings/sources/scraperHealth.ts"
  ) {
    return (
      /jobswithgpt_endpoint/.test(text) && !/jobswithgpt_approval/.test(text)
    );
  }

  return false;
}

export function hasJobsWithGptMissingRequestLedger(root, path) {
  if (!jobsWithGptRequestLedgerPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");

  if (path === "crates/jobsentinel-storage/migrations/00000000000006_source_request_log.sql") {
    return (
      !/source_request_log/.test(text) ||
      /title_text|raw_title|location_value|salary_floor|private_notes/.test(
        text,
      )
    );
  }

  if (path === "crates/jobsentinel-storage/src/health/tracking.rs") {
    return (
      !/record_source_request_started/.test(text) ||
      !/get_latest_source_request/.test(text)
    );
  }

  if (path === "src-tauri/src/ipc/health.rs") {
    return !/pub(?:\([^)]*\))?\s+async fn get_latest_source_request/.test(text);
  }

  if (
    path === "crates/jobsentinel-application/src/scheduler/workers/scrapers.rs" ||
    path ===
      "crates/jobsentinel-application/src/scheduler/workers/scrapers/jobswithgpt_worker.rs"
  ) {
    return (
      /JobsWithGptScraper::new/.test(text) &&
      !/record_source_request_started/.test(text)
    );
  }

  if (path === "src-tauri/src/ipc/registry.rs") {
    return !/commands::health::get_latest_source_request/.test(text);
  }

  if (path === "src-tauri/src/bootstrap/mod.rs") {
    return !/command_handlers::jobsentinel_command_handlers!\(\)/.test(text);
  }

  if (
    path === "src/features/settings/SettingsPage.tsx" ||
    path === "src/features/settings/sources/SettingsJobSourcesSection.tsx"
  ) {
    return (
      /jobswithgpt_endpoint/.test(text) &&
      !/SettingsConnectedJobSource/.test(text) &&
      !/SettingsJobSourcesSection/.test(text) &&
      !/Last contacted/.test(text)
    );
  }

  if (path === "src/features/settings/sources/SettingsConnectedJobSource.tsx") {
    return /jobswithgpt_endpoint/.test(text) && !/Last contacted/.test(text);
  }

  return false;
}
