import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  collectPrivacyLoggingViolations,
  hasExternalAlertRawScoreReasons,
  hasBookmarkletCodeWithoutTokenHeader,
  hasCredentialKeyInputEcho,
  hasHardcodedFrontendErrorExportVersion,
  hasIncompleteFeedbackJobSearchSanitizer,
  hasIncompleteConfigExportRedaction,
  hasLinkedInLoginCookieReturn,
  hasMlRawErrorDisplay,
  hasMlRawLocalPathDoc,
  hasMlRawLocalPathExposure,
  hasMissingLinkedInCredentialStorageDisable,
  hasMissingWebhookCredentialStorageValidation,
  hasNonPublicIpErrorEcho,
  hasManualBookmarkletJsonErrorResponses,
  hasRawAutomationDropdownValueLogging,
  hasRawAutomationBrowserErrors,
  hasRawAutomationCommandErrorDetails,
  hasRawAutomationFormResultData,
  hasRawAutomationQuestionLogging,
  hasRawScreeningAnswerCommandLogging,
  hasRawAtsCommandErrorDetails,
  hasRawAtsTimelinePrivateEventData,
  hasRawBackupPathError,
  hasRawCommandSetupErrorDisplay,
  hasRawConfigValidationUrlDisplay,
  hasRawCredentialStorageErrors,
  hasRawEmailTestErrorReturn,
  hasRawFrontendDirectErrorLogging,
  hasRawFrontendErrorHelperDebugLogging,
  hasRawFrontendErrorHelperUserMessage,
  hasRawFrontendErrorReporterForwarding,
  hasRawFrontendSharedErrorLogging,
  hasRawFrontendToastSupportDetails,
  hasRawImportBookmarkletCommandErrorDetails,
  hasRawImportHttpErrorReturn,
  hasRawImportRedirectDisplay,
  hasRawJobsWithGptDebug,
  hasRawJobsWithGptSmokeEndpointError,
  hasRawJobImportLogging,
  hasRawLinkedInDebug,
  hasRawLocalPathLogging,
  hasRawNotificationProviderErrorBody,
  hasFrontendDesktopNotificationPassthrough,
  hasRawNotificationJobTitleLogging,
  hasRawNotificationServiceErrorDetails,
  hasRawPathOrQueryErrorDisplay,
  hasRawPrivateQueryLogging,
  hasRawBookmarkletImportLogging,
  hasRawResumeCommandDtoExposure,
  hasRawResumeCommandErrorDetails,
  hasRawResumeNameLogging,
  hasRawResumeParserPathDisplay,
  hasRawScraperLoopErrorLogging,
  hasRawScraperUrlOrQueryLogging,
  hasRawSchedulerJobContentLogging,
  hasRawSchedulerScoringPrivacyLeak,
  hasRawSchedulerScraperErrorDetails,
  hasRawScoringCacheJobHashLogging,
  hasRawSensitiveCommandErrorDetails,
  hasRawSlackWebhookValidationErrorReturn,
  hasRawSourceCheckResultError,
  hasRawTelegramBotTokenRequestError,
  hasRawUrlErrorDisplay,
  hasRawUrlLogging,
  hasRawUserDataPrivacyLogging,
  hasRawUtilityCommandErrorDetails,
  hasRawWebhookTokenRequestError,
  hasRendererCredentialSecretRead,
  hasResidualCorePrivacyLeak,
  hasReusableBookmarkletImportToken,
  hasSecretBearingDebugDerive,
  hasStaleFeedbackWebhookSanitizer,
  hasUnauthenticatedBookmarkletImports,
  hasUnsafeErrorReportStorageParsing,
  hasUnsanitizedFeedbackFileSave,
  hasUnsanitizedFrontendErrorReportStorage,
  hasUnsanitizedStructuredDebugLogEvents,
  hasUnboundedExternalResponseBodyRead,
  hasRawFeedbackOpenErrors,
} from "../harness/checks/privacy-logging.mjs";
function writeFixtureFile(root,path,content="") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}
function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-privacy-logging-"));
  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
