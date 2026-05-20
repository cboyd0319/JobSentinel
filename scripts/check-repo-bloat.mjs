#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");

const ignoredTraversalPaths = new Set([
  ".git",
  ".husky/_",
  "node_modules",
  "src-tauri/target",
]);

const allowedRootEntries = new Set([
  ".claudeignore",
  ".env.example",
  ".github",
  ".gitignore",
  ".husky",
  ".lintstagedrc.json",
  ".markdownlint-cli2.jsonc",
  ".markdownlint.json",
  ".storybook",
  ".vale",
  ".vale.ini",
  "AGENTS.md",
  "CHANGELOG.md",
  "CLAUDE.md",
  "CODE_OF_CONDUCT.md",
  "LICENSE",
  "README.md",
  "SECURITY.md",
  "config",
  "docs",
  "eslint.config.js",
  "examples",
  "index.html",
  "package-lock.json",
  "package.json",
  "playwright.config.ts",
  "postcss.config.js",
  "profiles",
  "public",
  "scripts",
  "src",
  "src-tauri",
  "tailwind.config.js",
  "tests",
  "tsconfig.json",
  "tsconfig.node.json",
  "vite.config.ts",
  "vitest.config.ts",
]);

const allowedTrackedGeneratedPaths = new Set([
  "docs/images/application-tracking.png",
  "docs/images/ats-optimizer.png",
  "docs/images/dashboard-light.png",
  "docs/images/dashboard.png",
  "docs/images/keyboard-shortcuts.png",
  "docs/images/logo.png",
  "docs/images/market-intelligence.png",
  "docs/images/one-click-apply.png",
  "docs/images/resume-builder.png",
  "docs/images/resume-matcher.png",
  "docs/images/salary-ai.png",
  "docs/images/settings.png",
  "src-tauri/gen/schemas/acl-manifests.json",
  "src-tauri/gen/schemas/capabilities.json",
  "src-tauri/gen/schemas/desktop-schema.json",
  "src-tauri/gen/schemas/macOS-schema.json",
]);

const forbiddenArtifactDirs = new Set([
  ".claude",
  ".vagrant",
  "coverage",
  "dist",
  "dist-ssr",
  "playwright-report",
  "storybook-static",
  "test_cache",
  "test_ml_cache",
  "test-results",
]);

const forbiddenRootSummaryPattern =
  /(?:_SUMMARY|_FIXES|_REPORT|_ANALYSIS|_ROADMAP|_GUIDE|_CHECKLIST|_IMPLEMENTATION|_PLAN)\.md$/;

const forbiddenFileExtensions = new Set([
  ".AppImage",
  ".bak",
  ".bk",
  ".db",
  ".db-shm",
  ".db-wal",
  ".deb",
  ".dmg",
  ".local",
  ".log",
  ".msi",
  ".njsproj",
  ".pdb",
  ".rpm",
  ".sln",
  ".suo",
  ".swo",
  ".swp",
  ".tmp",
  ".ntvs",
]);

const forbiddenFileNames = new Set([
  ".DS_Store",
  ".gitkeep",
  "Thumbs.db",
  "desktop.ini",
  "npm-debug.log",
  "yarn-debug.log",
  "yarn-error.log",
  "pnpm-debug.log",
  "lerna-debug.log",
]);

const forbiddenTrackedPlaceholderFiles = new Set([
  "tests/e2e/fixtures/.gitkeep",
  "tests/e2e/fixtures/README.md",
]);

const speculativeCloudDeploymentDocs = new Map([
  [
    "docs/developer/ARCHITECTURE.md",
    /Cloud Architecture \(not implemented\)|Cloud Backend \(GCP\/AWS\)|or in the cloud/,
  ],
  ["docs/developer/GETTING_STARTED.md", /src-tauri\/src\/cloud\/|GCP\/AWS deployment/],
  ["docs/ROADMAP.md", /GCP Cloud Run \/ AWS Lambda deployment/],
]);

const rawPrivateQueryLoggingPaths = new Set([
  "src-tauri/src/commands/automation.rs",
  "src-tauri/src/commands/jobs.rs",
  "src-tauri/src/core/db/queries.rs",
]);

