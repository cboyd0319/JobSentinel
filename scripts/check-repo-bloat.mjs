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
  "docs/images/dashboard.png",
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

const forbiddenTrackedOneOffDocs = new Set(["docs/intel-mac-support.md"]);

const settingsHelperComponents = new Map([
  ["src/components/settings/CredentialInput.tsx", "CredentialInput"],
  ["src/components/settings/FilterListInput.tsx", "FilterListInput"],
  ["src/components/settings/SecureCredentialInput.tsx", "SecureCredentialInput"],
  ["src/components/settings/SliderSection.tsx", "SliderSection"],
  ["src/components/settings/ToggleSection.tsx", "ToggleSection"],
]);

const unreferencedHookModules = new Map([
  ["src/hooks/useAsyncOperation.ts", "useAsyncOperation"],
  ["src/hooks/useCachedDashboardData.ts", "useCachedDashboardData"],
  ["src/hooks/useFetchOnMount.ts", "useFetchOnMount"],
  ["src/hooks/useFormValidation.ts", "useFormValidation"],
  ["src/hooks/useMinimumLoadingDuration.ts", "useMinimumLoadingDuration"],
  ["src/hooks/useModal.ts", "useModal"],
  ["src/hooks/useOptimisticUpdate.ts", "useOptimisticUpdate"],
  ["src/hooks/usePagination.ts", "usePagination"],
  ["src/hooks/useTabs.ts", "useTabs"],
  ["src/hooks/useVirtualListScroll.ts", "useVirtualListScroll"],
]);

const unreferencedSourceHelpers = new Map([
  ["src/utils/cacheStrategies.ts", "cacheStrategies"],
]);

