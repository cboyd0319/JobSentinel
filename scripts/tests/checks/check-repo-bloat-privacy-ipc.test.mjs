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
    join(tmpdir(), "jobsentinel-repo-bloat-privacy-ipc-"),
  );

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects renderer credential secret read IPC", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/credentials.rs",
      [
        "pub async fn retrieve_credential(key: String) -> Result<Option<String>, String> {",
        "  CredentialStore::retrieve(parse_credential_key(&key)?)",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/settings/SettingsPage.tsx",
      [
        "async function retrieveCredential(key: CredentialKey): Promise<string | null> {",
        "  return await invoke<string | null>('retrieve_credential', { key });",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/security/KEYRING.md",
      ['invoke("retrieve_credential", { key })', ""].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/ipc/credentials.rs",
        "src/features/settings/SettingsPage.tsx",
        "docs/security/KEYRING.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "keep credential values out of renderer IPC: src-tauri/src/ipc/credentials.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "keep credential values out of renderer IPC: src/features/settings/SettingsPage.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "keep credential values out of renderer IPC: docs/security/KEYRING.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects resume renderer DTO path exposure", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/resume.rs",
      [
        "pub async fn get_active_resume() -> Result<Option<Resume>, String> { todo!() }",
        "pub async fn list_all_resumes() -> Result<Vec<Resume>, String> { todo!() }",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/resumes/library/ResumeLibraryPage.tsx",
      [
        "interface ResumeData {",
        "  id: number;",
        "  file_path: string;",
        "}",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/resumes/builder/ResumeBuilderPage.tsx",
      [
        "interface Resume {",
        "  id: number;",
        "  parsed_text: string | null;",
        "}",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/dev-runtime/mocks/handlers.ts",
      [
        'case "get_active_resume":',
        "  return getActiveResume() as T;",
        'case "list_all_resumes":',
        "  return resumes as T;",
        "",
      ].join("\n"),
    );
    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/ipc/resume.rs",
        "src/features/resumes/library/ResumeLibraryPage.tsx",
        "src/features/resumes/builder/ResumeBuilderPage.tsx",
        "src/dev-runtime/mocks/handlers.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src-tauri/src/ipc/resume.rs",
      "src/features/resumes/library/ResumeLibraryPage.tsx",
      "src/features/resumes/builder/ResumeBuilderPage.tsx",
      "src/dev-runtime/mocks/handlers.ts",
    ]) {
      assert.ok(
        violations.includes(
          `hide resume file paths from renderer DTOs: ${path}`,
        ),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects incomplete config export redaction", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/features/settings/support/settingsBackupFile.ts",
      [
        "function sanitizeConfigForExport(config) {",
        "  const sanitized = JSON.parse(JSON.stringify(config));",
        "  sanitized.alerts.email.smtp_password = '';",
        "  sanitized.linkedin.session_cookie = '';",
        "  return sanitized;",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/features/settings/support/settingsBackupFile.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "redact all credential fields from config export: src/features/settings/support/settingsBackupFile.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw Telegram bot-token request errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-notifications/src/telegram.rs",
      [
        'let api_url = format!("https://api.telegram.org/bot{}/sendMessage", config.bot_token);',
        "let response = client.post(&api_url).json(&payload).send().await?;",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "crates/jobsentinel-notifications/src/telegram.rs"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove Telegram bot-token URLs from request errors: crates/jobsentinel-notifications/src/telegram.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw webhook token request errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    for (const path of [
      "crates/jobsentinel-notifications/src/slack.rs",
      "crates/jobsentinel-notifications/src/discord.rs",
      "crates/jobsentinel-notifications/src/teams.rs",
    ]) {
      writeFixtureFile(
        root,
        path,
        [
          "async fn send(webhook_url: &str) -> anyhow::Result<()> {",
          "  let response = client.post(webhook_url).json(&payload).send().await?;",
          "  Ok(())",
          "}",
          "",
        ].join("\n"),
      );
    }

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "crates/jobsentinel-notifications/src/slack.rs",
        "crates/jobsentinel-notifications/src/discord.rs",
        "crates/jobsentinel-notifications/src/teams.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "crates/jobsentinel-notifications/src/slack.rs",
      "crates/jobsentinel-notifications/src/discord.rs",
      "crates/jobsentinel-notifications/src/teams.rs",
    ]) {
      assert.ok(
        violations.includes(
          `remove webhook token URLs from request errors: ${path}`,
        ),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects notification provider error body exposure", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    for (const path of [
      "crates/jobsentinel-notifications/src/discord.rs",
      "crates/jobsentinel-notifications/src/teams.rs",
      "crates/jobsentinel-notifications/src/telegram.rs",
    ]) {
      writeFixtureFile(
        root,
        path,
        [
          "async fn send() -> anyhow::Result<()> {",
          '  let error_text = read_text_with_limit(response, "https://example.test").await?;',
          '  return Err(anyhow!("Provider failed: {}", error_text));',
          "}",
          "",
        ].join("\n"),
      );
    }

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "crates/jobsentinel-notifications/src/discord.rs",
        "crates/jobsentinel-notifications/src/teams.rs",
        "crates/jobsentinel-notifications/src/telegram.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "crates/jobsentinel-notifications/src/discord.rs",
      "crates/jobsentinel-notifications/src/teams.rs",
      "crates/jobsentinel-notifications/src/telegram.rs",
    ]) {
      assert.ok(
        violations.includes(
          `omit notification provider error bodies from errors: ${path}`,
        ),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects raw notification service error details", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/notify/mod.rs",
      [
        "pub async fn send_immediate_alert() -> anyhow::Result<()> {",
        "  if let Err(e) = send_slack().await {",
        '    tracing::error!("Failed to send Slack notification: {}", e);',
        '    errors.push(format!("Slack: {}", e));',
        "  }",
        "  if let Err(e) = CredentialStore::retrieve(CredentialKey::TelegramBotToken) {",
        '    tracing::error!("Failed to retrieve Telegram bot token from keyring: {}", e);',
        '    errors.push(format!("Telegram: {}", e));',
        "  }",
        "  Ok(())",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "crates/jobsentinel-application/src/notify/mod.rs"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize notification service error details: crates/jobsentinel-application/src/notify/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});
