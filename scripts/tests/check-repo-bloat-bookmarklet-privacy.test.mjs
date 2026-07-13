import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../check-repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-bloat-bookmarklet-privacy-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects raw import and bookmarklet command error details", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/import.rs",
      [
        "fn format_import_error(error: ImportError) -> String {",
        "    format!(\"Failed to read the job page response: {}\", error)",
        "}",
        "fn serialize(e: Error) -> String {",
        "    format!(\"Failed to serialize job: {}\", e)",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/user_data.rs",
      'category.parse().map_err(|e: String| format!("Invalid category: {}", e))?;\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/scoring.rs",
      'tracing::error!("Failed to load scoring config: {}", e);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/bookmarklet.rs",
      'tracing::error!(error = %e, "Failed to start bookmarklet server");\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/bookmarklet/server.rs",
      [
        'tracing::error!("Failed to parse job data: {}", e);',
        'json_error_response(format!("Failed to import job: {e}"));',
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/import.rs",
        "src-tauri/src/commands/user_data.rs",
        "src-tauri/src/commands/scoring.rs",
        "src-tauri/src/commands/bookmarklet.rs",
        "crates/jobsentinel-core/src/core/bookmarklet/server.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src-tauri/src/commands/import.rs",
      "src-tauri/src/commands/user_data.rs",
      "src-tauri/src/commands/scoring.rs",
      "src-tauri/src/commands/bookmarklet.rs",
      "crates/jobsentinel-core/src/core/bookmarklet/server.rs",
    ]) {
      assert.ok(
        violations.includes(`sanitize import and bookmarklet command error details: ${path}`),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects raw command setup error display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/config.rs",
      [
        "pub async fn complete_setup() -> Result<(), String> {",
        "    Database::connect(&db_path)",
        "        .await",
        "        .map_err(|e| format!(\"Failed to connect to database: {}\", e))?;",
        "    Ok(())",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/app.rs",
      [
        "fn main() {",
        "    match Config::load(&config_path) {",
        "        Err(e) => {",
        "            tracing::error!(\"Failed to load config: {}\", e);",
        "            return Err(format!(\"Configuration error: {}\", e).into());",
        "        }",
        "        _ => {}",
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
        "src-tauri/src/commands/config.rs",
        "src-tauri/src/app.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw command setup error display: src-tauri/src/commands/config.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw command setup error display: src-tauri/src/app.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw config validation URL display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/config/validation_error.rs",
      [
        "match self {",
        "  Self::InvalidUrl { field, url, reason } => {",
        "    if field.contains(\"greenhouse\") {",
        "      write!(f, \"Invalid Greenhouse URL format. Got: {}\", url)",
        "    } else {",
        "      write!(f, \"Invalid URL in {}: {}\", field, reason)",
        "    }",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "crates/jobsentinel-core/src/core/config/validation_error.rs"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize config validation URL display: crates/jobsentinel-core/src/core/config/validation_error.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw import redirect display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/import/types.rs",
      [
        "#[derive(thiserror::Error, Debug)]",
        "pub enum ImportError {",
        '    #[error("Redirect blocked while fetching URL: {location}")]',
        "    RedirectBlocked { location: String },",
        '    #[error("URL validation failed: {0}")]',
        "    InvalidUrl(String),",
        '    #[error("Database error: {0}")]',
        "    DatabaseError(String),",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "crates/jobsentinel-core/src/core/import/types.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw import redirect display: crates/jobsentinel-core/src/core/import/types.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw bookmarklet import metadata logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/bookmarklet/server.rs",
      [
        "tracing::info!(",
        "    title = %title,",
        "    company = %company,",
        '    "Job imported from bookmarklet"',
        ");",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "crates/jobsentinel-core/src/core/bookmarklet/server.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw bookmarklet import metadata logging: crates/jobsentinel-core/src/core/bookmarklet/server.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw scoring cache job hash logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/scoring/cache.rs",
      [
        'tracing::debug!("Score cache HIT for job_hash={}", key.job_hash);',
        'tracing::info!(job_hash = %job_hash, "Invalidated cached score");',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "crates/jobsentinel-core/src/core/scoring/cache.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw scoring cache job hash logging: crates/jobsentinel-core/src/core/scoring/cache.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw scheduler scoring privacy leaks", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/scheduler/workers/scoring.rs",
      [
        'tracing::warn!(error = %e, job_hash = %job.hash, "Failed to serialize score reasons");',
        'tracing::debug!("Ghost indicator for \'{}\' at {}: score={:.2}", job.title, job.company, analysis.score);',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/scoring/db.rs",
      'sqlx_call.map_err(|e| format!("Failed to load scoring config: {}", e));\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "crates/jobsentinel-core/src/core/scheduler/workers/scoring.rs",
        "crates/jobsentinel-core/src/core/scoring/db.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw scheduler scoring privacy leaks: crates/jobsentinel-core/src/core/scheduler/workers/scoring.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw scheduler scoring privacy leaks: crates/jobsentinel-core/src/core/scoring/db.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects residual core privacy leaks", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    const fixtures = new Map([
      [
        "crates/jobsentinel-core/src/core/automation/browser/manager.rs",
        'tracing::debug!(error = %e, "Browser handler event error");\n',
      ],
      [
        "crates/jobsentinel-core/src/core/config/io.rs",
        'std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create config directory: {}", e))?;\n',
      ],
      [
        "crates/jobsentinel-core/src/core/db/connection.rs",
        'tracing::warn!("Failed to create database directory: {}", e);\n',
      ],
      [
        "crates/jobsentinel-core/src/core/db/error.rs",
        'format!("Database operation failed: {}", context)\n',
      ],
      [
        "crates/jobsentinel-core/src/core/import/schema_org.rs",
        'tracing::debug!(error = %e, "Skipping invalid JSON-LD script tag");\n',
      ],
      [
        "crates/jobsentinel-core/src/core/ml/model.rs",
        'let api = Api::new().map_err(|e| MlError::DownloadFailed(e.to_string()))?;\n',
      ],
      [
        "crates/jobsentinel-core/src/core/resume/parser.rs",
        'tracing::warn!("OCR extraction failed: {}", e);\n',
      ],
      [
        "crates/jobsentinel-core/src/core/resume/templates.rs",
        'Err(format!("Invalid template ID: {}", s))\n',
      ],
      [
        "crates/jobsentinel-core/src/core/scheduler/mod.rs",
        'tracing::error!("Scraping cycle failed: {}", e);\n',
      ],
      [
        "crates/jobsentinel-core/src/core/scrapers/mod.rs",
        'tracing::error!(error = %e, "Scraper task panicked");\n',
      ],
      [
        "crates/jobsentinel-core/src/core/scrapers/usajobs.rs",
        'message: format!("Invalid API key: {}", e),\n',
      ],
      [
        "crates/jobsentinel-core/src/core/scrapers/yc_startup.rs",
        'tracing::warn!("YC scraper: failed to parse Inertia JSON: {}", e);\n',
      ],
    ]);

    for (const [path, content] of fixtures) {
      writeFixtureFile(root, path, content);
    }

    execFileSync("git", ["add", "package.json", ...fixtures.keys()], { cwd: root });

    const violations = checkRepoBloat(root);

    for (const path of fixtures.keys()) {
      assert.ok(
        violations.includes(`replace residual core privacy leaks: ${path}`),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects manual bookmarklet JSON error responses", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/bookmarklet/server.rs",
      [
        'format!(r#"{{"error":"{}"}}"#, e),',
        'format!(r#"{{"error":"Failed to import job: {}"}}"#, e),',
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "crates/jobsentinel-core/src/core/bookmarklet/server.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace manual bookmarklet JSON error responses: crates/jobsentinel-core/src/core/bookmarklet/server.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects opaque command unit errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/cache.rs",
      [
        "#[tauri::command]",
        "pub async fn get_cache_health() -> Result<serde_json::Value, ()> {",
        "    Ok(serde_json::json!({\"status\":\"healthy\"}))",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/commands/cache.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace opaque command unit errors: src-tauri/src/commands/cache.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unauthenticated bookmarklet imports", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/bookmarklet/server.rs",
      [
        'if request.starts_with("POST /api/bookmarklet/import") {',
        "    handle_import_request(&request, database).await",
        "} else if request.starts_with(\"OPTIONS\") {",
        '    ("OK".to_string(), "text/plain".to_string())',
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "crates/jobsentinel-core/src/core/bookmarklet/server.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "require bookmarklet import auth token: crates/jobsentinel-core/src/core/bookmarklet/server.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects bookmarklet code without auth header", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/settings/sources/browser-import/BrowserImportSection.tsx",
      [
        "export function code() {",
        "  return `fetch('http://localhost:4321/api/bookmarklet/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(job)})`;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/features/settings/sources/browser-import/BrowserImportSection.tsx"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "include bookmarklet auth token header: src/features/settings/sources/browser-import/BrowserImportSection.tsx",
      ),
      violations.join("\n"),
    );
  });
});
