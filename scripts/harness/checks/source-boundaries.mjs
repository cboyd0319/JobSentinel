import { readFileSync } from "node:fs";
import { join } from "node:path";

const linkedInCredentialDocsPaths = new Set([
  "src-tauri/src/core/scrapers/linkedin.rs",
  "docs/features/scrapers.md",
  "docs/features/scraper-health.md",
]);

const linkedInAutomationBoundaryPaths = new Set([
  "src-tauri/src/core/scrapers/linkedin.rs",
  "src-tauri/src/core/scheduler/workers/scrapers.rs",
  "src-tauri/src/core/health/smoke_tests.rs",
  "src/pages/SettingsJobSourcesSection.tsx",
  "src/pages/Settings.tsx",
  "docs/features/scrapers.md",
  "docs/features/scraper-health.md",
  "docs/features/credentials-security.md",
  "docs/security/KEYRING.md",
]);

const linkedInNotificationBoundaryPaths = new Set([
  "src/utils/notificationPreferences.ts",
  "src/components/NotificationPreferences.tsx",
  "src/mocks/handlers.ts",
  "docs/features/user-data-management.md",
  "src-tauri/src/core/user_data/mod.rs",
]);

const cacheUsageDocPaths = new Set(["docs/CACHE_USAGE.md"]);

const frontendJobUrlOpenPaths = new Set([
  "src/components/JobCard.tsx",
  "src/pages/Dashboard.tsx",
]);

const staleStackOverflowJobsPaths = new Set([
  "docs/user/DEEP_LINKS.md",
  "src/mocks/handlers.ts",
  "src/types/deeplinks.ts",
  "src-tauri/src/core/deeplinks/generator.rs",
  "src-tauri/src/core/deeplinks/mod.rs",
  "src-tauri/src/core/deeplinks/sites.rs",
  "src-tauri/src/core/deeplinks/types.rs",
]);

const userFacingSourceAddressCopyPaths = new Set([
  "PRIVACY.md",
  "docs/features/scraper-health.md",
  "docs/features/scrapers.md",
  "docs/user/QUICK_START.md",
]);

const jobsWithGptApprovalPaths = new Set([
  "src-tauri/src/core/scheduler/workers/scrapers.rs",
  "src-tauri/src/core/health/smoke_tests.rs",
  "src/pages/SettingsConnectedJobSource.tsx",
  "src/pages/SettingsJobSourcesSection.tsx",
  "src/pages/Settings.tsx",
  "src/mocks/handlers.ts",
]);

const jobsWithGptRequestLedgerPaths = new Set([
  "src-tauri/migrations/00000000000006_source_request_log.sql",
  "src-tauri/src/core/health/tracking.rs",
  "src-tauri/src/commands/health.rs",
  "src-tauri/src/core/scheduler/workers/scrapers.rs",
  "src-tauri/src/main.rs",
  "src/pages/SettingsConnectedJobSource.tsx",
  "src/pages/SettingsJobSourcesSection.tsx",
  "src/pages/Settings.tsx",
]);

