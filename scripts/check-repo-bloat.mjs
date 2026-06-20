#!/usr/bin/env node

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  hasDirectPlaywrightE2eScript,
  hasRedundantDirectPlaywrightDependency,
  hasRedundantDomPurifyTypesDependency,
  hasTailwindPostcssPlugin,
  hasUnownedStorybookAddon,
} from "./harness/checks/dependency-ownership.mjs";
import { hasUnreferencedE2eTestHelper } from "./harness/checks/e2e-helpers.mjs";
import {
  collectFileSizeContractGlobalViolations,
  collectFilesystemBloat,
  collectTrackedFileSizeViolations,
  collectUnexpectedRootEntries,
  isTrackedBloat,
  listTrackedFiles,
} from "./harness/checks/repo-artifacts.mjs";
import {
  hasForbiddenJobSearchFraming,
  hasMissingFreeForeverEthos,
  hasMissingReadmeProductDefinition,
} from "./harness/checks/product-framing.mjs";
import {
  hasEngineerFirstAudienceExamples,
  hasSalaryAudienceExampleDrift,
} from "./harness/checks/broad-audience-fixtures.mjs";
import {
  hasFrontDoorMacosDistributionOverpromise,
  hasFrontDoorMacosInstallerOverpromise,
  hasFrontDoorLegacyMacosVerifierOverclaim,
  hasFrontDoorReleaseVersionPromise,
  hasFrontDoorWindowsLinuxReleaseOverpromise,
  hasSourceReleaseVersionPromise,
} from "./harness/checks/release-promises.mjs";
import {
  hasApplicationAssistAutomationFraming,
  hasEngineerFirstResumeTemplateCopy,
  hasFeedbackTechnicalCompanyLabels,
  hasFeedbackSetupJargon,
  hasFeedbackLocalReportDrift,
  hasLegacyPreferenceListCopy,
  hasNonProtectivePayFloorRecoveryCopy,
  hasNonProtectiveScoreCopy,
  hasOverconfidentGhostCopy,
  hasOverconfidentPayGuidance,
  hasRawErrorBoundaryDetails,
  hasRawFeedbackDebugEventDetails,
  hasRawProblemHistoryContextDetails,
  hasStaleResumeOptimizerFraming,
  hasTechnicalRecoveryCopy,
  hasTechnicalFirstUserCopy,
} from "./harness/checks/product-copy.mjs";
import {
  hasStaleNotificationPreferenceSyncWrapper,
  hasUnreferencedBarrelModule,
  hasUnreferencedComponentsBarrel,
  hasUnreferencedHookModule,
  hasUnreferencedSettingsHelperComponent,
  hasUnreferencedSourceHelper,
} from "./harness/checks/source-structure.mjs";
import {
  hasFrontendDirectOpenDeepLinkFallback,
  hasJobsWithGptMissingRequestLedger,
  hasJobsWithGptUnapprovedEndpointFlow,
  hasLinkedInAutomationBoundaryDrift,
  hasLinkedInNotificationBoundaryDrift,
  hasScraperDocEmojiMarkers,
  hasScraperHealthDocEmojiMarkers,
  hasStaleCacheUsageDoc,
  hasStaleLinkedInCredentialDocs,
  hasStaleScraperDocReliabilityClaim,
  hasStaleScraperHealthCoverage,
  hasStaleStackOverflowJobsDeepLink,
  hasTechnicalSourceHealthUserCopy,
} from "./harness/checks/source-boundaries.mjs";
import {
  hasStaleAtsKeywordMatchFrontendShape,
  hasStaleDeepLinkMockHandlers,
  hasStaleFeedbackMockHandlers,
  hasStaleFeedbackSystemInfoArchitecture,
  hasStaleInterviewFollowupFrontendShape,
  hasStaleResumeE2eMatchSeed,
  hasStaleResumeMatchSubscoreDisplay,
  hasStaleResumeOptimizerMockHandlers,
  hasResumeSuggestionCategoryDrift,
  hasStaleSalaryBenchmarkFrontendShape,
  hasStaleUserDataMockHandlers,
  hasUnsafeResumeOptimizerJsonParsing,
  missingRuntimeMockInvokeCases,
} from "./harness/checks/frontend-contracts.mjs";
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
} from "./harness/checks/source-quality.mjs";
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
} from "./harness/checks/security-docs.mjs";
import {
  hasContradictoryPlansIndexReleaseStatus,
  hasDuplicateDocsScreenshotCapture,
  hasUnreferencedDocsImage,
  isJobSentinelProject,
} from "./harness/checks/repo-integrity.mjs";
import { collectPrivacyLoggingViolations } from "./harness/checks/privacy-logging.mjs";
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
  hasStaleJobImportMockHandlers,
  hasStaleProfilePreviewMock,
} from "./harness/checks/ipc-minimization.mjs";
import {
  collectDocsDriftViolations,
  collectMissingGrantFacingDocs,
} from "./harness/checks/docs-drift.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");