test("privacy logging collector returns repo-bloat violation messages", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/commands/jobs.rs",
      'tracing::info!("search query: {}", query);',
    );
    writeFixtureFile(root, "src-tauri/src/commands/config.rs", "");
    assert.deepEqual(collectPrivacyLoggingViolations(root, "src-tauri/src/commands/jobs.rs"), [
      "replace raw private query logging: src-tauri/src/commands/jobs.rs",
    ]);
    assert.deepEqual(collectPrivacyLoggingViolations(root, "src-tauri/src/commands/config.rs"), []);
  });
});
test("privacy logging rejects raw automation dropdown selected values", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-assistance/src/automation/browser/page.rs",
      [
        'tracing::debug!("Selected option \'{}\' in dropdown \'{}\'", value, selector);',
        "",
      ].join("\n"),
    );
    assert.equal(
      hasRawAutomationDropdownValueLogging(
        root,
        "crates/jobsentinel-assistance/src/automation/browser/page.rs",
      ),
      true,
    );
    assert.equal(
      hasRawAutomationDropdownValueLogging(root, "crates/jobsentinel-assistance/src/automation/form_filler.rs"),
      false,
    );
  });
});
test("privacy logging rejects raw automation question and form data", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-assistance/src/automation/form_filler.rs",
      [
        'tracing::debug!("screening question \'{}\'", question_text);',
        'tracing::debug!("Matched pattern \'{}\' for question \'{}\'", answer.question_pattern, question);',
        'format!("screening:{}", question_text);',
        "",
      ].join("\n"),
    );
    writeFixtureFile(root, "src/test-support/mocks/handlers.ts", "`screening:${answer.questionPattern}`");
    assert.equal(
      hasRawAutomationQuestionLogging(root, "crates/jobsentinel-assistance/src/automation/form_filler.rs"),
      true,
    );
    assert.equal(
      hasRawAutomationFormResultData(root, "crates/jobsentinel-assistance/src/automation/form_filler.rs"),
      true,
    );
    assert.equal(hasRawAutomationFormResultData(root, "src/test-support/mocks/handlers.ts"), true);
    assert.equal(
      hasRawAutomationQuestionLogging(root, "crates/jobsentinel-assistance/src/automation/browser/page.rs"),
      false,
    );
  });
});
test("privacy logging rejects raw screening-answer command logs", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/commands/automation.rs",
      [
        'tracing::info!("Command: find {}", question_text);',
        'tracing::info!(answer_filled, "Command: record_answer_usage");',
        'tracing::info!(modified_to = ?modified_to, "Command: record_answer_usage");',
        'tracing::info!(pattern = %pattern, "Command: get_answer_statistics");',
        "",
      ].join("\n"),
    );
    assert.equal(
      hasRawScreeningAnswerCommandLogging(root, "src-tauri/src/commands/automation.rs"),
      true,
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/automation.rs",
      [
        'tracing::info!(question_chars = question.chars().count(), "Command: get_suggested_answers");',
        'tracing::info!(question_pattern_chars = question_pattern.chars().count(), "Command: upsert_screening_answer");',
        'tracing::info!(has_pattern = pattern.is_some(), pattern_chars = pattern.as_ref().map_or(0, |pattern| pattern.chars().count()), "Command: clear_answer_history");',
        "",
      ].join("\n"),
    );
    assert.equal(
      hasRawScreeningAnswerCommandLogging(root, "src-tauri/src/commands/automation.rs"),
      false,
    );
  });
});
test("privacy logging rejects raw automation browser errors and notification titles", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-assistance/src/automation/browser/manager.rs",
      'format!("Failed to build browser config: {}", e);',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/notify/mod.rs",
      "tracing::info!(notification.job.title);",
    );
    assert.equal(
      hasRawAutomationBrowserErrors(root, "crates/jobsentinel-assistance/src/automation/browser/manager.rs"),
      true,
    );
    assert.equal(
      hasRawNotificationJobTitleLogging(root, "crates/jobsentinel-application/src/notify/mod.rs"),
      true,
    );
    assert.equal(
      hasRawAutomationBrowserErrors(root, "crates/jobsentinel-assistance/src/automation/form_filler.rs"),
      false,
    );
  });
});
test("privacy logging rejects desktop notification passthrough payloads", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/dashboard/notifications.ts",
      [
        "export async function notify(title: string, body: string): Promise<void> {",
        "  sendNotification({ title, body });",
        "}",
        "sendNotification({",
        '  title: `Reminder: ${jobTitle} at ${company}`,',
        '  body: `${title} at ${company} - ${Math.round(score * 100)}% match`,',
        "});",
        "",
      ].join("\n"),
    );
    assert.equal(
      hasFrontendDesktopNotificationPassthrough(root, "src/features/dashboard/notifications.ts"),
      true,
    );
    assert.deepEqual(collectPrivacyLoggingViolations(root, "src/features/dashboard/notifications.ts"), [
      "keep desktop notification payloads privacy-preserving: src/features/dashboard/notifications.ts",
    ]);
  });
});
test("privacy logging rejects raw ATS note and reminder timeline event data", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-storage/src/application_tracking/tracker.rs",
      'serde_json::json!({"notes": notes})',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-storage/src/application_tracking/reminders.rs",
      'serde_json::json!({"message": message})',
    );
    assert.equal(
      hasRawAtsTimelinePrivateEventData(root, "crates/jobsentinel-storage/src/application_tracking/tracker.rs"),
      true,
    );
    assert.equal(
      hasRawAtsTimelinePrivateEventData(root, "crates/jobsentinel-storage/src/application_tracking/reminders.rs"),
      true,
    );
    assert.equal(hasRawAtsTimelinePrivateEventData(root, "crates/jobsentinel-storage/src/application_tracking/types.rs"), false);
  });
});
test("privacy logging rejects raw frontend error forwarding", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/shared/errorReporting/errorReporter.ts",
      [
        "window.onerror = () => {",
        "  return false;",
        "};",
        "const originalConsoleError = console.error;",
        "console.error = (...args) => originalConsoleError.apply(console, args);",
        "",
      ].join("\n"),
    );
    assert.equal(hasRawFrontendErrorReporterForwarding(root, "src/shared/errorReporting/errorReporter.ts"), true);
    assert.equal(hasRawFrontendErrorReporterForwarding(root, "src/shared/errorReporting/logger.ts"), false);
  });
});
test("privacy logging rejects unsafe frontend error report storage", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/shared/errorReporting/errorReporter.ts",
      [
        "class ErrorReporter {",
        "  save(report) {",
        "    this.errors.unshift(report);",
        "    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.errors));",
        "  }",
        "}",
        "const parsed = JSON.parse(stored).map(Boolean);",
        'const exportPayload = { app_version: "1.2.3" };',
        "",
      ].join("\n"),
    );
    assert.equal(
      hasUnsanitizedFrontendErrorReportStorage(root, "src/shared/errorReporting/errorReporter.ts"),
      true,
    );
    assert.equal(hasUnsafeErrorReportStorageParsing(root, "src/shared/errorReporting/errorReporter.ts"), true);
    assert.equal(
      hasHardcodedFrontendErrorExportVersion(root, "src/shared/errorReporting/errorReporter.ts"),
      true,
    );
    assert.equal(hasUnsafeErrorReportStorageParsing(root, "src/shared/errorReporting/logger.ts"), false);
  });
});
test("privacy logging rejects raw frontend error report export", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/shared/errorReporting/errorReporter.ts",
      [
        "const TOKEN_PATTERN = /token(?:\\s+|=)/;",
        "const WEBHOOK_PATTERN = /https:\\/\\/(?:discord(?:app)?\\.com\\/api\\/webhooks|outlook\\.office(?:365)?\\.com\\/webhook)/;",
        "const SENSITIVE_LABELED_TEXT_PATTERNS = [/salary/];",
        "function sanitizeStoredReport(report) { return report; }",
        "function isErrorReport(report) { return Boolean(report); }",
        "function parseStoredErrorReports(stored) { return []; }",
        "class ErrorReporter {",
        "  export() {",
        "    return JSON.stringify({ errors: this.errors });",
        "  }",
        "}",
        "",
      ].join("\n"),
    );
    assert.equal(
      hasUnsanitizedFrontendErrorReportStorage(root, "src/shared/errorReporting/errorReporter.ts"),
      true,
    );
  });
});
test("privacy logging rejects raw frontend error helper output", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/errorSupport.ts",
      [
        "function getUserMessage(error) {",
        "  return error.message;",
        "}",
        "console.error('Error:', error);",
        "",
      ].join("\n"),
    );
    assert.equal(
      hasRawFrontendErrorHelperDebugLogging(root, "src/errorSupport.ts"),
      true,
    );
    assert.equal(
      hasRawFrontendErrorHelperUserMessage(root, "src/errorSupport.ts"),
      true,
    );
    assert.equal(
      hasRawFrontendErrorHelperDebugLogging(root, "src/shared/errorReporting/errorReporter.ts"),
      false,
    );
  });
});
test("privacy logging rejects raw shared and direct frontend error logging", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/shared/errorReporting/logger.ts",
      [
        "export function getErrorMessage(error) {",
        "  return error.message;",
        "}",
        "/** next helper */",
        "",
      ].join("\n"),
    );
    writeFixtureFile(root, "src/app/errors/ErrorBoundary.tsx", "console.error(error);");
    assert.equal(hasRawFrontendSharedErrorLogging(root, "src/shared/errorReporting/logger.ts"), true);
    assert.equal(
      hasRawFrontendDirectErrorLogging(root, "src/app/errors/ErrorBoundary.tsx"),
      true,
    );
    assert.equal(hasRawFrontendDirectErrorLogging(root, "src/shared/errorReporting/logger.ts"), false);
  });
});
test("privacy logging rejects raw frontend toast support details", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/shared/tauri/commandClient.ts",
      [
        "const fullMessage = options?.showTechnical && import.meta.env.DEV && enhancedError.message",
        '  ? `${message || "An error occurred"}\\n\\nTechnical: ${enhancedError.message}`',
        "const enhancedError = Object.assign(error instanceof Error ? error : new Error(String(error)), {",
        "  invokeArgs: args,",
        "});",
        "  : message;",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/shared/errorReporting/logger.ts",
      "const fullMessage = enhancedError.message;",
    );
    assert.equal(
      hasRawFrontendToastSupportDetails(root, "src/shared/tauri/commandClient.ts"),
      true,
    );
    assert.equal(hasRawFrontendToastSupportDetails(root, "src/shared/errorReporting/logger.ts"), false);
    assert.deepEqual(collectPrivacyLoggingViolations(root, "src/shared/tauri/commandClient.ts"), [
      "sanitize frontend toast support details: src/shared/tauri/commandClient.ts",
    ]);
  });
});
test("privacy logging rejects raw private query fields", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/commands/jobs.rs",
      'tracing::debug!("search query: {}", query);',
    );
    assert.equal(hasRawPrivateQueryLogging(root, "src-tauri/src/commands/jobs.rs"), true);
    assert.equal(hasRawPrivateQueryLogging(root, "crates/jobsentinel-storage/src/lib.rs"), false);
  });
});
test("privacy logging rejects raw user-data and scheduler logging", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/commands/user_data.rs",
      'tracing::info!("Creating saved search: {}", name);',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/scheduler/workers/persistence.rs",
      "let job_title = job.title.clone();",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/scheduler/workers/scrapers.rs",
      "fail_run(db, scraper_run_id, &e.to_string()).await;",
    );
    assert.equal(hasRawUserDataPrivacyLogging(root, "src-tauri/src/commands/user_data.rs"), true);
    assert.equal(
      hasRawSchedulerJobContentLogging(
        root,
        "crates/jobsentinel-application/src/scheduler/workers/persistence.rs",
      ),
      true,
    );
    assert.equal(
      hasRawSchedulerScraperErrorDetails(
        root,
        "crates/jobsentinel-application/src/scheduler/workers/scrapers.rs",
      ),
      true,
    );
    assert.equal(hasRawSchedulerScraperErrorDetails(root, "src-tauri/src/commands/jobs.rs"), false);
  });
});
test("privacy logging rejects raw import and bookmarklet details", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/commands/import.rs",
      'format!("Invalid URL: {}", e);',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-assistance/src/bookmarklet/server.rs",
      [
        'tracing::info!(title = %title, company = %company, "imported");',
        'format!(r#"{{"error":"{}"}}"#, e);',
        "if body_has_valid_bookmarklet_token(&body, auth_token) { save_job(); }",
        'if request.starts_with("POST /api/bookmarklet/import") {',
        "  handle_import_request(&request, database).await",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/settings/sources/browser-import/BrowserImportSection.tsx",
      'fetch("/api/bookmarklet/import", { method: "POST" });',
    );
    assert.equal(
      hasRawImportBookmarkletCommandErrorDetails(root, "src-tauri/src/commands/import.rs"),
      true,
    );
    assert.equal(
      hasRawBookmarkletImportLogging(root, "crates/jobsentinel-assistance/src/bookmarklet/server.rs"),
      true,
    );
    assert.equal(
      hasManualBookmarkletJsonErrorResponses(root, "crates/jobsentinel-assistance/src/bookmarklet/server.rs"),
      true,
    );
    assert.equal(
      hasUnauthenticatedBookmarkletImports(root, "crates/jobsentinel-assistance/src/bookmarklet/server.rs"),
      true,
    );
    assert.equal(
      hasReusableBookmarkletImportToken(root, "crates/jobsentinel-assistance/src/bookmarklet/server.rs"),
      true,
    );
    assert.equal(
      hasBookmarkletCodeWithoutTokenHeader(root, "src/features/settings/sources/browser-import/BrowserImportSection.tsx"),
      true,
    );
    assert.equal(hasRawBookmarkletImportLogging(root, "src-tauri/src/commands/import.rs"), false);
  });
});
test("privacy logging rejects raw scheduler scoring and residual core leaks", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/scoring/cache.rs",
      "tracing::debug!(job_hash = %job_hash);",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/scheduler/workers/scoring.rs",
      "tracing::warn!(error = %e, job_hash = %job.hash);",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/config/io.rs",
      'format!("Invalid API key: {}", e);',
    );
    assert.equal(
      hasRawScoringCacheJobHashLogging(root, "crates/jobsentinel-application/src/scoring/cache.rs"),
      true,
    );
    assert.equal(
      hasRawSchedulerScoringPrivacyLeak(
        root,
        "crates/jobsentinel-application/src/scheduler/workers/scoring.rs",
      ),
      true,
    );
    assert.equal(hasResidualCorePrivacyLeak(root, "crates/jobsentinel-application/src/config/io.rs"), true);
    assert.equal(hasResidualCorePrivacyLeak(root, "src-tauri/src/commands/import.rs"), false);
  });
});
test("privacy logging rejects raw scraper URL and query output", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-network/src/external_request.rs",
      'tracing::debug!("Fetching API for query: {}", query);',
    );
    assert.equal(
      hasRawScraperUrlOrQueryLogging(root, "crates/jobsentinel-network/src/external_request.rs"),
      true,
    );
    assert.equal(
      hasRawScraperUrlOrQueryLogging(root, "crates/jobsentinel-sources/src/scrapers/mod.rs"),
      false,
    );
  });
});
test("privacy logging rejects raw scraper loop errors outside tests", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-sources/src/scrapers/greenhouse.rs",
      [
        'tracing::warn!("Failed to scrape {}: {}", company.name, e);',
        "#[cfg(test)]",
        "mod tests {",
        '  tracing::warn!("Failed to scrape {}: {}", company.name, e);',
        "}",
      ].join("\n"),
    );
    assert.equal(
      hasRawScraperLoopErrorLogging(root, "crates/jobsentinel-sources/src/scrapers/greenhouse.rs"),
      true,
    );
    assert.equal(hasRawScraperLoopErrorLogging(root, "crates/jobsentinel-sources/src/scrapers/dice.rs"), false);
  });
});
test("privacy logging rejects unbounded external response body reads", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-sources/src/scrapers/dice.rs",
      "let body = response.text().await?;",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-network/src/body.rs",
      "let body = response.text().await?;",
    );
    assert.equal(
      hasUnboundedExternalResponseBodyRead(root, "crates/jobsentinel-sources/src/scrapers/dice.rs"),
      true,
    );
    assert.equal(
      hasUnboundedExternalResponseBodyRead(root, "crates/jobsentinel-network/src/body.rs"),
      false,
    );
  });
});
test("privacy logging rejects raw local path logging", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/commands/resume.rs",
      'tracing::error!("resume path: {}", path.display());',
    );
    assert.equal(hasRawLocalPathLogging(root, "src-tauri/src/commands/resume.rs"), true);
    assert.equal(hasRawLocalPathLogging(root, "src-tauri/src/commands/jobs.rs"), false);
  });
});
test("privacy logging rejects raw backup path errors", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-storage/src/connection/backups.rs",
      'return Err(format!("Backup file not found: {}", backup_path.display()));',
    );
    assert.equal(
      hasRawBackupPathError(root, "crates/jobsentinel-storage/src/connection/backups.rs"),
      true,
    );
    assert.equal(hasRawBackupPathError(root, "crates/jobsentinel-storage/src/connection.rs"), false);
  });
});
test("privacy logging rejects ML local path exposure", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src-tauri/src/commands/ml.rs", "pub model_path: PathBuf,\n");
    writeFixtureFile(root, "docs/developer/LOCAL_SEMANTIC_MATCHING.md", "model_path: string\n");
    assert.equal(hasMlRawLocalPathExposure(root, "src-tauri/src/commands/ml.rs"), true);
    assert.equal(hasMlRawLocalPathExposure(root, "src-tauri/src/commands/jobs.rs"), false);
    assert.equal(hasMlRawLocalPathDoc(root, "docs/developer/LOCAL_SEMANTIC_MATCHING.md"), true);
    assert.equal(hasMlRawLocalPathDoc(root, "docs/README.md"), false);
  });
});
test("privacy logging rejects raw ML error display", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-local-ai/src/lib.rs",
      '#[error("model loading failed: {0}")]\nstruct MlError;',
    );
    assert.equal(hasMlRawErrorDisplay(root, "crates/jobsentinel-local-ai/src/lib.rs"), true);
    assert.equal(hasMlRawErrorDisplay(root, "crates/jobsentinel-local-ai/src/model.rs"), false);
  });
});
test("privacy logging rejects sensitive Debug derives", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-sources/src/scrapers/jobswithgpt.rs",
      "#[derive(Debug)]\npub struct JobQuery;",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-sources/src/scrapers/linkedin.rs",
      "#[derive(Clone, Debug)]\npub struct LinkedInScraper;",
    );
    assert.equal(
      hasRawJobsWithGptDebug(root, "crates/jobsentinel-sources/src/scrapers/jobswithgpt.rs"),
      true,
    );
    assert.equal(hasRawLinkedInDebug(root, "crates/jobsentinel-sources/src/scrapers/linkedin.rs"), true);
    assert.equal(hasRawJobsWithGptDebug(root, "crates/jobsentinel-sources/src/scrapers/dice.rs"), false);
    assert.equal(hasRawLinkedInDebug(root, "crates/jobsentinel-sources/src/scrapers/dice.rs"), false);
  });
});
test("privacy logging rejects LinkedIn cookie return", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/commands/linkedin_auth.rs",
      "tx.send(cookie_result.map(|(cookie, expires)| cookie))?;",
    );
    assert.equal(
      hasLinkedInLoginCookieReturn(root, "src-tauri/src/commands/linkedin_auth.rs"),
      true,
    );
    assert.equal(
      hasLinkedInLoginCookieReturn(root, "src-tauri/src/commands/config.rs"),
      false,
    );
  });
});
