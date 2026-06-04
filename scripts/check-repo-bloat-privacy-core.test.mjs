import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "./check-repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-bloat-privacy-core-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects stale Rust export and scraper stubs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/mod.rs",
      [
        "use crate::core::db::Job;",
        "/// Run all enabled scrapers (legacy function, use scrape_all_parallel for new code)",
        "#[deprecated(since = \"1.3.0\", note = \"Use scrape_all_parallel instead\")]",
        "pub async fn scrape_all() -> Vec<Job> {",
        "    vec![]",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/resume/export.rs",
      [
        "//! Resume export functionality - PDF, DOCX, and plain text formats",
        "//! printpdf = \"0.7\"",
        "impl ResumeExporter {",
        "    pub fn export_pdf() {",
        "        anyhow::bail!(\"PDF export not yet implemented\");",
        "    }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/scrapers/mod.rs",
        "src-tauri/src/core/resume/export.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale scrape_all scraper stub: src-tauri/src/core/scrapers/mod.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove stale resume PDF export stub: src-tauri/src/core/resume/export.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw private query logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/jobs.rs",
      'tracing::info!("Command: search_jobs_query (query: {}, limit: {})", query, limit);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/automation.rs",
      'tracing::info!("Command: find_answer_for_question (question: {})", question);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/queries.rs",
      'tracing::debug!("Performing full-text search with query: \'{}\'", query);\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/jobs.rs",
        "src-tauri/src/commands/automation.rs",
        "src-tauri/src/core/db/queries.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw private query logging: src-tauri/src/commands/jobs.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw private query logging: src-tauri/src/commands/automation.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw private query logging: src-tauri/src/core/db/queries.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw scraper URL and query logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/cache.rs",
      'tracing::debug!("Cache HIT for URL: {}", url);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/http_client.rs",
      [
        'tracing::debug!("Cache miss, fetching: {}", url);',
        'return Err(error).with_context(|| format!("Failed to send request: {url}"));',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/dice.rs",
      'tracing::info!("Fetching jobs from Dice for query: {}", self.query);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/linkedin.rs",
      "#[tracing::instrument(skip(self), fields(query = %self.query, location = %self.location))]\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/jobswithgpt.rs",
      [
        'tracing::debug!("MCP request: {}", request);',
        'message: format!("MCP error: {}", error),',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/usajobs.rs",
      'format!("USAJobs API error: {} - {}", status, body)\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/scrapers/cache.rs",
        "src-tauri/src/core/scrapers/http_client.rs",
        "src-tauri/src/core/scrapers/dice.rs",
        "src-tauri/src/core/scrapers/linkedin.rs",
        "src-tauri/src/core/scrapers/jobswithgpt.rs",
        "src-tauri/src/core/scrapers/usajobs.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw scraper URL/query logging: src-tauri/src/core/scrapers/cache.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw scraper URL/query logging: src-tauri/src/core/scrapers/http_client.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw scraper URL/query logging: src-tauri/src/core/scrapers/dice.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw scraper URL/query logging: src-tauri/src/core/scrapers/linkedin.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw scraper URL/query logging: src-tauri/src/core/scrapers/jobswithgpt.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw scraper URL/query logging: src-tauri/src/core/scrapers/usajobs.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw scraper loop error logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/greenhouse.rs",
      'tracing::error!("Failed to scrape {}: {}", company.name, e);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/lever/mod.rs",
      'tracing::warn!("Failed to scrape {}: {}", company.name, e);\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/scrapers/greenhouse.rs",
        "src-tauri/src/core/scrapers/lever/mod.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize scraper loop error logging: src-tauri/src/core/scrapers/greenhouse.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sanitize scraper loop error logging: src-tauri/src/core/scrapers/lever/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unbounded external response body reads", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/geo/mod.rs",
      "let body = response.text().await?;\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/remoteok.rs",
      "let json: serde_json::Value = response.json().await?;\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/notify/telegram.rs",
      "let bytes = response.bytes().await?;\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/http_client.rs",
      [
        "pub async fn production() {}",
        "#[cfg(test)]",
        "mod tests {",
        "    async fn reads_mock_response(response: reqwest::Response) {",
        "        let _ = response.text().await;",
        "    }",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/http_body.rs",
      "while let Some(chunk) = response.chunk().await? { body.extend_from_slice(&chunk); }\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/geo/mod.rs",
        "src-tauri/src/core/scrapers/remoteok.rs",
        "src-tauri/src/core/notify/telegram.rs",
        "src-tauri/src/core/scrapers/http_client.rs",
        "src-tauri/src/core/http_body.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace unbounded external response body read: src-tauri/src/core/geo/mod.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace unbounded external response body read: src-tauri/src/core/scrapers/remoteok.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace unbounded external response body read: src-tauri/src/core/notify/telegram.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      !violations.includes(
        "replace unbounded external response body read: src-tauri/src/core/scrapers/http_client.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      !violations.includes(
        "replace unbounded external response body read: src-tauri/src/core/http_body.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale cache usage documentation", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/CACHE_USAGE.md",
      [
        'tracing::info!("Cache hit for: {}", url);',
        "let response = reqwest::get(url).await?;",
        "let body = response.text().await?;",
        "Disable in Production",
        "- ✅ `get_with_cache(url)`",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/CACHE_USAGE.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync cache usage doc with scraper HTTP client: docs/CACHE_USAGE.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects frontend direct-open deep link fallbacks", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/JobCard.tsx",
      "try { await openDeepLink(url); } catch { window.open(url, '_blank'); }\n",
    );
    writeFixtureFile(
      root,
      "src/pages/Dashboard.tsx",
      "try { await openDeepLink(job.url); } catch { window.open(job.url, '_blank'); }\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/components/JobCard.tsx",
        "src/pages/Dashboard.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("route job URL opens through backend guard only: src/components/JobCard.tsx"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("route job URL opens through backend guard only: src/pages/Dashboard.tsx"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw local path logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/resume.rs",
      'tracing::info!("Command: upload_resume (name: {}, path: {})", name, file_path);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/automation/form_filler.rs",
      'tracing::debug!(resume_path = %resume_path.display(), "Uploading resume");\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/connection.rs",
      'tracing::info!("Pre-migration backup created: {}", backup_path.display());\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/resume.rs",
        "src-tauri/src/core/automation/form_filler.rs",
        "src-tauri/src/core/db/connection.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw local path logging: src-tauri/src/commands/resume.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw local path logging: src-tauri/src/core/automation/form_filler.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw local path logging: src-tauri/src/core/db/connection.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw backup path error display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/integrity/backups.rs",
      [
        'return Err(anyhow::anyhow!("Backup file not found: {}", backup_path.display()));',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/db/integrity/backups.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize backup path error display: src-tauri/src/core/db/integrity/backups.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects ML raw local path exposure", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/ml.rs",
      'Ok(format!("Model downloaded to {:?}", model_path))\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/ml/model.rs",
      [
        "use std::path::PathBuf;",
        "pub struct ModelStatus {",
        "  pub model_path: PathBuf,",
        "}",
        'tracing::info!("Model downloaded successfully to {:?}", model_dir);',
        'let model_data = std::fs::read(&model_path).with_context(|| format!("failed to read model weights from {:?}", model_path))?;',
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/ML_FEATURE.md",
      ["interface ModelStatus {", "  model_path: string;", "}"].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/ML_QUICKSTART.md",
      ["interface ModelStatus {", "  model_path: string;", "}"].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/ml.rs",
        "src-tauri/src/core/ml/model.rs",
        "docs/ML_FEATURE.md",
        "docs/ML_QUICKSTART.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove ML raw local path exposure: src-tauri/src/commands/ml.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("remove ML raw local path exposure: src-tauri/src/core/ml/model.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("remove ML raw local path doc claim: docs/ML_FEATURE.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("remove ML raw local path doc claim: docs/ML_QUICKSTART.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw ML error display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/ml/mod.rs",
      [
        "#[derive(Error, Debug)]",
        "pub enum MlError {",
        "  #[error(\"model loading failed: {0}\")]",
        "  ModelLoadFailed(String),",
        "  #[error(\"IO error: {0}\")]",
        "  Io(#[from] std::io::Error),",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/ml/mod.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sanitize ML error display: src-tauri/src/core/ml/mod.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw JobsWithGPT Debug derives", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/jobswithgpt.rs",
      [
        "#[derive(Debug, Clone)]",
        "pub struct JobsWithGptScraper {",
        "  pub endpoint: String,",
        "}",
        "",
        "#[derive(Debug, Clone, Default)]",
        "pub struct JobQuery {",
        "  pub titles: Vec<String>,",
        "  pub location: Option<String>,",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src-tauri/src/core/scrapers/jobswithgpt.rs"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize JobsWithGPT debug output: src-tauri/src/core/scrapers/jobswithgpt.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw legacy LinkedIn source Debug derive", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/linkedin.rs",
      [
        "#[derive(Debug, Clone, Serialize, Deserialize)]",
        "pub struct LinkedInScraper {",
        "  pub session_cookie: String,",
        "  pub query: String,",
        "  pub location: String,",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/scrapers/linkedin.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize legacy LinkedIn source debug output: src-tauri/src/core/scrapers/linkedin.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects LinkedIn login cookie return", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/linkedin_auth.rs",
      [
        "pub async fn linkedin_login() -> Result<String, String> {",
        "    let tx = get_sender();",
        "    // Send result back (just the cookie value, not expiry)",
        "    let _ = tx.send(cookie_result.map(|(cookie, _)| cookie));",
        "    Ok(String::new())",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/linkedin_auth.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "keep LinkedIn login cookie out of renderer response: src-tauri/src/commands/linkedin_auth.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects secret-bearing Debug derives", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/config.rs",
      [
        "#[derive(Debug, Clone, Serialize, Deserialize)]",
        "pub struct TestEmailConfig {",
        "  pub smtp_server: String,",
        "  pub smtp_password: String,",
        "}",
        "",
      ].join("\n"),
    );
    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/config.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sanitize secret-bearing debug derive: src-tauri/src/commands/config.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw test email command errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/config.rs",
      [
        "pub async fn test_email_notification() -> Result<(), String> {",
        '  validate_email_config().await.map_err(|e| format!("Failed to send test email: {}", e))?;',
        "  Ok(())",
        "}",
        "",
      ].join("\n"),
    );
    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/config.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sanitize test email command errors: src-tauri/src/commands/config.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw Slack webhook validation command errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/config.rs",
      [
        "pub async fn validate_slack_webhook(webhook_url: String) -> Result<bool, String> {",
        "  match validate_webhook(&webhook_url).await {",
        "    Ok(valid) => Ok(valid),",
        '    Err(e) => { tracing::error!("Webhook validation failed: {}", e); Err(format!("Validation failed: {}", e)) }',
        "  }",
        "}",
        "",
      ].join("\n"),
    );
    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/config.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize Slack webhook validation command errors: src-tauri/src/commands/config.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects credential key input echo", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/credentials.rs",
      [
        'let cred_key = key.parse::<CredentialKey>().map_err(|_| format!("Unknown credential key: {key}"))?;',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/credentials/mod.rs",
      [
        'impl FromStr for CredentialKey { type Err = String; fn from_str(s: &str) -> Result<Self, Self::Err> { Err(format!("Invalid credential key: {}", s)) } }',
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/credentials.rs",
        "src-tauri/src/core/credentials/mod.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("avoid echoing credential key input: src-tauri/src/commands/credentials.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("avoid echoing credential key input: src-tauri/src/core/credentials/mod.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw credential storage errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/credentials/mod.rs",
      [
        "fn ensure_keyring_store() -> Result<(), String> {",
        '  keyring::use_native_store(true).map_err(|e| format!("Failed to initialize native keyring store: {e}"))',
        "}",
        "impl CredentialStore {",
        "  pub fn store(key: CredentialKey, value: &str) -> Result<(), String> {",
        '    entry.set_password(value).map_err(|e| format!("Failed to store credential \'{}\': {e}", key.as_str()))',
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/core/credentials/mod.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize credential storage errors: src-tauri/src/core/credentials/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects enabled LinkedIn credential storage", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/credentials.rs",
      [
        "pub async fn store_credential(key: String, value: String) -> Result<(), String> {",
        "  let cred_key = parse_credential_key(&key)?;",
        "  CredentialStore::store(cred_key, &value)",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/credentials/mod.rs",
      [
        "impl CredentialStore {",
        "  pub fn store(key: CredentialKey, value: &str) -> Result<(), String> {",
        "    entry.set_password(value)",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/credentials.rs",
        "src-tauri/src/core/credentials/mod.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "disable LinkedIn credential storage: src-tauri/src/commands/credentials.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "disable LinkedIn credential storage: src-tauri/src/core/credentials/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});