export function checkRepoBloat(root = defaultRoot) {
  const violations = [];

  if (!existsSync(root)) {
    return [`repo root does not exist: ${root}`];
  }

  if (isJobSentinelProject(root)) {
    for (const path of collectMissingGrantFacingDocs(root)) {
      violations.push(`add required grant-facing doc: ${path}`);
    }
  }

  for (const rootEntry of collectUnexpectedRootEntries(root)) {
    violations.push(`classify root entry or move/remove it: ${rootEntry}`);
  }

  for (const artifact of collectFilesystemBloat(root)) {
    violations.push(`remove local artifact: ${artifact}`);
  }

  for (const violation of collectFileSizeContractGlobalViolations(root)) {
    violations.push(violation);
  }

  for (const path of listTrackedFiles(root)) {
    if (isTrackedBloat(path)) {
      violations.push(`remove tracked generated or disposable file: ${path}`);
    }

    for (const violation of collectTrackedFileSizeViolations(root, path)) {
      violations.push(violation);
    }

    for (const violation of collectDocsDriftViolations(root, path)) {
      violations.push(violation);
    }

    for (const violation of collectPrivacyLoggingViolations(root, path)) {
      violations.push(violation);
    }

    if (hasUnreferencedSettingsHelperComponent(root, path)) {
      violations.push(`remove unreferenced settings helper component: ${path}`);
    }

    if (hasUnreferencedHookModule(root, path)) {
      violations.push(`remove unreferenced hook module: ${path}`);
    }

    if (hasUnreferencedSourceHelper(root, path)) {
      violations.push(`remove unreferenced source helper: ${path}`);
    }

    if (hasStaleNotificationPreferenceSyncWrapper(root, path)) {
      violations.push(`remove stale notification preference sync wrapper: ${path}`);
    }

    if (hasUnreferencedComponentsBarrel(root, path)) {
      violations.push(`remove unreferenced components barrel: ${path}`);
    }

    if (hasUnreferencedBarrelModule(root, path)) {
      violations.push(`remove unreferenced barrel module: ${path}`);
    }

    if (hasFrontDoorReleaseVersionPromise(root, path)) {
      violations.push(`replace front-door release version promises: ${path}`);
    }

    if (hasFrontDoorMacosInstallerOverpromise(root, path)) {
      violations.push(`replace front-door macOS installer overpromise: ${path}`);
    }

    if (hasFrontDoorMacosDistributionOverpromise(root, path)) {
      violations.push(`replace front-door macOS distribution overpromise: ${path}`);
    }

    if (hasFrontDoorWindowsLinuxReleaseOverpromise(root, path)) {
      violations.push(`replace front-door Windows/Linux release overpromise: ${path}`);
    }

    if (hasFrontDoorLegacyMacosVerifierOverclaim(root, path)) {
      violations.push(`replace front-door legacy macOS verifier overclaim: ${path}`);
    }

    if (hasSourceReleaseVersionPromise(root, path)) {
      violations.push(`replace source release version promises: ${path}`);
    }

    if (hasMissingReadmeProductDefinition(root, path)) {
      violations.push(`add required README product definition: ${path}`);
    }

    if (hasMissingFreeForeverEthos(root, path)) {
      violations.push(`add free-forever MIT wording: ${path}`);
    }

    if (hasForbiddenJobSearchFraming(root, path)) {
      violations.push(`replace banned job-search framing: ${path}`);
    }

    if (
      hasEngineerFirstAudienceExamples(root, path) ||
      hasEngineerFirstResumeTemplateCopy(root, path)
    ) {
      violations.push(`replace engineer-first audience example: ${path}`);
    }

    if (hasStaleResumeOptimizerFraming(root, path)) {
      violations.push(`replace stale Resume Optimizer framing: ${path}`);
    }

    if (hasTechnicalFirstUserCopy(root, path)) {
      violations.push(`replace technical-first user copy: ${path}`);
    }

    if (hasApplicationAssistAutomationFraming(root, path)) {
      violations.push(`replace application-assist automation framing: ${path}`);
    }

    if (hasOverconfidentGhostCopy(root, path)) {
      violations.push(`replace overconfident ghost-risk copy: ${path}`);
    }

    if (hasOverconfidentPayGuidance(root, path)) {
      violations.push(`replace overconfident pay guidance: ${path}`);
    }

    if (hasNonProtectivePayFloorRecoveryCopy(root, path)) {
      violations.push(`keep salary-floor troubleshooting protective: ${path}`);
    }

    if (hasFeedbackLocalReportDrift(root, path)) {
      violations.push(`keep feedback support path local-first: ${path}`);
    }

    if (hasRawSalaryCommandLogging(root, path)) {
      violations.push(`remove raw salary command logging: ${path}`);
    }

    if (hasSalaryAudienceExampleDrift(root, path)) {
      violations.push(`replace salary audience example: ${path}`);
    }

    if (hasStaticCompanyRatingFallback(root, path)) {
      violations.push(`remove stale static company ratings: ${path}`);
    }

    if (hasFrontendFileUrlResumeImport(root, path)) {
      violations.push(`move structured resume import file reads to backend: ${path}`);
    }

    if (hasProductionExplicitAnySuppression(root, path)) {
      violations.push(`remove production explicit-any suppression: ${path}`);
    }

    if (hasProductionTypeErrorSuppression(root, path)) {
      violations.push(`remove production TypeScript error suppression: ${path}`);
    }

    if (hasProductionHookDependencySuppression(root, path)) {
      violations.push(`remove production hook dependency suppression: ${path}`);
    }

    if (hasProductionReactRefreshSuppression(root, path)) {
      violations.push(`remove production react-refresh suppression: ${path}`);
    }

    if (hasProductionSourceGlyphMarkers(root, path)) {
      violations.push(`replace production source emoji markers: ${path}`);
    }

    if (hasBackendScoringReasonGlyphMarkers(root, path)) {
      violations.push(`replace backend scoring reason glyph markers: ${path}`);
    }

    if (hasNotificationScoringReasonGlyphMarkers(root, path)) {
      violations.push(`replace notification scoring reason glyph markers: ${path}`);
    }

    if (hasFrontendStatusEmojiMarkers(root, path)) {
      violations.push(`replace frontend status emoji markers: ${path}`);
    }

    if (hasScraperDocEmojiMarkers(root, path)) {
      violations.push(`replace scraper doc emoji markers: ${path}`);
    }

    if (hasStaleScraperDocReliabilityClaim(root, path)) {
      violations.push(`sync scraper reliability and rate-limit docs: ${path}`);
    }

    if (hasScraperHealthDocEmojiMarkers(root, path)) {
      violations.push(`replace scraper health doc emoji markers: ${path}`);
    }

    if (hasStaleScraperHealthCoverage(root, path)) {
      violations.push(`sync scraper health source coverage: ${path}`);
    }

    if (hasTechnicalSourceHealthUserCopy(root, path)) {
      violations.push(`keep source-health copy plain-language: ${path}`);
    }

    if (hasUnreferencedE2eTestHelper(root, path)) {
      violations.push(`remove unreferenced E2E test helper: ${path}`);
    }

    if (hasStaleScrapeAllStub(root, path)) {
      violations.push(`remove stale scrape_all scraper stub: ${path}`);
    }

    if (hasStaleResumeExportPdfStub(root, path)) {
      violations.push(`remove stale resume PDF export stub: ${path}`);
    }

    if (hasStaleLinkedInCredentialDocs(root, path)) {
      violations.push(`sync LinkedIn credential docs with keyring login flow: ${path}`);
    }

    if (hasLinkedInAutomationBoundaryDrift(root, path)) {
      violations.push(`remove automated LinkedIn collection boundary drift: ${path}`);
    }

    if (hasLinkedInNotificationBoundaryDrift(root, path)) {
      violations.push(`remove LinkedIn notification source drift: ${path}`);
    }

    if (hasDatabaseLogEmojiMarkers(root, path)) {
      violations.push(`replace database log emoji markers: ${path}`);
    }

    if (hasUnverifiedPreMigrationBackup(root, path)) {
      violations.push(`verify pre-migration SQLite backups before migration: ${path}`);
    }

    if (hasStaleCacheUsageDoc(root, path)) {
      violations.push(`sync cache usage doc with scraper HTTP client: ${path}`);
    }

    if (hasFrontendDirectOpenDeepLinkFallback(root, path)) {
      violations.push(`route job URL opens through backend guard only: ${path}`);
    }

    if (hasJobsWithGptUnapprovedEndpointFlow(root, path)) {
      violations.push(`require JobsWithGPT payload review before source checks: ${path}`);
    }

    if (hasJobsWithGptMissingRequestLedger(root, path)) {
      violations.push(`record minimized JobsWithGPT source request history: ${path}`);
    }

    if (hasOpaqueCommandUnitError(root, path)) {
      violations.push(`replace opaque command unit errors: ${path}`);
    }

    if (hasUnsafeScoreReasonJsonParsing(root, path)) {
      violations.push(`validate reason JSON before rendering: ${path}`);
    }

    if (hasUnsafeStorageJsonParsing(root, path)) {
      violations.push(`validate storage JSON before rendering: ${path}`);
    }

    if (hasNotificationWebhookSaveWithoutValidation(root, path)) {
      violations.push(`validate notification webhook settings before saving: ${path}`);
    }

    if (hasStaleSettingsPartialSaveMessage(root, path)) {
      violations.push(`separate config save failures from credential save failures: ${path}`);
    }

    if (hasStaleNotificationWebhookDocs(root, path)) {
      violations.push(`document all notification webhook provider hosts: ${path}`);
    }

    if (hasStaleWebhookSecurityDocMarkers(root, path)) {
      violations.push(`replace webhook security doc stale markers: ${path}`);
    }

    if (hasStaleCommandExecutionSecurityDocMarkers(root, path)) {
      violations.push(`replace command execution security doc stale markers: ${path}`);
    }

    if (hasStaleUrlValidationSecurityDocMarkers(root, path)) {
      violations.push(`sync URL validation security doc markers: ${path}`);
    }

    if (hasStaleXssSecurityDocs(root, path)) {
      violations.push(`sync XSS security docs with live sanitizer path: ${path}`);
    }

    if (hasStaleKeyringSecurityDocs(root, path)) {
      violations.push(`sync keyring credential docs: ${path}`);
    }

    if (hasUnsafeKeyringMigration(root, path)) {
      violations.push(`keep keyring migration retry-safe: ${path}`);
    }

    if (hasStaleCredentialArchitectureComments(root, path)) {
      violations.push(`sync credential architecture comments: ${path}`);
    }

    if (hasStaleNotificationPreferenceDocs(root, path)) {
      violations.push(`sync notification preference docs with backend shape: ${path}`);
    }

    if (hasUnownedStorybookAddon(root, path)) {
      violations.push(`remove Storybook addon without package ownership: ${path}`);
    }

    if (hasRedundantDirectPlaywrightDependency(root, path)) {
      violations.push(`remove redundant direct Playwright dependency: ${path}`);
    }

    if (hasDirectPlaywrightE2eScript(root, path)) {
      violations.push(`route E2E scripts through Playwright wrapper: ${path}`);
    }

    if (hasRedundantDomPurifyTypesDependency(root, path)) {
      violations.push(`remove redundant DOMPurify stub types dependency: ${path}`);
    }

    if (hasTailwindPostcssPlugin(root, path)) {
      violations.push(`use Tailwind Vite plugin instead of PostCSS plugin: ${path}`);
    }

    if (hasUnreferencedDocsImage(root, path)) {
      violations.push(`remove unreferenced docs image: ${path}`);
    }

    if (hasDuplicateDocsScreenshotCapture(root, path)) {
      violations.push(`remove duplicate docs screenshot capture: ${path}`);
    }

    if (hasContradictoryPlansIndexReleaseStatus(root, path)) {
      violations.push(`sync plans index release status: ${path}`);
    }

    if (hasStaleUserDataMockHandlers(root, path)) {
      violations.push(`sync user-data mock command handlers: ${path}`);
    }

    if (hasStaleDeepLinkMockHandlers(root, path)) {
      violations.push(`sync deep-link mock command handlers: ${path}`);
    }

    if (hasStaleJobImportMockHandlers(root, path)) {
      violations.push(`sync job-import mock command handlers: ${path}`);
    }

    if (hasStaleProfilePreviewMock(root, path)) {
      violations.push(`sync minimized profile mock command handlers: ${path}`);
    }

    if (hasBookmarkletTokenIpcExposure(root, path)) {
      violations.push(`keep bookmarklet token out of renderer IPC: ${path}`);
    }

    if (hasApplicationProfileResumePathExposure(root, path)) {
      violations.push(`keep application resume paths out of renderer IPC: ${path}`);
    }

    if (hasApplicationAssistAutomaticResumeUpload(root, path)) {
      violations.push(`keep Application Assist resume attachment manual: ${path}`);
    }

    if (hasApplicationAssistUntrustedFormTarget(root, path)) {
      violations.push(`validate Application Assist target before profile load: ${path}`);
    }

    if (hasAutomationScreenshotPathIpcExposure(root, path)) {
      violations.push(`keep automation screenshot paths out of renderer IPC: ${path}`);
    }

    if (hasRawAnswerHistoryIpcExposure(root, path)) {
      violations.push(`keep raw screening answer history out of renderer IPC: ${path}`);
    }

    if (hasAnswerHistoryRendererInvoke(root, path)) {
      violations.push(`avoid renderer answer-history IPC: ${path}`);
    }

    if (hasNonSettingsFullApplicationProfileInvoke(root, path)) {
      violations.push(`use minimized application profile IPC: ${path}`);
    }

    if (hasDashboardFullConfigInvoke(root, path)) {
      violations.push(`use Dashboard preferences IPC: ${path}`);
    }

    if (hasRawJobImportUrlAfterPreview(root, path)) {
      violations.push(`use canonical import preview URL: ${path}`);
    }

    if (hasFullImportedJobReturn(root, path)) {
      violations.push(`return minimized imported job payload: ${path}`);
    }

    if (hasStaleFeedbackMockHandlers(root, path)) {
      violations.push(`sync feedback mock command handlers: ${path}`);
    }

    if (hasStaleFeedbackSystemInfoArchitecture(root, path)) {
      violations.push(`sync feedback system-info architecture field: ${path}`);
    }

    if (hasRawFeedbackDebugEventDetails(root, path)) {
      violations.push(`keep feedback debug event details readable: ${path}`);
    }

    if (hasFeedbackTechnicalCompanyLabels(root, path)) {
      violations.push(`keep feedback reports plain-language: ${path}`);
    }

    if (hasFeedbackSetupJargon(root, path)) {
      violations.push(`keep feedback setup summary plain-language: ${path}`);
    }

    if (hasRawProblemHistoryContextDetails(root, path)) {
      violations.push(`keep problem-history context details readable: ${path}`);
    }

    if (hasRawErrorBoundaryDetails(root, path)) {
      violations.push(`sanitize visible error-boundary details: ${path}`);
    }

    if (hasTechnicalRecoveryCopy(root, path)) {
      violations.push(`keep recovery copy plain-language: ${path}`);
    }

    if (hasNonProtectiveScoreCopy(root, path)) {
      violations.push(`keep score copy protective: ${path}`);
    }

    if (hasLegacyPreferenceListCopy(root, path)) {
      violations.push(`keep job-search docs plain-language: ${path}`);
    }

    if (hasStaleStackOverflowJobsDeepLink(root, path)) {
      violations.push(`remove discontinued Stack Overflow Jobs deep link: ${path}`);
    }

    if (hasStaleResumeOptimizerMockHandlers(root, path)) {
      violations.push(`sync resume optimizer mock command handlers: ${path}`);
    }

    if (hasStaleAtsKeywordMatchFrontendShape(root, path)) {
      violations.push(`sync ATS keyword match frontend shape: ${path}`);
    }

    if (hasResumeSuggestionCategoryDrift(root, path)) {
      violations.push(`sync resume suggestion category labels: ${path}`);
    }

    if (hasUnsafeResumeOptimizerJsonParsing(root, path)) {
      violations.push(`validate Resume Optimizer JSON before invoke: ${path}`);
    }

    const missingMockCases = missingRuntimeMockInvokeCases(root, path);
    if (missingMockCases.length > 0) {
      violations.push(
        `sync dev mock handlers for runtime invokes: ${path} missing ${missingMockCases.join(", ")}`,
      );
    }

    if (hasStaleSalaryBenchmarkFrontendShape(root, path)) {
      violations.push(`sync salary benchmark frontend shape: ${path}`);
    }

    if (hasStaleInterviewFollowupFrontendShape(root, path)) {
      violations.push(`sync interview follow-up frontend shape: ${path}`);
    }

    if (hasStaleResumeMatchSubscoreDisplay(root, path)) {
      violations.push(`render resume match sub-scores from backend fractions: ${path}`);
    }

    if (hasStaleResumeE2eMatchSeed(root, path)) {
      violations.push(`sync resume E2E match seeds with backend fraction shape: ${path}`);
    }
  }

  return violations.sort();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.argv[2] ? resolve(process.argv[2]) : defaultRoot;
  const violations = checkRepoBloat(root);

  if (violations.length > 0) {
    console.error("Repo bloat check failed:");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log("Repo bloat check passed.");
}
