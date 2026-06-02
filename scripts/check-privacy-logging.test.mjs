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
} from "./harness/checks/privacy-logging.mjs";

function writeFixtureFile(root, path, content = "") {
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
      "src-tauri/src/core/automation/browser/page.rs",
      [
        'tracing::debug!("Selected option \'{}\' in dropdown \'{}\'", value, selector);',
        "",
      ].join("\n"),
    );

    assert.equal(
      hasRawAutomationDropdownValueLogging(
        root,
        "src-tauri/src/core/automation/browser/page.rs",
      ),
      true,
    );
    assert.equal(
      hasRawAutomationDropdownValueLogging(root, "src-tauri/src/core/automation/form_filler.rs"),
      false,
    );
  });
});

test("privacy logging rejects raw automation question and form data", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/automation/form_filler.rs",
      [
        'tracing::debug!("screening question \'{}\'", question_text);',
        'tracing::debug!("Matched pattern \'{}\' for question \'{}\'", answer.question_pattern, question);',
        'format!("screening:{}", question_text);',
        "",
      ].join("\n"),
    );
    writeFixtureFile(root, "src/mocks/handlers.ts", "`screening:${answer.questionPattern}`");

    assert.equal(
      hasRawAutomationQuestionLogging(root, "src-tauri/src/core/automation/form_filler.rs"),
      true,
    );
    assert.equal(
      hasRawAutomationFormResultData(root, "src-tauri/src/core/automation/form_filler.rs"),
      true,
    );
    assert.equal(hasRawAutomationFormResultData(root, "src/mocks/handlers.ts"), true);
    assert.equal(
      hasRawAutomationQuestionLogging(root, "src-tauri/src/core/automation/browser/page.rs"),
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
      "src-tauri/src/core/automation/browser/manager.rs",
      'format!("Failed to build browser config: {}", e);',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/notify/mod.rs",
      "tracing::info!(notification.job.title);",
    );

    assert.equal(
      hasRawAutomationBrowserErrors(root, "src-tauri/src/core/automation/browser/manager.rs"),
      true,
    );
    assert.equal(
      hasRawNotificationJobTitleLogging(root, "src-tauri/src/core/notify/mod.rs"),
      true,
    );
    assert.equal(
      hasRawAutomationBrowserErrors(root, "src-tauri/src/core/automation/form_filler.rs"),
      false,
    );
  });
});

test("privacy logging rejects desktop notification passthrough payloads", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/utils/notifications.ts",
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
      hasFrontendDesktopNotificationPassthrough(root, "src/utils/notifications.ts"),
      true,
    );
    assert.deepEqual(collectPrivacyLoggingViolations(root, "src/utils/notifications.ts"), [
      "keep desktop notification payloads privacy-preserving: src/utils/notifications.ts",
    ]);
  });
});

test("privacy logging rejects raw ATS note and reminder timeline event data", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/ats/tracker.rs",
      'serde_json::json!({"notes": notes})',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/ats/reminders.rs",
      'serde_json::json!({"message": message})',
    );

    assert.equal(
      hasRawAtsTimelinePrivateEventData(root, "src-tauri/src/core/ats/tracker.rs"),
      true,
    );
    assert.equal(
      hasRawAtsTimelinePrivateEventData(root, "src-tauri/src/core/ats/reminders.rs"),
      true,
    );
    assert.equal(hasRawAtsTimelinePrivateEventData(root, "src-tauri/src/core/ats/types.rs"), false);
  });
});

test("privacy logging rejects raw frontend error forwarding", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/utils/errorReporting.ts",
      [
        "window.onerror = () => {",
        "  return false;",
        "};",
        "const originalConsoleError = console.error;",
        "console.error = (...args) => originalConsoleError.apply(console, args);",
        "",
      ].join("\n"),
    );

    assert.equal(hasRawFrontendErrorReporterForwarding(root, "src/utils/errorReporting.ts"), true);
    assert.equal(hasRawFrontendErrorReporterForwarding(root, "src/utils/errorUtils.ts"), false);
  });
});

