import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../checks/repo-bloat.mjs";

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
      "crates/jobsentinel-core/src/core/automation/form_filler.rs",
      [
        'tracing::debug!("Filled screening question \'{}\' with answer", question_text);',
        'tracing::debug!("Selected screening answer for \'{}\'", question_text);',
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "crates/jobsentinel-core/src/core/automation/form_filler.rs"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw automation screening question logging: crates/jobsentinel-core/src/core/automation/form_filler.rs",
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
      "crates/jobsentinel-core/src/core/automation/form_filler.rs",
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
      "src/mocks/handlers.ts",
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
        "crates/jobsentinel-core/src/core/automation/form_filler.rs",
        "src/mocks/handlers.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize automation form result data: crates/jobsentinel-core/src/core/automation/form_filler.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("sanitize automation form result data: src/mocks/handlers.ts"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw automation browser errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/automation/browser/manager.rs",
      [
        'BrowserConfig::builder().build().map_err(|e| anyhow::anyhow!("Failed to build browser config: {}", e))?;',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/automation/browser/page.rs",
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
        "crates/jobsentinel-core/src/core/automation/browser/manager.rs",
        "crates/jobsentinel-core/src/core/automation/browser/page.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize automation browser errors: crates/jobsentinel-core/src/core/automation/browser/manager.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sanitize automation browser errors: crates/jobsentinel-core/src/core/automation/browser/page.rs",
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
      "crates/jobsentinel-core/src/core/automation/browser/page.rs",
      [
        'tracing::debug!("Selected option \'{}\' in dropdown \'{}\'", value, selector);',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "crates/jobsentinel-core/src/core/automation/browser/page.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove raw automation dropdown value logging: crates/jobsentinel-core/src/core/automation/browser/page.rs",
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
      "crates/jobsentinel-core/src/core/notify/mod.rs",
      [
        'tracing::info!("Sent Slack notification for: {}", notification.job.title);',
        'tracing::info!("Sent Teams notification for: {}", notification.job.title);',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "crates/jobsentinel-core/src/core/notify/mod.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw notification job title logging: crates/jobsentinel-core/src/core/notify/mod.rs",
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
      "crates/jobsentinel-core/src/core/automation/error.rs",
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
      "crates/jobsentinel-core/src/core/scrapers/error.rs",
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
      "crates/jobsentinel-core/src/core/http_body.rs",
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
        "crates/jobsentinel-core/src/core/automation/error.rs",
        "crates/jobsentinel-core/src/core/http_body.rs",
        "crates/jobsentinel-core/src/core/scrapers/error.rs",
      ],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw URL error display: crates/jobsentinel-core/src/core/automation/error.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw URL error display: crates/jobsentinel-core/src/core/scrapers/error.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw URL error display: crates/jobsentinel-core/src/core/http_body.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw path or query error display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/db/error.rs",
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

    execFileSync("git", ["add", "package.json", "crates/jobsentinel-core/src/core/db/error.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw path/query error display: crates/jobsentinel-core/src/core/db/error.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw resume parser path error display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/resume/parser.rs",
      [
        'let canonical_path = file_path.canonicalize().context(format!("Invalid path: {}", file_path.display()))?;',
        'return Err(anyhow::anyhow!("File must be a PDF. Got: {}", canonical_path.display()));',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "crates/jobsentinel-core/src/core/resume/parser.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize resume parser path error display: crates/jobsentinel-core/src/core/resume/parser.rs",
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
      "src-tauri/src/commands/resume.rs",
      [
        'tracing::info!("Command: import_json_resume (name: {})", name);',
        'tracing::info!(name = %name, "Command: import_json_resume");',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/resume.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sanitize resume import name logging: src-tauri/src/commands/resume.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw resume command error details", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/resume.rs",
      [
        "pub async fn upload_resume() -> Result<i64, String> {",
        "    matcher.upload_resume().await.map_err(|e| format!(\"Failed to upload resume: {}\", e))",
        "}",
        "",
        "pub async fn add_user_skill(skill: NewSkill) -> Result<i64, String> {",
        "    tracing::info!(\"Command: add_user_skill (resume: {}, skill: {})\", resume_id, skill.skill_name);",
        "    Ok(1)",
        "}",
        "",
        "pub async fn match_resume_to_job(job_hash: String) -> Result<(), String> {",
        "    tracing::info!(\"Command: match_resume_to_job (resume: {}, job: {})\", resume_id, job_hash);",
        "    Ok(())",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/resume.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sanitize resume command error details: src-tauri/src/commands/resume.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw application tracking command error details", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/ats.rs",
      [
        "pub async fn create_application(job_hash: String) -> Result<i64, String> {",
        "    tracing::info!(\"Command: create_application (job_hash: {})\", job_hash);",
        "    tracker.create_application(&job_hash).await.map_err(|e| format!(\"Failed to create application: {}\", e))",
        "}",
        "",
        "pub async fn schedule_interview(interview_type: String, scheduled_at: String) -> Result<i64, String> {",
        "    tracing::info!(\"Command: schedule_interview (app: {}, type: {}, at: {})\", application_id, interview_type, scheduled_at);",
        "    Ok(1)",
        "}",
        "",
        "pub async fn complete_interview(outcome: String) -> Result<(), String> {",
        "    tracing::info!(\"Command: complete_interview (id: {}, outcome: {})\", interview_id, outcome);",
        "    status.parse().map_err(|e| format!(\"Invalid status: {}\", e))?;",
        "    Ok(())",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/ats.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize application tracking command error details: src-tauri/src/commands/ats.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw automation command error details", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/automation.rs",
      [
        "pub async fn create_automation_attempt(job_hash: String) -> Result<i64, String> {",
        "    tracing::info!(\"Command: create_automation_attempt (job: {})\", job_hash);",
        "    manager.create_attempt(&job_hash).await.map_err(|e| format!(\"Failed to create automation attempt: {}\", e))",
        "}",
        "",
        "pub async fn get_application_profile() -> Result<(), String> {",
        "    match manager.get_profile().await {",
        "        Ok(_) => Ok(()),",
        "        Err(e) => Err(format!(\"Failed to get profile: {}\", e)),",
        "    }",
        "}",
        "",
        "pub async fn fill_application_form() -> Result<(), String> {",
        "    tracing::warn!(\"Failed to create automation attempt: {}\", e);",
        "    Ok(())",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/automation.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize automation command error details: src-tauri/src/commands/automation.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw sensitive command error details", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/ml.rs",
      [
        "pub async fn match_resume_semantic(job_hash: String) -> Result<(), String> {",
        "    tracing::info!(\"Command: match_resume_semantic (job: {})\", job_hash);",
        "    matcher.match_skills().map_err(|e| format!(\"Failed to match skills: {}\", e))",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/salary.rs",
      [
        "pub async fn generate_negotiation_script(scenario: String) -> Result<(), String> {",
        "    tracing::info!(\"Command: generate_negotiation_script (scenario: {})\", scenario);",
        "    analyzer.generate().await.map_err(|e| format!(\"Failed to generate script: {}\", e))",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/market.rs",
      [
        "pub async fn run_market_analysis() -> Result<(), String> {",
        "    Err(e) => Err(format!(\"Failed to run market analysis: {}\", e)),",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/ml.rs",
        "src-tauri/src/commands/salary.rs",
        "src-tauri/src/commands/market.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src-tauri/src/commands/ml.rs",
      "src-tauri/src/commands/salary.rs",
      "src-tauri/src/commands/market.rs",
    ]) {
      assert.ok(
        violations.includes(`sanitize sensitive command error details: ${path}`),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects raw utility command error details", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/jobs.rs",
      [
        "pub async fn search_jobs() -> Result<(), String> {",
        "    tracing::error!(error = %e, \"Manual search failed\");",
        "    Err(format!(\"Scraping failed: {}\", e))",
        "}",
        "",
        "pub async fn get_statistics() -> Result<(), String> {",
        "    serde_json::to_value(&stats).map_err(|e| format!(\"Failed to serialize stats: {}\", e))",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/ghost.rs",
      [
        "pub async fn get_ghost_jobs() -> Result<(), String> {",
        "    tracing::error!(\"Failed to get ghost jobs: {}\", e);",
        "    Err(format!(\"Database error: {}\", e))",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/deeplinks.rs",
      [
        "pub async fn open_deep_link(url: String) -> Result<(), String> {",
        "    app.emit(\"deep-link-opened\", DeepLinkOpenedEvent { url: url.clone() });",
        "    format!(\"Failed to generate deep link for {}: {}\", site_id, e);",
        "    Ok(())",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/jobs.rs",
        "src-tauri/src/commands/ghost.rs",
        "src-tauri/src/commands/deeplinks.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src-tauri/src/commands/jobs.rs",
      "src-tauri/src/commands/ghost.rs",
      "src-tauri/src/commands/deeplinks.rs",
    ]) {
      assert.ok(
        violations.includes(`sanitize utility command error details: ${path}`),
        violations.join("\n"),
      );
    }
  });
});
