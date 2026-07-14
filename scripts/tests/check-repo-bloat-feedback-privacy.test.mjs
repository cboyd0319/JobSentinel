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
  const root = mkdtempSync(
    join(tmpdir(), "jobsentinel-repo-bloat-feedback-privacy-"),
  );

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects stale notification preference docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      [
        'invoke("save_notification_preferences", {',
        "  per_source_settings: {",
        "    linkedin: { enabled: true, min_score: 0.9, include_ghosts: false },",
        "  },",
        "  keyword_rules: { include: ['Rust'] },",
        "  thresholds: { slack: 0.9 },",
        "Minimum score - Only notify for jobs scoring at or above the threshold",
        "});",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/features/user-data-management.md"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync notification preference docs with backend shape: docs/features/user-data-management.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unsanitized structured feedback debug events", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/feedback/debug_log.rs",
      [
        "pub(super) fn get_debug_log() -> Vec<TimestampedEvent> {",
        "    DEBUG_LOG",
        "        .read()",
        "        .map(|buffer| buffer.get_all())",
        "        .unwrap_or_default()",
        "}",
        "",
        "pub fn get_recent_events(n: usize) -> Vec<TimestampedEvent> {",
        "    DEBUG_LOG",
        "        .read()",
        "        .map(|buffer| buffer.get_recent(n))",
        "        .unwrap_or_default()",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src-tauri/src/commands/feedback/debug_log.rs"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize structured feedback debug events: src-tauri/src/commands/feedback/debug_log.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat accepts disabled feedback activity collection", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/feedback/debug_log.rs",
      [
        "pub fn get_debug_log() -> Vec<TimestampedEvent> {",
        "    Vec::new()",
        "}",
        "",
        "pub(super) fn get_recent_events(_limit: usize) -> Vec<TimestampedEvent> {",
        "    Vec::new()",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src-tauri/src/commands/feedback/debug_log.rs"],
      {
        cwd: root,
      },
    );

    assert.equal(
      checkRepoBloat(root).includes(
        "sanitize structured feedback debug events: src-tauri/src/commands/feedback/debug_log.rs",
      ),
      false,
    );
  });
});