test("privacy logging rejects unsafe frontend error report storage", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/utils/errorReporting.ts",
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
      hasUnsanitizedFrontendErrorReportStorage(root, "src/utils/errorReporting.ts"),
      true,
    );
    assert.equal(hasUnsafeErrorReportStorageParsing(root, "src/utils/errorReporting.ts"), true);
    assert.equal(
      hasHardcodedFrontendErrorExportVersion(root, "src/utils/errorReporting.ts"),
      true,
    );
    assert.equal(hasUnsafeErrorReportStorageParsing(root, "src/utils/errorUtils.ts"), false);
  });
});

test("privacy logging rejects raw frontend error helper output", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/utils/errorHelpers.ts",
      [
        "function getUserMessage(error) {",
        "  return error.message;",
        "}",
        "console.error('Error:', error);",
        "",
      ].join("\n"),
    );

    assert.equal(
      hasRawFrontendErrorHelperDebugLogging(root, "src/utils/errorHelpers.ts"),
      true,
    );
    assert.equal(
      hasRawFrontendErrorHelperUserMessage(root, "src/utils/errorHelpers.ts"),
      true,
    );
    assert.equal(
      hasRawFrontendErrorHelperDebugLogging(root, "src/utils/errorReporting.ts"),
      false,
    );
  });
});

test("privacy logging rejects raw shared and direct frontend error logging", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/utils/errorUtils.ts",
      [
        "export function getErrorMessage(error) {",
        "  return error.message;",
        "}",
        "/** next helper */",
        "",
      ].join("\n"),
    );
    writeFixtureFile(root, "src/components/ErrorBoundary.tsx", "console.error(error);");

    assert.equal(hasRawFrontendSharedErrorLogging(root, "src/utils/errorUtils.ts"), true);
    assert.equal(
      hasRawFrontendDirectErrorLogging(root, "src/components/ErrorBoundary.tsx"),
      true,
    );
    assert.equal(hasRawFrontendDirectErrorLogging(root, "src/utils/errorUtils.ts"), false);
  });
});

test("privacy logging rejects raw frontend toast support details", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/utils/api.ts",
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
      "src/utils/errorUtils.ts",
      "const fullMessage = enhancedError.message;",
    );

    assert.equal(hasRawFrontendToastSupportDetails(root, "src/utils/api.ts"), true);
    assert.equal(hasRawFrontendToastSupportDetails(root, "src/utils/errorUtils.ts"), false);
    assert.deepEqual(collectPrivacyLoggingViolations(root, "src/utils/api.ts"), [
      "sanitize frontend toast support details: src/utils/api.ts",
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
    assert.equal(hasRawPrivateQueryLogging(root, "src-tauri/src/core/db/mod.rs"), false);
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
      "src-tauri/src/core/scheduler/workers/persistence.rs",
      "let job_title = job.title.clone();",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scheduler/workers/scrapers.rs",
      "fail_run(db, scraper_run_id, &e.to_string()).await;",
    );

    assert.equal(hasRawUserDataPrivacyLogging(root, "src-tauri/src/commands/user_data.rs"), true);
    assert.equal(
      hasRawSchedulerJobContentLogging(
        root,
        "src-tauri/src/core/scheduler/workers/persistence.rs",
      ),
      true,
    );
    assert.equal(
      hasRawSchedulerScraperErrorDetails(
        root,
        "src-tauri/src/core/scheduler/workers/scrapers.rs",
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
      "src-tauri/src/core/bookmarklet/server.rs",
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
      "src/components/BookmarkletGenerator.tsx",
      'fetch("/api/bookmarklet/import", { method: "POST" });',
    );

    assert.equal(
      hasRawImportBookmarkletCommandErrorDetails(root, "src-tauri/src/commands/import.rs"),
      true,
    );
    assert.equal(
      hasRawBookmarkletImportLogging(root, "src-tauri/src/core/bookmarklet/server.rs"),
      true,
    );
    assert.equal(
      hasManualBookmarkletJsonErrorResponses(root, "src-tauri/src/core/bookmarklet/server.rs"),
      true,
    );
    assert.equal(
      hasUnauthenticatedBookmarkletImports(root, "src-tauri/src/core/bookmarklet/server.rs"),
      true,
    );
    assert.equal(
      hasReusableBookmarkletImportToken(root, "src-tauri/src/core/bookmarklet/server.rs"),
      true,
    );
    assert.equal(
      hasBookmarkletCodeWithoutTokenHeader(root, "src/components/BookmarkletGenerator.tsx"),
      true,
    );
    assert.equal(hasRawBookmarkletImportLogging(root, "src-tauri/src/commands/import.rs"), false);
  });
});

