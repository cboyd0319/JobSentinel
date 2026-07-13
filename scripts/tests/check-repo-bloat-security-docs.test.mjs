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
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-bloat-security-docs-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects stale keyring credential docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/security/KEYRING.md",
      [
        "JobSentinel v2.0.0 introduces OS-native keyring integration.",
        "Frontend uses `tauri-plugin-secure-storage` JS API.",
        "pub enum CredentialKey { SlackWebhookUrl, DiscordWebhookUrl, TeamsWebhookUrl }",
        "pub fn list_status() -> Result<HashMap<String, bool>, String>;",
        "Does NOT delete plaintext values",
        "- ✅ Stored",
        "**Last Updated**: 2026-05-19",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/saved-secrets.md",
      [
        "JobSentinel:slack-webhook",
        "pub enum CredentialKey { EmailSmtpPassword, LinkedinCookies, TelegramToken }",
        "Self::TelegramToken => \"JobSentinel:telegram-token\"",
        "Setup complete ✓",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/security/KEYRING.md", "docs/features/saved-secrets.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync keyring credential docs: docs/security/KEYRING.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("sync keyring credential docs: docs/features/saved-secrets.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects unsafe keyring migration and stale credential comments", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/app.rs",
      [
        'tracing::info!("✓ Migrated {:?} to secure storage", key);',
        "// Mark migration as complete (even if partial, to avoid repeated attempts)",
        "migration::set_migrated();",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/credentials/mod.rs",
      [
        "//! - Frontend uses `tauri-plugin-secure-storage` JS API",
        "//!   set_item, get_item, remove_item",
        '///     println!("Got password: {}", password);',
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src-tauri/src/app.rs", "crates/jobsentinel-core/src/core/credentials/mod.rs"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("keep keyring migration retry-safe: src-tauri/src/app.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync credential architecture comments: crates/jobsentinel-core/src/core/credentials/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});