test("checkRepoBloat rejects unsanitized feedback file saves", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/feedback/mod.rs",
      [
        "pub async fn save_feedback_file(content: String) -> Result<(), String> {",
        '    std::fs::write(&path, content).map_err(|e| format!("{e}"))?;',
        "    Ok(Some(path.to_string_lossy().into_owned()))",
        "    Ok(())",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src-tauri/src/commands/feedback/mod.rs"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize feedback file content before saving: src-tauri/src/commands/feedback/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw feedback support-open errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/feedback/mod.rs",
      [
        "pub async fn open_github_issues() -> Result<(), String> {",
        '    app.shell().open(url, None).map_err(|e| format!("Failed to open browser: {e}"))?;',
        '    Command::new("open").arg("-R").arg(path).spawn().map_err(|e| format!("Failed to reveal file: {e}"))?;',
        '    app.shell().open(parent, None).map_err(|e| format!("Failed to open directory: {e}"))?;',
        "    Ok(())",
        "}",
        "fn feedback_file_content(content: &str) -> String { Sanitizer::sanitize(content) }",
        "struct SavedFeedbackFile { reveal_token: String }",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src-tauri/src/commands/feedback/mod.rs"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize feedback support-open errors: src-tauri/src/commands/feedback/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw user-data privacy logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/user_data.rs",
      [
        "pub async fn create_cover_letter_template(name: String) -> Result<(), String> {",
        '    tracing::info!("Command: create_cover_letter_template (name: {})", name);',
        "    Ok(())",
        "}",
        "",
        "pub async fn create_saved_search(search: SavedSearch) -> Result<(), String> {",
        '    tracing::info!("Command: create_saved_search (name: {})", search.name);',
        "    Ok(())",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/user_data/mod.rs",
      [
        "#[instrument(skip(self, content))]",
        "pub async fn create_template(&self, name: &str, content: &str) -> Result<(), Error> {",
        '    debug!("Creating template: {}", name);',
        "    Ok(())",
        "}",
        "",
        "#[instrument(skip(self))]",
        "pub async fn create_saved_search(&self, search: SavedSearch) -> Result<(), Error> {",
        '    debug!("Creating saved search: {} ({})", search.name, search.id);',
        "    Ok(())",
        "}",
        "",
        "#[instrument(skip(self))]",
        "pub async fn add_search_history(&self, query: &str) -> Result<(), Error> {",
        '    debug!("Adding search history: {}", query);',
        "    Ok(())",
        "}",
        "",
        'serde_json::to_string(&prefs).map_err(|e| sqlx::Error::Protocol(format!("JSON serialization error: {}", e)))?;',
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/user_data.rs",
        "crates/jobsentinel-core/src/core/user_data/mod.rs",
      ],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw user-data privacy logging: src-tauri/src/commands/user_data.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw user-data privacy logging: crates/jobsentinel-core/src/core/user_data/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw scheduler job content logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/db/crud.rs",
      [
        "#[tracing::instrument(skip(self, job), fields(",
        "    job_hash = %job.hash,",
        "    job_title = %job.title,",
        "    job_company = %job.company,",
        "))]",
        "pub async fn upsert_job(&self, job: &Job) -> Result<i64, Error> {",
        "    Ok(1)",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/scheduler/workers/persistence.rs",
      [
        "pub async fn persist_and_notify(job: Job) {",
        '    tracing::error!(job_title = %job.title, job_company = %job.company, "Failed");',
        '    errors.push(format!("Notification error for {}: {}", job.title, error));',
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "crates/jobsentinel-core/src/core/db/crud.rs",
        "crates/jobsentinel-core/src/core/scheduler/workers/persistence.rs",
      ],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize scheduler job content logging: crates/jobsentinel-core/src/core/db/crud.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sanitize scheduler job content logging: crates/jobsentinel-core/src/core/scheduler/workers/persistence.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw scheduler scraper error details", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/scheduler/workers/scrapers.rs",
      [
        "async fn run_scrapers() {",
        "  let _ = crate::core::health::fail_run(db, _tid, _dur, &e.to_string(), None).await;",
        '  let error_msg = format!("Dice scraper failed: {}", e);',
        '  tracing::error!("{}", error_msg);',
        "  errors.push(error_msg);",
        '  let error_msg = format!("Failed to retrieve USAJobs API key from keyring: {}", e);',
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "crates/jobsentinel-core/src/core/scheduler/workers/scrapers.rs",
      ],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize scheduler scraper error details: crates/jobsentinel-core/src/core/scheduler/workers/scrapers.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale user-data mock handlers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'get_search_history':",
        "      return [];",
        "    case 'list_saved_searches':",
        "      return [];",
        "    case 'save_search':",
        "      return {};",
        "    case 'delete_saved_search':",
        "      return undefined;",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/mocks/handlers.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync user-data mock command handlers: src/mocks/handlers.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale deep-link mock handlers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'get_supported_sites':",
        "      return [];",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/mocks/handlers.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync deep-link mock command handlers: src/mocks/handlers.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale job-import mock handlers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'preview_job_import':",
        "      return {};",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/mocks/handlers.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync job-import mock command handlers: src/mocks/handlers.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects job-import mocks returning full jobs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/dashboard/mocks/jobImportCommands.ts",
      [
        "function importMockJobFromUrl(command) {",
        "  const job = { id: 1, title: 'Care Coordinator' };",
        "  switch (command) {",
        "    case 'preview_job_import':",
        "      return {};",
        "    case 'confirm_job_import':",
        "      return { value: { ...job } };",
        "    default:",
        "      return undefined;",
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
        "src/features/dashboard/mocks/jobImportCommands.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync job-import mock command handlers: src/features/dashboard/mocks/jobImportCommands.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat accepts job-import mocks returning only job id", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/dashboard/mocks/jobImportCommands.ts",
      [
        "function importMockJobFromUrl(command) {",
        "  const job = { id: 1, title: 'Care Coordinator' };",
        "  switch (command) {",
        "    case 'preview_job_import':",
        "      return {};",
        "    case 'confirm_job_import':",
        "      return { value: { jobId: job.id } };",
        "    default:",
        "      return undefined;",
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
        "src/features/dashboard/mocks/jobImportCommands.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      !violations.includes(
        "sync job-import mock command handlers: src/features/dashboard/mocks/jobImportCommands.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale feedback mock handlers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'generate_feedback_report':",
        "      return '';",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/mocks/handlers.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync feedback mock command handlers: src/mocks/handlers.ts",
      ),
      violations.join("\n"),
    );
  });
});
