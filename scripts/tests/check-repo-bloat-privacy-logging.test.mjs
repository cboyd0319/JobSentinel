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
    join(tmpdir(), "jobsentinel-repo-bloat-privacy-ipc-"),
  );

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}


test("checkRepoBloat rejects raw URL logging outside approved sanitizers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-assistance/src/automation/browser/manager.rs",
      [
        'tracing::warn!("Failed to parse URL for navigation: {}", url_str);',
        '#[tracing::instrument(skip(self), fields(url = %url), level = "info")]',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/linkedin_auth.rs",
      'tracing::debug!("LinkedIn navigation: {}", url_str);\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "crates/jobsentinel-assistance/src/automation/browser/manager.rs",
        "src-tauri/src/ipc/linkedin_auth.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw URL logging: crates/jobsentinel-assistance/src/automation/browser/manager.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw URL logging: src-tauri/src/ipc/linkedin_auth.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw job import logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/import.rs",
      [
        '#[tracing::instrument(skip(state), fields(url), level = "info")]',
        "pub async fn preview_job_import(url: String) {}",
        'tracing::info!(title = %preview.title, company = %preview.company, "Import preview created");',
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src-tauri/src/ipc/import.rs"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw job import logging: src-tauri/src/ipc/import.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw job import HTTP errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/import.rs",
      [
        'ImportError::HttpError(e) => format!("Failed to fetch the page: {}", e),',
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src-tauri/src/ipc/import.rs"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize job import HTTP errors: src-tauri/src/ipc/import.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects non-public IP validation error echo", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-security/src/url.rs",
      [
        "return Err(format!(\"Blocked non-public IP address '{}'\", host));",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "crates/jobsentinel-security/src/url.rs"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize non-public IP validation errors: crates/jobsentinel-security/src/url.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw job import success metadata", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/import.rs",
      'tracing::info!(job_id = job_id, title = %title, company = %company, "Job imported successfully");\n',
    );

    execFileSync(
      "git",
      ["add", "package.json", "src-tauri/src/ipc/import.rs"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace raw job import logging: src-tauri/src/ipc/import.rs",
      ),
      violations.join("\n"),
    );
  });
});
