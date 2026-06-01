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
