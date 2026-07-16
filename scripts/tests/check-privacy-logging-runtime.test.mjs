import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasExternalAlertRawScoreReasons,
  hasCredentialKeyInputEcho,
  hasIncompleteFeedbackJobSearchSanitizer,
  hasIncompleteConfigExportRedaction,
  hasMissingLinkedInCredentialStorageDisable,
  hasMissingWebhookCredentialStorageValidation,
  hasNonPublicIpErrorEcho,
  hasRawAutomationCommandErrorDetails,
  hasRawAtsCommandErrorDetails,
  hasRawCommandSetupErrorDisplay,
  hasRawConfigValidationUrlDisplay,
  hasRawCredentialStorageErrors,
  hasRawEmailTestErrorReturn,
  hasRawFeedbackOpenErrors,
  hasRawImportHttpErrorReturn,
  hasRawImportRedirectDisplay,
  hasRawJobsWithGptSmokeEndpointError,
  hasRawJobImportLogging,
  hasRawNotificationProviderErrorBody,
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
  hasUnsanitizedFeedbackFileSave,
  hasUnsanitizedStructuredDebugLogEvents,
} from "../harness/checks/privacy-logging.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(
    join(tmpdir(), "jobsentinel-privacy-logging-runtime-"),
  );

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("privacy logging rejects raw email and webhook errors", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/config.rs",
      [
        'format!("Failed to send test email: {}", e);',
        'tracing::error!("Webhook validation failed: {}", e);',
      ].join("\n"),
    );

    assert.equal(
      hasRawEmailTestErrorReturn(root, "src-tauri/src/ipc/config.rs"),
      true,
    );
    assert.equal(
      hasRawSlackWebhookValidationErrorReturn(
        root,
        "src-tauri/src/ipc/config.rs",
      ),
      true,
    );
    assert.equal(
      hasRawEmailTestErrorReturn(root, "src-tauri/src/ipc/jobs.rs"),
      false,
    );
  });
});

test("privacy logging rejects raw match reasons in external alerts", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-notifications/src/slack.rs",
      'fn build(notification: &Notification) { notification.score.reasons.join("\\n"); }',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-notifications/src/email.rs",
      "fn format(score: &JobScore) { score.reasons.iter(); }",
    );

    assert.equal(
      hasExternalAlertRawScoreReasons(
        root,
        "crates/jobsentinel-notifications/src/slack.rs",
      ),
      true,
    );
    assert.equal(
      hasExternalAlertRawScoreReasons(
        root,
        "crates/jobsentinel-notifications/src/email.rs",
      ),
      true,
    );
    assert.equal(
      hasExternalAlertRawScoreReasons(root, "crates/jobsentinel-application/src/notify/mod.rs"),
      false,
    );
  });
});

test("privacy logging rejects secret-bearing Debug derives", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/config/mod.rs",
      "#[derive(Debug)]\npub struct Config {\n  api_key: String,\n}",
    );

    assert.equal(
      hasSecretBearingDebugDerive(root, "crates/jobsentinel-application/src/config/mod.rs"),
      true,
    );
    assert.equal(
      hasSecretBearingDebugDerive(
        root,
        "src/features/settings/SettingsPage.tsx",
      ),
      false,
    );
  });
});

test("privacy logging rejects credential key echo and storage errors", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-credentials/src/lib.rs",
      [
        'format!("Invalid credential key: {}", key);',
        'format!("Failed to store credential: {e}");',
      ].join("\n"),
    );

    assert.equal(
      hasCredentialKeyInputEcho(root, "crates/jobsentinel-credentials/src/lib.rs"),
      true,
    );
    assert.equal(
      hasRawCredentialStorageErrors(
        root,
        "crates/jobsentinel-credentials/src/lib.rs",
      ),
      true,
    );
    assert.equal(
      hasCredentialKeyInputEcho(root, "crates/jobsentinel-application/src/config/mod.rs"),
      false,
    );
  });
});

test("privacy logging rejects missing credential storage guardrails", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-credentials/src/lib.rs",
      "pub enum CredentialKey {}\n",
    );

    assert.equal(
      hasMissingLinkedInCredentialStorageDisable(
        root,
        "crates/jobsentinel-credentials/src/lib.rs",
      ),
      true,
    );
    assert.equal(
      hasMissingWebhookCredentialStorageValidation(
        root,
        "crates/jobsentinel-credentials/src/lib.rs",
      ),
      true,
    );
    assert.equal(
      hasMissingLinkedInCredentialStorageDisable(
        root,
        "crates/jobsentinel-application/src/config/mod.rs",
      ),
      false,
    );
  });
});

