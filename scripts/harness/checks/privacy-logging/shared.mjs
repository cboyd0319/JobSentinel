export { existsSync, readFileSync } from "node:fs";
export { join } from "node:path";

export const frontendErrorReportingPaths = new Set([
  "src/shared/errorReporting/errorReporter.ts",
]);
export const frontendErrorLoggerPaths = new Set(["src/shared/errorReporting/logger.ts"]);
export const frontendToastSupportDetailPaths = new Set([
  "src/shared/tauri/commandClient.ts",
]);
export const frontendDirectErrorLoggingPaths = new Set([
  "src/features/settings/sources/browser-import/BrowserImportSection.tsx",
  "src/features/dashboard/errors/ComponentErrorBoundary.tsx",
  "src/features/search-links/SearchLinksPage.tsx",
  "src/app/errors/ErrorBoundary.tsx",
  "src/features/dashboard/errors/ModalErrorBoundary.tsx",
  "src/app/errors/PageErrorBoundary.tsx",
  "src/features/settings/support/feedback/useFeedback.ts",
  "src/services/feedbackService.ts",
]);

export const rawPrivateQueryLoggingPaths = new Set([
  "src-tauri/src/commands/automation.rs",
  "src-tauri/src/commands/jobs.rs",
  "src-tauri/src/core/db/queries.rs",
]);

export const rawScraperLoggingPaths = new Set([
  "src-tauri/src/core/scrapers/cache.rs",
  "src-tauri/src/core/scrapers/dice.rs",
  "src-tauri/src/core/scrapers/glassdoor.rs",
  "src-tauri/src/core/scrapers/greenhouse.rs",
  "src-tauri/src/core/scrapers/http_client.rs",
  "src-tauri/src/core/scrapers/jobswithgpt.rs",
  "src-tauri/src/core/scrapers/lever/mod.rs",
  "src-tauri/src/core/scrapers/linkedin.rs",
  "src-tauri/src/core/scrapers/simplyhired.rs",
  "src-tauri/src/core/scrapers/usajobs.rs",
]);

export const scraperLoopErrorLoggingPaths = new Set([
  "src-tauri/src/core/scrapers/greenhouse.rs",
  "src-tauri/src/core/scrapers/lever/mod.rs",
]);

export const rawLocalPathLoggingPaths = new Set([
  "src-tauri/src/commands/ml.rs",
  "src-tauri/src/commands/resume.rs",
  "src-tauri/src/core/automation/browser/page.rs",
  "src-tauri/src/core/automation/form_filler.rs",
  "src-tauri/src/core/db/connection.rs",
  "src-tauri/src/core/db/integrity/backups.rs",
  "src-tauri/src/main.rs",
  "src-tauri/src/platforms/linux/mod.rs",
  "src-tauri/src/platforms/macos/mod.rs",
  "src-tauri/src/platforms/windows/mod.rs",
]);

export const rawBackupPathErrorPaths = new Set([
  "src-tauri/src/core/db/integrity/backups.rs",
]);

export const mlRawLocalPathExposurePaths = new Set([
  "src-tauri/src/commands/ml.rs",
  "src-tauri/src/core/ml/model.rs",
]);

export const mlErrorDisplayPrivacyPaths = new Set([
  "src-tauri/src/core/ml/mod.rs",
]);

export const mlRawLocalPathDocPaths = new Set([
  "docs/developer/LOCAL_SEMANTIC_MATCHING.md",
  "docs/developer/LOCAL_SEMANTIC_MATCHING_QUICKSTART.md",
]);

export const jobsWithGptPrivacyPaths = new Set([
  "src-tauri/src/core/scrapers/jobswithgpt.rs",
]);
export const linkedInPrivacyPaths = new Set([
  "src-tauri/src/core/scrapers/linkedin.rs",
]);
export const linkedInAuthPrivacyPaths = new Set([
  "src-tauri/src/commands/linkedin_auth.rs",
]);
export const emailCommandPrivacyPaths = new Set([
  "src-tauri/src/commands/config.rs",
]);

export const credentialCommandPrivacyPaths = new Set([
  "src-tauri/src/commands/credentials.rs",
  "src-tauri/src/core/credentials/mod.rs",
]);

export const credentialStorageErrorPrivacyPaths = new Set([
  "src-tauri/src/core/credentials/mod.rs",
]);

