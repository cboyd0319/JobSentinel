import { readFileSync } from "node:fs";
import { join } from "node:path";

const frontendErrorReportingPaths = new Set(["src/utils/errorReporting.ts"]);
const frontendErrorHelperDebugPaths = new Set(["src/utils/errorHelpers.ts"]);
const frontendErrorUtilsPaths = new Set(["src/utils/errorUtils.ts"]);
const frontendDirectErrorLoggingPaths = new Set([
  "src/components/BookmarkletGenerator.tsx",
  "src/components/ComponentErrorBoundary.tsx",
  "src/components/DeepLinkGenerator.tsx",
  "src/components/ErrorBoundary.tsx",
  "src/components/ModalErrorBoundary.tsx",
  "src/components/PageErrorBoundary.tsx",
  "src/hooks/useFeedback.ts",
  "src/services/feedbackService.ts",
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

const scraperLoopErrorLoggingPaths = new Set([
  "src-tauri/src/core/scrapers/greenhouse.rs",
  "src-tauri/src/core/scrapers/lever/mod.rs",
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

const mlErrorDisplayPrivacyPaths = new Set(["src-tauri/src/core/ml/mod.rs"]);

const mlRawLocalPathDocPaths = new Set(["docs/ML_FEATURE.md", "docs/ML_QUICKSTART.md"]);

const jobsWithGptPrivacyPaths = new Set(["src-tauri/src/core/scrapers/jobswithgpt.rs"]);
const linkedInPrivacyPaths = new Set(["src-tauri/src/core/scrapers/linkedin.rs"]);
const linkedInAuthPrivacyPaths = new Set(["src-tauri/src/commands/linkedin_auth.rs"]);
const emailCommandPrivacyPaths = new Set(["src-tauri/src/commands/config.rs"]);

const credentialCommandPrivacyPaths = new Set([
  "src-tauri/src/commands/credentials.rs",
  "src-tauri/src/core/credentials/mod.rs",
]);

const credentialStorageErrorPrivacyPaths = new Set([
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

const feedbackSanitizerPaths = new Set(["src-tauri/src/commands/feedback/sanitizer.rs"]);
const structuredDebugLogPaths = new Set(["src-tauri/src/commands/feedback/debug_log.rs"]);
const feedbackCommandPaths = new Set(["src-tauri/src/commands/feedback/mod.rs"]);

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

const notificationServicePrivacyPaths = new Set(["src-tauri/src/core/notify/mod.rs"]);
const healthSmokePrivacyPaths = new Set(["src-tauri/src/core/health/smoke_tests.rs"]);

const rawUrlLoggingPaths = new Set([
  "src-tauri/src/commands/linkedin_auth.rs",
  "src-tauri/src/core/automation/browser/manager.rs",
  "src-tauri/src/core/scrapers/url_utils.rs",
]);

const rawUrlErrorDisplayPaths = new Set([
  "src-tauri/src/core/automation/error.rs",
  "src-tauri/src/core/http_body.rs",
  "src-tauri/src/core/scrapers/error.rs",
]);

const rawPathOrQueryErrorDisplayPaths = new Set(["src-tauri/src/core/db/error.rs"]);
const rawResumeParserPathDisplayPaths = new Set(["src-tauri/src/core/resume/parser.rs"]);
const rawResumeNameLoggingPaths = new Set(["src-tauri/src/commands/resume.rs"]);

const resumeCommandDtoPrivacyPaths = new Set([
  "src-tauri/src/commands/resume.rs",
  "src/pages/Resume.tsx",
  "src/pages/ResumeBuilder.tsx",
  "src/mocks/handlers.ts",
  "docs/features/resume-matcher.md",
]);

const resumeCommandErrorPrivacyPaths = new Set(["src-tauri/src/commands/resume.rs"]);
const atsCommandErrorPrivacyPaths = new Set(["src-tauri/src/commands/ats.rs"]);
const automationCommandErrorPrivacyPaths = new Set(["src-tauri/src/commands/automation.rs"]);

const sensitiveCommandErrorPrivacyPaths = new Set([
  "src-tauri/src/commands/ml.rs",
  "src-tauri/src/commands/salary.rs",
  "src-tauri/src/commands/market.rs",
]);

const utilityCommandErrorPrivacyPaths = new Set([
  "src-tauri/src/commands/jobs.rs",
  "src-tauri/src/commands/ghost.rs",
  "src-tauri/src/commands/deeplinks.rs",
  "src-tauri/src/commands/geo.rs",
  "src-tauri/src/commands/config.rs",
  "src-tauri/src/commands/linkedin_auth.rs",
]);

const rawCommandSetupErrorDisplayPaths = new Set([
  "src-tauri/src/commands/config.rs",
  "src-tauri/src/commands/ghost.rs",
  "src-tauri/src/main.rs",
]);

const configValidationPrivacyPaths = new Set([
  "src-tauri/src/core/config/validation_error.rs",
]);

const rawJobImportLoggingPaths = new Set(["src-tauri/src/commands/import.rs"]);
const importCommandPrivacyPaths = new Set(["src-tauri/src/commands/import.rs"]);
const rawImportRedirectDisplayPaths = new Set(["src-tauri/src/core/import/types.rs"]);
const urlSecurityPrivacyPaths = new Set(["src-tauri/src/core/url_security.rs"]);

const importBookmarkletCommandPrivacyPaths = new Set([
  "src-tauri/src/commands/import.rs",
  "src-tauri/src/commands/user_data.rs",
  "src-tauri/src/commands/scoring.rs",
  "src-tauri/src/commands/bookmarklet.rs",
  "src-tauri/src/core/bookmarklet/server.rs",
]);

const rawBookmarkletLoggingPaths = new Set(["src-tauri/src/core/bookmarklet/server.rs"]);
const bookmarkletGeneratorPaths = new Set(["src/components/BookmarkletGenerator.tsx"]);

const userDataPrivacyLoggingPaths = new Set([
  "src-tauri/src/commands/user_data.rs",
  "src-tauri/src/core/user_data/mod.rs",
]);

const rawSchedulerJobContentLoggingPaths = new Set([
  "src-tauri/src/core/db/crud.rs",
  "src-tauri/src/core/scheduler/workers/persistence.rs",
]);

const schedulerScraperWorkerPrivacyPaths = new Set([
  "src-tauri/src/core/scheduler/workers/scrapers.rs",
]);

const schedulerScoringPrivacyPaths = new Set([
  "src-tauri/src/core/scheduler/workers/scoring.rs",
  "src-tauri/src/core/scoring/db.rs",
]);

const scoringCachePrivacyPaths = new Set(["src-tauri/src/core/scoring/cache.rs"]);

const residualCorePrivacyPaths = new Set([
  "src-tauri/src/core/automation/browser/manager.rs",
  "src-tauri/src/core/config/io.rs",
  "src-tauri/src/core/db/connection.rs",
  "src-tauri/src/core/db/error.rs",
  "src-tauri/src/core/import/schema_org.rs",
  "src-tauri/src/core/ml/model.rs",
  "src-tauri/src/core/resume/parser.rs",
  "src-tauri/src/core/resume/templates.rs",
  "src-tauri/src/core/scheduler/mod.rs",
  "src-tauri/src/core/scrapers/mod.rs",
  "src-tauri/src/core/scrapers/usajobs.rs",
  "src-tauri/src/core/scrapers/yc_startup.rs",
]);

const rawAutomationQuestionLoggingPaths = new Set([
  "src-tauri/src/core/automation/form_filler.rs",
]);

const automationFormPrivacyPaths = new Set([
  "src-tauri/src/core/automation/form_filler.rs",
  "src/mocks/handlers.ts",
]);

const automationBrowserErrorPrivacyPaths = new Set([
  "src-tauri/src/core/automation/browser/manager.rs",
  "src-tauri/src/core/automation/browser/page.rs",
]);

const rawNotificationJobTitleLoggingPaths = new Set(["src-tauri/src/core/notify/mod.rs"]);

function stripRustTestModules(text) {
  let output = text;

  output = output.replace(/#\[cfg\(test\)\]\s*mod\s+tests\s*\{[\s\S]*$/m, "");

  output = output.replace(/#\[cfg\(test\)\]\s*[\s\S]*?#\[test\][\s\S]*?\n\s*\}/g, "");

  output = output.replace(/#\[test\]\s*fn\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}/g, "");

  output = output.replace(
    /#\[tokio::test\]\s*async\s+fn\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}/g,
    "",
  );

  return output;
}

function stripTypeScriptComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

export function hasRawAutomationDropdownValueLogging(root, path) {
  if (path !== "src-tauri/src/core/automation/browser/page.rs") {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /tracing::debug!\(\s*"Selected option[^"]*"[\s\S]{0,120},\s*value\b/.test(
    productionText,
  );
}

export function hasRawFrontendErrorReporterForwarding(root, path) {
  if (!frontendErrorReportingPaths.has(path)) {
    return false;
  }

  const text = stripTypeScriptComments(readFileSync(join(root, path), "utf8"));
  return (
    /originalConsoleError\.apply\(\s*console\s*,\s*args\s*\)/.test(text) ||
    /window\.onerror\s*=\s*\([\s\S]{0,640}return\s+false\s*;/.test(text) ||
    /window\.onunhandledrejection\s*=\s*\([\s\S]{0,720}if\s*\(\s*!import\.meta\.env\.DEV\s*\)\s*\{[\s\S]{0,120}event\.preventDefault\(\)/.test(
      text,
    )
  );
}

export function hasUnsanitizedFrontendErrorReportStorage(root, path) {
  if (!frontendErrorReportingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /this\.errors\.unshift\(report\)/.test(text) ||
    (/localStorage\.setItem\(STORAGE_KEY,\s*JSON\.stringify\(this\.errors\)\)/.test(text) &&
      !/sanitizeStoredReport/.test(text)) ||
    /logError\(`\[ErrorReporter\]\[\$\{type\}\]`,\s*error\.message/.test(text) ||
    /\boriginalError:\s*error\b/.test(text) ||
    /logError\(`\[ErrorReporter\]\[\$\{type\}\]`[\s\S]{0,160}\breport,\s*$/m.test(text) ||
    /console\.warn\(\s*["']\[ErrorReporter\][^;]*,\s*(?:e|error)\s*\)/.test(text) ||
    !/token\(\?:\\s\+\|=\)/.test(text) ||
    text.includes("hooks\\.slack\\.com\\/services") ||
    !text.includes("discord(?:app)?\\.com\\/api\\/webhooks") ||
    !text.includes("outlook\\.office(?:365)?\\.com\\/webhook")
  );
}

export function hasRawFrontendErrorHelperDebugLogging(root, path) {
  if (!frontendErrorHelperDebugPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /console\.error\(\s*["']Error:["']\s*,\s*error\s*\)/.test(text) ||
    /console\.log\(\s*["']Context:["']\s*,\s*context\s*\)/.test(text) ||
    /console\.log\(\s*["']Stack:["']\s*,\s*error\.stack\s*\)/.test(text) ||
    !text.includes("sanitizeDebugValue") ||
    !text.includes("sanitizeTextForStorage") ||
    !text.includes("sanitizeContext")
  );
}

export function hasRawFrontendErrorHelperUserMessage(root, path) {
  if (!frontendErrorHelperDebugPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /function\s+getUserMessage[\s\S]*?\breturn\s+error\.message\s*;/.test(text);
}

export function hasRawFrontendSharedErrorLogging(root, path) {
  if (!frontendErrorUtilsPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const getErrorMessageStart = text.indexOf("export function getErrorMessage");
  const getErrorMessageEnd =
    getErrorMessageStart === -1
      ? -1
      : text.indexOf("\n/**", getErrorMessageStart + 1);
  const getErrorMessageBody =
    getErrorMessageStart === -1
      ? ""
      : text.slice(
          getErrorMessageStart,
          getErrorMessageEnd === -1 ? undefined : getErrorMessageEnd,
        );
  return (
    /console\.error\(\s*message\s*,\s*error\s*\)/.test(text) ||
    /\breturn\s+(?:error\.message|error|String\(\s*\([^)]*message|String\(\s*error)/.test(
      getErrorMessageBody,
    ) ||
    !text.includes("getUserFriendlyError") ||
    !text.includes("sanitizeLoggedError") ||
    !text.includes("sanitizeTextForStorage") ||
    !text.includes("sanitizeContext")
  );
}

export function hasRawFrontendDirectErrorLogging(root, path) {
  if (!frontendDirectErrorLoggingPaths.has(path)) {
    return false;
  }

  return /console\.error\(/.test(readFileSync(join(root, path), "utf8"));
}

export function hasUnsafeErrorReportStorageParsing(root, path) {
  if (!frontendErrorReportingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /JSON\.parse\(stored\)\.map/.test(text) ||
    !/function\s+isErrorReport/.test(text) ||
    !/parseStoredErrorReports/.test(text)
  );
}

export function hasHardcodedFrontendErrorExportVersion(root, path) {
  if (!frontendErrorReportingPaths.has(path)) {
    return false;
  }

  return /app_version:\s*["']\d+\.\d+(?:\.\d+)?["']/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasRawPrivateQueryLogging(root, path) {
  if (!rawPrivateQueryLoggingPaths.has(path)) {
    return false;
  }

  return /\b(?:query|question|pattern):\s*'?\{(?::\?)?\}'?/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasRawUserDataPrivacyLogging(root, path) {
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
    /JSON serialization error:\s*\{\}/.test(text) ||
    /#\[instrument\(skip\(self,\s*content\)\)\]\s*pub async fn (?:create|update)_template/.test(
      text,
    ) ||
    /#\[instrument\(skip\(self\)\)\]\s*pub async fn (?:create_saved_search|add_search_history|save_notification_preferences)/.test(
      text,
    )
  );
}

export function hasRawSchedulerJobContentLogging(root, path) {
  if (!rawSchedulerJobContentLoggingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /(?:job_title|job_company)\s*=/.test(text) ||
    /tracing::(?:debug|info|warn|error)!\([^;]*(?:job\.title|job\.company)/.test(text) ||
    /errors\.push\(format!\([^;]*(?:job\.title|job\.company)/.test(text) ||
    /(?:Database error for|Notification error for|Failed to mark alert sent for)\s+\{\}/.test(
      text,
    )
  );
}

export function hasRawSchedulerScraperErrorDetails(root, path) {
  if (!schedulerScraperWorkerPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /fail_run\(db,[\s\S]{0,180}&e\.to_string\(\)/.test(productionText) ||
    /format!\(\s*"[^"]*scraper failed:\s*\{\}"\s*,\s*e\s*\)/.test(productionText) ||
    /Failed to retrieve USAJobs API key from keyring:\s*\{\}/.test(productionText) ||
    /tracing::error!\(\s*"\{\}"\s*,\s*error_msg\s*\)/.test(productionText) ||
    /errors\.push\(error_msg\)/.test(productionText)
  );
}

export function hasRawScraperUrlOrQueryLogging(root, path) {
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

export function hasRawScraperLoopErrorLogging(root, path) {
  if (!scraperLoopErrorLoggingPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /tracing::(?:error|warn)!\(\s*"Failed to scrape \{\}:\s*\{\}"\s*,\s*company\.name\s*,\s*e\s*\)/.test(
    productionText,
  );
}

export function hasUnboundedExternalResponseBodyRead(root, path) {
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

export function hasRawLocalPathLogging(root, path) {
  if (!rawLocalPathLoggingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /tracing::(?:debug|info|warn|error)!\([^;]*(?:\bpath:\s*\{\}|display\(\)|(?:path|dir|directory|backup|database|configuration)[^;]*\{:\?\})/.test(
    text,
  );
}

export function hasRawBackupPathError(root, path) {
  if (!rawBackupPathErrorPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /Backup file not found:\s*\{\}[\s\S]{0,80}backup_path\.display\(\)/.test(
    productionText,
  );
}

export function hasMlRawLocalPathExposure(root, path) {
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

export function hasMlRawErrorDisplay(root, path) {
  if (!mlErrorDisplayPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /#\[error\("\s*(?:model not downloaded|model loading failed|inference failed|tokenization failed|download failed|IO error)[^"]*:\s*\{0\}"\)\]/.test(
    productionText,
  );
}

export function hasMlRawLocalPathDoc(root, path) {
  if (!mlRawLocalPathDocPaths.has(path)) {
    return false;
  }

  return /\bmodel_path\s*:\s*string\b/.test(readFileSync(join(root, path), "utf8"));
}

export function hasRawJobsWithGptDebug(root, path) {
  if (!jobsWithGptPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /#\[derive\([^)]*Debug[^)]*\)\]\s*pub struct (?:JobsWithGptScraper|JobQuery)\b/.test(
    productionText,
  );
}

export function hasRawLinkedInDebug(root, path) {
  if (!linkedInPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /#\[derive\([^)]*Debug[^)]*\)\]\s*pub struct LinkedInScraper\b/.test(productionText);
}

export function hasLinkedInLoginCookieReturn(root, path) {
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

export function hasRawEmailTestErrorReturn(root, path) {
  if (!emailCommandPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /format!\(\s*"Failed to send test email:\s*\{\}"\s*,\s*e\s*\)/.test(productionText);
}

export function hasRawSlackWebhookValidationErrorReturn(root, path) {
  if (!emailCommandPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /format!\(\s*"Validation failed:\s*\{\}"\s*,\s*e\s*\)/.test(productionText) ||
    /tracing::error!\(\s*"Webhook validation failed:\s*\{\}"\s*,\s*e\s*\)/.test(productionText)
  );
}

export function hasSecretBearingDebugDerive(root, path) {
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

export function hasCredentialKeyInputEcho(root, path) {
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

export function hasRawCredentialStorageErrors(root, path) {
  if (!credentialStorageErrorPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /format!\(\s*"Failed to (?:initialize native keyring store|create keyring entry):\s*\{e\}"/.test(
      productionText,
    ) ||
    /format!\(\s*"Failed to (?:store|retrieve|delete) credential[^"]*:\s*\{e\}"/.test(
      productionText,
    ) ||
    /map_err\(\s*\|e\|\s*format!\([\s\S]{0,160}(?:keyring|credential)[\s\S]{0,80}\{e\}/i.test(
      productionText,
    )
  );
}

export function hasMissingLinkedInCredentialStorageDisable(root, path) {
  if (!credentialCommandPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));

  if (path === "src-tauri/src/core/credentials/mod.rs") {
    return (
      !productionText.includes("LINKEDIN_CREDENTIAL_STORAGE_DISABLED") ||
      !/fn\s+reject_disabled_credential_storage/.test(productionText) ||
      !/CredentialKey::LinkedInCookie\s*\|\s*CredentialKey::LinkedInCookieExpiry/.test(productionText) ||
      !/reject_disabled_credential_storage\(key\)\?/.test(productionText) ||
      !/validate_credential_value\(key,\s*value\)\?/.test(productionText)
    );
  }

  if (path === "src-tauri/src/commands/credentials.rs") {
    return (
      !productionText.includes("LINKEDIN_CREDENTIALS_DISABLED") ||
      !/fn\s+reject_disabled_credential_storage/.test(productionText) ||
      !/CredentialKey::LinkedInCookie\s*\|\s*CredentialKey::LinkedInCookieExpiry/.test(productionText) ||
      !/reject_disabled_credential_storage\(cred_key\)\?/.test(productionText)
    );
  }

  return false;
}

export function hasMissingWebhookCredentialStorageValidation(root, path) {
  if (path !== "src-tauri/src/core/credentials/mod.rs") {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    !/CredentialKey::SlackWebhook\s*=>\s*validate_webhook_credential/.test(productionText) ||
    !/CredentialKey::DiscordWebhook\s*=>\s*validate_webhook_credential/.test(productionText) ||
    !/CredentialKey::TeamsWebhook\s*=>\s*validate_webhook_credential/.test(productionText) ||
    !/fn\s+validate_webhook_credential/.test(productionText)
  );
}

export function hasRendererCredentialSecretRead(root, path) {
  if (!credentialSecretReadIpcPaths.has(path)) {
    return false;
  }

  const text = path.endsWith(".rs")
    ? stripRustTestModules(readFileSync(join(root, path), "utf8"))
    : readFileSync(join(root, path), "utf8");

  return /\bretrieve_credential\b|\bretrieveCredential\b/.test(text);
}

export function hasIncompleteConfigExportRedaction(root, path) {
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

export function hasStaleFeedbackWebhookSanitizer(root, path) {
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

export function hasUnsanitizedStructuredDebugLogEvents(root, path) {
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

export function hasUnsanitizedFeedbackFileSave(root, path) {
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

export function hasRawFeedbackOpenErrors(root, path) {
  if (!feedbackCommandPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /format!\(\s*["']Failed to (?:open browser|reveal file|open directory): \{e\}["']\s*\)/.test(
    text,
  );
}

export function hasRawTelegramBotTokenRequestError(root, path) {
  if (!telegramNotificationPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /client\s*\.post\(&api_url\)[\s\S]{0,260}\.send\(\)\s*\.await\s*\?/.test(
    productionText,
  );
}

export function hasRawWebhookTokenRequestError(root, path) {
  if (!webhookNotificationPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /client\s*\.post\(&?(?:config\.)?webhook_url\)[\s\S]{0,260}\.send\(\)\s*\.await\s*\?/.test(
    productionText,
  );
}

export function hasRawNotificationProviderErrorBody(root, path) {
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

export function hasRawNotificationServiceErrorDetails(root, path) {
  if (!notificationServicePrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /tracing::(?:error|warn)!\([^;]*\{\}[^;]*,\s*e\s*\)/.test(productionText) ||
    /errors\.push\(format!\(\s*"(?:Slack|Email|Discord|Telegram|Teams):\s*\{\}"\s*,\s*e\s*\)\)/.test(
      productionText,
    ) ||
    /anyhow::anyhow!\([^;]*errors\.join\([^)]*\)[\s\S]{0,120}\b(?:webhook|token|password|SMTP)\b/i.test(
      productionText,
    )
  );
}

export function hasRawJobsWithGptSmokeEndpointError(root, path) {
  if (!healthSmokePrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /"error"\s*:\s*e\.to_string\(\)/.test(productionText) ||
    /Err\(e\)\s*=>\s*Err\(e\.into\(\)\)/.test(productionText)
  );
}

export function hasRawSourceCheckResultError(root, path) {
  if (!healthSmokePrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /error:\s*Some\(\s*e\.to_string\(\)\s*\)/.test(productionText) ||
    /"error"\s*:\s*format!\([^)]*e\.without_url\(\)/.test(productionText)
  );
}

export function hasRawUrlLogging(root, path) {
  if (!rawUrlLoggingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /(?:fields\(url\s*=\s*%url\)|tracing::(?:debug|info|warn|error)!\([^;]*(?:URL|url)[^;]*:\s*\{\})/.test(
    text,
  ) || /tracing::(?:debug|info|warn|error)!\([^;]*navigation:\s*\{\}[^;]*url_str/.test(text);
}

export function hasRawUrlErrorDisplay(root, path) {
  if (!rawUrlErrorDisplayPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  if (/#\[error\("[^"]*\{url\}/.test(productionText)) {
    return true;
  }

  if (path !== "src-tauri/src/core/scrapers/error.rs") {
    return false;
  }

  return (
    /"HTTP request failed for \{\}: \{\}"[\s\S]{0,180}\bsource\b/.test(productionText) ||
    /"Network error for \{\}: \{\}"[\s\S]{0,180}\bsource\b/.test(productionText) ||
    /"Failed to parse \{\} from \{\}: \{\}"[\s\S]{0,220}\bsource\b/.test(productionText) ||
    /message:\s*error\.to_string\(\)/.test(productionText) ||
    /format!\(\s*"Response body from \{\} exceeded \{\} byte limit"\s*,\s*url\s*,/.test(
      productionText,
    )
  );
}

export function hasRawPathOrQueryErrorDisplay(root, path) {
  if (!rawPathOrQueryErrorDisplayPaths.has(path)) {
    return false;
  }

  return /#\[error\("[^"]*\{(?:path|query)\}/.test(readFileSync(join(root, path), "utf8"));
}

export function hasRawResumeParserPathDisplay(root, path) {
  if (!rawResumeParserPathDisplayPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /(?:file_path|canonical_path)\.display\(\)/.test(productionText);
}

export function hasRawResumeNameLogging(root, path) {
  if (!rawResumeNameLoggingPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /tracing::(?:debug|info|warn|error)!\([^;]*import_json_resume[^;]*(?:\bname\s*[:=]\s*\{\}|\bname\s*=\s*%?name\b)/.test(
    productionText,
  );
}

export function hasRawResumeCommandErrorDetails(root, path) {
  if (!resumeCommandErrorPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /map_err\(\|e\|\s*format!\(\s*"(?:Failed to|Export failed)[^"]*:\s*\{\}"\s*,\s*e\s*\)\)/.test(
      productionText,
    ) ||
    /tracing::info!\([^;]*(?:job:\s*\{\}|skill:\s*\{\})[^;]*\)/.test(productionText) ||
    /tracing::info!\([^;]*(?:\bjob_hash\b|skill\.skill_name)[^;]*\)/.test(productionText)
  );
}

export function hasRawAtsCommandErrorDetails(root, path) {
  if (!atsCommandErrorPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /map_err\(\|e\|\s*format!\(\s*"(?:Failed to|Invalid status)[^"]*:\s*\{\}"\s*,\s*e\s*\)\)/.test(
      productionText,
    ) ||
    /tracing::info!\([^;]*(?:job_hash:\s*\{\}|status:\s*\{\}|type:\s*\{\}|at:\s*\{\}|outcome:\s*\{\})[^;]*\)/.test(
      productionText,
    ) ||
    /tracing::info!\([^;]*(?:\bjob_hash\b|\bstatus\b|\binterview_type\b|\bscheduled_at\b|\boutcome\b)[^;]*\)/.test(
      productionText,
    )
  );
}

export function hasRawAutomationCommandErrorDetails(root, path) {
  if (!automationCommandErrorPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /map_err\(\|e\|\s*format!\(\s*"Failed to [^"]*:\s*\{\}"\s*,\s*e\s*\)\)/.test(
      productionText,
    ) ||
    /Err\(e\)\s*=>\s*Err\(format!\(\s*"Failed to [^"]*:\s*\{\}"\s*,\s*e\s*\)\)/.test(
      productionText,
    ) ||
    /tracing::(?:info|warn)!\([^;]*(?:job:\s*\{\}|hash:\s*\{\})[^;]*\)/.test(
      productionText,
    ) ||
    /tracing::(?:info|warn)!\([^;]*(?:\bjob_hash\b\s*,|\bjob_hash\s*=\s*[%?]?\s*job_hash\b)[^;]*\)/.test(
      productionText,
    ) ||
    /tracing::warn!\(\s*"Failed to create automation attempt:\s*\{\}"\s*,\s*e\s*\)/.test(
      productionText,
    )
  );
}

export function hasRawSensitiveCommandErrorDetails(root, path) {
  if (!sensitiveCommandErrorPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /map_err\(\|e\|\s*format!\(\s*"Failed to [^"]*:\s*\{\}"\s*,\s*e\s*\)\)/.test(
      productionText,
    ) ||
    /Err\(e\)\s*=>\s*Err\(format!\(\s*"Failed to [^"]*:\s*\{\}"\s*,\s*e\s*\)\)/.test(
      productionText,
    ) ||
    /serde_json::to_value\([^)]*\)\.map_err\(\|e\|\s*format!\(\s*"Failed to [^"]*:\s*\{\}"\s*,\s*e\s*\)\)/.test(
      productionText,
    ) ||
    /tracing::info!\([^;]*(?:job:\s*\{\}|scenario:\s*\{\})[^;]*\)/.test(productionText) ||
    /tracing::info!\([^;]*(?:\bjob_hash\b\s*,|\bscenario\b\s*,|\bjob_hash\s*=\s*[%?]?\s*job_hash\b|\bscenario\s*=\s*[%?]?\s*scenario\b)[^;]*\)/.test(
      productionText,
    )
  );
}

export function hasRawUtilityCommandErrorDetails(root, path) {
  if (!utilityCommandErrorPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /format!\(\s*"(?:Scraping failed|Database error|Failed to [^"]*|Invalid (?:configuration|ghost config)):\s*\{\}"\s*,\s*e\s*\)/.test(
      productionText,
    ) ||
    /format!\(\s*"Failed to [^"]*\{\}:\s*\{\}"\s*,\s*[^,]+,\s*e\s*\)/.test(
      productionText,
    ) ||
    /tracing::error!\(\s*"[^"]*:\s*\{\}"\s*,\s*e\s*\)/.test(productionText) ||
    /tracing::error!\(\s*"Failed to serialize job \{\}:\s*\{\}"\s*,\s*job\.id\s*,\s*e\s*\)/.test(
      productionText,
    ) ||
    /tracing::error!\([^;]*error\s*=\s*%e/.test(productionText) ||
    /DeepLinkOpenedEvent\s*\{\s*url:\s*url\.clone\(\)\s*\}/.test(productionText)
  );
}

function resumeSummaryStructMissingOrPrivate(text) {
  const match = text.match(/pub\s+struct\s+ResumeSummary\s*\{([^}]*)\}/);
  return !match || /\b(?:file_path|parsed_text)\b/.test(match[1]);
}

export function hasRawResumeCommandDtoExposure(root, path) {
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

export function hasRawCommandSetupErrorDisplay(root, path) {
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

export function hasRawConfigValidationUrlDisplay(root, path) {
  if (!configValidationPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /Got:\s*\{\}"[\s\S]{0,120},\s*url\b/.test(productionText);
}

export function hasRawImportRedirectDisplay(root, path) {
  if (!rawImportRedirectDisplayPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /(?:Redirect blocked while fetching URL: \{location\}|URL validation failed: \{0\}|Invalid JSON-LD format: \{0\}|HTML parsing failed: \{0\}|Database error: \{0\}|HTTP request failed: \{0\})/.test(
    productionText,
  );
}

export function hasRawJobImportLogging(root, path) {
  if (!rawJobImportLoggingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /#\[tracing::instrument\([^\]]*fields\(url\)/.test(text) ||
    /tracing::info!\([^;]*(?:title|company)\s*=\s*%(?:preview\.)?(?:title|company)/.test(text)
  );
}

export function hasRawImportHttpErrorReturn(root, path) {
  if (!importCommandPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /Failed to fetch the page:\s*\{\}[\s\S]{0,80},\s*e\b/.test(productionText);
}

export function hasNonPublicIpErrorEcho(root, path) {
  if (!urlSecurityPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /Blocked non-public IP address ['"]?\{[^}]*}/.test(productionText);
}

export function hasRawImportBookmarkletCommandErrorDetails(root, path) {
  if (!importBookmarkletCommandPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /format!\(\s*"(?:Failed to serialize job|Invalid URL|Failed to read the job page response|Failed to parse the page|Invalid Schema\.org data format|Database error):\s*\{\}"/.test(
      productionText,
    ) ||
    /format!\(\s*"Invalid category:\s*\{\}"/.test(productionText) ||
    /tracing::(?:error|warn)!\(\s*"[^"]*(?:scoring config|bookmarklet server|Connection error|Accept error|job data|Database error)[^"]*:\s*\{\}"\s*,\s*e\s*\)/.test(
      productionText,
    ) ||
    /tracing::error!\([^;]*error\s*=\s*%e/.test(productionText) ||
    /json_error_response\(\s*format!\(\s*"[^"]*\{e\}[^"]*"\s*\)\s*\)/.test(
      productionText,
    ) ||
    /json_error_response\(\s*format!\(\s*r#"\{\{"error":"[^"]*\{\}[^"]*"\}\}"#,\s*e\s*\)\s*\)/.test(
      productionText,
    )
  );
}

export function hasRawBookmarkletImportLogging(root, path) {
  if (!rawBookmarkletLoggingPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /tracing::info!\([^;]*title\s*=\s*%title[^;]*company\s*=\s*%company/s.test(
      productionText,
    ) ||
    /tracing::info!\([^;]*(?:\bjob_hash\b\s*,|\bjob_hash\s*=\s*%job_hash\b)/.test(
      productionText,
    )
  );
}

export function hasRawScoringCacheJobHashLogging(root, path) {
  if (!scoringCachePrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /tracing::(?:debug|info|warn|error)!\([^;]*(?:job_hash=\{\}|job_hash\s*=\s*[%?]?(?:key\.)?job_hash|\bjob_hash\b\s*,)/.test(
    productionText,
  );
}

export function hasRawSchedulerScoringPrivacyLeak(root, path) {
  if (!schedulerScoringPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /tracing::warn!\([^;]*error\s*=\s*%e[^;]*job_hash\s*=\s*%job\.hash/.test(
      productionText,
    ) ||
    /tracing::debug!\([^;]*Ghost indicator for '\{\}' at \{\}/.test(productionText) ||
    /tracing::debug!\([^;]*(?:job_title\s*=\s*%job\.title|job_company\s*=\s*%job\.company|,\s*job\.title\s*,\s*job\.company)/s.test(
      productionText,
    ) ||
    /format!\(\s*"Failed to (?:load|save) scoring config:\s*\{\}"\s*,\s*e\s*\)/.test(
      productionText,
    )
  );
}

export function hasResidualCorePrivacyLeak(root, path) {
  if (!residualCorePrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /format!\(\s*"(?:Invalid template ID|Failed to create config directory|Invalid email for User-Agent header|Invalid API key|Failed to build HTTP client):\s*\{\}"/.test(
      productionText,
    ) ||
    /MlError::DownloadFailed\(\s*e\.to_string\(\)/.test(productionText) ||
    /MlError::DownloadFailed\(\s*format!\(\s*"Failed to download \{\}:\s*\{\}"/.test(
      productionText,
    ) ||
    /tracing::(?:debug|warn|error)!\([^;]*(?:error\s*=\s*%e|failed to parse Inertia JSON:\s*\{\}|OCR extraction failed:\s*\{\}|Scraping cycle failed:\s*\{\}|Errors during scraping:\s*\{:?\}|(?:database|backup|config)[^"]*:\s*\{\}")/.test(
      productionText,
    ) ||
    /format!\(\s*"(?:Database operation failed|Database query timed out|Invalid [^"]*):\s*\{\}"/.test(
      productionText,
    )
  );
}

export function hasManualBookmarkletJsonErrorResponses(root, path) {
  if (!rawBookmarkletLoggingPaths.has(path)) {
    return false;
  }

  return /format!\(r#"\{\{"error":"[^"]*\{\}[^"]*"\}\}"#,\s*e\)/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasUnauthenticatedBookmarkletImports(root, path) {
  if (!rawBookmarkletLoggingPaths.has(path)) {
    return false;
  }

  return /if request\.starts_with\("POST \/api\/bookmarklet\/import"\)\s*\{\s*handle_import_request\(&request,\s*database\)\.await/s.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasBookmarkletCodeWithoutTokenHeader(root, path) {
  if (!bookmarkletGeneratorPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /api\/bookmarklet\/import/.test(text) && !/X-JobSentinel-Token/.test(text);
}

export function hasRawAutomationQuestionLogging(root, path) {
  if (!rawAutomationQuestionLoggingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /tracing::debug!\([^;]*(?:screening question|screening answer)[^;]*'\{\}'[^;]*question_text/.test(
    text,
  );
}

export function hasRawAutomationFormResultData(root, path) {
  if (!automationFormPrivacyPaths.has(path)) {
    return false;
  }

  const text = path.endsWith(".rs")
    ? stripRustTestModules(readFileSync(join(root, path), "utf8"))
    : readFileSync(join(root, path), "utf8");

  if (path === "src-tauri/src/core/automation/form_filler.rs") {
    return (
      /format!\(\s*"screening:\{\}"\s*,\s*(?:field_name|question_text)/.test(text) ||
      /truncate_question\(&question_text/.test(text) ||
      /Failed to (?:execute|parse) question finder (?:script|result):\s*\{\}/.test(text)
    );
  }

  return /`screening:\$\{answer\.questionPattern\}`/.test(text);
}

export function hasRawAutomationBrowserErrors(root, path) {
  if (!automationBrowserErrorPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /Failed to build browser config:\s*\{\}/.test(productionText) ||
    /File does not exist:\s*\{:\?\}/.test(productionText) ||
    /Invalid file path encoding/.test(productionText) ||
    /Failed to build file upload params:\s*\{\}/.test(productionText)
  );
}

export function hasRawNotificationJobTitleLogging(root, path) {
  if (!rawNotificationJobTitleLoggingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /tracing::info!\([^;]*notification\.job\.title/.test(text);
}

const privacyLoggingViolationChecks = [
  [hasRawPrivateQueryLogging, "replace raw private query logging"],
  [hasRawUserDataPrivacyLogging, "replace raw user-data privacy logging"],
  [hasRawSchedulerJobContentLogging, "sanitize scheduler job content logging"],
  [hasRawSchedulerScraperErrorDetails, "sanitize scheduler scraper error details"],
  [hasRawScraperUrlOrQueryLogging, "replace raw scraper URL/query logging"],
  [hasRawScraperLoopErrorLogging, "sanitize scraper loop error logging"],
  [hasUnboundedExternalResponseBodyRead, "replace unbounded external response body read"],
  [hasRawLocalPathLogging, "replace raw local path logging"],
  [hasRawBackupPathError, "sanitize backup path error display"],
  [hasMlRawLocalPathExposure, "remove ML raw local path exposure"],
  [hasMlRawErrorDisplay, "sanitize ML error display"],
  [hasMlRawLocalPathDoc, "remove ML raw local path doc claim"],
  [hasRawJobsWithGptDebug, "sanitize JobsWithGPT debug output"],
  [hasRawLinkedInDebug, "sanitize legacy LinkedIn source debug output"],
  [hasLinkedInLoginCookieReturn, "keep LinkedIn login cookie out of renderer response"],
  [hasRawEmailTestErrorReturn, "sanitize test email command errors"],
  [hasRawSlackWebhookValidationErrorReturn, "sanitize Slack webhook validation command errors"],
  [hasSecretBearingDebugDerive, "sanitize secret-bearing debug derive"],
  [hasCredentialKeyInputEcho, "avoid echoing credential key input"],
  [hasRawCredentialStorageErrors, "sanitize credential storage errors"],
  [hasMissingLinkedInCredentialStorageDisable, "disable LinkedIn credential storage"],
  [
    hasMissingWebhookCredentialStorageValidation,
    "validate notification webhook credentials before keyring storage",
  ],
  [hasRendererCredentialSecretRead, "keep credential values out of renderer IPC"],
  [hasIncompleteConfigExportRedaction, "redact all credential fields from config export"],
  [hasRawTelegramBotTokenRequestError, "remove Telegram bot-token URLs from request errors"],
  [hasRawWebhookTokenRequestError, "remove webhook token URLs from request errors"],
  [hasRawNotificationProviderErrorBody, "omit notification provider error bodies from errors"],
  [hasRawNotificationServiceErrorDetails, "sanitize notification service error details"],
  [hasRawJobsWithGptSmokeEndpointError, "sanitize JobsWithGPT smoke-test endpoint errors"],
  [hasRawSourceCheckResultError, "sanitize source-check result errors"],
  [hasRawUrlLogging, "replace raw URL logging"],
  [hasRawUrlErrorDisplay, "replace raw URL error display"],
  [hasRawFrontendErrorHelperUserMessage, "sanitize frontend user error messages"],
  [hasRawPathOrQueryErrorDisplay, "replace raw path/query error display"],
  [hasRawResumeParserPathDisplay, "sanitize resume parser path error display"],
  [hasRawResumeNameLogging, "sanitize resume import name logging"],
  [hasRawResumeCommandErrorDetails, "sanitize resume command error details"],
  [hasRawAtsCommandErrorDetails, "sanitize application tracking command error details"],
  [hasRawAutomationCommandErrorDetails, "sanitize automation command error details"],
  [hasRawSensitiveCommandErrorDetails, "sanitize sensitive command error details"],
  [hasRawUtilityCommandErrorDetails, "sanitize utility command error details"],
  [hasRawResumeCommandDtoExposure, "hide resume file paths from renderer DTOs"],
  [hasRawCommandSetupErrorDisplay, "replace raw command setup error display"],
  [hasRawConfigValidationUrlDisplay, "sanitize config validation URL display"],
  [hasRawImportRedirectDisplay, "replace raw import redirect display"],
  [hasRawJobImportLogging, "replace raw job import logging"],
  [hasRawImportHttpErrorReturn, "sanitize job import HTTP errors"],
  [hasRawImportBookmarkletCommandErrorDetails, "sanitize import and bookmarklet command error details"],
  [hasNonPublicIpErrorEcho, "sanitize non-public IP validation errors"],
  [hasRawAutomationQuestionLogging, "replace raw automation screening question logging"],
  [hasRawAutomationFormResultData, "sanitize automation form result data"],
  [hasRawAutomationBrowserErrors, "sanitize automation browser errors"],
  [hasRawAutomationDropdownValueLogging, "remove raw automation dropdown value logging"],
  [hasRawNotificationJobTitleLogging, "replace raw notification job title logging"],
  [hasRawBookmarkletImportLogging, "replace raw bookmarklet import metadata logging"],
  [hasRawScoringCacheJobHashLogging, "replace raw scoring cache job hash logging"],
  [hasRawSchedulerScoringPrivacyLeak, "replace raw scheduler scoring privacy leaks"],
  [hasResidualCorePrivacyLeak, "replace residual core privacy leaks"],
  [hasManualBookmarkletJsonErrorResponses, "replace manual bookmarklet JSON error responses"],
  [hasUnauthenticatedBookmarkletImports, "require bookmarklet import auth token"],
  [hasBookmarkletCodeWithoutTokenHeader, "include bookmarklet auth token header"],
  [hasUnsanitizedFrontendErrorReportStorage, "sanitize frontend error report storage"],
  [hasRawFrontendErrorReporterForwarding, "sanitize frontend error reporter console forwarding"],
  [hasRawFrontendErrorHelperDebugLogging, "sanitize frontend error helper debug logging"],
  [hasRawFrontendSharedErrorLogging, "sanitize shared frontend error logging"],
  [
    hasRawFrontendDirectErrorLogging,
    "route frontend direct error logging through sanitized logger",
  ],
  [hasUnsafeErrorReportStorageParsing, "validate stored error reports before loading"],
  [
    hasHardcodedFrontendErrorExportVersion,
    "derive frontend error export version from package metadata",
  ],
  [hasStaleFeedbackWebhookSanitizer, "redact provider webhook URLs in feedback sanitizer"],
  [hasUnsanitizedStructuredDebugLogEvents, "sanitize structured feedback debug events"],
  [hasUnsanitizedFeedbackFileSave, "sanitize feedback file content before saving"],
  [hasRawFeedbackOpenErrors, "sanitize feedback support-open errors"],
];

export function collectPrivacyLoggingViolations(root, path) {
  return privacyLoggingViolationChecks
    .filter(([predicate]) => predicate(root, path))
    .map(([, message]) => `${message}: ${path}`);
}