test("privacy logging rejects raw scheduler scoring and residual core leaks", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/scoring/cache.rs",
      "tracing::debug!(job_hash = %job_hash);",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scheduler/workers/scoring.rs",
      "tracing::warn!(error = %e, job_hash = %job.hash);",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/config/io.rs",
      'format!("Invalid API key: {}", e);',
    );

    assert.equal(
      hasRawScoringCacheJobHashLogging(root, "src-tauri/src/core/scoring/cache.rs"),
      true,
    );
    assert.equal(
      hasRawSchedulerScoringPrivacyLeak(
        root,
        "src-tauri/src/core/scheduler/workers/scoring.rs",
      ),
      true,
    );
    assert.equal(hasResidualCorePrivacyLeak(root, "src-tauri/src/core/config/io.rs"), true);
    assert.equal(hasResidualCorePrivacyLeak(root, "src-tauri/src/commands/import.rs"), false);
  });
});

test("privacy logging rejects raw scraper URL and query output", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/http_client.rs",
      'tracing::debug!("Fetching API for query: {}", query);',
    );

    assert.equal(
      hasRawScraperUrlOrQueryLogging(root, "src-tauri/src/core/scrapers/http_client.rs"),
      true,
    );
    assert.equal(
      hasRawScraperUrlOrQueryLogging(root, "src-tauri/src/core/scrapers/mod.rs"),
      false,
    );
  });
});

test("privacy logging rejects raw scraper loop errors outside tests", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/greenhouse.rs",
      [
        'tracing::warn!("Failed to scrape {}: {}", company.name, e);',
        "#[cfg(test)]",
        "mod tests {",
        '  tracing::warn!("Failed to scrape {}: {}", company.name, e);',
        "}",
      ].join("\n"),
    );

    assert.equal(
      hasRawScraperLoopErrorLogging(root, "src-tauri/src/core/scrapers/greenhouse.rs"),
      true,
    );
    assert.equal(hasRawScraperLoopErrorLogging(root, "src-tauri/src/core/scrapers/dice.rs"), false);
  });
});

test("privacy logging rejects unbounded external response body reads", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/dice.rs",
      "let body = response.text().await?;",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/http_body.rs",
      "let body = response.text().await?;",
    );

    assert.equal(
      hasUnboundedExternalResponseBodyRead(root, "src-tauri/src/core/scrapers/dice.rs"),
      true,
    );
    assert.equal(
      hasUnboundedExternalResponseBodyRead(root, "src-tauri/src/core/http_body.rs"),
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
      "src-tauri/src/core/db/integrity/backups.rs",
      'return Err(format!("Backup file not found: {}", backup_path.display()));',
    );

    assert.equal(
      hasRawBackupPathError(root, "src-tauri/src/core/db/integrity/backups.rs"),
      true,
    );
    assert.equal(hasRawBackupPathError(root, "src-tauri/src/core/db/connection.rs"), false);
  });
});

test("privacy logging rejects ML local path exposure", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src-tauri/src/commands/ml.rs", "pub model_path: PathBuf,\n");
    writeFixtureFile(root, "docs/ML_FEATURE.md", "model_path: string\n");

    assert.equal(hasMlRawLocalPathExposure(root, "src-tauri/src/commands/ml.rs"), true);
    assert.equal(hasMlRawLocalPathExposure(root, "src-tauri/src/commands/jobs.rs"), false);
    assert.equal(hasMlRawLocalPathDoc(root, "docs/ML_FEATURE.md"), true);
    assert.equal(hasMlRawLocalPathDoc(root, "docs/README.md"), false);
  });
});

test("privacy logging rejects raw ML error display", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/ml/mod.rs",
      '#[error("model loading failed: {0}")]\nstruct MlError;',
    );

    assert.equal(hasMlRawErrorDisplay(root, "src-tauri/src/core/ml/mod.rs"), true);
    assert.equal(hasMlRawErrorDisplay(root, "src-tauri/src/core/ml/model.rs"), false);
  });
});

