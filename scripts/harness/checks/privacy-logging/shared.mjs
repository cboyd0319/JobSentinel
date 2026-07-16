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
  "src/features/settings/support/feedback/feedbackClient.ts",
]);

export const rawPrivateQueryLoggingPaths = new Set([
  "src-tauri/src/commands/automation.rs",
  "src-tauri/src/commands/jobs.rs",
  "crates/jobsentinel-storage/src/queries.rs",
]);

export const rawScraperLoggingPaths = new Set([
  "crates/jobsentinel-sources/src/scrapers/dice.rs",
  "crates/jobsentinel-sources/src/scrapers/glassdoor.rs",
  "crates/jobsentinel-sources/src/scrapers/greenhouse.rs",
  "crates/jobsentinel-network/src/external_request.rs",
  "crates/jobsentinel-sources/src/scrapers/jobswithgpt.rs",
  "crates/jobsentinel-sources/src/scrapers/lever/mod.rs",
  "crates/jobsentinel-sources/src/scrapers/linkedin.rs",
  "crates/jobsentinel-sources/src/scrapers/simplyhired.rs",
  "crates/jobsentinel-sources/src/scrapers/usajobs.rs",
]);

export const scraperLoopErrorLoggingPaths = new Set([
  "crates/jobsentinel-sources/src/scrapers/greenhouse.rs",
  "crates/jobsentinel-sources/src/scrapers/lever/mod.rs",
]);

export const rawLocalPathLoggingPaths = new Set([
  "src-tauri/src/commands/ml.rs",
  "src-tauri/src/commands/resume.rs",
  "crates/jobsentinel-assistance/src/automation/browser/page.rs",
  "crates/jobsentinel-assistance/src/automation/form_filler.rs",
  "crates/jobsentinel-storage/src/connection.rs",
  "crates/jobsentinel-storage/src/connection/backups.rs",
  "src-tauri/src/app.rs",
  "crates/jobsentinel-platform/src/linux/mod.rs",
  "crates/jobsentinel-platform/src/macos/mod.rs",
  "crates/jobsentinel-platform/src/windows/mod.rs",
]);

export const rawBackupPathErrorPaths = new Set([
  "crates/jobsentinel-storage/src/connection/backups.rs",
]);

export const mlRawLocalPathExposurePaths = new Set([
  "src-tauri/src/commands/ml.rs",
  "crates/jobsentinel-local-ai/src/model.rs",
]);

export const mlErrorDisplayPrivacyPaths = new Set([
  "crates/jobsentinel-local-ai/src/lib.rs",
]);

export const mlRawLocalPathDocPaths = new Set([
  "docs/developer/LOCAL_SEMANTIC_MATCHING.md",
  "docs/developer/LOCAL_SEMANTIC_MATCHING_QUICKSTART.md",
]);

export const jobsWithGptPrivacyPaths = new Set([
  "crates/jobsentinel-sources/src/scrapers/jobswithgpt.rs",
]);
export const linkedInPrivacyPaths = new Set([
  "crates/jobsentinel-sources/src/scrapers/linkedin.rs",
]);
export const linkedInAuthPrivacyPaths = new Set([
  "src-tauri/src/commands/linkedin_auth.rs",
]);
export const emailCommandPrivacyPaths = new Set([
  "src-tauri/src/commands/config.rs",
]);

export const credentialCommandPrivacyPaths = new Set([
  "src-tauri/src/commands/credentials.rs",
  "crates/jobsentinel-credentials/src/lib.rs",
]);

export const credentialStorageErrorPrivacyPaths = new Set([
  "crates/jobsentinel-credentials/src/lib.rs",
]);

export const credentialSecretReadIpcPaths = new Set([
  "src-tauri/src/commands/credentials.rs",
  "src-tauri/src/commands/mod.rs",
  "src-tauri/src/app.rs",
  "src/features/settings/sources/SettingsJobSourcesSection.tsx",
  "src/features/settings/SettingsPage.tsx",
  "src/test-support/mocks/handlers.ts",
  "src/features/settings/mocks/commands.ts",
  "docs/security/KEYRING.md",
  "docs/features/saved-secrets.md",
  "docs/releases/v2.0.md",
]);

export const configExportPrivacyPaths = new Set([
  "src/features/settings/support/settingsBackupFile.ts",
]);

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
  "crates/jobsentinel-notifications/src/telegram.rs",
]);

export const webhookNotificationPrivacyPaths = new Set([
  "crates/jobsentinel-notifications/src/discord.rs",
  "crates/jobsentinel-notifications/src/slack.rs",
  "crates/jobsentinel-notifications/src/teams.rs",
]);

export const notificationProviderErrorBodyPaths = new Set([
  "crates/jobsentinel-notifications/src/discord.rs",
  "crates/jobsentinel-notifications/src/teams.rs",
  "crates/jobsentinel-notifications/src/telegram.rs",
]);

export const externalAlertMatchReasonPaths = new Set([
  "crates/jobsentinel-notifications/src/discord.rs",
  "crates/jobsentinel-notifications/src/email.rs",
  "crates/jobsentinel-notifications/src/slack.rs",
  "crates/jobsentinel-notifications/src/teams.rs",
  "crates/jobsentinel-notifications/src/telegram.rs",
]);

export const notificationServicePrivacyPaths = new Set([
  "crates/jobsentinel-application/src/notify/mod.rs",
]);
export const frontendDesktopNotificationPrivacyPaths = new Set([
  "src/features/dashboard/notifications.ts",
]);
export const healthSmokePrivacyPaths = new Set([
  "crates/jobsentinel-application/src/health/smoke_checks/mod.rs",
  "crates/jobsentinel-application/src/health/smoke_checks/sources.rs",
]);

