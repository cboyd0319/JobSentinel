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
  const root = mkdtempSync(
    join(tmpdir(), "jobsentinel-repo-bloat-local-data-privacy-"),
  );

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects raw local path logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/resume.rs",
      'tracing::info!("Command: upload_resume (name: {}, path: {})", name, file_path);\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-assistance/src/automation/form_filler.rs",
      'tracing::debug!(resume_path = %resume_path.display(), "Uploading resume");\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-storage/src/connection.rs",
      'tracing::info!("Pre-migration backup created: {}", backup_path.display());\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/ipc/resume.rs",
        "crates/jobsentinel-assistance/src/automation/form_filler.rs",
        "crates/jobsentinel-storage/src/connection.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw local path logging: src-tauri/src/ipc/resume.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw local path logging: crates/jobsentinel-assistance/src/automation/form_filler.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw local path logging: crates/jobsentinel-storage/src/connection.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw backup path error display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-storage/src/connection/backups.rs",
      [
        'return Err(anyhow::anyhow!("Backup file not found: {}", backup_path.display()));',
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "crates/jobsentinel-storage/src/connection/backups.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize backup path error display: crates/jobsentinel-storage/src/connection/backups.rs",
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
      "src-tauri/src/ipc/ml.rs",
      'Ok(format!("Model downloaded to {:?}", model_path))\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-local-ai/src/model.rs",
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
      "docs/developer/LOCAL_SEMANTIC_MATCHING.md",
      ["interface ModelStatus {", "  model_path: string;", "}"].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/LOCAL_SEMANTIC_MATCHING_QUICKSTART.md",
      ["interface ModelStatus {", "  model_path: string;", "}"].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/ipc/ml.rs",
        "crates/jobsentinel-local-ai/src/model.rs",
        "docs/developer/LOCAL_SEMANTIC_MATCHING.md",
        "docs/developer/LOCAL_SEMANTIC_MATCHING_QUICKSTART.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove ML raw local path exposure: src-tauri/src/ipc/ml.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove ML raw local path exposure: crates/jobsentinel-local-ai/src/model.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove ML raw local path doc claim: docs/developer/LOCAL_SEMANTIC_MATCHING.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove ML raw local path doc claim: docs/developer/LOCAL_SEMANTIC_MATCHING_QUICKSTART.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw ML error display", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-local-ai/src/lib.rs",
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

    execFileSync(
      "git",
      ["add", "package.json", "crates/jobsentinel-local-ai/src/lib.rs"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize ML error display: crates/jobsentinel-local-ai/src/lib.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw JobsWithGPT Debug derives", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-sources/src/scrapers/jobswithgpt.rs",
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
      [
        "add",
        "package.json",
        "crates/jobsentinel-sources/src/scrapers/jobswithgpt.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize JobsWithGPT debug output: crates/jobsentinel-sources/src/scrapers/jobswithgpt.rs",
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
      "crates/jobsentinel-sources/src/scrapers/linkedin.rs",
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

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "crates/jobsentinel-sources/src/scrapers/linkedin.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize legacy LinkedIn source debug output: crates/jobsentinel-sources/src/scrapers/linkedin.rs",
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
      "src-tauri/src/ipc/linkedin_auth.rs",
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

    execFileSync(
      "git",
      ["add", "package.json", "src-tauri/src/ipc/linkedin_auth.rs"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "keep LinkedIn login cookie out of renderer response: src-tauri/src/ipc/linkedin_auth.rs",
      ),
      violations.join("\n"),
    );
  });
});