const rawScraperLoggingPaths = new Set([
  "src-tauri/src/core/scrapers/cache.rs",
  "src-tauri/src/core/scrapers/dice.rs",
  "src-tauri/src/core/scrapers/glassdoor.rs",
  "src-tauri/src/core/scrapers/greenhouse.rs",
  "src-tauri/src/core/scrapers/http_client.rs",
  "src-tauri/src/core/scrapers/jobswithgpt.rs",
  "src-tauri/src/core/scrapers/lever/mod.rs",
  "src-tauri/src/core/scrapers/linkedin.rs",
  "src-tauri/src/core/scrapers/simplyhired.rs",
]);

const rawLocalPathLoggingPaths = new Set([
  "src-tauri/src/commands/ml.rs",
  "src-tauri/src/commands/resume.rs",
  "src-tauri/src/core/automation/browser/page.rs",
  "src-tauri/src/core/automation/form_filler.rs",
  "src-tauri/src/core/db/connection.rs",
  "src-tauri/src/core/db/integrity/backups.rs",
  "src-tauri/src/main.rs",
  "src-tauri/src/platforms/linux/mod.rs",
  "src-tauri/src/platforms/macos/mod.rs",
  "src-tauri/src/platforms/windows/mod.rs",
]);

const rawUrlLoggingPaths = new Set([
  "src-tauri/src/commands/linkedin_auth.rs",
  "src-tauri/src/core/automation/browser/manager.rs",
  "src-tauri/src/core/scrapers/url_utils.rs",
]);

const rawUrlErrorDisplayPaths = new Set([
  "src-tauri/src/core/automation/error.rs",
  "src-tauri/src/core/scrapers/error.rs",
]);

const rawPathOrQueryErrorDisplayPaths = new Set(["src-tauri/src/core/db/error.rs"]);

const rawJobImportLoggingPaths = new Set(["src-tauri/src/commands/import.rs"]);

const rawImportRedirectDisplayPaths = new Set(["src-tauri/src/core/import/types.rs"]);

const rawAutomationQuestionLoggingPaths = new Set([
  "src-tauri/src/core/automation/form_filler.rs",
]);

const rawNotificationJobTitleLoggingPaths = new Set(["src-tauri/src/core/notify/mod.rs"]);

const rawBookmarkletLoggingPaths = new Set(["src-tauri/src/core/bookmarklet/server.rs"]);
const bookmarkletGeneratorPaths = new Set(["src/components/BookmarkletGenerator.tsx"]);
const frontendErrorReportingPaths = new Set(["src/utils/errorReporting.ts"]);
const settingsCredentialPaths = new Set(["src/pages/Settings.tsx"]);
const feedbackSanitizerPaths = new Set(["src-tauri/src/commands/feedback/sanitizer.rs"]);
const notificationDocsPaths = new Set(["docs/features/notifications.md"]);
const userDataDocsPaths = new Set(["docs/features/user-data-management.md"]);
const structuredDebugLogPaths = new Set(["src-tauri/src/commands/feedback/debug_log.rs"]);
const feedbackCommandPaths = new Set(["src-tauri/src/commands/feedback/mod.rs"]);
const userDataPrivacyLoggingPaths = new Set([
  "src-tauri/src/commands/user_data.rs",
  "src-tauri/src/core/user_data/mod.rs",
]);

function readPackageManifest(root) {
  return JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
}

function normalizeRepoPath(path) {
  return path.split(/[\\/]/).join("/");
}

function shouldSkipTraversal(relPath) {
  const normalized = normalizeRepoPath(relPath);
  const parts = normalized.split("/");

  if (ignoredTraversalPaths.has(normalized)) {
    return true;
  }

  return parts.some((part) => part === "node_modules" || part === ".git");
}

function isForbiddenFileName(name) {
  if (forbiddenFileNames.has(name)) {
    return true;
  }

  if (name.endsWith("~")) {
    return true;
  }

  if (/\.sw.$/.test(name) || name.endsWith("storybook.log")) {
    return true;
  }

  if (
    name.startsWith("npm-debug.log") ||
    name.startsWith("yarn-debug.log") ||
    name.startsWith("yarn-error.log") ||
    name.startsWith("pnpm-debug.log") ||
    name.startsWith("lerna-debug.log")
  ) {
    return true;
  }

  return forbiddenFileExtensions.has(extname(name));
}