export const rawUrlLoggingPaths = new Set([
  "src-tauri/src/commands/linkedin_auth.rs",
  "crates/jobsentinel-assistance/src/automation/browser/manager.rs",
]);

export const rawUrlErrorDisplayPaths = new Set([
  "crates/jobsentinel-assistance/src/automation/error.rs",
  "crates/jobsentinel-network/src/body.rs",
  "crates/jobsentinel-sources/src/scrapers/error.rs",
]);

export const rawResumeParserPathDisplayPaths = new Set([
  "crates/jobsentinel-documents/src/parser.rs",
]);
export const rawResumeNameLoggingPaths = new Set([
  "src-tauri/src/commands/resume.rs",
]);

export const resumeCommandDtoPrivacyPaths = new Set([
  "src-tauri/src/commands/resume.rs",
  "src/features/resumes/library/ResumeLibraryPage.tsx",
  "src/features/resumes/builder/ResumeBuilderPage.tsx",
  "src/test-support/mocks/handlers.ts",
  "src/features/resumes/mocks/resumeCommands.ts",
]);

export const resumeCommandErrorPrivacyPaths = new Set([
  "src-tauri/src/commands/resume.rs",
]);
export const atsCommandErrorPrivacyPaths = new Set([
  "src-tauri/src/commands/ats.rs",
]);
export const atsTimelineEventPrivacyPaths = new Set([
  "crates/jobsentinel-storage/src/application_tracking/tracker.rs",
  "crates/jobsentinel-storage/src/application_tracking/reminders.rs",
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
  "src-tauri/src/app.rs",
]);

export const configValidationPrivacyPaths = new Set([
  "crates/jobsentinel-application/src/config/validation_error.rs",
]);

export const rawJobImportLoggingPaths = new Set([
  "src-tauri/src/commands/import.rs",
]);
export const importCommandPrivacyPaths = new Set([
  "src-tauri/src/commands/import.rs",
]);
export const rawImportRedirectDisplayPaths = new Set([
  "crates/jobsentinel-application/src/types.rs",
]);
export const urlSecurityPrivacyPaths = new Set([
  "crates/jobsentinel-security/src/url.rs",
]);

export const importBookmarkletCommandPrivacyPaths = new Set([
  "src-tauri/src/commands/import.rs",
  "src-tauri/src/commands/user_data.rs",
  "src-tauri/src/commands/scoring.rs",
  "src-tauri/src/commands/bookmarklet.rs",
  "crates/jobsentinel-assistance/src/bookmarklet/server.rs",
]);

export const rawBookmarkletLoggingPaths = new Set([
  "crates/jobsentinel-assistance/src/bookmarklet/server.rs",
]);
export const bookmarkletGeneratorPaths = new Set([
  "src/features/settings/sources/browser-import/BrowserImportSection.tsx",
]);

export const userDataPrivacyLoggingPaths = new Set([
  "src-tauri/src/commands/user_data.rs",
  "crates/jobsentinel-application/src/user_data/mod.rs",
]);

export const rawSchedulerJobContentLoggingPaths = new Set([
  "crates/jobsentinel-storage/src/crud.rs",
  "crates/jobsentinel-application/src/scheduler/workers/persistence.rs",
]);

export const schedulerScraperWorkerPrivacyPaths = new Set([
  "crates/jobsentinel-application/src/scheduler/workers/scrapers.rs",
]);

export const schedulerScoringPrivacyPaths = new Set([
  "crates/jobsentinel-application/src/scheduler/workers/scoring.rs",
  "crates/jobsentinel-storage/src/scoring_config.rs",
]);

export const scoringCachePrivacyPaths = new Set([
  "crates/jobsentinel-application/src/scoring/cache.rs",
]);

export const residualCorePrivacyPaths = new Set([
  "crates/jobsentinel-assistance/src/automation/browser/manager.rs",
  "crates/jobsentinel-application/src/config/io.rs",
  "crates/jobsentinel-storage/src/connection.rs",
  "crates/jobsentinel-sources/src/job_page/mod.rs",
  "crates/jobsentinel-local-ai/src/model.rs",
  "crates/jobsentinel-documents/src/parser.rs",
  "crates/jobsentinel-documents/src/templates.rs",
  "crates/jobsentinel-application/src/scheduler/mod.rs",
  "crates/jobsentinel-sources/src/scrapers/mod.rs",
  "crates/jobsentinel-sources/src/scrapers/usajobs.rs",
  "crates/jobsentinel-sources/src/scrapers/yc_startup.rs",
]);

export const rawAutomationQuestionLoggingPaths = new Set([
  "crates/jobsentinel-assistance/src/automation/form_filler.rs",
]);

export const automationFormPrivacyPaths = new Set([
  "crates/jobsentinel-assistance/src/automation/form_filler.rs",
  "src/test-support/mocks/handlers.ts",
  "src/features/application-assist/mocks/commands.ts",
]);

export const automationBrowserErrorPrivacyPaths = new Set([
  "crates/jobsentinel-assistance/src/automation/browser/manager.rs",
  "crates/jobsentinel-assistance/src/automation/browser/page.rs",
]);

export const screeningAnswerCommandLoggingPaths = new Set([
  "src-tauri/src/commands/automation.rs",
]);
export const rawNotificationJobTitleLoggingPaths = new Set([
  "crates/jobsentinel-application/src/notify/mod.rs",
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
