import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasBackendScoringReasonGlyphMarkers,
  hasDatabaseLogEmojiMarkers,
  hasFrontendFileUrlResumeImport,
  hasFrontendStatusEmojiMarkers,
  hasNotificationScoringReasonGlyphMarkers,
  hasNotificationWebhookSaveWithoutValidation,
  hasOpaqueCommandUnitError,
  hasProductionExplicitAnySuppression,
  hasProductionHookDependencySuppression,
  hasProductionReactRefreshSuppression,
  hasProductionSourceGlyphMarkers,
  hasProductionTypeErrorSuppression,
  hasRawSalaryCommandLogging,
  hasStaticCompanyRatingFallback,
  hasStaleResumeExportPdfStub,
  hasStaleScrapeAllStub,
  hasStaleSettingsPartialSaveMessage,
  hasUnverifiedPreMigrationBackup,
  hasUnsafeScoreReasonJsonParsing,
  hasUnsafeStorageJsonParsing,
} from "../harness/checks/source-quality.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-source-quality-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("source quality rejects frontend glyphs and lint suppressions", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/features/market/MarketPage.tsx", 'icon: "📊";\n');
    writeFixtureFile(
      root,
      "src/features/market/TrendChart.tsx",
      "// eslint-disable-next-line @typescript-eslint/no-explicit-any\ntype Data = any;\n",
    );
    writeFixtureFile(root, "src/utils/vitals.ts", "// @ts-expect-error\nperformance.memory;\n");
    writeFixtureFile(
      root,
      "src/components/CompanyResearchPanel.tsx",
      "// eslint-disable-next-line react-hooks/exhaustive-deps\n",
    );
    writeFixtureFile(
      root,
      "src/contexts/UndoContext.tsx",
      "// eslint-disable-next-line react-refresh/only-export-components\n",
    );
    writeFixtureFile(root, "src/features/applications/InterviewScheduler.tsx", "<Button>✓ Passed</Button>\n");

    assert.equal(hasProductionSourceGlyphMarkers(root, "src/features/market/MarketPage.tsx"), true);
    assert.equal(hasProductionExplicitAnySuppression(root, "src/features/market/TrendChart.tsx"), true);
    assert.equal(hasProductionTypeErrorSuppression(root, "src/utils/vitals.ts"), true);
    assert.equal(
      hasProductionHookDependencySuppression(root, "src/components/CompanyResearchPanel.tsx"),
      true,
    );
    assert.equal(hasProductionReactRefreshSuppression(root, "src/contexts/UndoContext.tsx"), true);
    assert.equal(hasFrontendStatusEmojiMarkers(root, "src/features/applications/InterviewScheduler.tsx"), true);
  });
});

test("source quality ignores test and mock frontend files for production source checks", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/mocks/handlers.ts", 'icon: "📊";\n');
    writeFixtureFile(root, "src/components/Example.test.tsx", "// @ts-ignore\n");

    assert.equal(hasProductionSourceGlyphMarkers(root, "src/mocks/handlers.ts"), false);
    assert.equal(hasProductionTypeErrorSuppression(root, "src/components/Example.test.tsx"), false);
  });
});

test("source quality rejects backend glyphs and stale Rust stubs", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src-tauri/src/core/scoring/mod.rs", '"✓ Title matches";\n');
    writeFixtureFile(root, "src-tauri/src/core/notify/slack.rs", '"✓ Title matches";\n');
    writeFixtureFile(root, "src-tauri/src/core/db/connection.rs", 'info!("✅ connected");\n');
    writeFixtureFile(root, "src-tauri/src/core/scrapers/mod.rs", "pub async fn scrape_all() -> Vec<Job> {}\n");
    writeFixtureFile(root, "src-tauri/src/core/resume/export.rs", "pub fn export_pdf() {}\n");

    assert.equal(
      hasBackendScoringReasonGlyphMarkers(root, "src-tauri/src/core/scoring/mod.rs"),
      true,
    );
    assert.equal(
      hasNotificationScoringReasonGlyphMarkers(root, "src-tauri/src/core/notify/slack.rs"),
      true,
    );
    assert.equal(hasDatabaseLogEmojiMarkers(root, "src-tauri/src/core/db/connection.rs"), true);
    assert.equal(hasStaleScrapeAllStub(root, "src-tauri/src/core/scrapers/mod.rs"), true);
    assert.equal(hasStaleResumeExportPdfStub(root, "src-tauri/src/core/resume/export.rs"), true);
  });
});

