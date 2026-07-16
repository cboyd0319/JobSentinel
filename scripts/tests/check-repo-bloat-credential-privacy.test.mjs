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
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-bloat-credential-privacy-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

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
      "crates/jobsentinel-credentials/src/lib.rs",
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
        "crates/jobsentinel-credentials/src/lib.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("avoid echoing credential key input: src-tauri/src/commands/credentials.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("avoid echoing credential key input: crates/jobsentinel-credentials/src/lib.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw credential storage errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-credentials/src/lib.rs",
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

    execFileSync("git", ["add", "package.json", "crates/jobsentinel-credentials/src/lib.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize credential storage errors: crates/jobsentinel-credentials/src/lib.rs",
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
      "crates/jobsentinel-credentials/src/lib.rs",
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
        "crates/jobsentinel-credentials/src/lib.rs",
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
        "disable LinkedIn credential storage: crates/jobsentinel-credentials/src/lib.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("credential storage policy follows the validation owner module", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-credentials/src/lib.rs",
      [
        "mod validation;",
        "const LINKEDIN_CREDENTIAL_STORAGE_DISABLED: &str = \"disabled\";",
        "fn store(key: CredentialKey, value: &str) -> Result<(), String> {",
        "  reject_disabled_credential_storage(key)?;",
        "  validate_credential_value(key, value)?;",
        "  Ok(())",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-credentials/src/validation.rs",
      [
        "fn reject_disabled_credential_storage(key: CredentialKey) -> Result<(), String> {",
        "  let disabled = matches!(key, CredentialKey::LinkedInCookie | CredentialKey::LinkedInCookieExpiry);",
        "  if disabled { Err(LINKEDIN_CREDENTIAL_STORAGE_DISABLED.to_string()) } else { Ok(()) }",
        "}",
        "fn validate_credential_value(key: CredentialKey, value: &str) -> Result<(), String> {",
        "  match key {",
        "    CredentialKey::SlackWebhook | CredentialKey::DiscordWebhook => validate_webhook_credential(value),",
        "    CredentialKey::TeamsWebhook => validate_teams_webhook_credential(value),",
        "    CredentialKey::TelegramBotToken => validate_telegram_bot_token_credential(value),",
        "    _ => Ok(()),",
        "  }",
        "}",
        "fn validate_webhook_credential(_value: &str) -> Result<(), String> { Ok(()) }",
        "fn validate_teams_webhook_credential(_value: &str) -> Result<(), String> { Ok(()) }",
        "fn validate_telegram_bot_token_credential(_value: &str) -> Result<(), String> { Ok(()) }",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "crates/jobsentinel-credentials/src/lib.rs",
        "crates/jobsentinel-credentials/src/validation.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);
    assert.equal(
      violations.some((violation) =>
        violation.startsWith("disable LinkedIn credential storage:"),
      ),
      false,
      violations.join("\n"),
    );
    assert.equal(
      violations.some((violation) =>
        violation.startsWith(
          "validate notification webhook credentials before keyring storage:",
        ),
      ),
      false,
      violations.join("\n"),
    );
  });
});
