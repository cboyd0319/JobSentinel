import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  collectPrivacyLoggingViolations,
  hasExternalAlertRawScoreReasons,
  hasCredentialKeyInputEcho,
  hasHardcodedFrontendErrorExportVersion,
  hasIncompleteFeedbackJobSearchSanitizer,
  hasIncompleteConfigExportRedaction,
  hasMissingLinkedInCredentialStorageDisable,
  hasMissingWebhookCredentialStorageValidation,
  hasNonPublicIpErrorEcho,
  hasRawAutomationDropdownValueLogging,
  hasRawAutomationBrowserErrors,
  hasRawAutomationCommandErrorDetails,
  hasRawAutomationFormResultData,
  hasRawAutomationQuestionLogging,
  hasRawScreeningAnswerCommandLogging,
  hasRawAtsCommandErrorDetails,
  hasRawAtsTimelinePrivateEventData,
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
  hasRawImportHttpErrorReturn,
  hasRawImportRedirectDisplay,
  hasRawJobsWithGptSmokeEndpointError,
  hasRawJobImportLogging,
  hasRawNotificationProviderErrorBody,
  hasFrontendDesktopNotificationPassthrough,
  hasRawNotificationJobTitleLogging,
  hasRawNotificationServiceErrorDetails,
  hasRawPathOrQueryErrorDisplay,
  hasRawResumeCommandDtoExposure,
  hasRawResumeCommandErrorDetails,
  hasRawResumeNameLogging,
  hasRawResumeParserPathDisplay,
  hasRawSensitiveCommandErrorDetails,
  hasRawSlackWebhookValidationErrorReturn,
  hasRawSourceCheckResultError,
  hasRawTelegramBotTokenRequestError,
  hasRawUrlErrorDisplay,
  hasRawUrlLogging,
  hasRawUtilityCommandErrorDetails,
  hasRawWebhookTokenRequestError,
  hasRendererCredentialSecretRead,
  hasSecretBearingDebugDerive,
  hasStaleFeedbackWebhookSanitizer,
  hasUnsafeErrorReportStorageParsing,
  hasUnsanitizedFeedbackFileSave,
  hasUnsanitizedFrontendErrorReportStorage,
  hasUnsanitizedStructuredDebugLogEvents,
  hasRawFeedbackOpenErrors,
} from "../../harness/checks/privacy-logging.mjs";
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
      "src-tauri/src/ipc/jobs.rs",
      'tracing::info!("search query: {}", query);',
    );
    writeFixtureFile(root, "src-tauri/src/ipc/config.rs", "");
    assert.deepEqual(collectPrivacyLoggingViolations(root, "src-tauri/src/ipc/jobs.rs"), [
      "replace raw private query logging: src-tauri/src/ipc/jobs.rs",
    ]);
    assert.deepEqual(collectPrivacyLoggingViolations(root, "src-tauri/src/ipc/config.rs"), []);
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
    writeFixtureFile(root, "src/dev-runtime/mocks/handlers.ts", "`screening:${answer.questionPattern}`");
    assert.equal(
      hasRawAutomationQuestionLogging(root, "crates/jobsentinel-assistance/src/automation/form_filler.rs"),
      true,
    );
    assert.equal(
      hasRawAutomationFormResultData(root, "crates/jobsentinel-assistance/src/automation/form_filler.rs"),
      true,
    );
    assert.equal(hasRawAutomationFormResultData(root, "src/dev-runtime/mocks/handlers.ts"), true);
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
      "src-tauri/src/ipc/automation.rs",
      [
        'tracing::info!("Command: find {}", question_text);',
        'tracing::info!(answer_filled, "Command: record_answer_usage");',
        'tracing::info!(modified_to = ?modified_to, "Command: record_answer_usage");',
        'tracing::info!(pattern = %pattern, "Command: get_answer_statistics");',
        "",
      ].join("\n"),
    );
    assert.equal(
      hasRawScreeningAnswerCommandLogging(root, "src-tauri/src/ipc/automation.rs"),
      true,
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/automation.rs",
      [
        'tracing::info!(question_chars = question.chars().count(), "Command: get_suggested_answers");',
        'tracing::info!(question_pattern_chars = question_pattern.chars().count(), "Command: upsert_screening_answer");',
        'tracing::info!(has_pattern = pattern.is_some(), pattern_chars = pattern.as_ref().map_or(0, |pattern| pattern.chars().count()), "Command: clear_answer_history");',
        "",
      ].join("\n"),
    );
    assert.equal(
      hasRawScreeningAnswerCommandLogging(root, "src-tauri/src/ipc/automation.rs"),
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
      "src/platform/tauri/commandClient.ts",
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
      hasRawFrontendToastSupportDetails(root, "src/platform/tauri/commandClient.ts"),
      true,
    );
    assert.equal(hasRawFrontendToastSupportDetails(root, "src/shared/errorReporting/logger.ts"), false);
    assert.deepEqual(collectPrivacyLoggingViolations(root, "src/platform/tauri/commandClient.ts"), [
      "sanitize frontend toast support details: src/platform/tauri/commandClient.ts",
    ]);
  });
});
