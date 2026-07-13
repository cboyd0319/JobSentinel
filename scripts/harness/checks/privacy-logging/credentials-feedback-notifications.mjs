import {
  readFileSync,
  join,
  frontendErrorReportingPaths,
  frontendErrorLoggerPaths,
  frontendToastSupportDetailPaths,
  frontendDirectErrorLoggingPaths,
  rawPrivateQueryLoggingPaths,
  rawScraperLoggingPaths,
  scraperLoopErrorLoggingPaths,
  rawLocalPathLoggingPaths,
  rawBackupPathErrorPaths,
  mlRawLocalPathExposurePaths,
  mlErrorDisplayPrivacyPaths,
  mlRawLocalPathDocPaths,
  jobsWithGptPrivacyPaths,
  linkedInPrivacyPaths,
  linkedInAuthPrivacyPaths,
  emailCommandPrivacyPaths,
  credentialCommandPrivacyPaths,
  credentialStorageErrorPrivacyPaths,
  credentialSecretReadIpcPaths,
  configExportPrivacyPaths,
  feedbackSanitizerPaths,
  structuredDebugLogPaths,
  feedbackCommandPaths,
  telegramNotificationPrivacyPaths,
  webhookNotificationPrivacyPaths,
  notificationProviderErrorBodyPaths,
  externalAlertMatchReasonPaths,
  notificationServicePrivacyPaths,
  frontendDesktopNotificationPrivacyPaths,
  healthSmokePrivacyPaths,
  rawUrlLoggingPaths,
  rawUrlErrorDisplayPaths,
  rawPathOrQueryErrorDisplayPaths,
  rawResumeParserPathDisplayPaths,
  rawResumeNameLoggingPaths,
  resumeCommandDtoPrivacyPaths,
  resumeCommandErrorPrivacyPaths,
  atsCommandErrorPrivacyPaths,
  atsTimelineEventPrivacyPaths,
  automationCommandErrorPrivacyPaths,
  sensitiveCommandErrorPrivacyPaths,
  utilityCommandErrorPrivacyPaths,
  rawCommandSetupErrorDisplayPaths,
  configValidationPrivacyPaths,
  rawJobImportLoggingPaths,
  importCommandPrivacyPaths,
  rawImportRedirectDisplayPaths,
  urlSecurityPrivacyPaths,
  importBookmarkletCommandPrivacyPaths,
  rawBookmarkletLoggingPaths,
  bookmarkletGeneratorPaths,
  userDataPrivacyLoggingPaths,
  rawSchedulerJobContentLoggingPaths,
  schedulerScraperWorkerPrivacyPaths,
  schedulerScoringPrivacyPaths,
  scoringCachePrivacyPaths,
  residualCorePrivacyPaths,
  rawAutomationQuestionLoggingPaths,
  automationFormPrivacyPaths,
  automationBrowserErrorPrivacyPaths,
  screeningAnswerCommandLoggingPaths,
  rawNotificationJobTitleLoggingPaths,
  stripRustTestModules,
  stripTypeScriptComments,
} from "./shared.mjs";

const activeSecretStorageWordingPaths = new Set([
  "docs/architecture/privacy-first-ai-gateway.md",
  "docs/developer/ARCHITECTURE.md",
  "docs/developer/MACOS_DEVELOPMENT.md",
  "src/features/settings/config/SettingsConfig.ts",
  "src/features/onboarding/SetupWizard.tsx",
  "crates/jobsentinel-core/src/core/config/types.rs",
]);

function isActiveSecretStorageWordingPath(path) {
  return (
    activeSecretStorageWordingPaths.has(path) ||
    path.startsWith("crates/jobsentinel-core/src/core/config/tests/")
  );
}

