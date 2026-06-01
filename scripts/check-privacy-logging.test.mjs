import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasLinkedInLoginCookieReturn,
  hasMlRawErrorDisplay,
  hasMlRawLocalPathDoc,
  hasMlRawLocalPathExposure,
  hasRawAutomationDropdownValueLogging,
  hasRawBackupPathError,
  hasRawFrontendErrorReporterForwarding,
  hasRawJobsWithGptDebug,
  hasRawLinkedInDebug,
  hasRawLocalPathLogging,
  hasRawPrivateQueryLogging,
  hasRawScraperLoopErrorLogging,
  hasRawScraperUrlOrQueryLogging,
  hasUnboundedExternalResponseBodyRead,
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
