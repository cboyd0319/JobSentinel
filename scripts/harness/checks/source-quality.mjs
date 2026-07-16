import { readFileSync } from "node:fs";
import { join } from "node:path";

const databaseLogEmojiPaths = new Set([
  "crates/jobsentinel-storage/src/connection.rs",
  "crates/jobsentinel-storage/src/connection/backups.rs",
  "crates/jobsentinel-storage/src/integrity/mod.rs",
]);

const scoreReasonJsonParserPaths = new Set([
  "src/ui/score-display/internal/scoreReasons.ts",
  "src/features/dashboard/components/ScoreBreakdownModal.tsx",
  "src/features/dashboard/components/GhostIndicator.tsx",
]);

const storageJsonParserPaths = new Set([
  "src/features/applications/AnalyticsPanel.tsx",
  "src/features/applications/analyticsPanelModel.ts",
  "src/features/resumes/builder/AtsLiveScorePanel.tsx",
  "src/features/resumes/shared/resumeJobContext.ts",
]);

const staticCompanyFallbackPaths = new Set([
  "src/features/company-research/internal/directory/digitalEmployers.ts",
  "src/features/company-research/internal/directory/serviceAndPublicEmployers.ts",
  "src/features/company-research/internal/directory/specializedEmployers.ts",
]);

const settingsCredentialPaths = new Set([
  "src/features/settings/sources/SettingsJobSourcesSection.tsx",
  "src/features/settings/SettingsPage.tsx",
]);

const resumeImportPaths = new Set([
  "src/features/resumes/library/ResumeLibraryPage.tsx",
]);

const frontendStatusEmojiPaths = new Set([
  "src/features/applications/AnalyticsPanel.tsx",
  "src/features/settings/sources/browser-import/BrowserImportSection.tsx",
  "src/features/applications/InterviewScheduler.tsx",
  "src/features/applications/ApplicationsPage.tsx",
]);

const rawSalaryCommandLoggingPaths = new Set([
  "src-tauri/src/commands/salary.rs",
]);

const backendScoringReasonPaths = new Set([
  "crates/jobsentinel-storage/src/resume/matcher.rs",
  "crates/jobsentinel-application/src/scoring/mod.rs",
  "crates/jobsentinel-application/src/scoring/remote.rs",
]);

const notificationScoringReasonPaths = new Set([
  "crates/jobsentinel-notifications/src/discord.rs",
  "crates/jobsentinel-notifications/src/email.rs",
  "crates/jobsentinel-application/src/notify/mod.rs",
  "crates/jobsentinel-notifications/src/slack.rs",
  "crates/jobsentinel-notifications/src/teams.rs",
  "crates/jobsentinel-notifications/src/telegram.rs",
]);

