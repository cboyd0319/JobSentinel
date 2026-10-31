// Exercises security-document and credential-config policy checks in synthetic repositories.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasStaleCommandExecutionSecurityDocMarkers,
  hasStaleCredentialArchitectureComments,
  hasStaleKeyringSecurityDocs,
  hasStaleNotificationPreferenceDocs,
  hasStaleNotificationWebhookDocs,
  hasStaleUrlValidationSecurityDocMarkers,
  hasStaleWebhookSecurityDocMarkers,
  hasStaleXssSecurityDocs,
  hasUnsafeCredentialConfigCompatibility,
} from "../../harness/checks/security-docs.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-security-docs-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const configIoPath = "crates/jobsentinel-application/src/config/io.rs";
const nativeConfigPath = "src-tauri/src/ipc/config.rs";
const startupPath = "crates/jobsentinel-application/src/desktop/startup.rs";
const credentialLibPath = "crates/jobsentinel-credentials/src/lib.rs";

function writeCurrentCredentialBoundary(root) {
  writeFixtureFile(root, startupPath, "// Starts the current application.\n");
  writeFixtureFile(root, credentialLibPath, "pub use service::CredentialService;\n");
  writeFixtureFile(root, configIoPath, [
    "impl Config {",
    "    pub(crate) fn from_json(content: &str) -> Result<Self, Error> {",
    "        reject_retired_config_fields(&serde_json::from_str(content)?)?;",
    "        let config: Config = serde_json::from_str(content)?;",
    "        Ok(config)",
    "    }",
    "    pub fn from_value(value: Value) -> Result<Self, Error> {",
    "        reject_retired_config_fields(&value)?;",
    "        let config: Self = serde_json::from_value(value)?;",
    "        Ok(config)",
    "    }",
    "}",
    "fn reject_retired_config_fields(value: &Value) -> io::Result<()> {",
    "    if [",
    '        "/alerts/email/smtp_password",',
    '        "/alerts/telegram/bot_token",',
    '        "/alerts/slack/webhook_url",',
    '        "/alerts/discord/webhook_url",',
    '        "/alerts/teams/webhook_url",',
    '        "/linkedin/session_cookie",',
    '        "/usajobs/api_key",',
    "    ].iter().any(|pointer| value.pointer(pointer).is_some()) {",
    '        return Err(io::Error::other("unsupported"));',
    "    }",
    "    Ok(())",
    "}",
  ].join("\n"));
  writeFixtureFile(root, nativeConfigPath, [
    "async fn save_config_to_runtime_and_path(config: Value) -> Result<(), String> {",
    "    let mut parsed_config = Config::from_value(config).map_err(error)?;",
    "    let previous = runtime_config.read().await.clone();",
    "    reconcile_restricted_source_consents(database, previous, parsed_config).await?;",
    "    parsed_config.save(config_path)?;",
    "    Ok(())",
    "}",
  ].join("\n"));
}

test("security docs reject stale notification webhook docs", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/features/notifications.md",
      [
        "- **Discord:** Must start with `https://discord.com/api/webhooks/`",
        "Slack says token is invalid",
        "Click Send Test to verify.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(root, "docs/user/QUICK_START.md", "Click Send Test.\n");

    assert.equal(
      hasStaleNotificationWebhookDocs(root, "docs/features/notifications.md"),
      true,
    );
    assert.equal(hasStaleNotificationWebhookDocs(root, "docs/user/QUICK_START.md"), true);
    assert.equal(hasStaleNotificationWebhookDocs(root, "docs/security/README.md"), false);
  });
});

test("security docs reject stale security-doc marker patterns", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/security/WEBHOOK_SECURITY.md", "**Last Updated**: 2026-03-18 ✅\n");
    writeFixtureFile(
      root,
      "docs/security/COMMAND_EXECUTION.md",
      "**Security Level**: Production Ready ❌\n",
    );
    writeFixtureFile(root, "docs/security/URL_VALIDATION.md", "**Version**: 2.6.4\n");

    assert.equal(
      hasStaleWebhookSecurityDocMarkers(root, "docs/security/WEBHOOK_SECURITY.md"),
      true,
    );
    assert.equal(
      hasStaleCommandExecutionSecurityDocMarkers(root, "docs/security/COMMAND_EXECUTION.md"),
      true,
    );
    assert.equal(
      hasStaleUrlValidationSecurityDocMarkers(root, "docs/security/URL_VALIDATION.md"),
      true,
    );
  });
});

