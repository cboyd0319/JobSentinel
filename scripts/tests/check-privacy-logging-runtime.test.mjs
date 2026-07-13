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
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-privacy-logging-runtime-"));

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
    assert.equal(hasRendererCredentialSecretRead(root, "src/features/dashboard/DashboardPage.tsx"), false);
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