export const credentialSecretReadIpcPaths = new Set([
  "src-tauri/src/commands/credentials.rs",
  "src-tauri/src/commands/mod.rs",
  "src-tauri/src/main.rs",
  "src/features/settings/sources/SettingsJobSourcesSection.tsx",
  "src/features/settings/SettingsPage.tsx",
  "src/mocks/handlers.ts",
  "docs/security/KEYRING.md",
  "docs/features/saved-secrets.md",
  "docs/releases/v2.0.md",
]);

export const configExportPrivacyPaths = new Set(["src/utils/export.ts"]);

export const feedbackSanitizerPaths = new Set([
  "src-tauri/src/commands/feedback/sanitizer.rs",
]);
export const structuredDebugLogPaths = new Set([
  "src-tauri/src/commands/feedback/debug_log.rs",
]);
export const feedbackCommandPaths = new Set([
  "src-tauri/src/commands/feedback/mod.rs",
]);

export const telegramNotificationPrivacyPaths = new Set([
  "src-tauri/src/core/notify/telegram.rs",
]);

export const webhookNotificationPrivacyPaths = new Set([
  "src-tauri/src/core/notify/discord.rs",
  "src-tauri/src/core/notify/slack.rs",
  "src-tauri/src/core/notify/teams.rs",
]);

export const notificationProviderErrorBodyPaths = new Set([
  "src-tauri/src/core/notify/discord.rs",
  "src-tauri/src/core/notify/teams.rs",
  "src-tauri/src/core/notify/telegram.rs",
]);

export const externalAlertMatchReasonPaths = new Set([
  "src-tauri/src/core/notify/discord.rs",
  "src-tauri/src/core/notify/email.rs",
  "src-tauri/src/core/notify/slack.rs",
  "src-tauri/src/core/notify/teams.rs",
  "src-tauri/src/core/notify/telegram.rs",
]);

export const notificationServicePrivacyPaths = new Set([
  "src-tauri/src/core/notify/mod.rs",
]);
export const frontendDesktopNotificationPrivacyPaths = new Set([
  "src/features/dashboard/notifications.ts",
]);
export const healthSmokePrivacyPaths = new Set([
  "src-tauri/src/core/health/smoke_tests.rs",
]);

export const rawUrlLoggingPaths = new Set([
  "src-tauri/src/commands/linkedin_auth.rs",
  "src-tauri/src/core/automation/browser/manager.rs",
  "src-tauri/src/core/scrapers/url_utils.rs",
]);

export const rawUrlErrorDisplayPaths = new Set([
  "src-tauri/src/core/automation/error.rs",
  "src-tauri/src/core/http_body.rs",
  "src-tauri/src/core/scrapers/error.rs",
]);

export const rawPathOrQueryErrorDisplayPaths = new Set([
  "src-tauri/src/core/db/error.rs",
]);
export const rawResumeParserPathDisplayPaths = new Set([
  "src-tauri/src/core/resume/parser.rs",
]);
export const rawResumeNameLoggingPaths = new Set([
  "src-tauri/src/commands/resume.rs",
]);

export const resumeCommandDtoPrivacyPaths = new Set([
  "src-tauri/src/commands/resume.rs",
  "src/features/resumes/library/ResumeLibraryPage.tsx",
  "src/features/resumes/builder/ResumeBuilderPage.tsx",
  "src/mocks/handlers.ts",
  "src/features/resumes/mocks/resumeCommands.ts",
  "docs/developer/ARCHITECTURE.md",
]);

export const resumeCommandErrorPrivacyPaths = new Set([
  "src-tauri/src/commands/resume.rs",
]);
export const atsCommandErrorPrivacyPaths = new Set([
  "src-tauri/src/commands/ats.rs",
]);
export const atsTimelineEventPrivacyPaths = new Set([
  "src-tauri/src/core/ats/tracker.rs",
  "src-tauri/src/core/ats/reminders.rs",
]);
export const automationCommandErrorPrivacyPaths = new Set([
  "src-tauri/src/commands/automation.rs",
]);

export const sensitiveCommandErrorPrivacyPaths = new Set([
  "src-tauri/src/commands/ml.rs",
  "src-tauri/src/commands/salary.rs",
  "src-tauri/src/commands/market.rs",
]);

export const utilityCommandErrorPrivacyPaths = new Set([
  "src-tauri/src/commands/jobs.rs",
  "src-tauri/src/commands/ghost.rs",
  "src-tauri/src/commands/deeplinks.rs",
  "src-tauri/src/commands/geo.rs",
  "src-tauri/src/commands/config.rs",
  "src-tauri/src/commands/linkedin_auth.rs",
]);