export function hasScraperDocEmojiMarkers(root, path) {
  if (path !== "docs/features/scrapers.md") {
    return false;
  }

  return /[\u{2014}\u{2192}\u{2500}-\u{257f}\u{25bc}\u{2705}\u{274c}\u{26a0}\u{23f3}\u{26a1}\u{23f1}\u{1f517}\u{1f512}\u{1f4c4}\u{1f4dd}\u{1f7e2}\u{1f7e1}\u{1f534}\u{1f4ca}\u{1f4e7}\u{1f4c8}\u{1f4c9}\u{1f3af}\u{1f680}\u{1f4a1}\u{1f50d}\u{1f539}\u{1f3d7}\u{1f9ee}\u{1f3e5}\u{1f9ea}\u{1f527}\u{1f51c}\u{1f1fa}\u{1f1f8}\u{1f4cb}\u{2b50}]/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleScraperDocReliabilityClaim(root, path) {
  if (path !== "docs/features/scrapers.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const staleAllSourcesClaim = new RegExp(
    ["All 13 job board", "scrapers \\(production-ready\\)"].join(" "),
  );
  return (
    /production-ready scrapers for 13 major job boards/.test(text) ||
    staleAllSourcesClaim.test(text) ||
    /CAPTCHA Solver|CAPTCHA solver integration|Proxy rotation for large-scale scraping/.test(text) ||
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
  if (path !== "docs/features/scraper-health.md") {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|[\u{1f1e6}-\u{1f1ff}\u{2014}\u{2192}\u{2500}-\u{257f}\u{25bc}])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleScraperHealthCoverage(root, path) {
  if (
    path !== "docs/features/scrapers.md" &&
    path !== "docs/features/scraper-health.md" &&
    path !== "docs/ROADMAP.md" &&
    path !== "docs/user/QUICK_START.md" &&
    path !== "docs/style-guide/WRITING-FOR-JOB-SEEKERS.md" &&
    path !== "docs/developer/WHY_TAURI.md" &&
    path !== "docs/releases/v2.1.md" &&
    path !== "src/mocks/handlers.ts" &&
    path !== "src/pages/Dashboard.tsx" &&
    path !== "src/components/ScraperHealthDashboard.tsx"
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
    path !== "docs/features/scraper-health.md" &&
    path !== "docs/features/scrapers.md" &&
    path !== "docs/releases/v2.1.md" &&
    path !== "docs/user/QUICK_START.md" &&
    path !== "src/components/ScraperHealthDashboard.tsx" &&
    path !== "src/components/ScraperHealthDashboard.test.tsx" &&
    path !== "src/pages/Settings.tsx"
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
    path !== "src/components/ScraperHealthDashboard.tsx" &&
    path !== "src/components/ScraperHealthDashboard.test.tsx"
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
  return /session cookie\s+via the config file|no credential storage|No credentials stored|Cookie expires after ~90 days|Open DevTools|Find and copy\s+\*\*?li_at|Paste into Settings > Scrapers > LinkedIn|Paste the new cookie|Update LinkedIn Cookie/.test(
    text,
  ) || /\[\s\]\s+\*\*Interactive Login:\*\* No manual cookie extraction/.test(text);
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
    /voyager\/api|jobs-guest\/jobs\/api|parse_linkedin_html|fetch_linkedin_html|csrf-token/.test(text) ||
    linkedInAutomationCopyPattern.test(text) ||
    /linkedin_login|get_linkedin_expiry_status|CredentialKey::LinkedInCookie/.test(text) ||
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
    /\blinkedin\s*[:=]\s*SourceNotificationConfig\s*\{\s*enabled:\s*true/.test(text) ||
    /linkedin:\s*\{[^}]*name:\s*['"]LinkedIn['"]/.test(text)
  );
}

export function hasStaleCacheUsageDoc(root, path) {
  if (!cacheUsageDocPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /tracing::info!\("Cache hit for: \{\}",\s*url\)/.test(text) ||
    /reqwest::get\(url\)/.test(text) ||
    /response\.(?:text|bytes|chunk)\(\)\s*\.await|response\.json(?:::<[^)]*>)?\(\)\s*\.await/.test(
      text,
    ) ||
    /Disable in Production|disable caching in production|Cache disabled for production/.test(text) ||
    /[✅❌⚠️]/u.test(text)
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
  return /Stack Overflow Jobs|stackoverflow\.com\/jobs|\bstackoverflow\b/i.test(text);
}

export function hasJobsWithGptUnapprovedEndpointFlow(root, path) {
  if (!jobsWithGptApprovalPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");

  if (path === "src-tauri/src/core/scheduler/workers/scrapers.rs") {
    return /JobsWithGptScraper::new/.test(text) && !/jobswithgpt_payload_approved\(\)/.test(text);
  }

  if (path === "src-tauri/src/core/health/smoke_tests.rs") {
    return /validate_external_http_url_for_fetch\(&config\.jobswithgpt_endpoint\)/.test(text);
  }

  if (path === "src/pages/Settings.tsx" || path === "src/pages/SettingsJobSourcesSection.tsx") {
    return (
      /jobswithgpt_endpoint/.test(text) &&
      !/SettingsConnectedJobSource/.test(text) &&
      !/SettingsJobSourcesSection/.test(text) &&
      !/Approve these exact details/.test(text)
    );
  }

  if (path === "src/pages/SettingsConnectedJobSource.tsx") {
    return /jobswithgpt_endpoint/.test(text) && !/Approve these exact details/.test(text);
  }

  if (path === "src/mocks/handlers.ts") {
    return /jobswithgpt_endpoint/.test(text) && !/jobswithgpt_approval/.test(text);
  }

  return false;
}

export function hasJobsWithGptMissingRequestLedger(root, path) {
  if (!jobsWithGptRequestLedgerPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");

  if (path === "src-tauri/migrations/00000000000006_source_request_log.sql") {
    return !/source_request_log/.test(text) || /title_text|raw_title|location_value|salary_floor|private_notes/.test(text);
  }

  if (path === "src-tauri/src/core/health/tracking.rs") {
    return !/record_source_request_started/.test(text) || !/get_latest_source_request/.test(text);
  }

  if (path === "src-tauri/src/commands/health.rs") {
    return !/pub async fn get_latest_source_request/.test(text);
  }

  if (path === "src-tauri/src/core/scheduler/workers/scrapers.rs") {
    return /JobsWithGptScraper::new/.test(text) && !/record_source_request_started/.test(text);
  }

  if (path === "src-tauri/src/main.rs") {
    return !/commands::health::get_latest_source_request/.test(text);
  }

  if (path === "src/pages/Settings.tsx" || path === "src/pages/SettingsJobSourcesSection.tsx") {
    return (
      /jobswithgpt_endpoint/.test(text) &&
      !/SettingsConnectedJobSource/.test(text) &&
      !/SettingsJobSourcesSection/.test(text) &&
      !/Last contacted/.test(text)
    );
  }

  if (path === "src/pages/SettingsConnectedJobSource.tsx") {
    return /jobswithgpt_endpoint/.test(text) && !/Last contacted/.test(text);
  }

  return false;
}