function collectUnexpectedRootEntries(root) {
  const violations = [];

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const rel = normalizeRepoPath(entry.name);

    if (ignoredTraversalPaths.has(rel) || rel === ".git" || rel === "node_modules") {
      continue;
    }

    if (!allowedRootEntries.has(rel)) {
      violations.push(`${rel} is not in the root allowlist`);
    }
  }

  return violations;
}

function collectFilesystemBloat(root, dir = root) {
  const violations = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    const rel = normalizeRepoPath(relative(root, fullPath));

    if (shouldSkipTraversal(rel)) {
      continue;
    }

    if (entry.isDirectory()) {
      if (forbiddenArtifactDirs.has(entry.name)) {
        violations.push(`${rel}/ is a disposable local artifact`);
        continue;
      }

      violations.push(...collectFilesystemBloat(root, fullPath));
      continue;
    }

    if (entry.isFile() && isForbiddenFileName(entry.name)) {
      violations.push(`${rel} is a disposable local artifact`);
    }
  }

  return violations;
}

function listTrackedFiles(root) {
  return execFileSync("git", ["ls-files"], {
    cwd: root,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean)
    .map(normalizeRepoPath)
    .filter((path) => existsSync(join(root, path)));
}

function isTrackedBloat(path) {
  if (allowedTrackedGeneratedPaths.has(path)) {
    return false;
  }

  if (forbiddenTrackedPlaceholderFiles.has(path)) {
    return true;
  }

  const parts = path.split("/");
  const fileName = parts.at(-1) ?? path;

  if (fileName === ".gitkeep") {
    return true;
  }

  if (parts.length > 1 && /^test[_-].*\.sh$/.test(fileName) && parts[0] !== "scripts") {
    return true;
  }

  if (parts.length === 1 && forbiddenRootSummaryPattern.test(fileName)) {
    return true;
  }

  if (
    parts.some((part) =>
      ["coverage", "dist", "dist-ssr", "playwright-report", "test-results"].includes(part),
    )
  ) {
    return true;
  }

  if (path.startsWith("tests/e2e/docs/")) {
    return true;
  }

  if (path.startsWith("src-tauri/gen/") && !path.startsWith("src-tauri/gen/schemas/")) {
    return true;
  }

  return isForbiddenFileName(fileName);
}

function hasSpeculativeCloudDeploymentDoc(root, path) {
  const pattern = speculativeCloudDeploymentDocs.get(path);

  if (!pattern) {
    return false;
  }

  return pattern.test(readFileSync(join(root, path), "utf8"));
}

function hasStaleInformalMaintainerFooter(root, path) {
  if (!path.endsWith(".md")) {
    return false;
  }

  return /Maintained By\**:\s*The Rust Mac Overlord/i.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasStaleHardcodedMigrationCount(root, path) {
  if (path !== "docs/developer/GETTING_STARTED.md") {
    return false;
  }

  return /\b\d+\s+SQLite migrations\b/.test(readFileSync(join(root, path), "utf8"));
}

function hasStaleIntegrationFixtureDirectoryClaim(root, path) {
  if (path !== "docs/developer/INTEGRATION_TESTING.md") {
    return false;
  }

  return /fixtures\/\s+# Test HTML\/JSON responses|Test HTML responses stored in `fixtures\/`/m.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasStaleSchedulerWorkerPathDocs(root, path) {
  if (path !== "docs/developer/ARCHITECTURE.md") {
    return false;
  }

  return /workers\/(?:scraper|scorer|notifier)\.rs/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasStaleSchedulerScraperPathDocs(root, path) {
  if (path !== "docs/security/KEYRING.md") {
    return false;
  }

  return /scheduler\/scrapers\.rs/.test(readFileSync(join(root, path), "utf8"));
}

function hasStaleRefactoringPriorityTable(root, path) {
  if (path !== "docs/developer/GETTING_STARTED.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /\*\*v1\.5 Refactoring Priority\*\*/.test(text) ||
    /needs modularization|candidate for split|frontend refactoring planned/.test(text)
  );
}

function hasStaleLinuxPlatformStubMarkers(root, path) {
  if (path !== "src-tauri/src/platforms/linux/mod.rs") {
    return false;
  }

  return /Coming Soon|will contain Linux-specific code|limited functionality/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasStaleShippedFeatureStatusDoc(root, path) {
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

function hasRoadmapStatusEmoji(root, path) {
  if (path !== "docs/ROADMAP.md") {
    return false;
  }

  return /[\u{2705}\u{1f532}]/u.test(readFileSync(join(root, path), "utf8"));
}

function hasStaleUserDataExportRoadmapClaim(root, path) {
  if (path !== "docs/features/user-data-management.md") {
    return false;
  }

  return /feature coming in v1\.5|\*\*v1\.5 \(Q1 2026\):\*\*|Export anytime.*JSON/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasOverbroadLocalStorageMigrationClaim(root, path) {
  if (path !== "docs/ROADMAP.md") {
    return false;
  }

  return /Backend persistence for all user data \(localStorage → SQLite\)/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasDeepLinksEmojiOrVersionPromise(root, path) {
  if (path !== "docs/user/DEEP_LINKS.md") {
    return false;
  }

  return /[✅❌⚠️🔐]|coming in v2\.7|planned for v2\.7|^### v\d+\.\d+/m.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasQuickStartEmojiMarkers(root, path) {
  if (path !== "docs/user/QUICK_START.md") {
    return false;
  }

  return /[✅❌⚠️⏳🔐📄📝🟢🟡🔴📊📧📈📉🎯🚀💡🔍⭐]/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasFrontDoorDocEmojiMarkers(root, path) {
  if (path !== "README.md" && path !== "docs/README.md") {
    return false;
  }

  return /[\u{2705}\u{274c}\u{26a0}\u{23f3}\u{26a1}\u{1f517}\u{1f512}\u{1f4c4}\u{1f4dd}\u{1f7e2}\u{1f7e1}\u{1f534}\u{1f4ca}\u{1f4e7}\u{1f4c8}\u{1f4c9}\u{1f3af}\u{1f680}\u{1f4a1}\u{1f50d}\u{2b50}]/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasScraperDocEmojiMarkers(root, path) {
  if (path !== "docs/features/scrapers.md") {
    return false;
  }

  return /[\u{2705}\u{274c}\u{26a0}\u{23f3}\u{26a1}\u{23f1}\u{1f517}\u{1f512}\u{1f4c4}\u{1f4dd}\u{1f7e2}\u{1f7e1}\u{1f534}\u{1f4ca}\u{1f4e7}\u{1f4c8}\u{1f4c9}\u{1f3af}\u{1f680}\u{1f4a1}\u{1f50d}\u{1f539}\u{1f3d7}\u{1f9ee}\u{1f3e5}\u{1f9ea}\u{1f527}\u{1f51c}\u{1f1fa}\u{1f1f8}\u{1f4cb}\u{2b50}]/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasScraperHealthDocEmojiMarkers(root, path) {
  if (path !== "docs/features/scraper-health.md") {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|[\u{1f1e6}-\u{1f1ff}])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasFeatureStatusColorEmojiMarkers(root, path) {
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

function hasMarketIntelligenceDocEmojiMarkers(root, path) {
  if (path !== "docs/features/market-intelligence.md") {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|severity_emoji|type_emoji|sentiment_emoji)/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasStaleApplicationTrackingDocClaims(root, path) {
  if (path !== "docs/features/application-tracking.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /UI Integration \(Future\)/.test(text) ||
    /src\/pages\/ApplicationTracker\.tsx/.test(text) ||
    /invoke<ApplicationsByStatus>\('get_applications_by_status'\)/.test(text) ||
    /- \[ \] Tauri commands/.test(text) ||
    /- \[ \] UI components \(Kanban board\)/.test(text) ||
    /UI Connections & Polish \(v1\.4 E4\)/.test(text)
  );
}

function hasStaleSmartScoringSalaryMarkerClaim(root, path) {
  if (path !== "docs/features/smart-scoring.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /Predicted salaries are marked with a .* icon/u.test(text) ||
    /\*\*Implementation Status:\*\* ✅ Complete/.test(text)
  );
}

function hasRawPrivateQueryLogging(root, path) {
  if (!rawPrivateQueryLoggingPaths.has(path)) {
    return false;
  }

  return /\b(?:query|question|pattern):\s*'?\{(?::\?)?\}'?/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasRawUserDataPrivacyLogging(root, path) {
  if (!userDataPrivacyLoggingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /create_cover_letter_template \(name:\s*\{\}\)/.test(text) ||
    /create_saved_search \(name:\s*\{\}\)/.test(text) ||
    /Creating template:\s*\{\}/.test(text) ||
    /Creating saved search:\s*\{\}/.test(text) ||
    /Adding search history:\s*\{\}/.test(text) ||
    /#\[instrument\(skip\(self,\s*content\)\)\]\s*pub async fn (?:create|update)_template/.test(
      text,
    ) ||
    /#\[instrument\(skip\(self\)\)\]\s*pub async fn (?:create_saved_search|add_search_history|save_notification_preferences)/.test(
      text,
    )
  );
}

function hasRawScraperUrlOrQueryLogging(root, path) {
  if (!rawScraperLoggingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /(?:URL|url|fetching|Fetching[^"]*(?:API|for|query)):\s*\{\}|(?:query|location)\s*=\s*%self\.(?:query|location)/.test(
    text,
  ) || /MCP request:\s*\{\}[^;]*request/.test(text);
}

function hasRawLocalPathLogging(root, path) {
  if (!rawLocalPathLoggingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /tracing::(?:debug|info|warn|error)!\([^;]*(?:\bpath:\s*\{\}|display\(\)|(?:path|dir|directory|backup|database|configuration)[^;]*\{:\?\})/.test(
    text,
  );
}

function hasRawUrlLogging(root, path) {
  if (!rawUrlLoggingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /(?:fields\(url\s*=\s*%url\)|tracing::(?:debug|info|warn|error)!\([^;]*(?:URL|url)[^;]*:\s*\{\})/.test(
    text,
  ) || /tracing::(?:debug|info|warn|error)!\([^;]*navigation:\s*\{\}[^;]*url_str/.test(text);
}

function hasRawUrlErrorDisplay(root, path) {
  if (!rawUrlErrorDisplayPaths.has(path)) {
    return false;
  }

  return /#\[error\("[^"]*\{url\}/.test(readFileSync(join(root, path), "utf8"));
}

function hasRawPathOrQueryErrorDisplay(root, path) {
  if (!rawPathOrQueryErrorDisplayPaths.has(path)) {
    return false;
  }

  return /#\[error\("[^"]*\{(?:path|query)\}/.test(readFileSync(join(root, path), "utf8"));
}

function hasRawImportRedirectDisplay(root, path) {
  if (!rawImportRedirectDisplayPaths.has(path)) {
    return false;
  }

  return /Redirect blocked while fetching URL: \{location\}/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasRawJobImportLogging(root, path) {
  if (!rawJobImportLoggingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /#\[tracing::instrument\([^\]]*fields\(url\)/.test(text) ||
    /tracing::info!\([^;]*(?:title|company)\s*=\s*%(?:preview\.)?(?:title|company)/.test(text)
  );
}

function hasRawAutomationQuestionLogging(root, path) {
  if (!rawAutomationQuestionLoggingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /tracing::debug!\([^;]*(?:screening question|screening answer)[^;]*'\{\}'[^;]*question_text/.test(
    text,
  );
}

function hasRawNotificationJobTitleLogging(root, path) {
  if (!rawNotificationJobTitleLoggingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /tracing::info!\([^;]*notification\.job\.title/.test(text);
}

function hasRawBookmarkletImportLogging(root, path) {
  if (!rawBookmarkletLoggingPaths.has(path)) {
    return false;
  }

  return /tracing::info!\([^;]*title\s*=\s*%title[^;]*company\s*=\s*%company/s.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasManualBookmarkletJsonErrorResponses(root, path) {
  if (!rawBookmarkletLoggingPaths.has(path)) {
    return false;
  }

  return /format!\(r#"\{\{"error":"[^"]*\{\}[^"]*"\}\}"#,\s*e\)/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasUnauthenticatedBookmarkletImports(root, path) {
  if (!rawBookmarkletLoggingPaths.has(path)) {
    return false;
  }

  return /if request\.starts_with\("POST \/api\/bookmarklet\/import"\)\s*\{\s*handle_import_request\(&request,\s*database\)\.await/s.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasBookmarkletCodeWithoutTokenHeader(root, path) {
  if (!bookmarkletGeneratorPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /api\/bookmarklet\/import/.test(text) && !/X-JobSentinel-Token/.test(text);
}

function hasUnsanitizedFrontendErrorReportStorage(root, path) {
  if (!frontendErrorReportingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /this\.errors\.unshift\(report\)/.test(text) ||
    (/localStorage\.setItem\(STORAGE_KEY,\s*JSON\.stringify\(this\.errors\)\)/.test(text) &&
      !/sanitizeStoredReport/.test(text)) ||
    text.includes("hooks\\.slack\\.com\\/services") ||
    !text.includes("discord(?:app)?\\.com\\/api\\/webhooks") ||
    !text.includes("outlook\\.office(?:365)?\\.com\\/webhook")
  );
}

function hasNotificationWebhookSaveWithoutValidation(root, path) {
  if (!settingsCredentialPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const savesNotificationWebhook =
    /storeCredential\(\s*["'](?:slack|discord|teams)_webhook["']/.test(text);

  return (
    savesNotificationWebhook &&
    !/getCredentialValidationError\(\s*credentials\s*\)/.test(text)
  );
}

function hasStaleFeedbackWebhookSanitizer(root, path) {
  if (!feedbackSanitizerPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    text.includes("hooks\\.(slack|discord|teams)\\.com") ||
    !text.includes("discord(?:app)?\\.com/api/webhooks") ||
    !text.includes("outlook\\.office(?:365)?\\.com/webhook")
  );
}

function hasStaleNotificationWebhookDocs(root, path) {
  if (!notificationDocsPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /Discord:\*\* Must start with `https:\/\/discord\.com\/api\/webhooks\/`/.test(text) ||
    /Teams:\*\* Must start with `https:\/\/outlook\.office\.com\/webhook\/`/.test(text)
  );
}

function hasStaleNotificationPreferenceDocs(root, path) {
  if (!userDataDocsPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /per_source_settings|min_score|include_ghosts|keyword_rules|\bthresholds\s*:/.test(text) ||
    /invoke\("save_notification_preferences",\s*\{\s*(?:\r?\n)?\s*(?:per_source_settings|linkedin):/m.test(text) ||
    !/indeed:\s*\{\s*enabled:\s*true,\s*minScoreThreshold:\s*70,\s*soundEnabled:\s*true\s*\}/.test(text) ||
    !/prefs:\s*\{[\s\S]*advancedFilters:/m.test(text)
  );
}

function hasUnsanitizedStructuredDebugLogEvents(root, path) {
  if (!structuredDebugLogPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    !text.includes("sanitize_timestamped_event") ||
    /pub fn get_debug_log\(\)[\s\S]*?\.map\(\|buffer\| buffer\.get_all\(\)\)/.test(text) ||
    /pub fn get_recent_events\([^)]*\)[\s\S]*?\.map\(\|buffer\| buffer\.get_recent\(n\)\)/.test(
      text,
    )
  );
}

function hasUnsanitizedFeedbackFileSave(root, path) {
  if (!feedbackCommandPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /std::fs::write\(&path,\s*content\)/.test(text) || !text.includes("feedback_file_content");
}

function hasUnownedStorybookAddon(root, path) {
  if (path !== ".storybook/main.ts") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const addons = text.match(/["']addons["']\s*:\s*\[([\s\S]*?)\]/)?.[1] ?? "";
  const packageJson = readPackageManifest(root);
  const ownedPackages = new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
    ...Object.keys(packageJson.optionalDependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {}),
  ]);

  return [...addons.matchAll(/["']([^"']+)["']/g)].some(([, addon]) => {
    return !addon.startsWith(".") && !ownedPackages.has(addon);
  });
}

function hasStaleUserDataMockHandlers(root, path) {
  if (path !== "src/mocks/handlers.ts") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const requiredCommands = [
    "seed_default_templates",
    "list_cover_letter_templates",
    "get_cover_letter_template",
    "create_cover_letter_template",
    "update_cover_letter_template",
    "delete_cover_letter_template",
    "get_notification_preferences",
    "save_notification_preferences",
    "get_search_history",
    "add_search_history",
    "clear_search_history",
    "list_saved_searches",
    "create_saved_search",
    "use_saved_search",
    "delete_saved_search",
  ];
  const missingRequiredCommand = requiredCommands.some((command) => {
    return !new RegExp(`case\\s+["']${command}["']`).test(text);
  });

  return missingRequiredCommand || /case\s+["']save_search["']/.test(text);
}

function hasStaleDeepLinkMockHandlers(root, path) {
  if (path !== "src/mocks/handlers.ts") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const requiredCommands = [
    "generate_deep_links",
    "generate_deep_link",
    "get_supported_sites",
    "get_sites_by_category_cmd",
    "open_deep_link",
  ];

  return requiredCommands.some((command) => {
    return !new RegExp(`case\\s+["']${command}["']`).test(text);
  });
}

export function checkRepoBloat(root = defaultRoot) {
  const violations = [];

  if (!existsSync(root)) {
    return [`repo root does not exist: ${root}`];
  }

  for (const rootEntry of collectUnexpectedRootEntries(root)) {
    violations.push(`classify root entry or move/remove it: ${rootEntry}`);
  }

  for (const artifact of collectFilesystemBloat(root)) {
    violations.push(`remove local artifact: ${artifact}`);
  }

  for (const path of listTrackedFiles(root)) {
    if (isTrackedBloat(path)) {
      violations.push(`remove tracked generated or disposable file: ${path}`);
    }

    if (hasSpeculativeCloudDeploymentDoc(root, path)) {
      violations.push(`remove speculative cloud deployment doc: ${path}`);
    }

    if (hasStaleInformalMaintainerFooter(root, path)) {
      violations.push(`replace stale informal maintainer footer: ${path}`);
    }

    if (hasStaleHardcodedMigrationCount(root, path)) {
      violations.push(`remove stale hardcoded migration count: ${path}`);
    }

    if (hasStaleIntegrationFixtureDirectoryClaim(root, path)) {
      violations.push(`remove stale integration fixture directory claim: ${path}`);
    }

    if (hasStaleSchedulerWorkerPathDocs(root, path)) {
      violations.push(`remove stale scheduler worker path docs: ${path}`);
    }

    if (hasStaleSchedulerScraperPathDocs(root, path)) {
      violations.push(`remove stale scheduler scraper path docs: ${path}`);
    }

    if (hasStaleRefactoringPriorityTable(root, path)) {
      violations.push(`remove stale refactoring-priority table: ${path}`);
    }

    if (hasStaleLinuxPlatformStubMarkers(root, path)) {
      violations.push(`replace stale Linux platform stub markers: ${path}`);
    }

    if (hasStaleShippedFeatureStatusDoc(root, path)) {
      violations.push(`remove stale shipped-feature status doc: ${path}`);
    }

    if (hasRoadmapStatusEmoji(root, path)) {
      violations.push(`replace roadmap status emoji with text: ${path}`);
    }

    if (hasStaleUserDataExportRoadmapClaim(root, path)) {
      violations.push(`remove stale user-data export roadmap claim: ${path}`);
    }

    if (hasOverbroadLocalStorageMigrationClaim(root, path)) {
      violations.push(`replace overbroad localStorage migration claim: ${path}`);
    }

    if (hasDeepLinksEmojiOrVersionPromise(root, path)) {
      violations.push(`replace Deep Links doc emoji/version promises: ${path}`);
    }

    if (hasQuickStartEmojiMarkers(root, path)) {
      violations.push(`replace Quick Start doc emoji markers: ${path}`);
    }

    if (hasFrontDoorDocEmojiMarkers(root, path)) {
      violations.push(`replace front-door doc emoji markers: ${path}`);
    }

    if (hasScraperDocEmojiMarkers(root, path)) {
      violations.push(`replace scraper doc emoji markers: ${path}`);
    }

    if (hasScraperHealthDocEmojiMarkers(root, path)) {
      violations.push(`replace scraper health doc emoji markers: ${path}`);
    }

    if (hasFeatureStatusColorEmojiMarkers(root, path)) {
      violations.push(`replace feature status color emoji markers: ${path}`);
    }

    if (hasMarketIntelligenceDocEmojiMarkers(root, path)) {
      violations.push(`replace Market Intelligence doc emoji/stale indicator markers: ${path}`);
    }

    if (hasStaleApplicationTrackingDocClaims(root, path)) {
      violations.push(`remove stale application tracking doc claims: ${path}`);
    }

    if (hasStaleSmartScoringSalaryMarkerClaim(root, path)) {
      violations.push(`remove stale smart-scoring salary marker claim: ${path}`);
    }

    if (hasRawPrivateQueryLogging(root, path)) {
      violations.push(`replace raw private query logging: ${path}`);
    }

    if (hasRawUserDataPrivacyLogging(root, path)) {
      violations.push(`replace raw user-data privacy logging: ${path}`);
    }

    if (hasRawScraperUrlOrQueryLogging(root, path)) {
      violations.push(`replace raw scraper URL/query logging: ${path}`);
    }

    if (hasRawLocalPathLogging(root, path)) {
      violations.push(`replace raw local path logging: ${path}`);
    }

    if (hasRawUrlLogging(root, path)) {
      violations.push(`replace raw URL logging: ${path}`);
    }

    if (hasRawUrlErrorDisplay(root, path)) {
      violations.push(`replace raw URL error display: ${path}`);
    }

    if (hasRawPathOrQueryErrorDisplay(root, path)) {
      violations.push(`replace raw path/query error display: ${path}`);
    }

    if (hasRawImportRedirectDisplay(root, path)) {
      violations.push(`replace raw import redirect display: ${path}`);
    }

    if (hasRawJobImportLogging(root, path)) {
      violations.push(`replace raw job import logging: ${path}`);
    }

    if (hasRawAutomationQuestionLogging(root, path)) {
      violations.push(`replace raw automation screening question logging: ${path}`);
    }

    if (hasRawNotificationJobTitleLogging(root, path)) {
      violations.push(`replace raw notification job title logging: ${path}`);
    }

    if (hasRawBookmarkletImportLogging(root, path)) {
      violations.push(`replace raw bookmarklet import metadata logging: ${path}`);
    }

    if (hasManualBookmarkletJsonErrorResponses(root, path)) {
      violations.push(`replace manual bookmarklet JSON error responses: ${path}`);
    }

    if (hasUnauthenticatedBookmarkletImports(root, path)) {
      violations.push(`require bookmarklet import auth token: ${path}`);
    }

    if (hasBookmarkletCodeWithoutTokenHeader(root, path)) {
      violations.push(`include bookmarklet auth token header: ${path}`);
    }

    if (hasUnsanitizedFrontendErrorReportStorage(root, path)) {
      violations.push(`sanitize frontend error report storage: ${path}`);
    }

    if (hasNotificationWebhookSaveWithoutValidation(root, path)) {
      violations.push(`validate notification webhook settings before saving: ${path}`);
    }

    if (hasStaleFeedbackWebhookSanitizer(root, path)) {
      violations.push(`redact provider webhook URLs in feedback sanitizer: ${path}`);
    }

    if (hasStaleNotificationWebhookDocs(root, path)) {
      violations.push(`document all notification webhook provider hosts: ${path}`);
    }

    if (hasStaleNotificationPreferenceDocs(root, path)) {
      violations.push(`sync notification preference docs with backend shape: ${path}`);
    }

    if (hasUnsanitizedStructuredDebugLogEvents(root, path)) {
      violations.push(`sanitize structured feedback debug events: ${path}`);
    }

    if (hasUnsanitizedFeedbackFileSave(root, path)) {
      violations.push(`sanitize feedback file content before saving: ${path}`);
    }

    if (hasUnownedStorybookAddon(root, path)) {
      violations.push(`remove Storybook addon without package ownership: ${path}`);
    }

    if (hasStaleUserDataMockHandlers(root, path)) {
      violations.push(`sync user-data mock command handlers: ${path}`);
    }

    if (hasStaleDeepLinkMockHandlers(root, path)) {
      violations.push(`sync deep-link mock command handlers: ${path}`);
    }
  }

  return violations.sort();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.argv[2] ? resolve(process.argv[2]) : defaultRoot;
  const violations = checkRepoBloat(root);

  if (violations.length > 0) {
    console.error("Repo bloat check failed:");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log("Repo bloat check passed.");
}