export const rawCommandSetupErrorDisplayPaths = new Set([
  "src-tauri/src/commands/config.rs",
  "src-tauri/src/commands/ghost.rs",
  "src-tauri/src/main.rs",
]);

export const configValidationPrivacyPaths = new Set([
  "src-tauri/src/core/config/validation_error.rs",
]);

export const rawJobImportLoggingPaths = new Set([
  "src-tauri/src/commands/import.rs",
]);
export const importCommandPrivacyPaths = new Set([
  "src-tauri/src/commands/import.rs",
]);
export const rawImportRedirectDisplayPaths = new Set([
  "src-tauri/src/core/import/types.rs",
]);
export const urlSecurityPrivacyPaths = new Set([
  "src-tauri/src/core/url_security.rs",
]);

export const importBookmarkletCommandPrivacyPaths = new Set([
  "src-tauri/src/commands/import.rs",
  "src-tauri/src/commands/user_data.rs",
  "src-tauri/src/commands/scoring.rs",
  "src-tauri/src/commands/bookmarklet.rs",
  "src-tauri/src/core/bookmarklet/server.rs",
]);

export const rawBookmarkletLoggingPaths = new Set([
  "src-tauri/src/core/bookmarklet/server.rs",
]);
export const bookmarkletGeneratorPaths = new Set([
  "src/features/settings/sources/browser-import/BrowserImportSection.tsx",
]);

export const userDataPrivacyLoggingPaths = new Set([
  "src-tauri/src/commands/user_data.rs",
  "src-tauri/src/core/user_data/mod.rs",
]);

export const rawSchedulerJobContentLoggingPaths = new Set([
  "src-tauri/src/core/db/crud.rs",
  "src-tauri/src/core/scheduler/workers/persistence.rs",
]);

export const schedulerScraperWorkerPrivacyPaths = new Set([
  "src-tauri/src/core/scheduler/workers/scrapers.rs",
]);

export const schedulerScoringPrivacyPaths = new Set([
  "src-tauri/src/core/scheduler/workers/scoring.rs",
  "src-tauri/src/core/scoring/db.rs",
]);

export const scoringCachePrivacyPaths = new Set([
  "src-tauri/src/core/scoring/cache.rs",
]);

export const residualCorePrivacyPaths = new Set([
  "src-tauri/src/core/automation/browser/manager.rs",
  "src-tauri/src/core/config/io.rs",
  "src-tauri/src/core/db/connection.rs",
  "src-tauri/src/core/db/error.rs",
  "src-tauri/src/core/import/schema_org.rs",
  "src-tauri/src/core/ml/model.rs",
  "src-tauri/src/core/resume/parser.rs",
  "src-tauri/src/core/resume/templates.rs",
  "src-tauri/src/core/scheduler/mod.rs",
  "src-tauri/src/core/scrapers/mod.rs",
  "src-tauri/src/core/scrapers/usajobs.rs",
  "src-tauri/src/core/scrapers/yc_startup.rs",
]);

export const rawAutomationQuestionLoggingPaths = new Set([
  "src-tauri/src/core/automation/form_filler.rs",
]);

export const automationFormPrivacyPaths = new Set([
  "src-tauri/src/core/automation/form_filler.rs",
  "src/mocks/handlers.ts",
]);

export const automationBrowserErrorPrivacyPaths = new Set([
  "src-tauri/src/core/automation/browser/manager.rs",
  "src-tauri/src/core/automation/browser/page.rs",
]);

export const screeningAnswerCommandLoggingPaths = new Set([
  "src-tauri/src/commands/automation.rs",
]);
export const rawNotificationJobTitleLoggingPaths = new Set([
  "src-tauri/src/core/notify/mod.rs",
]);

export function stripRustTestModules(text) {
  let output = text;

  output = output.replace(/#\[cfg\(test\)\]\s*mod\s+tests\s*\{[\s\S]*$/m, "");

  output = output.replace(
    /#\[cfg\(test\)\]\s*[\s\S]*?#\[test\][\s\S]*?\n\s*\}/g,
    "",
  );

  output = output.replace(
    /#\[test\]\s*fn\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}/g,
    "",
  );

  output = output.replace(
    /#\[tokio::test\]\s*async\s+fn\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}/g,
    "",
  );

  return output;
}

export function stripTypeScriptComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}
