import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { checkRepoBloat } from "../../checks/repo-bloat.mjs";
import {
  createFixtureRunner,
  writeFixtureFile,
} from "../lib/filesystem-fixture.mjs";
const withGitFixture = createFixtureRunner(
  "jobsentinel-repo-bloat-privacy-ipc-",
  { git: true },
);

test("checkRepoBloat rejects raw JobsWithGPT smoke-test endpoint errors", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/health/smoke_checks/sources.rs",
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
      ["add", "package.json", "crates/jobsentinel-application/src/health/smoke_checks/sources.rs"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize JobsWithGPT smoke-test endpoint errors: crates/jobsentinel-application/src/health/smoke_checks/sources.rs",
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
      "crates/jobsentinel-application/src/scheduler/workers/scrapers.rs",
      "let jobswithgpt = JobsWithGptScraper::new(endpoint, query);\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "crates/jobsentinel-application/src/scheduler/workers/scrapers.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "record minimized JobsWithGPT source request history: crates/jobsentinel-application/src/scheduler/workers/scrapers.rs",
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
      "crates/jobsentinel-application/src/health/smoke_checks/mod.rs",
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
      ["add", "package.json", "crates/jobsentinel-application/src/health/smoke_checks/mod.rs"],
      {
        cwd: root,
      },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sanitize source-check result errors: crates/jobsentinel-application/src/health/smoke_checks/mod.rs",
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
      "crates/jobsentinel-sources/src/scrapers/linkedin.rs",
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
        "crates/jobsentinel-sources/src/scrapers/linkedin.rs",
        "docs/features/job-sources.md",
        "docs/features/job-source-status.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync LinkedIn credential docs with keyring login flow: crates/jobsentinel-sources/src/scrapers/linkedin.rs",
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
      "crates/jobsentinel-sources/src/scrapers/linkedin.rs",
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
      "src/dev-runtime/mocks/handlers.ts",
      "function defaults() { return { linkedin: { enabled: true } }; }\n",
    );
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      "linkedin: { enabled: true, minScoreThreshold: 70, soundEnabled: true }\n",
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-application/src/user_data/mod.rs",
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
        "crates/jobsentinel-sources/src/scrapers/linkedin.rs",
        "src/features/settings/SettingsPage.tsx",
        "src/features/settings/notifications/notificationPreferencesStore.ts",
        "src/features/settings/notifications/NotificationPreferences.tsx",
        "src/dev-runtime/mocks/handlers.ts",
        "docs/features/user-data-management.md",
        "crates/jobsentinel-application/src/user_data/mod.rs",
        "docs/features/job-sources.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove automated LinkedIn collection boundary drift: crates/jobsentinel-sources/src/scrapers/linkedin.rs",
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
        "remove LinkedIn notification source drift: src/dev-runtime/mocks/handlers.ts",
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
        "remove LinkedIn notification source drift: crates/jobsentinel-application/src/user_data/mod.rs",
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
      "crates/jobsentinel-storage/src/connection.rs",
      [
        'tracing::info!("🔧 Configuring SQLite with maximum protections and performance...");',
        'tracing::debug!("  ✓ WAL mode verified ✅");',
        'tracing::error!("  ❌ Foreign keys NOT enabled!");',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-storage/src/integrity/mod.rs",
      [
        'tracing::info!("🔍 Running database integrity check...");',
        'tracing::error!("❌ Quick check failed: {}", quick_result.message);',
        'tracing::info!("✅ Database integrity check passed ({:?})", start_time.elapsed());',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "crates/jobsentinel-storage/src/connection/backups.rs",
      'tracing::info!("✅ Database backup created");\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "crates/jobsentinel-storage/src/connection.rs",
        "crates/jobsentinel-storage/src/connection/backups.rs",
        "crates/jobsentinel-storage/src/integrity/mod.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace database log emoji markers: crates/jobsentinel-storage/src/connection.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace database log emoji markers: crates/jobsentinel-storage/src/integrity/mod.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace database log emoji markers: crates/jobsentinel-storage/src/connection/backups.rs",
      ),
      violations.join("\n"),
    );
  });
});