test("privacy logging rejects renderer credential reads and incomplete export redaction", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/settings/SettingsPage.tsx",
      "await retrieveCredential('slack_webhook');",
    );
    writeFixtureFile(
      root,
      "src/features/settings/support/settingsBackupFile.ts",
      "function scrubSensitiveFields() {}\n",
    );

    assert.equal(
      hasRendererCredentialSecretRead(
        root,
        "src/features/settings/SettingsPage.tsx",
      ),
      true,
    );
    assert.equal(
      hasRendererCredentialSecretRead(
        root,
        "src/features/dashboard/DashboardPage.tsx",
      ),
      false,
    );
    assert.equal(
      hasIncompleteConfigExportRedaction(
        root,
        "src/features/settings/support/settingsBackupFile.ts",
      ),
      true,
    );
    assert.equal(
      hasIncompleteConfigExportRedaction(root, "src/utils/import.ts"),
      false,
    );
  });
});

test("privacy logging rejects unsanitized feedback report handling", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/feedback/sanitizer.rs",
      'let stale = "hooks\\.(slack|discord|teams)\\.com";',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/feedback/debug_log.rs",
      "pub fn get_debug_log() { DEBUG_LOG.lock().ok().map(|buffer| buffer.get_all()) }",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/feedback/mod.rs",
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
      hasStaleFeedbackWebhookSanitizer(
        root,
        "src-tauri/src/ipc/feedback/sanitizer.rs",
      ),
      true,
    );
    assert.equal(
      hasIncompleteFeedbackJobSearchSanitizer(
        root,
        "src-tauri/src/ipc/feedback/sanitizer.rs",
      ),
      true,
    );
    assert.equal(
      hasUnsanitizedStructuredDebugLogEvents(
        root,
        "src-tauri/src/ipc/feedback/debug_log.rs",
      ),
      true,
    );
    assert.equal(
      hasUnsanitizedFeedbackFileSave(
        root,
        "src-tauri/src/ipc/feedback/mod.rs",
      ),
      true,
    );
    assert.equal(
      hasRawFeedbackOpenErrors(root, "src-tauri/src/ipc/feedback/mod.rs"),
      true,
    );
    assert.equal(
      hasRawFeedbackOpenErrors(root, "src-tauri/src/ipc/jobs.rs"),
      false,
    );
  });
});

test("privacy logging rejects raw notification request token errors", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-notifications/src/telegram.rs",
      "client.post(&api_url).send().await?",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-notifications/src/slack.rs",
      "client.post(&config.webhook_url).send().await?",
    );

    assert.equal(
      hasRawTelegramBotTokenRequestError(
        root,
        "crates/jobsentinel-notifications/src/telegram.rs",
      ),
      true,
    );
    assert.equal(
      hasRawWebhookTokenRequestError(
        root,
        "crates/jobsentinel-notifications/src/slack.rs",
      ),
      true,
    );
    assert.equal(
      hasRawWebhookTokenRequestError(root, "crates/jobsentinel-application/src/notify/mod.rs"),
      false,
    );
  });
});

test("privacy logging rejects notification provider and service error details", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-notifications/src/discord.rs",
      "let error_text = read_text_with_limit(response, 1024).await?; anyhow!(error_text);",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/notify/mod.rs",
      'tracing::warn!("notification failed: {}", e);',
    );

    assert.equal(
      hasRawNotificationProviderErrorBody(
        root,
        "crates/jobsentinel-notifications/src/discord.rs",
      ),
      true,
    );
    assert.equal(
      hasRawNotificationServiceErrorDetails(
        root,
        "crates/jobsentinel-application/src/notify/mod.rs",
      ),
      true,
    );
    assert.equal(
      hasRawNotificationProviderErrorBody(
        root,
        "crates/jobsentinel-notifications/src/slack.rs",
      ),
      false,
    );
  });
});

test("privacy logging rejects raw source health errors", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/health/smoke_checks/sources.rs",
      '"error": e.to_string(),',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/health/smoke_checks/mod.rs",
      "error: Some(e.to_string()),",
    );

    assert.equal(
      hasRawJobsWithGptSmokeEndpointError(
        root,
        "crates/jobsentinel-application/src/health/smoke_checks/sources.rs",
      ),
      true,
    );
    assert.equal(
      hasRawSourceCheckResultError(
        root,
        "crates/jobsentinel-application/src/health/smoke_checks/mod.rs",
      ),
      true,
    );
    assert.equal(
      hasRawSourceCheckResultError(root, "crates/jobsentinel-application/src/health/mod.rs"),
      false,
    );
  });
});