test("security docs require the current shared webhook validator", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/security/URL_VALIDATION.md", "No live sanitizer call here.\n");

    assert.equal(
      hasStaleUrlValidationSecurityDocMarkers(root, "docs/security/URL_VALIDATION.md"),
      true,
    );
  });
});

test("URL validation policy follows the webhook validation owner", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/security/URL_VALIDATION.md",
      "Webhook rules: [Notification Webhook URL Validation](WEBHOOK_URL_VALIDATION.md).\n",
    );
    writeFixtureFile(
      root,
      "docs/security/WEBHOOK_URL_VALIDATION.md",
      "jobsentinel-security owns validate_webhook_target.\n",
    );

    assert.equal(
      hasStaleUrlValidationSecurityDocMarkers(
        root,
        "docs/security/URL_VALIDATION.md",
      ),
      false,
    );
  });
});

test("URL validation docs reject copied provider implementations", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/security/URL_VALIDATION.md",
      "jobsentinel-security owns validate_webhook_target.\n",
    );
    writeFixtureFile(
      root,
      "docs/security/WEBHOOK_URL_VALIDATION.md",
      "fn validate_webhook_url(value: &str) {}\n",
    );

    assert.equal(
      hasStaleUrlValidationSecurityDocMarkers(
        root,
        "docs/security/URL_VALIDATION.md",
      ),
      true,
    );
  });
});

test("security docs reject stale XSS doc shapes", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/security/README.md", "Input → Validation\n");
    writeFixtureFile(
      root,
      "docs/security/XSS_PREVENTION.md",
      "JobSentinel Security Documentation\nnpm install dompurify\n",
    );
    writeFixtureFile(
      root,
      "docs/security/dompurify-test-examples.js",
      "DOMPurify Integration Test Example\n// ✅ Output\n",
    );

    assert.equal(hasStaleXssSecurityDocs(root, "docs/security/README.md"), true);
    assert.equal(hasStaleXssSecurityDocs(root, "docs/security/XSS_PREVENTION.md"), true);
    assert.equal(hasStaleXssSecurityDocs(root, "docs/security/dompurify-test-examples.js"), true);
  });
});

test("security docs reject stale keyring docs and credential comments", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/security/KEYRING.md",
      "JobSentinel v2.0.0 introduces OS-native keyring integration.\nSlackWebhookUrl\n",
    );
    writeFixtureFile(
      root,
      "docs/features/saved-secrets.md",
      "JobSentinel:slack-webhook\nSetup complete ✓\n",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-credentials/src/lib.rs",
      'tauri-plugin-secure-storage` JS API\nprintln!("Got password: {}", password);\n',
    );

    assert.equal(hasStaleKeyringSecurityDocs(root, "docs/security/KEYRING.md"), true);
    assert.equal(
      hasStaleKeyringSecurityDocs(root, "docs/features/saved-secrets.md"),
      true,
    );
    assert.equal(
      hasStaleCredentialArchitectureComments(root, "crates/jobsentinel-credentials/src/lib.rs"),
      true,
    );
  });
});

test("keyring docs allow plain feature copy with implementation link", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/features/saved-secrets.md",
      [
        "USAJobs access code",
        "Legacy LinkedIn saved details",
        "Implementation details live in",
        "[Local Secret Vault And Keychain Integration](../security/KEYRING.md).",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/security/KEYRING.md",
      [
        "jobsentinel_usajobs_api_key",
        "Legacy LinkedIn credential",
        "store_credential",
      ].join("\n"),
    );

    assert.equal(
      hasStaleKeyringSecurityDocs(root, "docs/features/saved-secrets.md"),
      false,
    );
    assert.equal(hasStaleKeyringSecurityDocs(root, "docs/security/KEYRING.md"), false);
  });
});

test("security docs allow startup without plaintext credential migration", () => {
  withFixture((root) => {
    writeCurrentCredentialBoundary(root);
    for (const path of [startupPath, credentialLibPath, configIoPath, nativeConfigPath]) {
      assert.equal(hasUnsafeCredentialConfigCompatibility(root, path), false, path);
    }
  });
});

