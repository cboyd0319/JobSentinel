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

test("checkRepoBloat rejects renderer credential secret read IPC", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/credentials.rs",
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
        "src-tauri/src/commands/credentials.rs",
        "src/features/settings/SettingsPage.tsx",
        "docs/security/KEYRING.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "keep credential values out of renderer IPC: src-tauri/src/commands/credentials.rs",
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
      "src-tauri/src/commands/resume.rs",
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
      "src/mocks/handlers.ts",
      [
        'case "get_active_resume":',
        "  return getActiveResume() as T;",
        'case "list_all_resumes":',
        "  return resumes as T;",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      'const activeResume = await invoke<Resume>("get_active_resume");\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/resume.rs",
        "src/features/resumes/library/ResumeLibraryPage.tsx",
        "src/features/resumes/builder/ResumeBuilderPage.tsx",
        "src/mocks/handlers.ts",
        "docs/developer/ARCHITECTURE.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "src-tauri/src/commands/resume.rs",
      "src/features/resumes/library/ResumeLibraryPage.tsx",
      "src/features/resumes/builder/ResumeBuilderPage.tsx",
      "src/mocks/handlers.ts",
      "docs/developer/ARCHITECTURE.md",
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
      "crates/jobsentinel-core/src/core/notify/telegram.rs",
      [
        'let api_url = format!("https://api.telegram.org/bot{}/sendMessage", config.bot_token);',
        "let response = client.post(&api_url).json(&payload).send().await?;",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "crates/jobsentinel-core/src/core/notify/telegram.rs"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove Telegram bot-token URLs from request errors: crates/jobsentinel-core/src/core/notify/telegram.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw webhook token request errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    for (const path of [
      "crates/jobsentinel-core/src/core/notify/slack.rs",
      "crates/jobsentinel-core/src/core/notify/discord.rs",
      "crates/jobsentinel-core/src/core/notify/teams.rs",
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
        "crates/jobsentinel-core/src/core/notify/slack.rs",
        "crates/jobsentinel-core/src/core/notify/discord.rs",
        "crates/jobsentinel-core/src/core/notify/teams.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "crates/jobsentinel-core/src/core/notify/slack.rs",
      "crates/jobsentinel-core/src/core/notify/discord.rs",
      "crates/jobsentinel-core/src/core/notify/teams.rs",
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
      "crates/jobsentinel-core/src/core/notify/discord.rs",
      "crates/jobsentinel-core/src/core/notify/teams.rs",
      "crates/jobsentinel-core/src/core/notify/telegram.rs",
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
        "crates/jobsentinel-core/src/core/notify/discord.rs",
        "crates/jobsentinel-core/src/core/notify/teams.rs",
        "crates/jobsentinel-core/src/core/notify/telegram.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "crates/jobsentinel-core/src/core/notify/discord.rs",
      "crates/jobsentinel-core/src/core/notify/teams.rs",
      "crates/jobsentinel-core/src/core/notify/telegram.rs",
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
      "crates/jobsentinel-core/src/core/notify/mod.rs",
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
      ["add", "package.json", "crates/jobsentinel-core/src/core/notify/mod.rs"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize notification service error details: crates/jobsentinel-core/src/core/notify/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw JobsWithGPT smoke-test endpoint errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/health/smoke_tests.rs",
      [
        "match resp {",
        "  Err(e) if e.is_connect() => Ok(serde_json::json!({",
        '    "status": "unreachable",',
        '    "error": e.to_string()',
        "  })),",
        "  Err(e) => Err(e.into()),",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "crates/jobsentinel-core/src/core/health/smoke_tests.rs"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize JobsWithGPT smoke-test endpoint errors: crates/jobsentinel-core/src/core/health/smoke_tests.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects missing JobsWithGPT request ledger", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/scheduler/workers/scrapers.rs",
      "let jobswithgpt = JobsWithGptScraper::new(endpoint, query);\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "crates/jobsentinel-core/src/core/scheduler/workers/scrapers.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "record minimized JobsWithGPT source request history: crates/jobsentinel-core/src/core/scheduler/workers/scrapers.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw source-check result errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/health/smoke_tests.rs",
      [
        "let smoke_result = match result {",
        "  Err(e) => SmokeTestResult {",
        "    passed: false,",
        "    error: Some(e.to_string()),",
        "    details: Some(serde_json::json!({",
        '      "error": format!("connect error: {}", e.without_url())',
        "    })),",
        "  },",
        "};",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "crates/jobsentinel-core/src/core/health/smoke_tests.rs"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize source-check result errors: crates/jobsentinel-core/src/core/health/smoke_tests.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale LinkedIn credential docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/scrapers/linkedin.rs",
      [
        "//! The user must provide their LinkedIn session cookie",
        "//! via the config file.",
        "//! - Uses ONLY the user's own session cookie (no credential storage)",
        "//! 2. Open DevTools (F12) -> Application -> Cookies",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/job-source-status.md",
      [
        "Refresh Instructions:",
        "2. Open DevTools (F12)",
        "3. Find and copy **li_at** value",
        "4. Paste into Settings > Scrapers > LinkedIn",
        "Click **Update LinkedIn Cookie**",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/job-sources.md",
      [
        "- **Your Cookie Only:** No credentials stored, uses your own session",
        "- **Session Expiry:** Cookie expires after ~90 days, requires refresh",
        "- [ ] **Interactive Login:** No manual cookie extraction",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "crates/jobsentinel-core/src/core/scrapers/linkedin.rs",
        "docs/features/job-sources.md",
        "docs/features/job-source-status.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync LinkedIn credential docs with keyring login flow: crates/jobsentinel-core/src/core/scrapers/linkedin.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync LinkedIn credential docs with keyring login flow: docs/features/job-source-status.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync LinkedIn credential docs with keyring login flow: docs/features/job-sources.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects automated LinkedIn collection drift", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/scrapers/linkedin.rs",
      'const URL: &str = "https://www.linkedin.com/voyager/api/example";\n',
    );
    writeFixtureFile(
      root,
      "src/features/settings/SettingsPage.tsx",
      'await invoke("linkedin_login");\n',
    );
    writeFixtureFile(
      root,
      "src/features/settings/notifications/notificationPreferencesStore.ts",
      "export const DEFAULT_PREFERENCES = { linkedin: { enabled: true } };\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/notifications/NotificationPreferences.tsx",
      "const SOURCE_INFO = { linkedin: { name: 'LinkedIn' } };\n",
    );
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      "function defaults() { return { linkedin: { enabled: true } }; }\n",
    );
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      "linkedin: { enabled: true, minScoreThreshold: 70, soundEnabled: true }\n",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/user_data/mod.rs",
      "let linkedin = SourceNotificationConfig { enabled: true, min_score_threshold: 70, sound_enabled: true };\n",
    );
    writeFixtureFile(
      root,
      "docs/features/job-sources.md",
      `Click **${["Connect", "LinkedIn"].join(" ")}** to run the ${["LinkedIn", "scraper"].join(" ")}.\n`,
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "crates/jobsentinel-core/src/core/scrapers/linkedin.rs",
        "src/features/settings/SettingsPage.tsx",
        "src/features/settings/notifications/notificationPreferencesStore.ts",
        "src/features/settings/notifications/NotificationPreferences.tsx",
        "src/mocks/handlers.ts",
        "docs/features/user-data-management.md",
        "crates/jobsentinel-core/src/core/user_data/mod.rs",
        "docs/features/job-sources.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove automated LinkedIn collection boundary drift: crates/jobsentinel-core/src/core/scrapers/linkedin.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove automated LinkedIn collection boundary drift: src/features/settings/SettingsPage.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove LinkedIn notification source drift: src/features/settings/notifications/notificationPreferencesStore.ts",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove LinkedIn notification source drift: src/features/settings/notifications/NotificationPreferences.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove LinkedIn notification source drift: src/mocks/handlers.ts",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove LinkedIn notification source drift: docs/features/user-data-management.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove LinkedIn notification source drift: crates/jobsentinel-core/src/core/user_data/mod.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove automated LinkedIn collection boundary drift: docs/features/job-sources.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects database log emoji markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/db/connection.rs",
      [
        'tracing::info!("🔧 Configuring SQLite with maximum protections and performance...");',
        'tracing::debug!("  ✓ WAL mode verified ✅");',
        'tracing::error!("  ❌ Foreign keys NOT enabled!");',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/db/integrity/diagnostics.rs",
      'tracing::warn!("⚠️ WAL checkpoint partially complete (database was busy)");\n',
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/db/integrity/mod.rs",
      [
        'tracing::info!("🔍 Running database integrity check...");',
        'tracing::error!("❌ Quick check failed: {}", quick_result.message);',
        'tracing::info!("✅ Database integrity check passed ({:?})", start_time.elapsed());',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-core/src/core/db/integrity/backups.rs",
      'tracing::info!("✅ Database restored successfully");\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "crates/jobsentinel-core/src/core/db/connection.rs",
        "crates/jobsentinel-core/src/core/db/integrity/backups.rs",
        "crates/jobsentinel-core/src/core/db/integrity/diagnostics.rs",
        "crates/jobsentinel-core/src/core/db/integrity/mod.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace database log emoji markers: crates/jobsentinel-core/src/core/db/connection.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace database log emoji markers: crates/jobsentinel-core/src/core/db/integrity/diagnostics.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace database log emoji markers: crates/jobsentinel-core/src/core/db/integrity/mod.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace database log emoji markers: crates/jobsentinel-core/src/core/db/integrity/backups.rs",
      ),
      violations.join("\n"),
    );
  });
});