test("privacy logging rejects sensitive Debug derives", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/jobswithgpt.rs",
      "#[derive(Debug)]\npub struct JobQuery;",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/linkedin.rs",
      "#[derive(Clone, Debug)]\npub struct LinkedInScraper;",
    );

    assert.equal(
      hasRawJobsWithGptDebug(root, "src-tauri/src/core/scrapers/jobswithgpt.rs"),
      true,
    );
    assert.equal(hasRawLinkedInDebug(root, "src-tauri/src/core/scrapers/linkedin.rs"), true);
    assert.equal(hasRawJobsWithGptDebug(root, "src-tauri/src/core/scrapers/dice.rs"), false);
    assert.equal(hasRawLinkedInDebug(root, "src-tauri/src/core/scrapers/dice.rs"), false);
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

test("privacy logging rejects raw email and webhook errors", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/commands/config.rs",
      [
        'format!("Failed to send test email: {}", e);',
        'tracing::error!("Webhook validation failed: {}", e);',
      ].join("\n"),
    );

    assert.equal(hasRawEmailTestErrorReturn(root, "src-tauri/src/commands/config.rs"), true);
    assert.equal(
      hasRawSlackWebhookValidationErrorReturn(root, "src-tauri/src/commands/config.rs"),
      true,
    );
    assert.equal(hasRawEmailTestErrorReturn(root, "src-tauri/src/commands/jobs.rs"), false);
  });
});

test("privacy logging rejects raw match reasons in external alerts", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/notify/slack.rs",
      "fn build(notification: &Notification) { notification.score.reasons.join(\"\\n\"); }",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/notify/email.rs",
      "fn format(score: &JobScore) { score.reasons.iter(); }",
    );

    assert.equal(hasExternalAlertRawScoreReasons(root, "src-tauri/src/core/notify/slack.rs"), true);
    assert.equal(hasExternalAlertRawScoreReasons(root, "src-tauri/src/core/notify/email.rs"), true);
    assert.equal(hasExternalAlertRawScoreReasons(root, "src-tauri/src/core/notify/mod.rs"), false);
  });
});

test("privacy logging rejects secret-bearing Debug derives", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/config/mod.rs",
      "#[derive(Debug)]\npub struct Config {\n  api_key: String,\n}",
    );

    assert.equal(hasSecretBearingDebugDerive(root, "src-tauri/src/core/config/mod.rs"), true);
    assert.equal(hasSecretBearingDebugDerive(root, "src/pages/Settings.tsx"), false);
  });
});

test("privacy logging rejects credential key echo and storage errors", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/credentials/mod.rs",
      [
        'format!("Invalid credential key: {}", key);',
        'format!("Failed to store credential: {e}");',
      ].join("\n"),
    );

    assert.equal(
      hasCredentialKeyInputEcho(root, "src-tauri/src/core/credentials/mod.rs"),
      true,
    );
    assert.equal(
      hasRawCredentialStorageErrors(root, "src-tauri/src/core/credentials/mod.rs"),
      true,
    );
    assert.equal(hasCredentialKeyInputEcho(root, "src-tauri/src/core/config/mod.rs"), false);
  });
});

test("privacy logging rejects missing credential storage guardrails", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src-tauri/src/core/credentials/mod.rs", "pub enum CredentialKey {}\n");

    assert.equal(
      hasMissingLinkedInCredentialStorageDisable(root, "src-tauri/src/core/credentials/mod.rs"),
      true,
    );
    assert.equal(
      hasMissingWebhookCredentialStorageValidation(root, "src-tauri/src/core/credentials/mod.rs"),
      true,
    );
    assert.equal(
      hasMissingLinkedInCredentialStorageDisable(root, "src-tauri/src/core/config/mod.rs"),
      false,
    );
  });
});

test("privacy logging rejects renderer credential reads and incomplete export redaction", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/pages/Settings.tsx", "await retrieveCredential('slack_webhook');");
    writeFixtureFile(root, "src/utils/export.ts", "function scrubSensitiveFields() {}\n");

    assert.equal(hasRendererCredentialSecretRead(root, "src/pages/Settings.tsx"), true);
    assert.equal(hasRendererCredentialSecretRead(root, "src/pages/Dashboard.tsx"), false);
    assert.equal(hasIncompleteConfigExportRedaction(root, "src/utils/export.ts"), true);
    assert.equal(hasIncompleteConfigExportRedaction(root, "src/utils/import.ts"), false);
  });
});