const unreferencedBarrelModules = new Set([
  "src/components/automation/index.ts",
  "src/components/feedback/index.ts",
  "src/pages/DashboardUI/index.ts",
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
  "src-tauri/src/core/scrapers/usajobs.rs",
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
const rawBackupPathErrorPaths = new Set(["src-tauri/src/core/db/integrity/backups.rs"]);

const mlRawLocalPathExposurePaths = new Set([
  "src-tauri/src/commands/ml.rs",
  "src-tauri/src/core/ml/model.rs",
]);

const mlRawLocalPathDocPaths = new Set(["docs/ML_FEATURE.md", "docs/ML_QUICKSTART.md"]);

const jobsWithGptPrivacyPaths = new Set(["src-tauri/src/core/scrapers/jobswithgpt.rs"]);
const linkedInPrivacyPaths = new Set(["src-tauri/src/core/scrapers/linkedin.rs"]);
const linkedInAuthPrivacyPaths = new Set(["src-tauri/src/commands/linkedin_auth.rs"]);
const emailCommandPrivacyPaths = new Set(["src-tauri/src/commands/config.rs"]);
const linkedInCredentialDocsPaths = new Set([
  "src-tauri/src/core/scrapers/linkedin.rs",
  "docs/features/scrapers.md",
  "docs/features/scraper-health.md",
]);

const databaseLogEmojiPaths = new Set([
  "src-tauri/src/core/db/connection.rs",
  "src-tauri/src/core/db/integrity/backups.rs",
  "src-tauri/src/core/db/integrity/diagnostics.rs",
  "src-tauri/src/core/db/integrity/mod.rs",
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
const rawResumeParserPathDisplayPaths = new Set(["src-tauri/src/core/resume/parser.rs"]);
const rawCommandSetupErrorDisplayPaths = new Set([
  "src-tauri/src/commands/config.rs",
  "src-tauri/src/commands/ghost.rs",
  "src-tauri/src/main.rs",
]);
const configValidationPrivacyPaths = new Set([
  "src-tauri/src/core/config/validation_error.rs",
]);

const rawJobImportLoggingPaths = new Set(["src-tauri/src/commands/import.rs"]);

const rawImportRedirectDisplayPaths = new Set(["src-tauri/src/core/import/types.rs"]);

const rawAutomationQuestionLoggingPaths = new Set([
  "src-tauri/src/core/automation/form_filler.rs",
]);
const importCommandPrivacyPaths = new Set(["src-tauri/src/commands/import.rs"]);
const urlSecurityPrivacyPaths = new Set(["src-tauri/src/core/url_security.rs"]);

const rawNotificationJobTitleLoggingPaths = new Set(["src-tauri/src/core/notify/mod.rs"]);

const rawBookmarkletLoggingPaths = new Set(["src-tauri/src/core/bookmarklet/server.rs"]);
const bookmarkletGeneratorPaths = new Set(["src/components/BookmarkletGenerator.tsx"]);
const frontendErrorReportingPaths = new Set(["src/utils/errorReporting.ts"]);
const settingsCredentialPaths = new Set(["src/pages/Settings.tsx"]);
const feedbackSanitizerPaths = new Set(["src-tauri/src/commands/feedback/sanitizer.rs"]);
const notificationDocsPaths = new Set(["docs/features/notifications.md"]);
const webhookSecurityDocsPaths = new Set(["docs/security/WEBHOOK_SECURITY.md"]);
const commandExecutionSecurityDocsPaths = new Set(["docs/security/COMMAND_EXECUTION.md"]);
const urlValidationSecurityDocsPaths = new Set(["docs/security/URL_VALIDATION.md"]);
const xssSecurityDocsPaths = new Set([
  "docs/security/README.md",
  "docs/security/XSS_PREVENTION.md",
  "docs/security/dompurify-test-examples.js",
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
const keyringSecurityDocsPaths = new Set([
  "docs/security/KEYRING.md",
  "docs/features/credentials-security.md",
]);
const keyringMigrationPaths = new Set(["src-tauri/src/main.rs"]);
const credentialArchitecturePaths = new Set(["src-tauri/src/core/credentials/mod.rs"]);
const credentialCommandPrivacyPaths = new Set([
  "src-tauri/src/commands/credentials.rs",
  "src-tauri/src/core/credentials/mod.rs",
]);
const credentialSecretReadIpcPaths = new Set([
  "src-tauri/src/commands/credentials.rs",
  "src-tauri/src/commands/mod.rs",
  "src-tauri/src/main.rs",
  "src/pages/Settings.tsx",
  "src/mocks/handlers.ts",
  "docs/security/KEYRING.md",
  "docs/features/credentials-security.md",
  "docs/releases/v2.0.md",
]);
const configExportPrivacyPaths = new Set(["src/utils/export.ts"]);
const telegramNotificationPrivacyPaths = new Set([
  "src-tauri/src/core/notify/telegram.rs",
]);
const webhookNotificationPrivacyPaths = new Set([
  "src-tauri/src/core/notify/discord.rs",
  "src-tauri/src/core/notify/slack.rs",
  "src-tauri/src/core/notify/teams.rs",
]);
const notificationProviderErrorBodyPaths = new Set([
  "src-tauri/src/core/notify/discord.rs",
  "src-tauri/src/core/notify/teams.rs",
  "src-tauri/src/core/notify/telegram.rs",
]);
const healthSmokePrivacyPaths = new Set(["src-tauri/src/core/health/smoke_tests.rs"]);
const userDataDocsPaths = new Set(["docs/features/user-data-management.md"]);
const structuredDebugLogPaths = new Set(["src-tauri/src/commands/feedback/debug_log.rs"]);
const feedbackCommandPaths = new Set(["src-tauri/src/commands/feedback/mod.rs"]);
const resumeCommandDtoPrivacyPaths = new Set([
  "src-tauri/src/commands/resume.rs",
  "src/pages/Resume.tsx",
  "src/pages/ResumeBuilder.tsx",
  "src/mocks/handlers.ts",
  "docs/features/resume-matcher.md",
]);
const userDataPrivacyLoggingPaths = new Set([
  "src-tauri/src/commands/user_data.rs",
  "src-tauri/src/core/user_data/mod.rs",
]);
const cacheUsageDocPaths = new Set(["docs/CACHE_USAGE.md"]);
const frontendJobUrlOpenPaths = new Set([
  "src/components/JobCard.tsx",
  "src/pages/Dashboard.tsx",
]);
const frontendStatusEmojiPaths = new Set([
  "src/components/AnalyticsPanel.tsx",
  "src/components/BookmarkletGenerator.tsx",
  "src/components/InterviewScheduler.tsx",
  "src/pages/Applications.tsx",
]);
const backendScoringReasonPaths = new Set([
  "src-tauri/src/core/resume/matcher.rs",
  "src-tauri/src/core/scoring/mod.rs",
  "src-tauri/src/core/scoring/remote.rs",
]);

const notificationScoringReasonPaths = new Set([
  "src-tauri/src/core/notify/discord.rs",
  "src-tauri/src/core/notify/email.rs",
  "src-tauri/src/core/notify/mod.rs",
  "src-tauri/src/core/notify/slack.rs",
  "src-tauri/src/core/notify/teams.rs",
  "src-tauri/src/core/notify/telegram.rs",
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

  if (forbiddenTrackedOneOffDocs.has(path)) {
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

  if (parts[0] === "src" && extname(fileName) === ".md") {
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

function isProductionTypeScriptSource(path) {
  return (
    path.startsWith("src/") &&
    /\.(?:ts|tsx)$/.test(path) &&
    !/(?:^|\/)[^/]+\.test\.(?:ts|tsx)$/.test(path)
  );
}

function hasExternalProductionReference(root, symbolName, options = {}) {
  const symbolPattern = new RegExp(`\\b${symbolName}\\b`);
  const ignoredPaths = options.ignoredPaths ?? new Set();
  const ignoredPrefixes = options.ignoredPrefixes ?? [];

  return listTrackedFiles(root).some((path) => {
    if (
      !isProductionTypeScriptSource(path) ||
      ignoredPaths.has(path) ||
      ignoredPrefixes.some((prefix) => path.startsWith(prefix))
    ) {
      return false;
    }

    return symbolPattern.test(readFileSync(join(root, path), "utf8"));
  });
}

function hasUnreferencedSettingsHelperComponent(root, path) {
  const componentName = settingsHelperComponents.get(path);

  if (!componentName) {
    return false;
  }

  return !hasExternalProductionReference(root, componentName, {
    ignoredPrefixes: ["src/components/settings/"],
  });
}

function hasUnreferencedHookModule(root, path) {
  const hookName = unreferencedHookModules.get(path);

  if (!hookName) {
    return false;
  }

  return !hasExternalProductionReference(root, hookName, {
    ignoredPaths: new Set([path, "src/hooks/index.ts"]),
  });
}

function hasUnreferencedSourceHelper(root, path) {
  const helperName = unreferencedSourceHelpers.get(path);

  if (!helperName) {
    return false;
  }

  return !hasExternalProductionReference(root, helperName, {
    ignoredPaths: new Set([path]),
  });
}

function hasStaleNotificationPreferenceSyncWrapper(root, path) {
  if (path !== "src/utils/notificationPreferences.ts") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /export function loadNotificationPreferences\(\): NotificationPreferences/.test(text) ||
    /export function saveNotificationPreferences\(_?prefs: NotificationPreferences\): boolean/.test(text) ||
    /@deprecated Use saveNotificationPreferencesAsync instead/.test(text)
  );
}

function importSpecifiers(root, path) {
  const text = readFileSync(join(root, path), "utf8");
  const specifiers = [];
  const importPattern =
    /(?:import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s*)?|export\s+(?:type\s+)?[\s\S]*?\s+from\s*|import\s*\()\s*["']([^"']+)["']/g;

  for (const match of text.matchAll(importPattern)) {
    specifiers.push(match[1]);
  }

  return specifiers;
}

function resolveImportSpecifier(importerPath, specifier) {
  if (specifier.startsWith("@/")) {
    return normalizeRepoPath(join("src", specifier.slice(2)));
  }

  if (specifier.startsWith(".")) {
    return normalizeRepoPath(join(dirname(importerPath), specifier));
  }

  return null;
}

function importsBarrelPath(root, path, barrelPath) {
  if (!isProductionTypeScriptSource(path) || path === barrelPath) {
    return false;
  }

  const barrelImportPath = barrelPath.replace(/\/index\.ts$/, "");

  return importSpecifiers(root, path).some((specifier) => {
    const resolvedPath = resolveImportSpecifier(path, specifier);
    return resolvedPath === barrelImportPath || resolvedPath === barrelPath.replace(/\.ts$/, "");
  });
}

function hasUnreferencedComponentsBarrel(root, path) {
  if (path !== "src/components/index.ts") {
    return false;
  }

  return !listTrackedFiles(root).some((trackedPath) =>
    importsBarrelPath(root, trackedPath, path),
  );
}

function hasUnreferencedBarrelModule(root, path) {
  if (!unreferencedBarrelModules.has(path)) {
    return false;
  }

  return !listTrackedFiles(root).some((trackedPath) =>
    importsBarrelPath(root, trackedPath, path),
  );
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

function hasStaleErrorHandlingScrapeAllDoc(root, path) {
  if (path !== "docs/developer/ERROR_HANDLING.md") {
    return false;
  }

  return /self\.scrape_all\(\)\.await/.test(readFileSync(join(root, path), "utf8"));
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

function hasRoadmapVersionDrift(root, path) {
  if (path !== "docs/ROADMAP.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /\*\*Last Updated:\*\*|## Current Version:|v2\.7\+ Planned|v2\.7\.[01]\s+-\s+/.test(text) ||
    /\((?:v2\.2\+|v2\.6\+|v1\.6\+)\)|Frontend Architecture \(v2\.6\+\)/.test(text)
  );
}

function hasFrontDoorDocStaleFooter(root, path) {
  if (path !== "docs/README.md") {
    return false;
  }

  return /\*\*Last Updated:\*\*/.test(readFileSync(join(root, path), "utf8"));
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

function hasFrontDoorReleaseVersionPromise(root, path) {
  if (path !== "README.md") {
    return false;
  }

  return /(?:Planned for v\d+\.\d+|coming in v\d+\.\d+|tracked for v\d+\.\d+)/i.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasSourceReleaseVersionPromise(root, path) {
  if (!isRuntimeFrontendSource(path)) {
    return false;
  }

  return /(?:Coming in v\d+\.\d+|planned for v\d+\.\d+)/i.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasProductionSourceGlyphMarkers(root, path) {
  if (!isRuntimeFrontendSource(path)) {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|[\u{2705}\u{274c}\u{26a0}\u{2139}\u{2713}\u{2717}])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasBackendScoringReasonGlyphMarkers(root, path) {
  if (!backendScoringReasonPaths.has(path)) {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|[\u{2705}\u{274c}\u{26a0}\u{2139}\u{2713}\u{2717}\u{251c}\u{2514}\u{2500}\u{2022}])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasNotificationScoringReasonGlyphMarkers(root, path) {
  if (!notificationScoringReasonPaths.has(path)) {
    return false;
  }

  return /\u{2713}/u.test(readFileSync(join(root, path), "utf8"));
}

function hasFrontendStatusEmojiMarkers(root, path) {
  if (!frontendStatusEmojiPaths.has(path)) {
    return false;
  }

  return /[⏳📝📞🎉✓✗]/u.test(readFileSync(join(root, path), "utf8"));
}

function hasBookmarkletDocStatusEmojiMarkers(root, path) {
  if (path !== "docs/BOOKMARKLET.md") {
    return false;
  }

  return /[✓✗]/u.test(readFileSync(join(root, path), "utf8"));
}

function hasScraperDocEmojiMarkers(root, path) {
  if (path !== "docs/features/scrapers.md") {
    return false;
  }

  return /[\u{2014}\u{2192}\u{2500}-\u{257f}\u{25bc}\u{2705}\u{274c}\u{26a0}\u{23f3}\u{26a1}\u{23f1}\u{1f517}\u{1f512}\u{1f4c4}\u{1f4dd}\u{1f7e2}\u{1f7e1}\u{1f534}\u{1f4ca}\u{1f4e7}\u{1f4c8}\u{1f4c9}\u{1f3af}\u{1f680}\u{1f4a1}\u{1f50d}\u{1f539}\u{1f3d7}\u{1f9ee}\u{1f3e5}\u{1f9ea}\u{1f527}\u{1f51c}\u{1f1fa}\u{1f1f8}\u{1f4cb}\u{2b50}]/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasStaleScraperDocReliabilityClaim(root, path) {
  if (path !== "docs/features/scrapers.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /production-ready scrapers for 13 major job boards/.test(text) ||
    /All 13 job board scrapers \(production-ready\)/.test(text) ||
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

function hasScraperHealthDocEmojiMarkers(root, path) {
  if (path !== "docs/features/scraper-health.md") {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|[\u{1f1e6}-\u{1f1ff}\u{2014}\u{2192}\u{2500}-\u{257f}\u{25bc}])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasStaleScraperHealthCoverage(root, path) {
  if (
    path !== "docs/features/scrapers.md" &&
    path !== "docs/features/scraper-health.md" &&
    path !== "docs/ROADMAP.md" &&
    path !== "src/mocks/handlers.ts" &&
    path !== "src/components/ScraperHealthDashboard.tsx"
  ) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  if (/13 scrapers|Testing 13 scrapers|updated with 13 scrapers|usa_jobs/.test(text)) {
    return true;
  }

  return (
    /interface SmokeTestResult[\s\S]{0,180}success:\s*boolean/.test(text) ||
    /interface MockSmokeTestResult[\s\S]{0,180}success:\s*boolean/.test(text) ||
    /response_time_ms/.test(text)
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

function hasFeatureDocMetadataFooter(root, path) {
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

function hasSynonymOrRemotePreferenceDocDrift(root, path) {
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
    /Potential improvements for v2\.0\+/.test(text) ||
    /preference × job type/.test(text) ||
    /\*\*Last Updated:\*\* March 18, 2026/.test(text)
  );
}

function hasStaleTestQualityDocGuidance(root, path) {
  if (path !== "tests/e2e/README.md" && path !== "docs/developer/FRONTEND_TESTING.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /\btest\.skip\s*\(|\b(?:it|test|describe)\.only\s*\(/.test(text) ||
    /\bnpm\s+test\s+--\s+--grep\b/.test(text)
  );
}

function hasDeveloperTestingDocMarkers(root, path) {
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

function hasDeveloperArchitectureDocMarkers(root, path) {
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

function hasDeveloperMaintenanceDocDrift(root, path) {
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

function hasTopLevelActiveDocDrift(root, path) {
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

function hasTopLevelActiveDocGlyphMarkers(root, path) {
  if (!topLevelActiveDocsPaths.has(path)) {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|[\u{2190}-\u{21ff}\u{2500}-\u{257f}\u{2713}\u{2717}])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasStaleE2eWaitGuidance(root, path) {
  if (path !== "tests/e2e/README.md" && path !== "docs/developer/FRONTEND_TESTING.md") {
    return false;
  }

  return /waitForLoadState\(["']networkidle["']\)|waitForTimeout\(ms\)/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasFixedWaitInE2ePageObject(root, path) {
  if (!path.startsWith("tests/e2e/playwright/page-objects/") || !path.endsWith(".ts")) {
    return false;
  }

  return /\.waitForTimeout\(/.test(readFileSync(join(root, path), "utf8"));
}

function hasUnreferencedE2eTestHelper(root, path) {
  if (path !== "tests/e2e/playwright/test-helpers.ts") {
    return false;
  }

  return !listTrackedFiles(root).some((trackedPath) => {
    if (
      trackedPath === path ||
      !trackedPath.startsWith("tests/e2e/playwright/") ||
      !trackedPath.endsWith(".ts")
    ) {
      return false;
    }

    return importSpecifiers(root, trackedPath).some(
      (specifier) => specifier === "./test-helpers" || specifier.endsWith("/test-helpers"),
    );
  });
}

function hasStaleGettingStartedToolingDocs(root, path) {
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

function hasStaleMacosDeveloperDocs(root, path) {
  if (path !== "docs/developer/MACOS_DEVELOPMENT.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /JobSentinel_1\.0\.0_aarch64\.dmg|[✅❌⚠️⏳🔐📄📝🟢🟡🔴📊📧📈📉🎯🚀💡🔍⭐🔄📋]/u.test(
    text,
  );
}

function hasStaleSqliteConfigurationDoc(root, path) {
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

function hasMarketIntelligenceDocGlyphMarkers(root, path) {
  if (path !== "docs/features/market-intelligence.md") {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|severity_emoji|type_emoji|sentiment_emoji|[\u{2190}-\u{21ff}\u{2500}-\u{257f}\u{25b2}\u{25bc}])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasResumeOrSalaryFeatureDocEmojiMarkers(root, path) {
  if (path !== "docs/features/resume-matcher.md" && path !== "docs/features/salary-ai.md") {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|[\u{1f1e6}-\u{1f1ff}\u{2192}\u{2500}\u{2502}\u{2514}\u{251c}\u{2713}\u{2717}\u{2022}])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasSmartScoringDocGlyphMarkers(root, path) {
  if (path !== "docs/features/smart-scoring.md") {
    return false;
  }

  return /[\u{2713}\u{2717}\u{2192}\u{251c}\u{2514}\u{2500}\u{2502}]/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasNotificationsDocGlyphMarkers(root, path) {
  if (path !== "docs/features/notifications.md") {
    return false;
  }

  return /[\u{2192}\u{251c}\u{2514}\u{2500}\u{2502}\u{22ef}]/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasActiveUserDocGlyphMarkers(root, path) {
  if (!activeUserDocGlyphPaths.has(path)) {
    return false;
  }

  return /[\u{2192}\u{2193}\u{2199}\u{2198}\u{2265}\u{2500}\u{2502}\u{2514}\u{251c}\u{22ef}]/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasFeaturePlainDocGlyphMarkers(root, path) {
  if (!featurePlainDocGlyphPaths.has(path)) {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|[\u{2190}-\u{21ff}\u{2500}-\u{257f}])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasMaintainedDocGlyphMarkers(root, path) {
  if (!maintainedDocGlyphPaths.has(path)) {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|[\u{2190}-\u{21ff}\u{2500}-\u{257f}\u{2713}\u{2717}])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasDeveloperLayoutDocGlyphMarkers(root, path) {
  if (!developerLayoutDocGlyphPaths.has(path)) {
    return false;
  }

  return /[\u{2192}\u{2500}\u{2502}\u{2514}\u{251c}]/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasStaleSalaryAiFutureUiClaim(root, path) {
  if (path !== "docs/features/salary-ai.md") {
    return false;
  }

  return /- \[ \] UI components/.test(readFileSync(join(root, path), "utf8"));
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

function hasStaleScrapeAllStub(root, path) {
  if (path !== "src-tauri/src/core/scrapers/mod.rs") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /pub async fn scrape_all\(\) -> Vec<Job>/.test(text) ||
    /legacy function, use scrape_all_parallel/.test(text)
  );
}

function hasStaleResumeExportPdfStub(root, path) {
  if (path !== "src-tauri/src/core/resume/export.rs") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /Resume export functionality - PDF/.test(text) ||
    /printpdf =/.test(text) ||
    /pub fn export_pdf/.test(text) ||
    /PDF export not yet implemented/.test(text)
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
  ) || /MCP request:\s*\{\}[^;]*request/.test(text) ||
    /MCP error:\s*\{\}[^;]*error/.test(text) ||
    /USAJobs API error:\s*\{\}\s*-\s*\{\}[^;]*body/.test(text) ||
    /tracing::(?:debug|info|warn|error)!\([^;]*,\s*url\s*\)/.test(text) ||
    /format!\([^)]*\{url\}/.test(text);
}

function stripRustTestModules(text) {
  const testModuleIndex = text.search(/(?:^|\n)\s*#\[cfg\(test\)\]/);
  if (testModuleIndex === -1) {
    return text;
  }

  return text.slice(0, testModuleIndex);
}

function hasUnboundedExternalResponseBodyRead(root, path) {
  if (
    !path.startsWith("src-tauri/src/") ||
    !path.endsWith(".rs") ||
    path === "src-tauri/src/core/http_body.rs"
  ) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /\.(?:text|bytes|chunk)\(\)\s*\.await|\.json(?:::<[^)]*>)?\(\)\s*\.await/.test(
    productionText,
  );
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

function hasRawBackupPathError(root, path) {
  if (!rawBackupPathErrorPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /Backup file not found:\s*\{\}[\s\S]{0,80}backup_path\.display\(\)/.test(
    productionText,
  );
}

function hasMlRawLocalPathExposure(root, path) {
  if (!mlRawLocalPathExposurePaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /\bpub\s+model_path\s*:\s*PathBuf\b/.test(productionText) ||
    /Ok\(format!\(\s*"Model downloaded to \{:\?\}"\s*,\s*model_path\s*\)\)/.test(
      productionText,
    ) ||
    /tracing::info!\(\s*"Model downloaded successfully to \{:\?\}"\s*,\s*model_dir\s*\)/.test(
      productionText,
    ) ||
    /failed to read model weights from \{:\?\}[\s\S]{0,120}model_path/.test(productionText)
  );
}

function hasMlRawLocalPathDoc(root, path) {
  if (!mlRawLocalPathDocPaths.has(path)) {
    return false;
  }

  return /\bmodel_path\s*:\s*string\b/.test(readFileSync(join(root, path), "utf8"));
}

function hasRawJobsWithGptDebug(root, path) {
  if (!jobsWithGptPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /#\[derive\([^)]*Debug[^)]*\)\]\s*pub struct (?:JobsWithGptScraper|JobQuery)\b/.test(
    productionText,
  );
}

function hasRawLinkedInDebug(root, path) {
  if (!linkedInPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /#\[derive\([^)]*Debug[^)]*\)\]\s*pub struct LinkedInScraper\b/.test(productionText);
}

function hasLinkedInLoginCookieReturn(root, path) {
  if (!linkedInAuthPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /cookie_result\.map\(\s*\|\(\s*cookie\b/.test(productionText) ||
    /tx\.send\(\s*cookie_result\.map\(\s*\|\([^)]*\)\|\s*cookie\s*\)\s*\)/.test(productionText) ||
    /Send result back\s*\([^)]*cookie value/.test(productionText)
  );
}

function hasRawEmailTestErrorReturn(root, path) {
  if (!emailCommandPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /format!\(\s*"Failed to send test email:\s*\{\}"\s*,\s*e\s*\)/.test(productionText);
}

function hasRawSlackWebhookValidationErrorReturn(root, path) {
  if (!emailCommandPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /format!\(\s*"Validation failed:\s*\{\}"\s*,\s*e\s*\)/.test(productionText) ||
    /tracing::error!\(\s*"Webhook validation failed:\s*\{\}"\s*,\s*e\s*\)/.test(productionText)
  );
}

function hasSecretBearingDebugDerive(root, path) {
  if (!path.startsWith("src-tauri/src/") || !path.endsWith(".rs")) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  const secretFieldPattern =
    /\b(?:api_key|bot_token|session_cookie|smtp_password|webhook_url|discord_webhook|linkedin_cookie|slack_webhook|teams_webhook|telegram_bot_token|usajobs_api_key)\s*:/;
  const derivedStructPattern =
    /#\[derive\([^)]*Debug[^)]*\)\]\s*(?:#\[[^\]]+\]\s*)*(?:pub\s+)?struct\s+\w+[^{]*\{([\s\S]*?)\n\}/g;

  return [...productionText.matchAll(derivedStructPattern)].some((match) =>
    secretFieldPattern.test(match[1] ?? ""),
  );
}

function hasCredentialKeyInputEcho(root, path) {
  if (!credentialCommandPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /Unknown credential key:\s*\{key\}/.test(productionText) ||
    /Invalid credential key:\s*\{\}[\s\S]{0,80},\s*(?:s|key)\b/.test(productionText) ||
    /format!\(\s*"[^"]*credential key[^"]*\{(?:key|s)\}/.test(productionText)
  );
}

function hasMissingLinkedInCookieStorageValidation(root, path) {
  if (!credentialCommandPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));

  if (path === "src-tauri/src/core/credentials/mod.rs") {
    return (
      !productionText.includes("MAX_LINKEDIN_COOKIE_LEN") ||
      !productionText.includes("is_ascii_control()") ||
      !productionText.includes("ch == ';'") ||
      !/validate_credential_value\(key,\s*value\)\?/.test(productionText)
    );
  }

  if (path === "src-tauri/src/commands/credentials.rs") {
    return (
      !productionText.includes("normalize_credential_value") ||
      !/CredentialKey::LinkedInCookie\s*=>\s*value\.trim\(\)\.to_string\(\)/.test(
        productionText,
      )
    );
  }

  return false;
}

function hasRendererCredentialSecretRead(root, path) {
  if (!credentialSecretReadIpcPaths.has(path)) {
    return false;
  }

  const text = path.endsWith(".rs")
    ? stripRustTestModules(readFileSync(join(root, path), "utf8"))
    : readFileSync(join(root, path), "utf8");

  return /\bretrieve_credential\b|\bretrieveCredential\b/.test(text);
}

function hasIncompleteConfigExportRedaction(root, path) {
  if (!configExportPrivacyPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    !text.includes("scrubSensitiveFields") ||
    [
      "api_key",
      "bot_token",
      "discord_webhook",
      "linkedin_cookie",
      "session_cookie",
      "slack_webhook",
      "smtp_password",
      "teams_webhook",
      "telegram_bot_token",
      "usajobs_api_key",
      "webhook_url",
    ].some((fieldName) => !text.includes(`"${fieldName}"`))
  );
}

function hasRawTelegramBotTokenRequestError(root, path) {
  if (!telegramNotificationPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /client\s*\.post\(&api_url\)[\s\S]{0,260}\.send\(\)\s*\.await\s*\?/.test(
    productionText,
  );
}

function hasRawWebhookTokenRequestError(root, path) {
  if (!webhookNotificationPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /client\s*\.post\(&?(?:config\.)?webhook_url\)[\s\S]{0,260}\.send\(\)\s*\.await\s*\?/.test(
    productionText,
  );
}

function hasRawNotificationProviderErrorBody(root, path) {
  if (!notificationProviderErrorBodyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /let\s+error_text\s*=\s*read_text_with_limit\(response,[\s\S]{0,420}anyhow!\([\s\S]{0,180}error_text/.test(
      productionText,
    ) ||
    /read_text_with_limit\(response,[\s\S]{0,180}\.await\?[\s\S]{0,180}anyhow!\([\s\S]{0,120}\{\}[\s\S]{0,80}error_text/.test(
      productionText,
    )
  );
}

function hasRawJobsWithGptSmokeEndpointError(root, path) {
  if (!healthSmokePrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /"error"\s*:\s*e\.to_string\(\)/.test(productionText) ||
    /Err\(e\)\s*=>\s*Err\(e\.into\(\)\)/.test(productionText)
  );
}

function hasStaleLinkedInCredentialDocs(root, path) {
  if (!linkedInCredentialDocsPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /session cookie\s+via the config file|no credential storage|No credentials stored|Cookie expires after ~90 days|Open DevTools|Find and copy\s+\*\*?li_at|Paste into Settings > Scrapers > LinkedIn|Paste the new cookie|Update LinkedIn Cookie/.test(
    text,
  ) || /\[\s\]\s+\*\*Interactive Login:\*\* No manual cookie extraction/.test(text);
}

function hasDatabaseLogEmojiMarkers(root, path) {
  if (!databaseLogEmojiPaths.has(path)) {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|[✅❌⚠️✓✗←→])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasStaleCacheUsageDoc(root, path) {
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

function hasFrontendDirectOpenDeepLinkFallback(root, path) {
  if (!frontendJobUrlOpenPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /\bopenDeepLink\(/.test(text) && /\bwindow\.open\(/.test(text);
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

function hasRawResumeParserPathDisplay(root, path) {
  if (!rawResumeParserPathDisplayPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /(?:file_path|canonical_path)\.display\(\)/.test(productionText);
}

function resumeSummaryStructMissingOrPrivate(text) {
  const match = text.match(/pub\s+struct\s+ResumeSummary\s*\{([^}]*)\}/);
  return !match || /\b(?:file_path|parsed_text)\b/.test(match[1]);
}

function hasRawResumeCommandDtoExposure(root, path) {
  if (!resumeCommandDtoPrivacyPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");

  if (path === "src-tauri/src/commands/resume.rs") {
    const productionText = stripRustTestModules(text);
    return (
      /Result\s*<\s*Option\s*<\s*Resume\s*>\s*,\s*String\s*>/.test(productionText) ||
      /Result\s*<\s*Vec\s*<\s*Resume\s*>\s*,\s*String\s*>/.test(productionText) ||
      resumeSummaryStructMissingOrPrivate(productionText)
    );
  }

  if (path === "src/pages/Resume.tsx") {
    return /interface\s+ResumeData\s*\{[\s\S]{0,320}\b(?:file_path|parsed_text)\b/.test(text);
  }

  if (path === "src/pages/ResumeBuilder.tsx") {
    return /interface\s+Resume\s*\{[\s\S]{0,320}\b(?:file_path|parsed_text)\b/.test(text);
  }

  if (path === "src/mocks/handlers.ts") {
    return (
      !/toMockResumeSummary/.test(text) ||
      /case\s+["']get_active_resume["']:[\s\S]{0,180}return\s+getActiveResume\(\)\s+as\s+T/.test(
        text,
      ) ||
      /case\s+["']list_all_resumes["']:[\s\S]{0,120}return\s+resumes\s+as\s+T/.test(text)
    );
  }

  return (
    /invoke<Resume>\(["']get_active_resume["']\)/.test(text) ||
    resumeSummaryStructMissingOrPrivate(text)
  );
}

function hasRawCommandSetupErrorDisplay(root, path) {
  if (!rawCommandSetupErrorDisplayPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /map_err\(\s*\|e\|\s*format!\(\s*"Failed to (?:load config|save config|create config directory|connect to database|migrate database|run migrations): \{\}"\s*,\s*e\s*\)\s*\)/.test(
      productionText,
    ) ||
    /format!\(\s*"Configuration error: \{\}"\s*,\s*e\s*\)/.test(productionText) ||
    /tracing::error!\(\s*"Failed to load config: \{\}"\s*,\s*e\s*\)/.test(productionText) ||
    /tracing::error!\([\s\S]{0,240}error\s*=\s*%e[\s\S]{0,240}"Failed to [^"]*(?:config|configuration|database)"/.test(
      productionText,
    )
  );
}

function hasRawConfigValidationUrlDisplay(root, path) {
  if (!configValidationPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /Got:\s*\{\}"[\s\S]{0,120},\s*url\b/.test(productionText);
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

function hasRawImportHttpErrorReturn(root, path) {
  if (!importCommandPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /Failed to fetch the page:\s*\{\}[\s\S]{0,80},\s*e\b/.test(productionText);
}

function hasNonPublicIpErrorEcho(root, path) {
  if (!urlSecurityPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /Blocked non-public IP address ['"]?\{[^}]*}/.test(productionText);
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

function hasHardcodedFrontendErrorExportVersion(root, path) {
  if (!frontendErrorReportingPaths.has(path)) {
    return false;
  }

  return /app_version:\s*["']\d+\.\d+(?:\.\d+)?["']/.test(
    readFileSync(join(root, path), "utf8"),
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

function hasStaleSettingsPartialSaveMessage(root, path) {
  if (!settingsCredentialPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /credential\(s\) failed to save\. Config was saved/.test(text);
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

function hasStaleWebhookSecurityDocMarkers(root, path) {
  if (!webhookSecurityDocsPaths.has(path)) {
    return false;
  }

  return /[✅❌⚠️→]|\*\*(?:Last Updated|Version)\*\*:|v2\.0\.0\+/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasStaleCommandExecutionSecurityDocMarkers(root, path) {
  if (!commandExecutionSecurityDocsPaths.has(path)) {
    return false;
  }

  return /[✅❌⚠️→]|\*\*(?:Last Updated|Version|Security Level)\*\*:/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasStaleUrlValidationSecurityDocMarkers(root, path) {
  if (!urlValidationSecurityDocsPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /[✅❌⚠️]|\*\*(?:Last Updated|Version|Security Level)\*\*:/.test(text) ||
    !text.includes("validate_webhook_url_security_parts(&url_parsed)?")
  );
}

function hasStaleXssSecurityDocs(root, path) {
  if (!xssSecurityDocsPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /[✅❌⚠️→←↑↓]|\*\*(?:Last Updated|(?:DOMPurify|JobSentinel) Version|Security Level)\*\*:/.test(
      text,
    ) ||
    /JobSentinel Security Documentation|DOMPurify Integration Test Example/.test(text) ||
    /JobSentinel uses v3\.3\.1\+|While JobSentinel is a desktop app with no backend/.test(text) ||
    /Resume Builder Configuration|cdn\.jsdelivr\.net\/npm\/dompurify/.test(text) ||
    /\/\/ ✅ Output|\/\/ ❌|\/\/ ✅ SAFE|\/\/ ❌ UNSAFE/.test(text)
  );
}

function hasStaleKeyringSecurityDocs(root, path) {
  if (!keyringSecurityDocsPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /JobSentinel:slack-webhook|SlackWebhookUrl|DiscordWebhookUrl|TeamsWebhookUrl/.test(text) ||
    /EmailSmtpPassword|LinkedinCookies|TelegramToken/.test(text) ||
    /tauri-plugin-secure-storage` JS API|Does NOT delete plaintext values/.test(text) ||
    /HashMap<String, bool>|list_status\(\) -> Result/.test(text) ||
    /v2\.0\.0 introduces|[✅❌⚠️✓→←]|\*\*(?:Last Updated|Version|Security Level)\*\*:/.test(text) ||
    !text.includes("jobsentinel_usajobs_api_key") ||
    !text.includes("LinkedInCookieExpiry") ||
    !text.includes("store_credential")
  );
}

function hasUnsafeKeyringMigration(root, path) {
  if (!keyringMigrationPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /even if partial/.test(text) ||
    /✓ Migrated/.test(text) ||
    !text.includes("mark_migration_complete") ||
    !text.includes("Keyring migration incomplete; will retry on next startup")
  );
}

function hasStaleCredentialArchitectureComments(root, path) {
  if (!credentialArchitecturePaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /tauri-plugin-secure-storage` JS API|set_item|get_item|remove_item|[✅❌⚠️✓→←]/.test(text);
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
  return (
    /std::fs::write\(&path,\s*content\)/.test(text) ||
    /Ok\(Some\(path\.to_string_lossy\(\)/.test(text) ||
    /Result<Option<String>,\s*String>/.test(text) ||
    !text.includes("feedback_file_content") ||
    !text.includes("reveal_token")
  );
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

function hasRedundantDirectPlaywrightDependency(root, path) {
  if (path !== "package.json") {
    return false;
  }

  const packageJson = readPackageManifest(root);
  const directDeps = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
    ...(packageJson.optionalDependencies ?? {}),
  };

  return Boolean(directDeps["@playwright/test"] && directDeps.playwright);
}

function hasRedundantDomPurifyTypesDependency(root, path) {
  if (path !== "package.json") {
    return false;
  }

  const packageJson = readPackageManifest(root);
  const directDeps = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
    ...(packageJson.optionalDependencies ?? {}),
  };

  return Boolean(directDeps.dompurify && directDeps["@types/dompurify"]);
}

function hasUnreferencedDocsImage(root, path) {
  if (!path.startsWith("docs/images/") || extname(path) !== ".png") {
    return false;
  }

  const fileName = path.split("/").at(-1);
  if (!fileName) {
    return true;
  }

  const references = [`docs/images/${fileName}`, `images/${fileName}`, `../images/${fileName}`];

  return !listTrackedFiles(root).some((trackedPath) => {
    if (
      trackedPath.startsWith("docs/archive/") ||
      trackedPath.startsWith("docs/releases/") ||
      !trackedPath.endsWith(".md") ||
      (trackedPath !== "README.md" && !trackedPath.startsWith("docs/"))
    ) {
      return false;
    }

    const text = readFileSync(join(root, trackedPath), "utf8");
    return references.some((reference) => text.includes(reference));
  });
}

function hasDuplicateDocsScreenshotCapture(root, path) {
  if (path !== "tests/e2e/playwright/screenshots.spec.ts") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const captures = [...text.matchAll(/screenshotPath\(\s*testInfo,\s*["']([^"']+)["']\s*\)/g)].map(
    (match) => match[1],
  );

  return new Set(captures).size !== captures.length;
}

function hasContradictoryPlansIndexReleaseStatus(root, path) {
  if (path !== "docs/plans/README.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /## Current Release Plans[\s\S]*\|\s*v\d+\.\d+\.\d+\s*\|\s*Unreleased\s*\|/.test(text) &&
    /## Archived Plans[\s\S]*\|\s*v\d+\.\d+\.\d+\s*\|\s*Complete on main\s*\|/.test(text)
  );
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

function hasStaleJobImportMockHandlers(root, path) {
  if (path !== "src/mocks/handlers.ts") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const requiredCommands = ["preview_job_import", "import_job_from_url"];

  return requiredCommands.some((command) => {
    return !new RegExp(`case\\s+["']${command}["']`).test(text);
  });
}

function hasStaleFeedbackMockHandlers(root, path) {
  if (path !== "src/mocks/handlers.ts") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const requiredCommands = [
    "generate_feedback_report",
    "get_feedback_filename",
    "save_feedback_file",
    "open_github_issues",
    "open_google_drive",
    "reveal_saved_feedback_file",
  ];

  return requiredCommands.some((command) => {
    return !new RegExp(`case\\s+["']${command}["']`).test(text);
  });
}

function hasStaleFeedbackSystemInfoArchitecture(root, path) {
  if (
    path !== "src/services/feedbackService.ts" &&
    path !== "src/components/feedback/DebugInfoPreview.tsx" &&
    path !== "src/mocks/handlers.ts"
  ) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  if (path === "src/mocks/handlers.ts") {
    return (
      /case\s+["']get_system_info["'][\s\S]{0,240}\barch\s*:/.test(text) ||
      /function\s+getMockSystemInfo\(\)[\s\S]{0,240}\barch\s*:/.test(text)
    );
  }

  return /\bsystemInfo\.arch\b|\barch\s*:\s*string\b/.test(text);
}

function hasStaleResumeOptimizerMockHandlers(root, path) {
  if (path !== "src/mocks/handlers.ts") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const requiredCommands = [
    "analyze_resume_for_job",
    "analyze_resume_format",
    "get_ats_power_words",
    "improve_bullet_point",
  ];
  const missingRequiredCommand = requiredCommands.some((command) => {
    return !new RegExp(`case\\s+["']${command}["']`).test(text);
  });

  return (
    missingRequiredCommand ||
    /case\s+["']analyze_resume_format["'][\s\S]{0,240}\bissues\s*:/.test(text) ||
    /case\s+["']analyze_resume_format["'][\s\S]{0,300}\brecommendations\s*:/.test(text)
  );
}

function hasStaleAtsKeywordMatchFrontendShape(root, path) {
  if (
    path !== "src/pages/ResumeOptimizer.tsx" &&
    path !== "src/components/AtsLiveScorePanel.tsx"
  ) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /\bfound_in\s*:\s*string\s*[;\n]/.test(text) || /\bcontext\s*:\s*string\s*[;\n]/.test(text);
}

function stripTypeScriptComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function isRuntimeFrontendSource(path) {
  return (
    path.startsWith("src/") &&
    /\.(ts|tsx)$/.test(path) &&
    !path.endsWith(".d.ts") &&
    !/\.test\.(ts|tsx)$/.test(path) &&
    !/\.stories\.(ts|tsx)$/.test(path) &&
    path !== "src/mocks/handlers.ts"
  );
}

function collectRuntimeInvokeCommands(root) {
  const commands = new Set();
  const commandPattern =
    /\b(?:cachedInvoke|safeInvokeWithToast|safeInvoke|invokeCommand|invoke)(?:<[^>]+>)?\(\s*["']([^"']+)["']/g;

  for (const path of listTrackedFiles(root).filter(isRuntimeFrontendSource)) {
    const text = stripTypeScriptComments(readFileSync(join(root, path), "utf8"));
    for (const match of text.matchAll(commandPattern)) {
      commands.add(match[1]);
    }
  }

  return commands;
}

function collectMockCommandCases(root) {
  const text = readFileSync(join(root, "src/mocks/handlers.ts"), "utf8");
  return new Set([...text.matchAll(/case\s+["']([^"']+)["']/g)].map((match) => match[1]));
}

function missingRuntimeMockInvokeCases(root, path) {
  if (path !== "src/mocks/handlers.ts") {
    return [];
  }

  const mockCases = collectMockCommandCases(root);
  return [...collectRuntimeInvokeCommands(root)]
    .filter((command) => !mockCases.has(command))
    .sort();
}

function hasStaleSalaryBenchmarkFrontendShape(root, path) {
  if (path !== "src/pages/Salary.tsx") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /\brole\s*:\s*string\s*[;\n]/.test(text) ||
    /\bp50\s*:\s*number\s*[;\n]/.test(text) ||
    /\bp90\s*:\s*number\s*[;\n]/.test(text) ||
    /\bbenchmark\.(role|p25|p50|p75|p90)\b/.test(text) ||
    /\bvalue\s*:\s*["']executive["']/.test(text)
  );
}

function hasStaleInterviewFollowupFrontendShape(root, path) {
  if (path !== "src/components/InterviewScheduler.tsx") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /\bthank_you_sent\b|\bsent_at\b/.test(text);
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

    if (hasUnreferencedSettingsHelperComponent(root, path)) {
      violations.push(`remove unreferenced settings helper component: ${path}`);
    }

    if (hasUnreferencedHookModule(root, path)) {
      violations.push(`remove unreferenced hook module: ${path}`);
    }

    if (hasUnreferencedSourceHelper(root, path)) {
      violations.push(`remove unreferenced source helper: ${path}`);
    }

    if (hasStaleNotificationPreferenceSyncWrapper(root, path)) {
      violations.push(`remove stale notification preference sync wrapper: ${path}`);
    }

    if (hasUnreferencedComponentsBarrel(root, path)) {
      violations.push(`remove unreferenced components barrel: ${path}`);
    }

    if (hasUnreferencedBarrelModule(root, path)) {
      violations.push(`remove unreferenced barrel module: ${path}`);
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

    if (hasStaleErrorHandlingScrapeAllDoc(root, path)) {
      violations.push(`remove stale scrape_all error-handling doc: ${path}`);
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

    if (hasRoadmapVersionDrift(root, path)) {
      violations.push(`replace roadmap version drift markers: ${path}`);
    }

    if (hasFrontDoorDocStaleFooter(root, path)) {
      violations.push(`replace front-door doc stale footer: ${path}`);
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

    if (hasFrontDoorReleaseVersionPromise(root, path)) {
      violations.push(`replace front-door release version promises: ${path}`);
    }

    if (hasSourceReleaseVersionPromise(root, path)) {
      violations.push(`replace source release version promises: ${path}`);
    }

    if (hasProductionSourceGlyphMarkers(root, path)) {
      violations.push(`replace production source emoji markers: ${path}`);
    }

    if (hasBackendScoringReasonGlyphMarkers(root, path)) {
      violations.push(`replace backend scoring reason glyph markers: ${path}`);
    }

    if (hasNotificationScoringReasonGlyphMarkers(root, path)) {
      violations.push(`replace notification scoring reason glyph markers: ${path}`);
    }

    if (hasFrontendStatusEmojiMarkers(root, path)) {
      violations.push(`replace frontend status emoji markers: ${path}`);
    }

    if (hasBookmarkletDocStatusEmojiMarkers(root, path)) {
      violations.push(`replace bookmarklet doc status emoji markers: ${path}`);
    }

    if (hasScraperDocEmojiMarkers(root, path)) {
      violations.push(`replace scraper doc emoji markers: ${path}`);
    }

    if (hasStaleScraperDocReliabilityClaim(root, path)) {
      violations.push(`sync scraper reliability and rate-limit docs: ${path}`);
    }

    if (hasScraperHealthDocEmojiMarkers(root, path)) {
      violations.push(`replace scraper health doc emoji markers: ${path}`);
    }

    if (hasStaleScraperHealthCoverage(root, path)) {
      violations.push(`sync scraper health source coverage: ${path}`);
    }

    if (hasFeatureStatusColorEmojiMarkers(root, path)) {
      violations.push(`replace feature status color emoji markers: ${path}`);
    }

    if (hasFeatureDocMetadataFooter(root, path)) {
      violations.push(`replace feature doc stale metadata: ${path}`);
    }

    if (hasSynonymOrRemotePreferenceDocDrift(root, path)) {
      violations.push(`sync synonym and remote preference docs: ${path}`);
    }

    if (hasStaleTestQualityDocGuidance(root, path)) {
      violations.push(`replace stale test-quality doc guidance: ${path}`);
    }

    if (hasDeveloperTestingDocMarkers(root, path)) {
      violations.push(`replace developer testing doc stale markers: ${path}`);
    }

    if (hasDeveloperArchitectureDocMarkers(root, path)) {
      violations.push(`replace developer architecture doc stale markers: ${path}`);
    }

    if (hasDeveloperMaintenanceDocDrift(root, path)) {
      violations.push(`replace developer maintenance doc stale markers: ${path}`);
    }

    if (hasTopLevelActiveDocDrift(root, path)) {
      violations.push(`replace top-level active doc stale markers: ${path}`);
    }

    if (hasTopLevelActiveDocGlyphMarkers(root, path)) {
      violations.push(`replace top-level active doc glyph markers: ${path}`);
    }

    if (hasStaleE2eWaitGuidance(root, path)) {
      violations.push(`replace stale E2E wait guidance: ${path}`);
    }

    if (hasFixedWaitInE2ePageObject(root, path)) {
      violations.push(`replace fixed E2E page-object wait: ${path}`);
    }

    if (hasUnreferencedE2eTestHelper(root, path)) {
      violations.push(`remove unreferenced E2E test helper: ${path}`);
    }

    if (hasStaleGettingStartedToolingDocs(root, path)) {
      violations.push(`sync getting-started tooling docs: ${path}`);
    }

    if (hasStaleMacosDeveloperDocs(root, path)) {
      violations.push(`sync macOS developer docs: ${path}`);
    }

    if (hasStaleSqliteConfigurationDoc(root, path)) {
      violations.push(`sync SQLite configuration doc: ${path}`);
    }

    if (hasMarketIntelligenceDocGlyphMarkers(root, path)) {
      violations.push(`replace Market Intelligence doc glyph/stale indicator markers: ${path}`);
    }

    if (hasResumeOrSalaryFeatureDocEmojiMarkers(root, path)) {
      violations.push(`replace resume and salary feature doc emoji markers: ${path}`);
    }

    if (hasSmartScoringDocGlyphMarkers(root, path)) {
      violations.push(`replace smart scoring doc glyph markers: ${path}`);
    }

    if (hasNotificationsDocGlyphMarkers(root, path)) {
      violations.push(`replace notifications doc glyph markers: ${path}`);
    }

    if (hasActiveUserDocGlyphMarkers(root, path)) {
      violations.push(`replace active user doc glyph markers: ${path}`);
    }

    if (hasFeaturePlainDocGlyphMarkers(root, path)) {
      violations.push(`replace feature doc glyph markers: ${path}`);
    }

    if (hasMaintainedDocGlyphMarkers(root, path)) {
      violations.push(`replace maintained doc glyph markers: ${path}`);
    }

    if (hasDeveloperLayoutDocGlyphMarkers(root, path)) {
      violations.push(`replace developer layout doc glyph markers: ${path}`);
    }

    if (hasStaleSalaryAiFutureUiClaim(root, path)) {
      violations.push(`remove stale Salary AI future UI claim: ${path}`);
    }

    if (hasStaleApplicationTrackingDocClaims(root, path)) {
      violations.push(`remove stale application tracking doc claims: ${path}`);
    }

    if (hasStaleSmartScoringSalaryMarkerClaim(root, path)) {
      violations.push(`remove stale smart-scoring salary marker claim: ${path}`);
    }

    if (hasStaleScrapeAllStub(root, path)) {
      violations.push(`remove stale scrape_all scraper stub: ${path}`);
    }

    if (hasStaleResumeExportPdfStub(root, path)) {
      violations.push(`remove stale resume PDF export stub: ${path}`);
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

    if (hasUnboundedExternalResponseBodyRead(root, path)) {
      violations.push(`replace unbounded external response body read: ${path}`);
    }

    if (hasRawLocalPathLogging(root, path)) {
      violations.push(`replace raw local path logging: ${path}`);
    }

    if (hasRawBackupPathError(root, path)) {
      violations.push(`sanitize backup path error display: ${path}`);
    }

    if (hasMlRawLocalPathExposure(root, path)) {
      violations.push(`remove ML raw local path exposure: ${path}`);
    }

    if (hasMlRawLocalPathDoc(root, path)) {
      violations.push(`remove ML raw local path doc claim: ${path}`);
    }

    if (hasRawJobsWithGptDebug(root, path)) {
      violations.push(`sanitize JobsWithGPT debug output: ${path}`);
    }

    if (hasRawLinkedInDebug(root, path)) {
      violations.push(`sanitize LinkedIn scraper debug output: ${path}`);
    }

    if (hasLinkedInLoginCookieReturn(root, path)) {
      violations.push(`keep LinkedIn login cookie out of renderer response: ${path}`);
    }

    if (hasRawEmailTestErrorReturn(root, path)) {
      violations.push(`sanitize test email command errors: ${path}`);
    }

    if (hasRawSlackWebhookValidationErrorReturn(root, path)) {
      violations.push(`sanitize Slack webhook validation command errors: ${path}`);
    }

    if (hasSecretBearingDebugDerive(root, path)) {
      violations.push(`sanitize secret-bearing debug derive: ${path}`);
    }

    if (hasCredentialKeyInputEcho(root, path)) {
      violations.push(`avoid echoing credential key input: ${path}`);
    }

    if (hasMissingLinkedInCookieStorageValidation(root, path)) {
      violations.push(`validate LinkedIn cookies before keyring storage: ${path}`);
    }

    if (hasRendererCredentialSecretRead(root, path)) {
      violations.push(`keep credential values out of renderer IPC: ${path}`);
    }

    if (hasIncompleteConfigExportRedaction(root, path)) {
      violations.push(`redact all credential fields from config export: ${path}`);
    }

    if (hasRawTelegramBotTokenRequestError(root, path)) {
      violations.push(`remove Telegram bot-token URLs from request errors: ${path}`);
    }

    if (hasRawWebhookTokenRequestError(root, path)) {
      violations.push(`remove webhook token URLs from request errors: ${path}`);
    }

    if (hasRawNotificationProviderErrorBody(root, path)) {
      violations.push(`omit notification provider error bodies from errors: ${path}`);
    }

    if (hasRawJobsWithGptSmokeEndpointError(root, path)) {
      violations.push(`sanitize JobsWithGPT smoke-test endpoint errors: ${path}`);
    }

    if (hasStaleLinkedInCredentialDocs(root, path)) {
      violations.push(`sync LinkedIn credential docs with keyring login flow: ${path}`);
    }

    if (hasDatabaseLogEmojiMarkers(root, path)) {
      violations.push(`replace database log emoji markers: ${path}`);
    }

    if (hasStaleCacheUsageDoc(root, path)) {
      violations.push(`sync cache usage doc with scraper HTTP client: ${path}`);
    }

    if (hasFrontendDirectOpenDeepLinkFallback(root, path)) {
      violations.push(`route job URL opens through backend guard only: ${path}`);
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

    if (hasRawResumeParserPathDisplay(root, path)) {
      violations.push(`sanitize resume parser path error display: ${path}`);
    }

    if (hasRawResumeCommandDtoExposure(root, path)) {
      violations.push(`hide resume file paths from renderer DTOs: ${path}`);
    }

    if (hasRawCommandSetupErrorDisplay(root, path)) {
      violations.push(`replace raw command setup error display: ${path}`);
    }

    if (hasRawConfigValidationUrlDisplay(root, path)) {
      violations.push(`sanitize config validation URL display: ${path}`);
    }

    if (hasRawImportRedirectDisplay(root, path)) {
      violations.push(`replace raw import redirect display: ${path}`);
    }

    if (hasRawJobImportLogging(root, path)) {
      violations.push(`replace raw job import logging: ${path}`);
    }

    if (hasRawImportHttpErrorReturn(root, path)) {
      violations.push(`sanitize job import HTTP errors: ${path}`);
    }

    if (hasNonPublicIpErrorEcho(root, path)) {
      violations.push(`sanitize non-public IP validation errors: ${path}`);
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

    if (hasHardcodedFrontendErrorExportVersion(root, path)) {
      violations.push(`derive frontend error export version from package metadata: ${path}`);
    }

    if (hasNotificationWebhookSaveWithoutValidation(root, path)) {
      violations.push(`validate notification webhook settings before saving: ${path}`);
    }

    if (hasStaleSettingsPartialSaveMessage(root, path)) {
      violations.push(`separate config save failures from credential save failures: ${path}`);
    }

    if (hasStaleFeedbackWebhookSanitizer(root, path)) {
      violations.push(`redact provider webhook URLs in feedback sanitizer: ${path}`);
    }

    if (hasStaleNotificationWebhookDocs(root, path)) {
      violations.push(`document all notification webhook provider hosts: ${path}`);
    }

    if (hasStaleWebhookSecurityDocMarkers(root, path)) {
      violations.push(`replace webhook security doc stale markers: ${path}`);
    }

    if (hasStaleCommandExecutionSecurityDocMarkers(root, path)) {
      violations.push(`replace command execution security doc stale markers: ${path}`);
    }

    if (hasStaleUrlValidationSecurityDocMarkers(root, path)) {
      violations.push(`sync URL validation security doc markers: ${path}`);
    }

    if (hasStaleXssSecurityDocs(root, path)) {
      violations.push(`sync XSS security docs with live sanitizer path: ${path}`);
    }

    if (hasStaleKeyringSecurityDocs(root, path)) {
      violations.push(`sync keyring credential docs: ${path}`);
    }

    if (hasUnsafeKeyringMigration(root, path)) {
      violations.push(`keep keyring migration retry-safe: ${path}`);
    }

    if (hasStaleCredentialArchitectureComments(root, path)) {
      violations.push(`sync credential architecture comments: ${path}`);
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

    if (hasRedundantDirectPlaywrightDependency(root, path)) {
      violations.push(`remove redundant direct Playwright dependency: ${path}`);
    }

    if (hasRedundantDomPurifyTypesDependency(root, path)) {
      violations.push(`remove redundant DOMPurify stub types dependency: ${path}`);
    }

    if (hasUnreferencedDocsImage(root, path)) {
      violations.push(`remove unreferenced docs image: ${path}`);
    }

    if (hasDuplicateDocsScreenshotCapture(root, path)) {
      violations.push(`remove duplicate docs screenshot capture: ${path}`);
    }

    if (hasContradictoryPlansIndexReleaseStatus(root, path)) {
      violations.push(`sync plans index release status: ${path}`);
    }

    if (hasStaleUserDataMockHandlers(root, path)) {
      violations.push(`sync user-data mock command handlers: ${path}`);
    }

    if (hasStaleDeepLinkMockHandlers(root, path)) {
      violations.push(`sync deep-link mock command handlers: ${path}`);
    }

    if (hasStaleJobImportMockHandlers(root, path)) {
      violations.push(`sync job-import mock command handlers: ${path}`);
    }

    if (hasStaleFeedbackMockHandlers(root, path)) {
      violations.push(`sync feedback mock command handlers: ${path}`);
    }

    if (hasStaleFeedbackSystemInfoArchitecture(root, path)) {
      violations.push(`sync feedback system-info architecture field: ${path}`);
    }

    if (hasStaleResumeOptimizerMockHandlers(root, path)) {
      violations.push(`sync resume optimizer mock command handlers: ${path}`);
    }

    if (hasStaleAtsKeywordMatchFrontendShape(root, path)) {
      violations.push(`sync ATS keyword match frontend shape: ${path}`);
    }

    const missingMockCases = missingRuntimeMockInvokeCases(root, path);
    if (missingMockCases.length > 0) {
      violations.push(
        `sync dev mock handlers for runtime invokes: ${path} missing ${missingMockCases.join(", ")}`,
      );
    }

    if (hasStaleSalaryBenchmarkFrontendShape(root, path)) {
      violations.push(`sync salary benchmark frontend shape: ${path}`);
    }

    if (hasStaleInterviewFollowupFrontendShape(root, path)) {
      violations.push(`sync interview follow-up frontend shape: ${path}`);
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