export function hasStaleActiveSecretStorageWording(root, path) {
  if (!isActiveSecretStorageWordingPath(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /stored (?:securely )?in (?:the )?OS keyring/i.test(text) ||
    /Credentials stored in OS keyring/i.test(text) ||
    /credential storage through (?:the )?OS keyring/i.test(text) ||
    /validated in keyring/i.test(text) ||
    /credential is in keyring/i.test(text)
  );
}

export function hasLinkedInLoginCookieReturn(root, path) {
  if (!linkedInAuthPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(
    readFileSync(join(root, path), "utf8"),
  );
  return (
    /cookie_result\.map\(\s*\|\(\s*cookie\b/.test(productionText) ||
    /tx\.send\(\s*cookie_result\.map\(\s*\|\([^)]*\)\|\s*cookie\s*\)\s*\)/.test(
      productionText,
    ) ||
    /Send result back\s*\([^)]*cookie value/.test(productionText)
  );
}

export function hasRawEmailTestErrorReturn(root, path) {
  if (!emailCommandPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(
    readFileSync(join(root, path), "utf8"),
  );
  return /format!\(\s*"Failed to send test email:\s*\{\}"\s*,\s*e\s*\)/.test(
    productionText,
  );
}

export function hasRawSlackWebhookValidationErrorReturn(root, path) {
  if (!emailCommandPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(
    readFileSync(join(root, path), "utf8"),
  );
  return (
    /format!\(\s*"Validation failed:\s*\{\}"\s*,\s*e\s*\)/.test(
      productionText,
    ) ||
    /tracing::error!\(\s*"Webhook validation failed:\s*\{\}"\s*,\s*e\s*\)/.test(
      productionText,
    )
  );
}

export function hasSecretBearingDebugDerive(root, path) {
  const rustSource =
    path.startsWith("src-tauri/src/") ||
    path.startsWith("crates/jobsentinel-core/src/");
  if (!rustSource || !path.endsWith(".rs")) {
    return false;
  }

  const productionText = stripRustTestModules(
    readFileSync(join(root, path), "utf8"),
  );
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

  const productionText = stripRustTestModules(
    readFileSync(join(root, path), "utf8"),
  );
  return (
    /Unknown credential key:\s*\{key\}/.test(productionText) ||
    /Invalid credential key:\s*\{\}[\s\S]{0,80},\s*(?:s|key)\b/.test(
      productionText,
    ) ||
    /format!\(\s*"[^"]*credential key[^"]*\{(?:key|s)\}/.test(productionText)
  );
}

export function hasRawCredentialStorageErrors(root, path) {
  if (!credentialStorageErrorPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(
    readFileSync(join(root, path), "utf8"),
  );
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

  const productionText = stripRustTestModules(
    readFileSync(join(root, path), "utf8"),
  );

  if (path === "crates/jobsentinel-core/src/core/credentials/mod.rs") {
    return (
      !productionText.includes("LINKEDIN_CREDENTIAL_STORAGE_DISABLED") ||
      !/fn\s+reject_disabled_credential_storage/.test(productionText) ||
      !/CredentialKey::LinkedInCookie\s*\|\s*CredentialKey::LinkedInCookieExpiry/.test(
        productionText,
      ) ||
      !/reject_disabled_credential_storage\(key\)\?/.test(productionText) ||
      !/validate_credential_value\(key,\s*value\)\?/.test(productionText)
    );
  }

  if (path === "src-tauri/src/commands/credentials.rs") {
    return (
      !productionText.includes("LINKEDIN_CREDENTIALS_DISABLED") ||
      !/fn\s+reject_disabled_credential_storage/.test(productionText) ||
      !/CredentialKey::LinkedInCookie\s*\|\s*CredentialKey::LinkedInCookieExpiry/.test(
        productionText,
      ) ||
      !/reject_disabled_credential_storage\(cred_key\)\?/.test(productionText)
    );
  }

  return false;
}

export function hasMissingWebhookCredentialStorageValidation(root, path) {
  if (path !== "crates/jobsentinel-core/src/core/credentials/mod.rs") {
    return false;
  }

  const productionText = stripRustTestModules(
    readFileSync(join(root, path), "utf8"),
  );
  return (
    !productionText.includes("CredentialKey::SlackWebhook") ||
    !productionText.includes("CredentialKey::DiscordWebhook") ||
    !productionText.includes("CredentialKey::TeamsWebhook") ||
    !productionText.includes("CredentialKey::TelegramBotToken") ||
    !/fn\s+validate_webhook_credential/.test(productionText) ||
    !/fn\s+validate_teams_webhook_credential/.test(productionText) ||
    !/fn\s+validate_telegram_bot_token_credential/.test(productionText)
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

export function hasIncompleteFeedbackJobSearchSanitizer(root, path) {
  if (!feedbackSanitizerPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    !text.includes("JOB_SEARCH_LABELED_CONTEXT_REGEX") ||
    !text.includes("JOB_SEARCH_STATEMENT_CONTEXT_REGEX") ||
    !text.includes("JOB_SEARCH_DETAIL_REDACTED") ||
    !/salary\|compensation\|pay/.test(text) ||
    !/resume\(\?:\[ _-\]\?/.test(text) ||
    !/private\[ _-\]\?notes/.test(text) ||
    !/application\[ _-\]\?\(\?:history\|notes\?\)/.test(text) ||
    !/screening\[ _-\]\?\(\?:questions\?\|answers\?\)/.test(text) ||
    !/location\[ _-\]\?preferences/.test(text) ||
    !/career\[ _-\]\?goals/.test(text) ||
    !/personal\[ _-\]\?circumstances/.test(text)
  );
}

export function hasUnsanitizedStructuredDebugLogEvents(root, path) {
  if (!structuredDebugLogPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const collectionDisabled =
    /pub fn get_debug_log\(\) -> Vec<TimestampedEvent> \{\s*Vec::new\(\)\s*\}/.test(text) &&
    /pub fn get_recent_events\([^)]*\) -> Vec<TimestampedEvent> \{\s*Vec::new\(\)\s*\}/.test(text);

  if (collectionDisabled) {
    return false;
  }

  return (
    !text.includes("sanitize_timestamped_event") ||
    /pub fn get_debug_log\(\)[\s\S]*?\.map\(\|buffer\| buffer\.get_all\(\)\)/.test(
      text,
    ) ||
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

  const productionText = stripRustTestModules(
    readFileSync(join(root, path), "utf8"),
  );
  return /client\s*\.post\(&api_url\)[\s\S]{0,260}\.send\(\)\s*\.await\s*\?/.test(
    productionText,
  );
}

export function hasRawWebhookTokenRequestError(root, path) {
  if (!webhookNotificationPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(
    readFileSync(join(root, path), "utf8"),
  );
  return /client\s*\.post\(&?(?:config\.)?webhook_url\)[\s\S]{0,260}\.send\(\)\s*\.await\s*\?/.test(
    productionText,
  );
}

export function hasRawNotificationProviderErrorBody(root, path) {
  if (!notificationProviderErrorBodyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(
    readFileSync(join(root, path), "utf8"),
  );
  return (
    /let\s+error_text\s*=\s*read_text_with_limit\(response,[\s\S]{0,420}anyhow!\([\s\S]{0,180}error_text/.test(
      productionText,
    ) ||
    /read_text_with_limit\(response,[\s\S]{0,180}\.await\?[\s\S]{0,180}anyhow!\([\s\S]{0,120}\{\}[\s\S]{0,80}error_text/.test(
      productionText,
    )
  );
}

export function hasExternalAlertRawScoreReasons(root, path) {
  if (!externalAlertMatchReasonPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(
    readFileSync(join(root, path), "utf8"),
  );
  return /(?:score|notification\.score)\s*\.\s*reasons/.test(productionText);
}

export function hasRawNotificationServiceErrorDetails(root, path) {
  if (!notificationServicePrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(
    readFileSync(join(root, path), "utf8"),
  );
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