test("privacy logging rejects unsanitized feedback report handling", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/commands/feedback/sanitizer.rs",
      'let stale = "hooks\\.(slack|discord|teams)\\.com";',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/feedback/debug_log.rs",
      "pub fn get_debug_log() { DEBUG_LOG.lock().ok().map(|buffer| buffer.get_all()) }",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/feedback/mod.rs",
      [
        "pub fn save_feedback_file(content: String) -> Result<Option<String>, String> {",
        "  std::fs::write(&path, content);",
        "  Ok(Some(path.to_string_lossy().to_string()))",
        "}",
        'format!("Failed to reveal file: {e}");',
        "",
      ].join("\n"),
    );

    assert.equal(
      hasStaleFeedbackWebhookSanitizer(root, "src-tauri/src/commands/feedback/sanitizer.rs"),
      true,
    );
    assert.equal(
      hasIncompleteFeedbackJobSearchSanitizer(
        root,
        "src-tauri/src/commands/feedback/sanitizer.rs",
      ),
      true,
    );
    assert.equal(
      hasUnsanitizedStructuredDebugLogEvents(
        root,
        "src-tauri/src/commands/feedback/debug_log.rs",
      ),
      true,
    );
    assert.equal(
      hasUnsanitizedFeedbackFileSave(root, "src-tauri/src/commands/feedback/mod.rs"),
      true,
    );
    assert.equal(hasRawFeedbackOpenErrors(root, "src-tauri/src/commands/feedback/mod.rs"), true);
    assert.equal(hasRawFeedbackOpenErrors(root, "src-tauri/src/commands/jobs.rs"), false);
  });
});

test("privacy logging rejects raw notification request token errors", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/notify/telegram.rs",
      "client.post(&api_url).send().await?",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/notify/slack.rs",
      "client.post(&config.webhook_url).send().await?",
    );

    assert.equal(
      hasRawTelegramBotTokenRequestError(root, "src-tauri/src/core/notify/telegram.rs"),
      true,
    );
    assert.equal(
      hasRawWebhookTokenRequestError(root, "src-tauri/src/core/notify/slack.rs"),
      true,
    );
    assert.equal(
      hasRawWebhookTokenRequestError(root, "src-tauri/src/core/notify/mod.rs"),
      false,
    );
  });
});

test("privacy logging rejects notification provider and service error details", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/notify/discord.rs",
      "let error_text = read_text_with_limit(response, 1024).await?; anyhow!(error_text);",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/notify/mod.rs",
      'tracing::warn!("notification failed: {}", e);',
    );

    assert.equal(
      hasRawNotificationProviderErrorBody(root, "src-tauri/src/core/notify/discord.rs"),
      true,
    );
    assert.equal(
      hasRawNotificationServiceErrorDetails(root, "src-tauri/src/core/notify/mod.rs"),
      true,
    );
    assert.equal(
      hasRawNotificationProviderErrorBody(root, "src-tauri/src/core/notify/slack.rs"),
      false,
    );
  });
});

test("privacy logging rejects raw source health errors", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/health/smoke_tests.rs",
      ['"error": e.to_string(),', "error: Some(e.to_string()),"].join("\n"),
    );

    assert.equal(
      hasRawJobsWithGptSmokeEndpointError(root, "src-tauri/src/core/health/smoke_tests.rs"),
      true,
    );
    assert.equal(
      hasRawSourceCheckResultError(root, "src-tauri/src/core/health/smoke_tests.rs"),
      true,
    );
    assert.equal(
      hasRawSourceCheckResultError(root, "src-tauri/src/core/health/mod.rs"),
      false,
    );
  });
});

test("privacy logging rejects raw URL logs and URL error displays", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/url_utils.rs",
      'tracing::debug!("Fetching URL: {}", url);',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/error.rs",
      '#[error("HTTP request failed for {url}: {source}")]\nstruct ScraperError;',
    );

    assert.equal(hasRawUrlLogging(root, "src-tauri/src/core/scrapers/url_utils.rs"), true);
    assert.equal(hasRawUrlLogging(root, "src-tauri/src/core/scrapers/mod.rs"), false);
    assert.equal(hasRawUrlErrorDisplay(root, "src-tauri/src/core/scrapers/error.rs"), true);
    assert.equal(hasRawUrlErrorDisplay(root, "src-tauri/src/core/scrapers/mod.rs"), false);
  });
});