export function hasRawSalaryCommandLogging(root, path) {
  if (!rawSalaryCommandLoggingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const stalePatterns = [
    /Command: predict_salary \(job: \{\}, years: \{:\?\}\)/,
    /Command: get_salary_benchmark \(title: \{\}, location: \{\}\)/,
    /tracing::info!\([\s\S]{0,240}"Command: get_salary_benchmark[\s\S]{0,240},\s*job_title,\s*location\s*\)/,
  ];

  return stalePatterns.some((pattern) => pattern.test(text));
}

function isRuntimeFrontendSource(path) {
  return (
    path.startsWith("src/") &&
    /\.(ts|tsx)$/.test(path) &&
    !path.endsWith(".d.ts") &&
    !/\.test\.(ts|tsx)$/.test(path) &&
    !/\.stories\.(ts|tsx)$/.test(path) &&
    path !== "src/test-support/mocks/handlers.ts"
  );
}

export function hasProductionSourceGlyphMarkers(root, path) {
  if (!isRuntimeFrontendSource(path)) {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|[\u{2705}\u{274c}\u{26a0}\u{2139}\u{2713}\u{2717}])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasBackendScoringReasonGlyphMarkers(root, path) {
  if (!backendScoringReasonPaths.has(path)) {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|[\u{2705}\u{274c}\u{26a0}\u{2139}\u{2713}\u{2717}\u{251c}\u{2514}\u{2500}\u{2022}])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasNotificationScoringReasonGlyphMarkers(root, path) {
  if (!notificationScoringReasonPaths.has(path)) {
    return false;
  }

  return /\u{2713}/u.test(readFileSync(join(root, path), "utf8"));
}

export function hasFrontendStatusEmojiMarkers(root, path) {
  if (!frontendStatusEmojiPaths.has(path)) {
    return false;
  }

  return /[⏳📝📞🎉✓✗]/u.test(readFileSync(join(root, path), "utf8"));
}

export function hasStaleScrapeAllStub(root, path) {
  if (path !== "crates/jobsentinel-sources/src/scrapers/mod.rs") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /pub async fn scrape_all\(\) -> Vec<Job>/.test(text) ||
    /legacy function, use scrape_all_parallel/.test(text)
  );
}

export function hasStaleResumeExportPdfStub(root, path) {
  if (path !== "crates/jobsentinel-documents/src/export.rs") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /Resume export functionality - PDF/.test(text) ||
    /printpdf =/.test(text) ||
    /pub fn export_pdf/.test(text) ||
    /PDF export not yet implemented/.test(text)
  );
}

function stripRustTestModules(text) {
  const testModuleIndex = text.search(/(?:^|\n)\s*#\[cfg\(test\)\]/);
  if (testModuleIndex === -1) {
    return text;
  }

  return text.slice(0, testModuleIndex);
}

export function hasDatabaseLogEmojiMarkers(root, path) {
  if (!databaseLogEmojiPaths.has(path)) {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|[✅❌⚠️✓✗←→])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasUnverifiedPreMigrationBackup(root, path) {
  if (path !== "crates/jobsentinel-storage/src/connection.rs") {
    return false;
  }

  const productionText = stripRustTestModules(
    readFileSync(join(root, path), "utf8"),
  );
  return (
    /VACUUM INTO/.test(productionText) &&
    (!/verify_pre_migration_backup/.test(productionText) ||
      !/PRAGMA pre_migration_backup\.quick_check/.test(productionText))
  );
}

export function hasOpaqueCommandUnitError(root, path) {
  if (!path.startsWith("src-tauri/src/commands/") || !path.endsWith(".rs")) {
    return false;
  }

  const productionText = stripRustTestModules(
    readFileSync(join(root, path), "utf8"),
  );
  return /#\[tauri::command\][\s\S]{0,320}->\s*Result\s*<[^>{;]*(?:<[^>]*>)?[^>{;]*,\s*\(\s*\)>/.test(
    productionText,
  );
}

export function hasUnsafeScoreReasonJsonParsing(root, path) {
  if (!scoreReasonJsonParserPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  if (path === "src/features/dashboard/components/GhostIndicator.tsx") {
    return (
      /return\s+JSON\.parse\(reasonsJson\)/.test(text) ||
      !/function\s+isGhostReason/.test(text) ||
      !/Array\.isArray\(parsed\)/.test(text) ||
      !/Number\.isFinite\(reason\.weight\)/.test(text)
    );
  }

  return (
    /const\s+reasons:\s*string\[\]\s*=\s*JSON\.parse\(reasonsJson\)/.test(
      text,
    ) ||
    !/function\s+parseReasonList/.test(text) ||
    !/Array\.isArray\(parsed\)/.test(text) ||
    !/typeof reason === "string"/.test(text)
  );
}

export function hasUnsafeStorageJsonParsing(root, path) {
  if (!storageJsonParserPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  if (
    path !== "src/features/resumes/builder/AtsLiveScorePanel.tsx" &&
    !/JSON\.parse\(/.test(text) &&
    !/readStorageValue\(/.test(text)
  ) {
    return false;
  }

  if (path === "src/features/applications/AnalyticsPanel.tsx") {
    if (/from "\.\/analyticsPanelModel"/.test(text)) {
      return false;
    }

    return (
      /return\s+stored\s+\?\s+JSON\.parse\(stored\)\s+:\s+null/.test(text) ||
      !/function\s+isWeeklyGoal/.test(text) ||
      !/removeStorageValue\("local",\s*WEEKLY_GOALS_KEY\)/.test(text)
    );
  }

  if (path === "src/features/applications/analyticsPanelModel.ts") {
    return (
      /return\s+stored\s+\?\s+JSON\.parse\(stored\)\s+:\s+null/.test(text) ||
      !/function\s+isWeeklyGoal/.test(text) ||
      !/removeStorageValue\("local",\s*WEEKLY_GOALS_KEY\)/.test(text)
    );
  }

  if (path === "src/features/resumes/builder/AtsLiveScorePanel.tsx") {
    return (
      /const\s+parsed\s*=\s*JSON\.parse\(stored\)/.test(text) ||
      /readStorageValue\("session",\s*["']jobContext["']\)/.test(text) ||
      !/takeStoredResumeJobContext/.test(text)
    );
  }

  if (path === "src/features/resumes/shared/resumeJobContext.ts") {
    return (
      !/function\s+isStoredResumeJobContext/.test(text) ||
      !/Number\.isFinite\(candidate\.timestamp\)/.test(text) ||
      !/typeof candidate\.description === "string"/.test(text) ||
      !/candidate\.description\.trim\(\)\.length > 0/.test(text) ||
      !/removeStorageValue\("session",\s*RESUME_JOB_CONTEXT_KEY\)/.test(text)
    );
  }

  return (
    /return\s+stored\s+\?\s+JSON\.parse\(stored\)\s+:\s+\{\}/.test(text) ||
    !/function\s+isCacheEntry/.test(text) ||
    !/function\s+isCompanyInfo/.test(text)
  );
}

export function hasStaticCompanyRatingFallback(root, path) {
  if (!staticCompanyFallbackPaths.has(path)) {
    return false;
  }

  return /\bglassdoorRating\s*:/.test(readFileSync(join(root, path), "utf8"));
}

export function hasFrontendFileUrlResumeImport(root, path) {
  if (!resumeImportPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /fetch\(\s*`file:\/\/\$\{filePath\}`\s*\)/.test(text) ||
    /@tauri-apps\/plugin-dialog[\s\S]{0,900}safeInvokeWithToast\(\s*["'`](?:upload_resume|import_json_resume_file)["'`]/.test(
      text,
    ) ||
    /JSON\.parse\(jsonString\)[\s\S]{0,520}safeInvokeWithToast\(\s*["'`]import_json_resume["'`]/.test(
      text,
    )
  );
}

export function hasNotificationWebhookSaveWithoutValidation(root, path) {
  if (!settingsCredentialPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const savesNotificationWebhook =
    /storeCredential\(\s*["'](?:slack|discord|teams)_webhook["']/.test(text);

  return (
    savesNotificationWebhook &&
    !/getCredentialValidationError\(\s*credentials\s*(?:,|\))/s.test(text)
  );
}

export function hasStaleSettingsPartialSaveMessage(root, path) {
  if (!settingsCredentialPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /credential\(s\) failed to save\. Config was saved/.test(text);
}

export function hasProductionExplicitAnySuppression(root, path) {
  if (!isRuntimeFrontendSource(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /eslint-disable(?:-next-line|-line)?\s+@typescript-eslint\/no-explicit-any/.test(
    text,
  );
}

export function hasProductionTypeErrorSuppression(root, path) {
  if (!isRuntimeFrontendSource(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /@ts-(?:expect-error|ignore)\b/.test(text);
}

export function hasProductionHookDependencySuppression(root, path) {
  if (!isRuntimeFrontendSource(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /eslint-disable(?:-next-line|-line)?\s+react-hooks\/exhaustive-deps/.test(
    text,
  );
}

export function hasProductionReactRefreshSuppression(root, path) {
  if (!isRuntimeFrontendSource(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /eslint-disable(?:-next-line|-line)?\s+react-refresh\/only-export-components/.test(
    text,
  );
}
