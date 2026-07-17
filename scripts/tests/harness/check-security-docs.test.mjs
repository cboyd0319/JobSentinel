import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
  hasUnsafeKeyringMigration,
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

test("security docs reject unsafe keyring migration", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/desktop/startup.rs",
      'tracing::info!("✓ Migrated {:?} to secure storage", key);\n// even if partial\n',
    );

    assert.equal(
      hasUnsafeKeyringMigration(
        root,
        "crates/jobsentinel-application/src/desktop/startup.rs",
      ),
      true,
    );
  });
});

test("security docs allow secure-storage migration retry marker", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/desktop/startup.rs",
      [
        "let mark_migration_complete = migration_success;",
        'tracing::warn!("Secure-storage migration incomplete; will retry on next startup");',
        "if mark_migration_complete { migration::set_migrated(); }",
      ].join("\n"),
    );

    assert.equal(
      hasUnsafeKeyringMigration(
        root,
        "crates/jobsentinel-application/src/desktop/startup.rs",
      ),
      false,
    );
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