test("privacy logging rejects raw path, query, and config URL displays", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/error.rs",
      '#[error("database query failed: {query}")]\nstruct DbError;',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/config.rs",
      'map_err(|e| format!("Failed to load config: {}", e));',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/config/validation_error.rs",
      'format!("Got: {}", url);',
    );

    assert.equal(hasRawPathOrQueryErrorDisplay(root, "src-tauri/src/core/db/error.rs"), true);
    assert.equal(hasRawCommandSetupErrorDisplay(root, "src-tauri/src/commands/config.rs"), true);
    assert.equal(
      hasRawConfigValidationUrlDisplay(root, "src-tauri/src/core/config/validation_error.rs"),
      true,
    );
    assert.equal(hasRawCommandSetupErrorDisplay(root, "src-tauri/src/commands/jobs.rs"), false);
  });
});

test("privacy logging rejects raw resume command details", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/resume/parser.rs",
      "let shown = file_path.display();",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/resume.rs",
      [
        'tracing::info!("import_json_resume name={}", name);',
        'map_err(|e| format!("Failed to export resume: {}", e))?',
        "pub struct ResumeSummary {",
        "  file_path: String,",
        "}",
        "",
      ].join("\n"),
    );

    assert.equal(
      hasRawResumeParserPathDisplay(root, "src-tauri/src/core/resume/parser.rs"),
      true,
    );
    assert.equal(hasRawResumeNameLogging(root, "src-tauri/src/commands/resume.rs"), true);
    assert.equal(hasRawResumeCommandErrorDetails(root, "src-tauri/src/commands/resume.rs"), true);
    assert.equal(hasRawResumeCommandDtoExposure(root, "src-tauri/src/commands/resume.rs"), true);
    assert.equal(hasRawResumeCommandDtoExposure(root, "src-tauri/src/commands/jobs.rs"), false);
  });
});

test("privacy logging rejects raw backend command error details", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/commands/ats.rs",
      'map_err(|e| format!("Failed to save status: {}", e))?',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/automation.rs",
      'Err(e) => Err(format!("Failed to fill form: {}", e)),',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/ml.rs",
      'serde_json::to_value(value).map_err(|e| format!("Failed to serialize: {}", e))?',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/jobs.rs",
      'format!("Database error: {}", e);',
    );

    assert.equal(hasRawAtsCommandErrorDetails(root, "src-tauri/src/commands/ats.rs"), true);
    assert.equal(
      hasRawAutomationCommandErrorDetails(root, "src-tauri/src/commands/automation.rs"),
      true,
    );
    assert.equal(hasRawSensitiveCommandErrorDetails(root, "src-tauri/src/commands/ml.rs"), true);
    assert.equal(hasRawUtilityCommandErrorDetails(root, "src-tauri/src/commands/jobs.rs"), true);
    assert.equal(
      hasRawUtilityCommandErrorDetails(root, "src-tauri/src/commands/resume.rs"),
      false,
    );
  });
});

test("privacy logging rejects raw import URL and HTTP errors", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/import/types.rs",
      "Redirect blocked while fetching URL: {location}",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/import.rs",
      [
        "#[tracing::instrument(fields(url))]",
        "fn preview() {}",
        'format!("Failed to fetch the page: {}", e);',
      ].join("\n"),
    );

    assert.equal(
      hasRawImportRedirectDisplay(root, "src-tauri/src/core/import/types.rs"),
      true,
    );
    assert.equal(hasRawJobImportLogging(root, "src-tauri/src/commands/import.rs"), true);
    assert.equal(hasRawImportHttpErrorReturn(root, "src-tauri/src/commands/import.rs"), true);
    assert.equal(hasRawJobImportLogging(root, "src-tauri/src/commands/jobs.rs"), false);
  });
});

test("privacy logging rejects non-public IP echo", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/url_security.rs",
      "return Err(format!(\"Blocked non-public IP address '{}'\", host));",
    );

    assert.equal(hasNonPublicIpErrorEcho(root, "src-tauri/src/core/url_security.rs"), true);
    assert.equal(hasNonPublicIpErrorEcho(root, "src-tauri/src/core/import/types.rs"), false);
  });
});
