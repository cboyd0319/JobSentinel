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
  const rustSource =
    path.startsWith("src-tauri/src/") ||
    path.startsWith("crates/");
  if (
    !rustSource ||
    !path.endsWith(".rs") ||
    path === "crates/jobsentinel-network/src/body.rs"
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

  if (path !== "crates/jobsentinel-sources/src/scrapers/error.rs") {
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
  if (!path.endsWith(".rs")) {
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