test("security docs reject retained credential migration modules and startup calls", () => {
  withFixture((root) => {
    writeCurrentCredentialBoundary(root);
    writeFixtureFile(root, startupPath, "migrate_plaintext_credentials_to_secure_storage();\n");
    assert.equal(hasUnsafeCredentialConfigCompatibility(root, startupPath), true);
    writeCurrentCredentialBoundary(root);
    writeFixtureFile(root, credentialLibPath, "mod migration;\npub use migration::set_migrated;\n");
    assert.equal(hasUnsafeCredentialConfigCompatibility(root, credentialLibPath), true);
    writeCurrentCredentialBoundary(root);
    writeFixtureFile(root, "crates/jobsentinel-credentials/src/migration.rs");
    assert.equal(hasUnsafeCredentialConfigCompatibility(root, startupPath), true);
  });
});

test("credential config checks require each pointer and presence-based error propagation", () => {
  withFixture((root) => {
    writeCurrentCredentialBoundary(root);
    const current = readFileSync(join(root, configIoPath), "utf8");
    const pointers = current.match(/"\/[^"]+"/g);
    assert.equal(pointers.length, 7);
    const unsafe = [
      ...pointers.map((pointer) => current.replace(pointer, '"/unrelated"')),
      current.replace("value.pointer(pointer).is_some()", "false"),
      current.replace("value.pointer(pointer).is_some()", "value.pointer(pointer).and_then(Value::as_str).is_some()"),
      current.replace('return Err(io::Error::other("unsupported"));', "let _ = value;"),
      current.replace("reject_retired_config_fields(&value)?;", "reject_retired_config_fields(&value);"),
      current.replace("        reject_retired_config_fields(&serde_json::from_str(content)?)?;\n", ""),
      current.replace("        reject_retired_config_fields(&value)?;\n", "")
        .replace("        Ok(config)\n    }\n}", "        reject_retired_config_fields(&value)?;\n        Ok(config)\n    }\n}"),
    ];
    for (const text of unsafe) {
      writeFixtureFile(root, configIoPath, text);
      assert.equal(hasUnsafeCredentialConfigCompatibility(root, configIoPath), true);
    }
    assert.equal(hasUnsafeCredentialConfigCompatibility(root, "unrelated.rs"), false);
  });
});

test("native config save checks require validated decode before state or disk access", () => {
  withFixture((root) => {
    writeCurrentCredentialBoundary(root);
    const current = readFileSync(join(root, nativeConfigPath), "utf8");
    for (const text of [
      current.replace("Config::from_value(config)", "serde_json::from_value(config)"),
      current.replace("Config::from_value(config).map_err(error)?;", "Config::from_value(config).unwrap();"),
      current.replace("    let previous = runtime_config.read().await.clone();\n", "")
        .replace("    let mut parsed_config", "    let previous = runtime_config.read().await.clone();\n    let mut parsed_config"),
    ]) {
      writeFixtureFile(root, nativeConfigPath, text);
      assert.equal(hasUnsafeCredentialConfigCompatibility(root, nativeConfigPath), true);
    }
  });
});

test("keyring docs reject retired automatic credential-import promises", () => {
  withFixture((root) => {
    for (const path of ["docs/security/KEYRING.md", "docs/features/saved-secrets.md"]) {
      writeFixtureFile(root, path, [
        "USAJobs access code jobsentinel_usajobs_api_key store_credential",
        "[Local Secret Vault And Keychain Integration](../security/KEYRING.md)",
        "Startup migration runs when the config file exists.",
      ].join("\n"));
      assert.equal(hasStaleKeyringSecurityDocs(root, path), true);
    }
  });
});

test("security docs reject stale notification preference docs", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      [
        'invoke("save_notification_preferences", {',
        "  per_source_settings: { linkedin: { min_score: 0.9 } },",
        "  thresholds: { slack: 0.9 },",
        "});",
        "",
      ].join("\n"),
    );

    assert.equal(
      hasStaleNotificationPreferenceDocs(root, "docs/features/user-data-management.md"),
      true,
    );
  });
});

test("security docs reject notification implementation shapes in user-data docs", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      "Notification settings control which saved searches and job sources can create alerts.\n",
    );
    assert.equal(
      hasStaleNotificationPreferenceDocs(root, "docs/features/user-data-management.md"),
      false,
    );
  });
});
