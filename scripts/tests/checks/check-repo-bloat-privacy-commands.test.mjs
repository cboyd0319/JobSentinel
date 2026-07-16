import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../../checks/repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-bloat-privacy-commands-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects raw automation screening question logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-assistance/src/automation/form_filler.rs",
      [
        'tracing::debug!("Filled screening question \'{}\' with answer", question_text);',
        'tracing::debug!("Selected screening answer for \'{}\'", question_text);',
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "crates/jobsentinel-assistance/src/automation/form_filler.rs"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw automation screening question logging: crates/jobsentinel-assistance/src/automation/form_filler.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw automation form result data", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-assistance/src/automation/form_filler.rs",
      [
        "let field_name = Self::truncate_question(&question_text, 30);",
        'result.filled_fields.push(format!("screening:{}", field_name));',
        'page.inner().evaluate(script).await.map_err(|e| anyhow::anyhow!("Failed to execute question finder script: {}", e))?;',
        'value.into_value().map_err(|e| anyhow::anyhow!("Failed to parse question finder result: {}", e))?;',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/dev-runtime/mocks/handlers.ts",
      [
        "const screeningFields = screeningAnswers.slice(0, 2).map((answer) =>",
        "  `screening:${answer.questionPattern}`,",
        ");",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "crates/jobsentinel-assistance/src/automation/form_filler.rs",
        "src/dev-runtime/mocks/handlers.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize automation form result data: crates/jobsentinel-assistance/src/automation/form_filler.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("sanitize automation form result data: src/dev-runtime/mocks/handlers.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw automation browser errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-assistance/src/automation/browser/manager.rs",
      [
        'BrowserConfig::builder().build().map_err(|e| anyhow::anyhow!("Failed to build browser config: {}", e))?;',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-assistance/src/automation/browser/page.rs",
      [
        'return Err(anyhow::anyhow!("File does not exist: {:?}", file_path));',
        'let path_str = file_path.to_str().context("Invalid file path encoding")?;',
        'builder.build().map_err(|e| anyhow::anyhow!("Failed to build file upload params: {}", e))?;',
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "crates/jobsentinel-assistance/src/automation/browser/manager.rs",
        "crates/jobsentinel-assistance/src/automation/browser/page.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize automation browser errors: crates/jobsentinel-assistance/src/automation/browser/manager.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sanitize automation browser errors: crates/jobsentinel-assistance/src/automation/browser/page.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw automation dropdown value logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-assistance/src/automation/browser/page.rs",
      [
        'tracing::debug!("Selected option \'{}\' in dropdown \'{}\'", value, selector);',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "crates/jobsentinel-assistance/src/automation/browser/page.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove raw automation dropdown value logging: crates/jobsentinel-assistance/src/automation/browser/page.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw notification job title logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/notify/mod.rs",
      [
        'tracing::info!("Sent Slack notification for: {}", notification.job.title);',
        'tracing::info!("Sent Teams notification for: {}", notification.job.title);',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "crates/jobsentinel-application/src/notify/mod.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw notification job title logging: crates/jobsentinel-application/src/notify/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw URL error display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-assistance/src/automation/error.rs",
      [
        "#[derive(thiserror::Error, Debug)]",
        "pub enum AutomationError {",
        '    #[error("Failed to navigate to {url}: {reason}")]',
        "    Navigation { url: String, reason: String },",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-sources/src/scrapers/error.rs",
      [
        "impl std::fmt::Display for ScraperError {",
        "  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {",
        "    match self {",
        '      Self::HttpRequest { url, source } => write!(f, "HTTP request failed for {}: {}", Self::sanitize_url(url), source),',
        '      Self::Network { url, source } => write!(f, "Network error for {}: {}", Self::sanitize_url(url), source),',
        '      Self::ParseError { format, url, source } => write!(f, "Failed to parse {} from {}: {}", format, Self::sanitize_url(url), source),',
        "    }",
        "  }",
        "}",
        "impl ScraperError {",
        "  pub fn from_anyhow(scraper: impl Into<String>, error: anyhow::Error) -> Self {",
        "    Self::Generic { scraper: scraper.into(), message: error.to_string() }",
        "  }",
        "}",
        "impl From<HttpBodyReadError> for ScraperError {",
        "  fn from(error: HttpBodyReadError) -> Self {",
        "    match error {",
        '      HttpBodyReadError::ResponseTooLarge { url, max_bytes } => Self::Generic { scraper: "http".to_string(), message: format!("Response body from {} exceeded {} byte limit", url, max_bytes) },',
        "    }",
        "  }",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-network/src/body.rs",
      [
        "#[derive(Debug, Error)]",
        "pub enum HttpBodyReadError {",
        '    #[error("HTTP response body from {url} exceeded {max_bytes} byte limit")]',
        "    ResponseTooLarge { url: String, max_bytes: usize },",
        '    #[error("Failed to read HTTP response body from {url}: {source}")]',
        "    Read { url: String, source: reqwest::Error },",
        '    #[error("Failed to parse JSON response from {url}: {source}")]',
        "    Json { url: String, source: serde_json::Error },",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "crates/jobsentinel-assistance/src/automation/error.rs",
        "crates/jobsentinel-network/src/body.rs",
        "crates/jobsentinel-sources/src/scrapers/error.rs",
      ],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw URL error display: crates/jobsentinel-assistance/src/automation/error.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw URL error display: crates/jobsentinel-sources/src/scrapers/error.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw URL error display: crates/jobsentinel-network/src/body.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw path or query error display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-storage/src/connection.rs",
      [
        "#[derive(thiserror::Error, Debug)]",
        "pub enum DatabaseError {",
        '    #[error("Database query timed out after {timeout_secs}s: {query}")]',
        "    Timeout { timeout_secs: u64, query: String },",
        '    #[error("Backup failed at {path}: {source}")]',
        "    Backup { path: String, source: std::io::Error },",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "crates/jobsentinel-storage/src/connection.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw path/query error display: crates/jobsentinel-storage/src/connection.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw resume parser path error display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-documents/src/parser.rs",
      [
        'let canonical_path = file_path.canonicalize().context(format!("Invalid path: {}", file_path.display()))?;',
        'return Err(anyhow::anyhow!("File must be a PDF. Got: {}", canonical_path.display()));',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "crates/jobsentinel-documents/src/parser.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize resume parser path error display: crates/jobsentinel-documents/src/parser.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw resume import name logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/resume.rs",
      [
        'tracing::info!("Command: import_json_resume (name: {})", name);',
        'tracing::info!(name = %name, "Command: import_json_resume");',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/ipc/resume.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sanitize resume import name logging: src-tauri/src/ipc/resume.rs"),
      violations.join("\n"),
    );
  });
});
