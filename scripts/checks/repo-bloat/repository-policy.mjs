import {
  hasDirectPlaywrightE2eScript,
  hasRedundantDirectPlaywrightDependency,
  hasRedundantDomPurifyTypesDependency,
  hasTailwindPostcssPlugin,
  hasUnownedStorybookAddon,
} from "../../harness/checks/dependency-ownership.mjs";
import { hasUnreferencedE2eTestHelper } from "../../harness/checks/e2e-helpers.mjs";
import {
  hasResumeSuggestionCategoryDrift,
  hasStaleAtsKeywordMatchFrontendShape,
  hasStaleDeepLinkMockHandlers,
  hasStaleFeedbackMockHandlers,
  hasStaleFeedbackSystemInfoArchitecture,
  hasStaleInterviewFollowupFrontendShape,
  hasStaleResumeE2eMatchSeed,
  hasStaleResumeMatchSubscoreDisplay,
  hasStaleResumeOptimizerMockHandlers,
  hasStaleSalaryBenchmarkFrontendShape,
  hasStaleUserDataMockHandlers,
  hasUnsafeResumeMatchJsonParsing,
  missingRuntimeMockInvokeCases,
} from "../../harness/checks/frontend-contracts.mjs";
import {
  hasAnswerHistoryRendererInvoke,
  hasApplicationAssistAutomaticResumeUpload,
  hasApplicationAssistUntrustedFormTarget,
  hasApplicationProfileResumePathExposure,
  hasAutomationScreenshotPathIpcExposure,
  hasBookmarkletTokenIpcExposure,
  hasDashboardFullConfigInvoke,
  hasFullImportedJobReturn,
  hasNonSettingsFullApplicationProfileInvoke,
  hasRawAnswerHistoryIpcExposure,
  hasRawJobImportUrlAfterPreview,
  hasStaleJobImportMockHandlers as hasStaleJobImportIpcMockHandlers,
  hasStaleProfilePreviewMock as hasStaleProfilePreviewIpcMock,
} from "../../harness/checks/ipc-minimization.mjs";
import {
  hasContradictoryPlansIndexReleaseStatus,
  hasDuplicateDocsScreenshotCapture,
  hasUnreferencedDocsImage,
} from "../../harness/checks/repo-integrity.mjs";
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
import {
  hasStaleNotificationPreferenceSyncWrapper,
  hasUnreferencedBarrelModule,
} from "../../harness/checks/source-structure.mjs";
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
} from "../../harness/checks/source-quality.mjs";

