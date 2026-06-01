import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const requiredGrantFacingDocs = new Set([
  "PRIVACY.md",
  "RESPONSIBLE_AI.md",
  "ROADMAP.md",
  "docs/research/job-seeker-behavior.md",
  "docs/research/ats-transparency.md",
  "docs/research/ghost-jobs.md",
  "docs/research/job-site-data-sources.md",
  "docs/research/pay-equity.md",
  "docs/research/salary-negotiation.md",
]);

const speculativeCloudDeploymentDocs = new Map([
  [
    "docs/developer/ARCHITECTURE.md",
    /Cloud Architecture \(not implemented\)|Cloud Backend \(GCP\/AWS\)|or in the cloud/,
  ],
  ["docs/developer/GETTING_STARTED.md", /src-tauri\/src\/cloud\/|GCP\/AWS deployment/],
  ["docs/ROADMAP.md", /GCP Cloud Run \/ AWS Lambda deployment/],
]);

const topLevelActiveDocsPaths = new Set([
  "docs/BOOKMARKLET.md",
  "docs/ML_FEATURE.md",
  "docs/ML_QUICKSTART.md",
  "docs/developer/FRONTEND_TESTING.md",
  "docs/developer/TESTING.md",
]);

const developerTestingDocsPaths = new Set([
  "docs/developer/TESTING.md",
  "docs/developer/FRONTEND_TESTING.md",
  "docs/developer/INTEGRATION_TESTING.md",
  "docs/developer/MUTATION_TESTING.md",
]);

const developerArchitectureDocsPaths = new Set([
  "docs/developer/ARCHITECTURE.md",
  "docs/developer/ERROR_HANDLING.md",
]);

const developerMaintenanceDocsPaths = new Set([
  "docs/developer/ADDING_DEEP_LINK_SITES.md",
  "docs/developer/CI_CD.md",
  "docs/developer/CONTRIBUTING.md",
  "docs/developer/GETTING_STARTED.md",
  "docs/developer/MACOS_DEVELOPMENT.md",
  "docs/developer/RELEASING.md",
  "docs/developer/WHY_TAURI.md",
]);

const applicationTrackingPlainLabelPaths = new Set([
  "docs/README.md",
  "docs/ROADMAP.md",
  "docs/features/application-tracking.md",
]);

const resumeMatcherPlainLabelPaths = new Set([
  "docs/README.md",
  "docs/ROADMAP.md",
  "docs/developer/ARCHITECTURE.md",
  "docs/features/resume-matcher.md",
]);

const salaryPlainLabelPaths = new Set([
  "docs/README.md",
  "docs/developer/ARCHITECTURE.md",
  "docs/features/salary-ai.md",
]);

const activeUserDocGlyphPaths = new Set([
  "docs/features/application-tracking.md",
  "docs/features/user-data-management.md",
  "docs/user/QUICK_START.md",
]);

const featurePlainDocGlyphPaths = new Set([
  "docs/features/ghost-detection.md",
  "docs/features/json-resume-import.md",
]);

const maintainedDocGlyphPaths = new Set([
  "docs/README.md",
  "docs/ROADMAP.md",
  "docs/style-guide/GLOSSARY.md",
]);

const developerLayoutDocGlyphPaths = new Set([
  "docs/developer/FRONTEND_TESTING.md",
  "docs/developer/GETTING_STARTED.md",
  "docs/developer/INTEGRATION_TESTING.md",
  "docs/developer/TESTING.md",
]);

const statusEmojiPattern =
  /[\u{2705}\u{274c}\u{26a0}\u{23f3}\u{26a1}\u{1f517}\u{1f512}\u{1f4c4}\u{1f4dd}\u{1f7e2}\u{1f7e1}\u{1f534}\u{1f4ca}\u{1f4e7}\u{1f4c8}\u{1f4c9}\u{1f3af}\u{1f680}\u{1f4a1}\u{1f50d}\u{2b50}]/u;