test("source quality rejects opaque command unit errors outside Rust tests", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/commands/cache.rs",
      "#[tauri::command]\npub async fn get_cache_health() -> Result<serde_json::Value, ()> { Ok(json!({})) }\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/test_only.rs",
      "#[cfg(test)]\n#[tauri::command]\npub async fn test_command() -> Result<(), ()> { Ok(()) }\n",
    );

    assert.equal(hasOpaqueCommandUnitError(root, "src-tauri/src/commands/cache.rs"), true);
    assert.equal(hasOpaqueCommandUnitError(root, "src-tauri/src/commands/test_only.rs"), false);
  });
});

test("source quality requires verified pre-migration SQLite backups", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/connection.rs",
      'sqlx::query("VACUUM INTO ?").execute(pool).await?;\n',
    );

    assert.equal(
      hasUnverifiedPreMigrationBackup(root, "src-tauri/src/core/db/connection.rs"),
      true,
    );

    writeFixtureFile(
      root,
      "src-tauri/src/core/db/connection.rs",
      [
        'sqlx::query("VACUUM INTO ?").execute(pool).await?;',
        "Self::verify_pre_migration_backup(pool, backup_path_str).await?;",
        "async fn verify_pre_migration_backup() {",
        '  sqlx::query_scalar::<_, String>("PRAGMA pre_migration_backup.quick_check");',
        "}",
        "",
      ].join("\n"),
    );

    assert.equal(
      hasUnverifiedPreMigrationBackup(root, "src-tauri/src/core/db/connection.rs"),
      false,
    );
  });
});

test("source quality rejects unsafe rendered JSON parsing", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/components/ScoreDisplay.tsx",
      "const reasons: string[] = JSON.parse(reasonsJson);\n",
    );
    writeFixtureFile(
      root,
      "src/components/GhostIndicator.tsx",
      "function parseReasons(reasonsJson) { return JSON.parse(reasonsJson); }\n",
    );
    writeFixtureFile(
      root,
      "src/features/applications/AnalyticsPanel.tsx",
      "return stored ? JSON.parse(stored) : null;\n",
    );
    writeFixtureFile(
      root,
      "src/components/AtsLiveScorePanel.tsx",
      "const parsed = JSON.parse(stored);\n",
    );
    writeFixtureFile(
      root,
      "src/utils/resumeJobContext.ts",
      "export function readStoredResumeJobContext() { return JSON.parse(stored); }\n",
    );

    assert.equal(hasUnsafeScoreReasonJsonParsing(root, "src/components/ScoreDisplay.tsx"), true);
    assert.equal(hasUnsafeScoreReasonJsonParsing(root, "src/components/GhostIndicator.tsx"), true);
    assert.equal(hasUnsafeStorageJsonParsing(root, "src/features/applications/AnalyticsPanel.tsx"), true);
    assert.equal(hasUnsafeStorageJsonParsing(root, "src/components/AtsLiveScorePanel.tsx"), true);
    assert.equal(hasUnsafeStorageJsonParsing(root, "src/utils/resumeJobContext.ts"), true);
  });
});

test("source quality requires ATS job context to be consumed from session storage", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/components/AtsLiveScorePanel.tsx",
      'import { readStoredResumeJobContext } from "../utils/resumeJobContext";\nreadStoredResumeJobContext();\n',
    );

    assert.equal(hasUnsafeStorageJsonParsing(root, "src/components/AtsLiveScorePanel.tsx"), true);

    writeFixtureFile(
      root,
      "src/components/AtsLiveScorePanel.tsx",
      'import { takeStoredResumeJobContext } from "../utils/resumeJobContext";\ntakeStoredResumeJobContext();\n',
    );

    assert.equal(hasUnsafeStorageJsonParsing(root, "src/components/AtsLiveScorePanel.tsx"), false);
  });
});