const repositoryPolicies = [
  [
    hasStaleNotificationPreferenceSyncWrapper,
    "remove stale notification preference sync wrapper",
  ],
  [hasUnreferencedBarrelModule, "remove unreferenced barrel module"],
  [hasRawSalaryCommandLogging, "remove raw salary command logging"],
  [hasStaticCompanyRatingFallback, "remove stale static company ratings"],
  [
    hasFrontendFileUrlResumeImport,
    "move structured resume import file reads to backend",
  ],
  [
    hasProductionExplicitAnySuppression,
    "remove production explicit-any suppression",
  ],
  [
    hasProductionTypeErrorSuppression,
    "remove production TypeScript error suppression",
  ],
  [
    hasProductionHookDependencySuppression,
    "remove production hook dependency suppression",
  ],
  [
    hasProductionReactRefreshSuppression,
    "remove production react-refresh suppression",
  ],
  [hasProductionSourceGlyphMarkers, "replace production source emoji markers"],
  [
    hasBackendScoringReasonGlyphMarkers,
    "replace backend scoring reason glyph markers",
  ],
  [
    hasNotificationScoringReasonGlyphMarkers,
    "replace notification scoring reason glyph markers",
  ],
  [hasFrontendStatusEmojiMarkers, "replace frontend status emoji markers"],
  [hasUnreferencedE2eTestHelper, "remove unreferenced E2E test helper"],
  [hasStaleScrapeAllStub, "remove stale scrape_all scraper stub"],
  [hasStaleResumeExportPdfStub, "remove stale resume PDF export stub"],
  [hasDatabaseLogEmojiMarkers, "replace database log emoji markers"],
  [
    hasUnverifiedPreMigrationBackup,
    "verify pre-migration SQLite backups before migration",
  ],
  [hasOpaqueCommandUnitError, "replace opaque command unit errors"],
  [hasUnsafeScoreReasonJsonParsing, "validate reason JSON before rendering"],
  [hasUnsafeStorageJsonParsing, "validate storage JSON before rendering"],
  [
    hasNotificationWebhookSaveWithoutValidation,
    "validate notification webhook settings before saving",
  ],
  [
    hasStaleSettingsPartialSaveMessage,
    "separate config save failures from credential save failures",
  ],
  [
    hasStaleNotificationWebhookDocs,
    "document all notification webhook provider hosts",
  ],
  [
    hasStaleWebhookSecurityDocMarkers,
    "replace webhook security doc stale markers",
  ],
  [
    hasStaleCommandExecutionSecurityDocMarkers,
    "replace command execution security doc stale markers",
  ],
  [
    hasStaleUrlValidationSecurityDocMarkers,
    "sync URL validation security doc markers",
  ],
  [hasStaleXssSecurityDocs, "sync XSS security docs with live sanitizer path"],
  [hasStaleKeyringSecurityDocs, "sync keyring credential docs"],
  [hasUnsafeKeyringMigration, "keep keyring migration retry-safe"],
  [
    hasStaleCredentialArchitectureComments,
    "sync credential architecture comments",
  ],
  [
    hasStaleNotificationPreferenceDocs,
    "sync notification preference docs with backend shape",
  ],
  [
    hasUnownedStorybookAddon,
    "remove Storybook addon without package ownership",
  ],
  [
    hasRedundantDirectPlaywrightDependency,
    "remove redundant direct Playwright dependency",
  ],
  [
    hasDirectPlaywrightE2eScript,
    "route E2E scripts through Playwright wrapper",
  ],
  [
    hasRedundantDomPurifyTypesDependency,
    "remove redundant DOMPurify stub types dependency",
  ],
  [
    hasTailwindPostcssPlugin,
    "use Tailwind Vite plugin instead of PostCSS plugin",
  ],
  [hasUnreferencedDocsImage, "remove unreferenced docs image"],
  [
    hasDuplicateDocsScreenshotCapture,
    "remove duplicate docs screenshot capture",
  ],
  [hasContradictoryPlansIndexReleaseStatus, "sync plans index release status"],
  [hasStaleUserDataMockHandlers, "sync user-data mock command handlers"],
  [hasStaleDeepLinkMockHandlers, "sync deep-link mock command handlers"],
  [
    hasBookmarkletTokenIpcExposure,
    "keep bookmarklet token out of renderer IPC",
  ],
  [
    hasApplicationProfileResumePathExposure,
    "keep application resume paths out of renderer IPC",
  ],
  [
    hasApplicationAssistAutomaticResumeUpload,
    "keep Application Assist resume attachment manual",
  ],
  [
    hasApplicationAssistUntrustedFormTarget,
    "validate Application Assist target before profile load",
  ],
  [
    hasAutomationScreenshotPathIpcExposure,
    "keep automation screenshot paths out of renderer IPC",
  ],
  [
    hasRawAnswerHistoryIpcExposure,
    "keep raw screening answer history out of renderer IPC",
  ],
  [hasAnswerHistoryRendererInvoke, "avoid renderer answer-history IPC"],
  [
    hasNonSettingsFullApplicationProfileInvoke,
    "use minimized application profile IPC",
  ],
  [hasDashboardFullConfigInvoke, "use Dashboard preferences IPC"],
  [hasRawJobImportUrlAfterPreview, "confirm the staged import by opaque id"],
  [hasFullImportedJobReturn, "return minimized imported job payload"],
  [hasStaleJobImportIpcMockHandlers, "sync job-import mock command handlers"],
  [
    hasStaleProfilePreviewIpcMock,
    "sync minimized profile mock command handlers",
  ],
  [hasStaleFeedbackMockHandlers, "sync feedback mock command handlers"],
  [
    hasStaleFeedbackSystemInfoArchitecture,
    "sync feedback system-info architecture field",
  ],
  [
    hasStaleResumeOptimizerMockHandlers,
    "sync resume optimizer mock command handlers",
  ],
  [
    hasStaleAtsKeywordMatchFrontendShape,
    "sync ATS keyword match frontend shape",
  ],
  [hasResumeSuggestionCategoryDrift, "sync resume suggestion category labels"],
  [hasUnsafeResumeMatchJsonParsing, "validate Resume Match JSON before invoke"],
  [
    hasStaleSalaryBenchmarkFrontendShape,
    "sync salary benchmark frontend shape",
  ],
  [
    hasStaleInterviewFollowupFrontendShape,
    "sync interview follow-up frontend shape",
  ],
  [
    hasStaleResumeMatchSubscoreDisplay,
    "render resume match sub-scores from backend fractions",
  ],
  [
    hasStaleResumeE2eMatchSeed,
    "sync resume E2E match seeds with backend fraction shape",
  ],
];

export function collectRepositoryPolicyViolations(root, path) {
  const violations = repositoryPolicies.flatMap(([predicate, message]) =>
    predicate(root, path) ? [`${message}: ${path}`] : [],
  );
  const missingMockCases = missingRuntimeMockInvokeCases(root, path);
  if (missingMockCases.length > 0) {
    violations.push(
      `sync dev mock handlers for runtime invokes: ${path} missing ${missingMockCases.join(", ")}`,
    );
  }
  return violations;
}