const deepLinksStatusEmojiPattern =
  /[\u{2705}\u{274c}\u{26a0}\u{1f510}]/u;

export function collectMissingGrantFacingDocs(root) {
  return [...requiredGrantFacingDocs].filter(
    (path) => !existsSync(join(root, path)),
  );
}

export function hasSpeculativeCloudDeploymentDoc(root, path) {
  const pattern = speculativeCloudDeploymentDocs.get(path);

  if (!pattern) {
    return false;
  }

  return pattern.test(readFileSync(join(root, path), "utf8"));
}

export function hasStaleInformalMaintainerFooter(root, path) {
  if (!path.endsWith(".md")) {
    return false;
  }

  return /Maintained By\**:\s*The Rust Mac Overlord/i.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleHardcodedMigrationCount(root, path) {
  if (path !== "docs/developer/GETTING_STARTED.md") {
    return false;
  }

  return /\b\d+\s+SQLite migrations\b/.test(readFileSync(join(root, path), "utf8"));
}

export function hasStaleIntegrationFixtureDirectoryClaim(root, path) {
  if (path !== "docs/developer/INTEGRATION_TESTING.md") {
    return false;
  }

  return /fixtures\/\s+# Test HTML\/JSON responses|Test HTML responses stored in `fixtures\/`/m.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleSchedulerWorkerPathDocs(root, path) {
  if (path !== "docs/developer/ARCHITECTURE.md") {
    return false;
  }

  return /workers\/(?:scraper|scorer|notifier)\.rs/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleSchedulerScraperPathDocs(root, path) {
  if (path !== "docs/security/KEYRING.md") {
    return false;
  }

  return /scheduler\/scrapers\.rs/.test(readFileSync(join(root, path), "utf8"));
}

export function hasStaleErrorHandlingScrapeAllDoc(root, path) {
  if (path !== "docs/developer/ERROR_HANDLING.md") {
    return false;
  }

  return /self\.scrape_all\(\)\.await/.test(readFileSync(join(root, path), "utf8"));
}

export function hasStaleRefactoringPriorityTable(root, path) {
  if (path !== "docs/developer/GETTING_STARTED.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /\*\*v1\.5 Refactoring Priority\*\*/.test(text) ||
    /needs modularization|candidate for split|frontend refactoring planned/.test(text)
  );
}

export function hasStaleLinuxPlatformStubMarkers(root, path) {
  if (path !== "src-tauri/src/platforms/linux/mod.rs") {
    return false;
  }

  return /Coming Soon|will contain Linux-specific code|limited functionality/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleShippedFeatureStatusDoc(root, path) {
  if (path !== "docs/ROADMAP.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /src-tauri\/src\/core\/import\/` module \(planned\)/.test(text) ||
    /\u{1f532} Universal Job Importer with Schema\.org parsing/u.test(text) ||
    /\u{1f532} Deep Link Generator for 15\+ sites/u.test(text) ||
    /\u{1f532} Bookmarklet generator/u.test(text)
  );
}

export function hasRoadmapStatusEmoji(root, path) {
  if (path !== "docs/ROADMAP.md") {
    return false;
  }

  return /[\u{2705}\u{1f532}]/u.test(readFileSync(join(root, path), "utf8"));
}

export function hasRoadmapVersionDrift(root, path) {
  if (path !== "docs/ROADMAP.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /\*\*Last Updated:\*\*|## Current Version:|v2\.7\+ Planned|v2\.7\.[01]\s+-\s+/.test(
      text,
    ) || /\((?:v2\.2\+|v2\.6\+|v1\.6\+)\)|Frontend Architecture \(v2\.6\+\)/.test(text)
  );
}

export function hasFrontDoorDocStaleFooter(root, path) {
  if (path !== "docs/README.md") {
    return false;
  }

  return /\*\*Last Updated:\*\*/.test(readFileSync(join(root, path), "utf8"));
}

export function hasDocsReadmeReleaseLogShape(root, path) {
  if (path !== "docs/README.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /## Current Status[\s\S]{0,400}\*\*Release version:\*\*/.test(text) ||
    /### What's New in v\d+\.\d+/i.test(text) ||
    /### Backend Modules \(\d+ registered Tauri commands\)/.test(text) ||
    /### Planned \/ Unreleased Features/.test(text) ||
    /\*\*Unreleased work implemented on main:\*\*/.test(text)
  );
}

export function hasStaleUserDataExportRoadmapClaim(root, path) {
  if (path !== "docs/features/user-data-management.md") {
    return false;
  }

  return /feature coming in v1\.5|\*\*v1\.5 \(Q1 2026\):\*\*|Export anytime.*JSON/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleUserDataManagementDocShape(root, path) {
  if (path !== "docs/features/user-data-management.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /Your job search, organized and persistent/i.test(text) ||
    /smart variable substitution/i.test(text) ||
    /Tech Startup|Fortune 500/i.test(text) ||
    /## Tauri Commands \(API Reference\)/i.test(text) ||
    /These commands power the user data features/i.test(text) ||
    /### Database Schema/i.test(text) ||
    /CREATE TABLE/i.test(text) ||
    /## Open Gaps/i.test(text) ||
    /The current user-data commands do not provide a full JSON export\/import/i.test(text)
  );
}

export function hasStaleCargoDenyIgnore(root, path) {
  if (path !== "src-tauri/deny.toml") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /RUSTSEC-2025-0057/.test(text);
}

export function hasOverbroadLocalStorageMigrationClaim(root, path) {
  if (path !== "docs/ROADMAP.md") {
    return false;
  }

  return /Backend persistence for all user data \(localStorage\s*(?:\u{2192}|->)\s*SQLite\)/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasDeepLinksEmojiOrVersionPromise(root, path) {
  if (path !== "docs/user/DEEP_LINKS.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    deepLinksStatusEmojiPattern.test(text) ||
    /coming in v2\.7|planned for v2\.7|^### v\d+\.\d+/m.test(text)
  );
}

export function hasQuickStartEmojiMarkers(root, path) {
  if (path !== "docs/user/QUICK_START.md") {
    return false;
  }

  return statusEmojiPattern.test(readFileSync(join(root, path), "utf8"));
}

export function hasFrontDoorDocEmojiMarkers(root, path) {
  if (path !== "README.md" && path !== "docs/README.md") {
    return false;
  }

  return statusEmojiPattern.test(readFileSync(join(root, path), "utf8"));
}

export function hasStaleTestQualityDocGuidance(root, path) {
  if (path !== "tests/e2e/README.md" && path !== "docs/developer/FRONTEND_TESTING.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /\btest\.skip\s*\(|\b(?:it|test|describe)\.only\s*\(/.test(text) ||
    /\bnpm\s+test\s+--\s+--grep\b/.test(text)
  );
}

export function hasDeveloperTestingDocMarkers(root, path) {
  if (!developerTestingDocsPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /[✅❌⚠️⏱️]|\*\*(?:Last Updated|Version|Maintained By|Stack|Target|Test Count|Test count)\*\*:|[\u{2190}-\u{21ff}\u{2500}-\u{257f}]/u.test(
      text,
    ) ||
    /### DO|### DON'T|Good ✅|Bad ❌|\bAchieved\s+✅|⚠️\s+In Progress|CAUGHT by|MISSED -/.test(
      text,
    )
  );
}

export function hasDeveloperArchitectureDocMarkers(root, path) {
  if (!developerArchitectureDocsPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /[✅❌⚠️]|\*\*(?:Last Updated|Version|Maintained By)\*\*:|[\u{2190}-\u{21ff}\u{2500}-\u{257f}]/u.test(text) ||
    /Good ✅|Bad ❌|DO ✅|DON'T ❌|No cloud dependencies \(v1\.0\)|JobSentinel v\d+\.\d+(?:\.\d+)? System Architecture/.test(
      text,
    )
  );
}

export function hasDeveloperMaintenanceDocDrift(root, path) {
  if (!developerMaintenanceDocsPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /(?:\p{Extended_Pictographic}|[\u{2190}-\u{21ff}\u{2500}-\u{257f}])/u.test(text) ||
    /^\*\*(?:Last Updated|Last updated|Version|Current version)(?::\*\*|\*\*:)/im.test(
      text,
    ) ||
    /^\*\*Version\s+\d+\.\d+(?:\.\d+)?\*\*$/m.test(text) ||
    /^## Version History$/m.test(text) ||
    /\bv\d+\.\d+(?:\.\d+)?\s+\(unreleased\)/.test(text) ||
    /for v1\.5\+ priorities|Modular Architecture \(v1\.5\+\)|refactored v1\.5/.test(
      text,
    )
  );
}

export function hasTopLevelActiveDocDrift(root, path) {
  if (!topLevelActiveDocsPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /^\*\*(?:Status|Version|Model):\*\*/m.test(text) ||
    /\bJobSentinel v\d+\.\d+(?:\.\d+)?\b/.test(text) ||
    /With ML support \(default build\)/.test(text)
  );
}

export function hasTopLevelActiveDocGlyphMarkers(root, path) {
  if (!topLevelActiveDocsPaths.has(path)) {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|[\u{2190}-\u{21ff}\u{2500}-\u{257f}\u{2713}\u{2717}])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleE2eWaitGuidance(root, path) {
  if (path !== "tests/e2e/README.md" && path !== "docs/developer/FRONTEND_TESTING.md") {
    return false;
  }

  return /waitForLoadState\(["']networkidle["']\)|waitForTimeout\(ms\)/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasFixedWaitInActiveE2eRuntime(root, path) {
  if (
    !path.startsWith("tests/e2e/playwright/") ||
    !path.endsWith(".ts") ||
    path === "tests/e2e/playwright/screenshots.spec.ts"
  ) {
    return false;
  }

  return /(?:\.waitForTimeout\(|\.waitForLoadState\(["']networkidle["']\))/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleGettingStartedToolingDocs(root, path) {
  if (path !== "docs/developer/GETTING_STARTED.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /cargo install tauri-cli@2\.1/.test(text) ||
    /\*\*Tauri 2\.1\*\*/.test(text) ||
    /# Frontend tests\s+npm test\b/.test(text) ||
    /# Lint Rust code\s+cargo clippy\s*(?:\n|$)/.test(text)
  );
}

export function hasStaleMacosDeveloperDocs(root, path) {
  if (path !== "docs/developer/MACOS_DEVELOPMENT.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /JobSentinel_1\.0\.0_aarch64\.dmg|[✅❌⚠️⏳🔐📄📝🟢🟡🔴📊📧📈📉🎯🚀💡🔍⭐🔄📋]/u.test(
    text,
  );
}

export function hasStaleSqliteConfigurationDoc(root, path) {
  if (path !== "docs/developer/sqlite-configuration.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /\p{Extended_Pictographic}/u.test(text) ||
    /SQLite Maximum Protection & Performance Configuration/.test(text) ||
    /\*\*(?:Status|Last Reviewed):\*\*/.test(text) ||
    /Status:\*\* ✅ Fully Implemented/.test(text) ||
    /cache_size`\s*\|\s*\*\*-64000\*\*/.test(text) ||
    /Cache size set \(`PRAGMA cache_size` returns -64000\)/.test(text) ||
    /Cloud backup sync \(optional S3\/GCS upload\)/.test(text) ||
    /Estimated Performance Gain:\*\* 200-300%/.test(text)
  );
}

export function hasUnlinkedLinuxBuildGuide(root, path) {
  if (path !== "docs/developer/LINUX_BUILD.md") {
    return false;
  }

  const docsHubPath = join(root, "docs/README.md");
  return (
    !existsSync(docsHubPath) ||
    !readFileSync(docsHubPath, "utf8").includes("(developer/LINUX_BUILD.md)")
  );
}

export function hasStaleLinuxBuildWorkflowTriggerDoc(root, path) {
  if (path !== "docs/developer/LINUX_BUILD.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /Push to `main` branch|Pull requests to `main`/.test(text) ||
    !/workflow_dispatch/.test(text)
  );
}

export function hasUnindexedReleaseNote(root, path) {
  if (
    !path.startsWith("docs/releases/") ||
    !path.endsWith(".md") ||
    path === "docs/releases/README.md"
  ) {
    return false;
  }

  const indexPath = join(root, "docs/releases/README.md");
  const releaseFileName = path.slice("docs/releases/".length);
  return (
    !existsSync(indexPath) ||
    !readFileSync(indexPath, "utf8").includes(`](${releaseFileName})`)
  );
}

export function hasBookmarkletDocStatusEmojiMarkers(root, path) {
  if (path !== "docs/BOOKMARKLET.md") {
    return false;
  }

  return /[✓✗]/u.test(readFileSync(join(root, path), "utf8"));
}

export function hasFeatureStatusColorEmojiMarkers(root, path) {
  if (
    path !== "docs/features/ghost-detection.md" &&
    path !== "docs/features/resume-builder.md"
  ) {
    return false;
  }

  return /[\u{1f7e2}\u{1f7e1}\u{1f7e0}\u{1f534}]\s+\*\*/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasFeatureDocMetadataFooter(root, path) {
  if (!path.startsWith("docs/features/") || !path.endsWith(".md")) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /^>\s+\*\*(?:Status|Completion|Coverage|Last Updated|Last Reviewed|Version|Tests|Supported Scrapers|Architecture):\*\*/m.test(
      text,
    ) ||
    /^\*\*(?:Status|Last Updated|Last Reviewed|Version|Updated|Maintained By|Implementation Status|Tests|Next Phase|Next Feature):\*\*/m.test(
      text,
    ) ||
    /^## Version History$/m.test(text)
  );
}

export function hasSynonymOrRemotePreferenceDocDrift(root, path) {
  if (
    path !== "docs/features/synonym-matching.md" &&
    path !== "docs/features/remote-preference-scoring.md"
  ) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /[✅❌⚠️✓✗→]/u.test(text) ||
    /Custom Synonyms \(v2\.1\+\)|Database-backed Synonyms \(v2\.2\+\)|Fuzzy Matching \(v2\.3\+\)/.test(
      text,
    ) ||
    /common tech terms|Python developer needed|"title_allowlist": \["Senior Engineer"\]/i.test(
      text,
    ) ||
    /Potential improvements for v2\.0\+/.test(text) ||
    /^\*\*Module:\*\*/m.test(text) ||
    /(?:User Preference Modes|Graduated Scoring Matrix|Scoring Weight)/i.test(
      text,
    ) ||
    /\|\s*Score\s*\|\s*Meaning\s*\|/i.test(text) ||
    /preference × job type/.test(text) ||
    /\*\*Last Updated:\*\* March 18, 2026/.test(text)
  );
}

export function hasMarketIntelligenceDocGlyphMarkers(root, path) {
  if (path !== "docs/features/market-intelligence.md") {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|severity_emoji|type_emoji|sentiment_emoji|[\u{2190}-\u{21ff}\u{2500}-\u{257f}\u{25b2}\u{25bc}])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleMarketIntelligenceDocShape(root, path) {
  if (path !== "docs/features/market-intelligence.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /Technical Documentation/i.test(text) ||
    /Real-Time Analytics & Trend Visualization/i.test(text) ||
    /comprehensive market insights/i.test(text) ||
    /## Architecture/i.test(text) ||
    /### Database Schema/i.test(text) ||
    /## Usage Guide/i.test(text) ||
    /## API Reference/i.test(text) ||
    /## Implementation Status/i.test(text) ||
    /Phase 2: Enhanced Analytics Planned/i.test(text) ||
    /Phase 3: Advanced Visualization/i.test(text) ||
    /Machine learning trend prediction/i.test(text) ||
    /## Scheduled Jobs/i.test(text) ||
    /Daily Analysis \(Recommended: 2 AM\)/i.test(text)
  );
}

export function hasResumeOrSalaryFeatureDocEmojiMarkers(root, path) {
  if (path !== "docs/features/resume-matcher.md" && path !== "docs/features/salary-ai.md") {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|[\u{1f1e6}-\u{1f1ff}\u{2192}\u{2500}\u{2502}\u{2514}\u{251c}\u{2713}\u{2717}\u{2022}])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleResumeMatcherDocShape(root, path) {
  if (path !== "docs/features/resume-matcher.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /^# AI Resume-Job Matcher/m.test(text) ||
    /Intelligent Resume Analysis & Job Compatibility Scoring/i.test(text) ||
    /Stop manually comparing job requirements/i.test(text) ||
    /## Architecture/i.test(text) ||
    /### Database Schema/i.test(text) ||
    /## Usage Guide/i.test(text) ||
    /## Matching Algorithm/i.test(text) ||
    /### Future Enhancements/i.test(text) ||
    /A\/B Testing/i.test(text) ||
    /## API Reference/i.test(text) ||
    /## Implementation Status/i.test(text) ||
    /keyword match against job description/i.test(text) ||
    /Keyword-based skill extraction/i.test(text) ||
    /Resume Optimization[\s\S]*Suggest keywords to add/i.test(text) ||
    /src\/pages\/ResumeManager\.tsx/.test(text) ||
    /match\.matching_skills\.filter\(skill => skill\.category/.test(text) ||
    /match\.(?:skills_score|experience_score|education_score)\b/.test(text) ||
    /\bskill\.(?:name|confidence|years_experience)\b/.test(text)
  );
}

export function hasConfusingResumeMatcherAiLabel(root, path) {
  if (!resumeMatcherPlainLabelPaths.has(path)) {
    return false;
  }

  return /\b(?:AI Resume-Job Matcher|Resume Matcher)\b/i.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasConfusingSalaryAiLabel(root, path) {
  if (!salaryPlainLabelPaths.has(path)) {
    return false;
  }

  return /Salary AI/i.test(readFileSync(join(root, path), "utf8"));
}

export function hasSmartScoringDocGlyphMarkers(root, path) {
  if (path !== "docs/features/smart-scoring.md") {
    return false;
  }

  return /[\u{2713}\u{2717}\u{2192}\u{251c}\u{2514}\u{2500}\u{2502}]/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasNotificationsDocGlyphMarkers(root, path) {
  if (path !== "docs/features/notifications.md") {
    return false;
  }

  return /[\u{2192}\u{251c}\u{2514}\u{2500}\u{2502}\u{22ef}]/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasActiveUserDocGlyphMarkers(root, path) {
  if (!activeUserDocGlyphPaths.has(path)) {
    return false;
  }

  return /[\u{2192}\u{2193}\u{2199}\u{2198}\u{2265}\u{2500}\u{2502}\u{2514}\u{251c}\u{22ef}]/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasFeaturePlainDocGlyphMarkers(root, path) {
  if (!featurePlainDocGlyphPaths.has(path)) {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|[\u{2190}-\u{21ff}\u{2500}-\u{257f}])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasMaintainedDocGlyphMarkers(root, path) {
  if (!maintainedDocGlyphPaths.has(path)) {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|[\u{2190}-\u{21ff}\u{2500}-\u{257f}\u{2713}\u{2717}])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasDeveloperLayoutDocGlyphMarkers(root, path) {
  if (!developerLayoutDocGlyphPaths.has(path)) {
    return false;
  }

  return /[\u{2192}\u{2500}\u{2502}\u{2514}\u{251c}]/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleSalaryAiFutureUiClaim(root, path) {
  if (path !== "docs/features/salary-ai.md") {
    return false;
  }

  return /- \[ \] UI components/.test(readFileSync(join(root, path), "utf8"));
}

export function hasStaleApplicationTrackingDocClaims(root, path) {
  if (path !== "docs/features/application-tracking.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /Never lose track of a job application again/i.test(text) ||
    /Trello board/i.test(text) ||
    /Application Tracking System/i.test(text) ||
    /ATS module/i.test(text) ||
    /Technical Interview/i.test(text) ||
    /technical_interview/i.test(text) ||
    /Phase 2 \(Future\)/i.test(text) ||
    /Phase 3 \(Advanced\)/i.test(text) ||
    /Machine Learning/i.test(text) ||
    /A\/B Testing/i.test(text) ||
    /API Reference/i.test(text) ||
    /Implementation Status/i.test(text) ||
    /UI Integration \(Future\)/.test(text) ||
    /src\/pages\/ApplicationTracker\.tsx/.test(text) ||
    /invoke<ApplicationsByStatus>\('get_applications_by_status'\)/.test(text) ||
    /- \[ \] Tauri commands/.test(text) ||
    /- \[ \] UI components \(Kanban board\)/.test(text) ||
    /UI Connections & Polish \(v1\.4 E4\)/.test(text)
  );
}

export function hasConfusingApplicationTrackingAtsLabel(root, path) {
  if (!applicationTrackingPlainLabelPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /Application Tracking System \(ATS\)/i.test(text) ||
    /\[ATS\]\(features\/application-tracking\.md\)/i.test(text)
  );
}

export function hasStaleSmartScoringSalaryMarkerClaim(root, path) {
  if (path !== "docs/features/smart-scoring.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /Predicted salaries are marked with a .* icon/u.test(text) ||
    /\*\*Implementation Status:\*\* ✅ Complete/.test(text)
  );
}

const docsDriftRules = [
  [hasSpeculativeCloudDeploymentDoc, "remove speculative cloud deployment doc"],
  [hasStaleInformalMaintainerFooter, "replace stale informal maintainer footer"],
  [hasStaleHardcodedMigrationCount, "remove stale hardcoded migration count"],
  [hasStaleIntegrationFixtureDirectoryClaim, "remove stale integration fixture directory claim"],
  [hasStaleSchedulerWorkerPathDocs, "remove stale scheduler worker path docs"],
  [hasStaleSchedulerScraperPathDocs, "remove stale scheduler scraper path docs"],
  [hasStaleErrorHandlingScrapeAllDoc, "remove stale scrape_all error-handling doc"],
  [hasStaleRefactoringPriorityTable, "remove stale refactoring-priority table"],
  [hasStaleLinuxPlatformStubMarkers, "replace stale Linux platform stub markers"],
  [hasStaleShippedFeatureStatusDoc, "remove stale shipped-feature status doc"],
  [hasRoadmapStatusEmoji, "replace roadmap status emoji with text"],
  [hasRoadmapVersionDrift, "replace roadmap version drift markers"],
  [hasFrontDoorDocStaleFooter, "replace front-door doc stale footer"],
  [hasDocsReadmeReleaseLogShape, "replace docs README release-log shape"],
  [hasStaleUserDataExportRoadmapClaim, "remove stale user-data export roadmap claim"],
  [hasStaleUserDataManagementDocShape, "sync user-data docs with local privacy guidance"],
  [hasStaleCargoDenyIgnore, "remove stale cargo-deny advisory ignore"],
  [hasOverbroadLocalStorageMigrationClaim, "replace overbroad localStorage migration claim"],
  [hasDeepLinksEmojiOrVersionPromise, "replace Deep Links doc emoji/version promises"],
  [hasQuickStartEmojiMarkers, "replace Quick Start doc emoji markers"],
  [hasFrontDoorDocEmojiMarkers, "replace front-door doc emoji markers"],
  [hasBookmarkletDocStatusEmojiMarkers, "replace bookmarklet doc status emoji markers"],
  [hasFeatureStatusColorEmojiMarkers, "replace feature status color emoji markers"],
  [hasFeatureDocMetadataFooter, "replace feature doc stale metadata"],
  [hasSynonymOrRemotePreferenceDocDrift, "sync synonym and remote preference docs"],
  [hasStaleTestQualityDocGuidance, "replace stale test-quality doc guidance"],
  [hasDeveloperTestingDocMarkers, "replace developer testing doc stale markers"],
  [hasDeveloperArchitectureDocMarkers, "replace developer architecture doc stale markers"],
  [hasDeveloperMaintenanceDocDrift, "replace developer maintenance doc stale markers"],
  [hasTopLevelActiveDocDrift, "replace top-level active doc stale markers"],
  [hasTopLevelActiveDocGlyphMarkers, "replace top-level active doc glyph markers"],
  [hasStaleE2eWaitGuidance, "replace stale E2E wait guidance"],
  [hasFixedWaitInActiveE2eRuntime, "replace fixed E2E runtime wait"],
  [hasStaleGettingStartedToolingDocs, "sync getting-started tooling docs"],
  [hasStaleMacosDeveloperDocs, "sync macOS developer docs"],
  [hasStaleSqliteConfigurationDoc, "sync SQLite configuration doc"],
  [hasUnlinkedLinuxBuildGuide, "link Linux build guide from docs hub"],
  [hasStaleLinuxBuildWorkflowTriggerDoc, "sync Linux build workflow trigger doc"],
  [hasUnindexedReleaseNote, "index historical release note"],
  [hasMarketIntelligenceDocGlyphMarkers, "replace Market Intelligence doc glyph/stale indicator markers"],
  [hasStaleMarketIntelligenceDocShape, "sync Market Intelligence docs with local evidence guidance"],
  [hasResumeOrSalaryFeatureDocEmojiMarkers, "replace resume and salary feature doc emoji markers"],
  [hasStaleResumeMatcherDocShape, "sync resume matcher docs with live Resume page shape"],
  [hasConfusingResumeMatcherAiLabel, "replace confusing Resume Matcher AI label"],
  [hasConfusingSalaryAiLabel, "replace confusing Salary AI label"],
  [hasSmartScoringDocGlyphMarkers, "replace smart scoring doc glyph markers"],
  [hasNotificationsDocGlyphMarkers, "replace notifications doc glyph markers"],
  [hasActiveUserDocGlyphMarkers, "replace active user doc glyph markers"],
  [hasFeaturePlainDocGlyphMarkers, "replace feature doc glyph markers"],
  [hasMaintainedDocGlyphMarkers, "replace maintained doc glyph markers"],
  [hasDeveloperLayoutDocGlyphMarkers, "replace developer layout doc glyph markers"],
  [hasStaleSalaryAiFutureUiClaim, "remove stale Salary AI future UI claim"],
  [hasStaleApplicationTrackingDocClaims, "remove stale application tracking doc claims"],
  [hasConfusingApplicationTrackingAtsLabel, "replace confusing application tracking ATS label"],
  [hasStaleSmartScoringSalaryMarkerClaim, "remove stale smart-scoring salary marker claim"],
];

export function collectDocsDriftViolations(root, path) {
  return docsDriftRules
    .filter(([predicate]) => predicate(root, path))
    .map(([, message]) => `${message}: ${path}`);
}