test("privacy logging rejects raw URL logs and URL error displays", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-assistance/src/automation/browser/manager.rs",
      '#[tracing::instrument(skip(self), fields(url = %url), level = "info")]',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-sources/src/scrapers/error.rs",
      '#[error("HTTP request failed for {url}: {source}")]\nstruct ScraperError;',
    );

    assert.equal(
      hasRawUrlLogging(root, "crates/jobsentinel-assistance/src/automation/browser/manager.rs"),
      true,
    );
    assert.equal(
      hasRawUrlLogging(root, "crates/jobsentinel-sources/src/scrapers/mod.rs"),
      false,
    );
    assert.equal(
      hasRawUrlErrorDisplay(root, "crates/jobsentinel-sources/src/scrapers/error.rs"),
      true,
    );
    assert.equal(
      hasRawUrlErrorDisplay(root, "crates/jobsentinel-sources/src/scrapers/mod.rs"),
      false,
    );
  });
});

test("privacy logging rejects raw path, query, and config URL displays", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-storage/src/connection.rs",
      '#[error("database query failed: {query}")]\nstruct DbError;',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/config.rs",
      'map_err(|e| format!("Failed to load config: {}", e));',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/config/validation_error.rs",
      'format!("Got: {}", url);',
    );

    assert.equal(
      hasRawPathOrQueryErrorDisplay(root, "crates/jobsentinel-storage/src/connection.rs"),
      true,
    );
    assert.equal(
      hasRawCommandSetupErrorDisplay(root, "src-tauri/src/ipc/config.rs"),
      true,
    );
    assert.equal(
      hasRawConfigValidationUrlDisplay(
        root,
        "crates/jobsentinel-application/src/config/validation_error.rs",
      ),
      true,
    );
    assert.equal(
      hasRawCommandSetupErrorDisplay(root, "src-tauri/src/ipc/jobs.rs"),
      false,
    );
  });
});

test("privacy logging rejects raw resume command details", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-documents/src/parser.rs",
      "let shown = file_path.display();",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/resume.rs",
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
      hasRawResumeParserPathDisplay(
        root,
        "crates/jobsentinel-documents/src/parser.rs",
      ),
      true,
    );
    assert.equal(
      hasRawResumeNameLogging(root, "src-tauri/src/ipc/resume.rs"),
      true,
    );
    assert.equal(
      hasRawResumeCommandErrorDetails(root, "src-tauri/src/ipc/resume.rs"),
      true,
    );
    assert.equal(
      hasRawResumeCommandDtoExposure(root, "src-tauri/src/ipc/resume.rs"),
      true,
    );
    assert.equal(
      hasRawResumeCommandDtoExposure(root, "src-tauri/src/ipc/jobs.rs"),
      false,
    );
  });
});

test("privacy logging rejects raw backend command error details", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/ats.rs",
      'map_err(|e| format!("Failed to save status: {}", e))?',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/automation.rs",
      'Err(e) => Err(format!("Failed to fill form: {}", e)),',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/ml.rs",
      'serde_json::to_value(value).map_err(|e| format!("Failed to serialize: {}", e))?',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/jobs.rs",
      'format!("Database error: {}", e);',
    );

    assert.equal(
      hasRawAtsCommandErrorDetails(root, "src-tauri/src/ipc/ats.rs"),
      true,
    );
    assert.equal(
      hasRawAutomationCommandErrorDetails(
        root,
        "src-tauri/src/ipc/automation.rs",
      ),
      true,
    );
    assert.equal(
      hasRawSensitiveCommandErrorDetails(root, "src-tauri/src/ipc/ml.rs"),
      true,
    );
    assert.equal(
      hasRawUtilityCommandErrorDetails(root, "src-tauri/src/ipc/jobs.rs"),
      true,
    );
    assert.equal(
      hasRawUtilityCommandErrorDetails(
        root,
        "src-tauri/src/ipc/resume.rs",
      ),
      false,
    );
  });
});

test("privacy logging rejects raw import URL and HTTP errors", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/types.rs",
      "Redirect blocked while fetching URL: {location}",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/import.rs",
      [
        "#[tracing::instrument(fields(url))]",
        "fn preview() {}",
        'format!("Failed to fetch the page: {}", e);',
      ].join("\n"),
    );

    assert.equal(
      hasRawImportRedirectDisplay(root, "crates/jobsentinel-application/src/types.rs"),
      true,
    );
    assert.equal(
      hasRawJobImportLogging(root, "src-tauri/src/ipc/import.rs"),
      true,
    );
    assert.equal(
      hasRawImportHttpErrorReturn(root, "src-tauri/src/ipc/import.rs"),
      true,
    );
    assert.equal(
      hasRawJobImportLogging(root, "src-tauri/src/ipc/jobs.rs"),
      false,
    );
  });
});

test("privacy logging rejects non-public IP echo", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-security/src/url.rs",
      "return Err(format!(\"Blocked non-public IP address '{}'\", host));",
    );

    assert.equal(
      hasNonPublicIpErrorEcho(root, "crates/jobsentinel-security/src/url.rs"),
      true,
    );
    assert.equal(
      hasNonPublicIpErrorEcho(root, "crates/jobsentinel-application/src/types.rs"),
      false,
    );
  });
});
