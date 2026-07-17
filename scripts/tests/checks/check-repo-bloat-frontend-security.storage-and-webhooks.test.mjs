import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { checkRepoBloat } from "../../checks/repo-bloat.mjs";
import {
  createFixtureRunner,
  writeFixtureFile,
} from "../lib/filesystem-fixture.mjs";
const withGitFixture = createFixtureRunner(
  "jobsentinel-repo-bloat-frontend-security-",
  { git: true },
);

test("checkRepoBloat rejects unsafe storage JSON parsing", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/applications/AnalyticsPanel.tsx",
      [
        "function getWeeklyGoal() {",
        "  const stored = readStorageValue('local', WEEKLY_GOALS_KEY);",
        "  return stored ? JSON.parse(stored) : null;",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/resumes/builder/AtsLiveScorePanel.tsx",
      [
        "function loadJobContext() {",
        "  const stored = readStorageValue('session', 'jobContext');",
        "  const parsed = JSON.parse(stored);",
        "  setJobDescription(parsed.description);",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/features/applications/AnalyticsPanel.tsx",
        "src/features/resumes/builder/AtsLiveScorePanel.tsx",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "validate storage JSON before rendering: src/features/applications/AnalyticsPanel.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "validate storage JSON before rendering: src/features/resumes/builder/AtsLiveScorePanel.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat accepts current frontend webhook redaction patterns", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/shared/errorReporting/errorReporter.ts",
      [
        "const WEBHOOK_PATTERN = /https:\\/\\/(?:hooks\\.slack\\.com|discord(?:app)?\\.com\\/api\\/webhooks|outlook\\.office(?:365)?\\.com\\/webhook)[^\\s]*/gi;",
        "const TOKEN_PATTERN = /token(?:\\s+|=)[^\\s&]+/gi;",
        "const SENSITIVE_KEY_PATTERN = /salary|screening[_-]?(?:question|answer)|private[_-]?notes?/i;",
        "const SENSITIVE_LABELED_TEXT_PATTERNS = [];",
        "function isErrorReport(report) { return true; }",
        "function parseStoredErrorReports(stored) { return JSON.parse(stored).filter(isErrorReport); }",
        "function sanitizeStoredReport(report) { return report; }",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src/shared/errorReporting/errorReporter.ts"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      !violations.includes(
        "sanitize frontend error report storage: src/shared/errorReporting/errorReporter.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects hardcoded frontend error export version", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/shared/errorReporting/errorReporter.ts",
      [
        "const WEBHOOK_PATTERN = /https:\\/\\/(?:hooks\\.slack\\.com|discord(?:app)?\\.com\\/api\\/webhooks|outlook\\.office(?:365)?\\.com\\/webhook)[^\\s]*/gi;",
        "function sanitizeStoredReport(report) { return report; }",
        "function exportErrors() {",
        "  return { app_version: '1.2.0' };",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src/shared/errorReporting/errorReporter.ts"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "derive frontend error export version from package metadata: src/shared/errorReporting/errorReporter.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects notification webhook saves without validation", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/settings/SettingsPage.tsx",
      [
        "async function handleSave(credentials) {",
        '  await storeCredential("discord_webhook", credentials.discord_webhook);',
        '  await storeCredential("teams_webhook", credentials.teams_webhook);',
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src/features/settings/SettingsPage.tsx"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "validate notification webhook settings before saving: src/features/settings/SettingsPage.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects notification webhook keyring storage without validation", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-credentials/src/lib.rs",
      [
        "enum CredentialKey { LinkedInCookie, SlackWebhook, DiscordWebhook, TeamsWebhook }",
        "fn validate_credential_value(key: CredentialKey, value: &str) -> Result<(), String> {",
        "  if key != CredentialKey::LinkedInCookie { return Ok(()); }",
        '  if value.len() > MAX_LINKEDIN_COOKIE_LEN { return Err("LinkedIn cookie is too long".to_string()); }',
        "  if value.chars().any(|ch| ch.is_ascii_control() || ch == ';') {",
        '    return Err("LinkedIn cookie contains unsupported characters".to_string());',
        "  }",
        "  Ok(())",
        "}",
        "fn store(key: CredentialKey, value: &str) -> Result<(), String> {",
        "  validate_credential_value(key, value)?;",
        "  Ok(())",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "crates/jobsentinel-credentials/src/lib.rs"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "validate notification webhook credentials before keyring storage: crates/jobsentinel-credentials/src/lib.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale active credential storage wording", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/config/types.rs",
      [
        "pub struct SlackConfig {",
        "  /// Webhook URL - stored in OS keyring, not serialized",
        "  pub webhook_url: String,",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "crates/jobsentinel-application/src/config/types.rs"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace stale OS-keyring credential storage wording: crates/jobsentinel-application/src/config/types.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale settings partial-save messages", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/settings/SettingsPage.tsx",
      [
        "async function handleSave(results) {",
        '  toast.warning("Partially saved", `${failures.length} credential(s) failed to save. Config was saved. Try saving again.`);',
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src/features/settings/SettingsPage.tsx"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "separate config save failures from credential save failures: src/features/settings/SettingsPage.tsx",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale feedback webhook sanitizer patterns", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/feedback/sanitizer.rs",
      [
        "static WEBHOOK_REGEX: Lazy<Regex> = Lazy::new(|| {",
        '    Regex::new(r"https://hooks\\.(slack|discord|teams)\\.com/[^\\s]+")',
        '        .expect("Webhook URL regex pattern is valid and should compile")',
        "});",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "src-tauri/src/ipc/feedback/sanitizer.rs"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "redact provider webhook URLs in feedback sanitizer: src-tauri/src/ipc/feedback/sanitizer.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale notification webhook docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/notifications.md",
      [
        "### URL Validation",
        "- **Slack:** Must start with `https://hooks.slack.com/services/`",
        "- **Discord:** Must start with `https://discord.com/api/webhooks/`",
        "- **Teams:** Must start with `https://outlook.office.com/webhook/`",
        "### Slack says token is invalid?",
        "Sign-in tokens are stored safely.",
        'Click "Send Test" to verify the connection.',
        "Discord embed looks broken? Check high scores and chat ID.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      'Test it by clicking "Send Test" in Settings.\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/notifications.md",
        "docs/user/QUICK_START.md",
      ],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "document all notification webhook provider hosts: docs/features/notifications.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "document all notification webhook provider hosts: docs/user/QUICK_START.md",
      ),
      violations.join("\n"),
    );
  });
});
