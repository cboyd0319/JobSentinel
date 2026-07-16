import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasNonPublicIpErrorEcho,
  hasRawAutomationCommandErrorDetails,
  hasRawAtsCommandErrorDetails,
  hasRawCommandSetupErrorDisplay,
  hasRawConfigValidationUrlDisplay,
  hasRawImportHttpErrorReturn,
  hasRawImportRedirectDisplay,
  hasRawJobImportLogging,
  hasRawPathOrQueryErrorDisplay,
  hasRawResumeCommandDtoExposure,
  hasRawResumeCommandErrorDetails,
  hasRawResumeNameLogging,
  hasRawResumeParserPathDisplay,
  hasRawSensitiveCommandErrorDetails,
  hasRawUrlErrorDisplay,
  hasRawUrlLogging,
  hasRawUtilityCommandErrorDetails,
} from "../../harness/checks/privacy-logging.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(
    join(tmpdir(), "jobsentinel-privacy-logging-runtime-inputs-"),
  );

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

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
      hasRawUrlLogging(
        root,
        "crates/jobsentinel-assistance/src/automation/browser/manager.rs",
      ),
      true,
    );
    assert.equal(
      hasRawUrlLogging(root, "crates/jobsentinel-sources/src/scrapers/mod.rs"),
      false,
    );
    assert.equal(
      hasRawUrlErrorDisplay(
        root,
        "crates/jobsentinel-sources/src/scrapers/error.rs",
      ),
      true,
    );
    assert.equal(
      hasRawUrlErrorDisplay(
        root,
        "crates/jobsentinel-sources/src/scrapers/mod.rs",
      ),
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
      hasRawPathOrQueryErrorDisplay(
        root,
        "crates/jobsentinel-storage/src/connection.rs",
      ),
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
      hasRawUtilityCommandErrorDetails(root, "src-tauri/src/ipc/resume.rs"),
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
      hasRawImportRedirectDisplay(
        root,
        "crates/jobsentinel-application/src/types.rs",
      ),
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
      hasNonPublicIpErrorEcho(
        root,
        "crates/jobsentinel-application/src/types.rs",
      ),
      false,
    );
  });
});