test("source quality accepts analytics storage validation in model helper", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/applications/AnalyticsPanel.tsx",
      'import { getWeeklyGoal } from "../analyticsPanelModel";\ngetWeeklyGoal();\n',
    );
    writeFixtureFile(
      root,
      "src/features/applications/analyticsPanelModel.ts",
      [
        'const WEEKLY_GOALS_KEY = "jobsentinel_weekly_goals";',
        "export function getWeeklyGoal() {",
        "  try {",
        "    const parsed = JSON.parse(stored);",
        "    if (isWeeklyGoal(parsed)) return parsed;",
        '    removeStorageValue("local", WEEKLY_GOALS_KEY);',
        "    return null;",
        "  } catch {",
        '    removeStorageValue("local", WEEKLY_GOALS_KEY);',
        "    return null;",
        "  }",
        "}",
        "function isWeeklyGoal(value) {",
        "  return Number.isFinite(value.target);",
        "}",
        "",
      ].join("\n"),
    );

    assert.equal(hasUnsafeStorageJsonParsing(root, "src/features/applications/AnalyticsPanel.tsx"), false);
    assert.equal(hasUnsafeStorageJsonParsing(root, "src/features/applications/analyticsPanelModel.ts"), false);
  });
});

test("source quality rejects unsafe analytics storage model helper", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/applications/analyticsPanelModel.ts",
      "return stored ? JSON.parse(stored) : null;\n",
    );

    assert.equal(hasUnsafeStorageJsonParsing(root, "src/features/applications/analyticsPanelModel.ts"), true);
  });
});

test("source quality rejects frontend file URL resume imports", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/pages/Resume.tsx",
      [
        "const response = await fetch(`file://${filePath}`);",
        "const jsonString = await response.text();",
        "JSON.parse(jsonString);",
        'await safeInvokeWithToast("import_json_resume", { name: fileName, jsonString }, toast);',
        "",
      ].join("\n"),
    );

    assert.equal(hasFrontendFileUrlResumeImport(root, "src/pages/Resume.tsx"), true);
  });
});

test("source quality rejects renderer-owned resume file picker imports", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/pages/Resume.tsx",
      [
        'import { open } from "@tauri-apps/plugin-dialog";',
        "const selected = await open({ multiple: false });",
        'await safeInvokeWithToast("import_json_resume_file", { filePath: selected }, toast);',
        "",
      ].join("\n"),
    );

    assert.equal(hasFrontendFileUrlResumeImport(root, "src/pages/Resume.tsx"), true);
  });
});

test("source quality rejects unsafe settings saves and raw salary logging", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
      [
        'await storeCredential("discord_webhook", credentials.discord_webhook);',
        'toast.warning("Partially saved", `${failures.length} credential(s) failed to save. Config was saved.`);',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/salary.rs",
      'tracing::info!("Command: get_salary_benchmark (title: {}, location: {})", job_title, location);\n',
    );

    assert.equal(hasNotificationWebhookSaveWithoutValidation(root, "src/pages/Settings.tsx"), true);
    assert.equal(hasStaleSettingsPartialSaveMessage(root, "src/pages/Settings.tsx"), true);
    assert.equal(hasRawSalaryCommandLogging(root, "src-tauri/src/commands/salary.rs"), true);
  });
});

test("source quality accepts expanded credential validation arguments", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
      [
        "const credentialValidationError = getCredentialValidationError(",
        "  credentials,",
        "  config,",
        "  credentialStatus,",
        ");",
        'await storeCredential("discord_webhook", credentials.discord_webhook);',
        "",
      ].join("\n"),
    );

    assert.equal(hasNotificationWebhookSaveWithoutValidation(root, "src/pages/Settings.tsx"), false);
  });
});

test("source quality rejects static company fallback ratings", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/components/CompanyResearchPanel.tsx",
      [
        "const KNOWN_COMPANIES = {",
        "  example: {",
        '    industry: "Healthcare",',
        "    glassdoorRating: 4.7,",
        "  },",
        "};",
        "",
        "async function fetchCompanyInfo(companyName) { return companyName; }",
        "",
      ].join("\n"),
    );

    assert.equal(
      hasStaticCompanyRatingFallback(root, "src/components/CompanyResearchPanel.tsx"),
      true,
    );
  });
});
