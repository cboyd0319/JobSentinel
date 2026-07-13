import {
  hasEngineerFirstAudienceExamples,
  hasSalaryAudienceExampleDrift,
} from "../../harness/checks/broad-audience-fixtures.mjs";
import {
  hasForbiddenJobSearchFraming,
  hasMissingFreeForeverEthos,
  hasMissingReadmeProductDefinition,
} from "../../harness/checks/product-framing.mjs";
import {
  hasApplicationAssistAutomationFraming,
  hasEngineerFirstResumeTemplateCopy,
  hasFeedbackLocalReportDrift,
  hasFeedbackSetupJargon,
  hasFeedbackTechnicalCompanyLabels,
  hasLegacyPreferenceListCopy,
  hasNonProtectivePayFloorRecoveryCopy,
  hasNonProtectiveScoreCopy,
  hasOverconfidentGhostCopy,
  hasOverconfidentPayGuidance,
  hasRawErrorBoundaryDetails,
  hasRawFeedbackDebugEventDetails,
  hasRawProblemHistoryContextDetails,
  hasStaleResumeOptimizerFraming,
  hasTechnicalFirstUserCopy,
  hasTechnicalRecoveryCopy,
} from "../../harness/checks/product-copy.mjs";
import {
  hasFrontDoorLegacyMacosVerifierOverclaim,
  hasFrontDoorMacosDistributionOverpromise,
  hasFrontDoorMacosInstallerOverpromise,
  hasFrontDoorReleaseVersionPromise,
  hasFrontDoorWindowsLinuxReleaseOverpromise,
  hasSourceReleaseVersionPromise,
} from "../../harness/checks/release-promises.mjs";
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
} from "../../harness/checks/source-boundaries.mjs";

const productPolicies = [
  [hasFrontDoorReleaseVersionPromise, "replace front-door release version promises"],
  [hasFrontDoorMacosInstallerOverpromise, "replace front-door macOS installer overpromise"],
  [hasFrontDoorMacosDistributionOverpromise, "replace front-door macOS distribution overpromise"],
  [hasFrontDoorWindowsLinuxReleaseOverpromise, "replace front-door Windows/Linux release overpromise"],
  [hasFrontDoorLegacyMacosVerifierOverclaim, "replace front-door legacy macOS verifier overclaim"],
  [hasSourceReleaseVersionPromise, "replace source release version promises"],
  [hasMissingReadmeProductDefinition, "add required README product definition"],
  [hasMissingFreeForeverEthos, "add free-forever MIT wording"],
  [hasForbiddenJobSearchFraming, "replace banned job-search framing"],
  [
    (root, path) =>
      hasEngineerFirstAudienceExamples(root, path) ||
      hasEngineerFirstResumeTemplateCopy(root, path),
    "replace engineer-first audience example",
  ],
  [hasStaleResumeOptimizerFraming, "replace stale Resume Optimizer framing"],
  [hasTechnicalFirstUserCopy, "replace technical-first user copy"],
  [hasApplicationAssistAutomationFraming, "replace application-assist automation framing"],
  [hasOverconfidentGhostCopy, "replace overconfident ghost-risk copy"],
  [hasOverconfidentPayGuidance, "replace overconfident pay guidance"],
  [hasNonProtectivePayFloorRecoveryCopy, "keep salary-floor troubleshooting protective"],
  [hasFeedbackLocalReportDrift, "keep feedback support path local-first"],
  [hasSalaryAudienceExampleDrift, "replace salary audience example"],
  [hasScraperDocEmojiMarkers, "replace scraper doc emoji markers"],
  [hasStaleScraperDocReliabilityClaim, "sync scraper reliability and rate-limit docs"],
  [hasScraperHealthDocEmojiMarkers, "replace scraper health doc emoji markers"],
  [hasStaleScraperHealthCoverage, "sync scraper health source coverage"],
  [hasTechnicalSourceHealthUserCopy, "keep source-health copy plain-language"],
  [hasStaleLinkedInCredentialDocs, "sync LinkedIn credential docs with keyring login flow"],
  [hasLinkedInAutomationBoundaryDrift, "remove automated LinkedIn collection boundary drift"],
  [hasLinkedInNotificationBoundaryDrift, "remove LinkedIn notification source drift"],
  [hasStaleCacheUsageDoc, "sync cache usage doc with scraper HTTP client"],
  [hasFrontendDirectOpenDeepLinkFallback, "route job URL opens through backend guard only"],
  [hasJobsWithGptUnapprovedEndpointFlow, "require JobsWithGPT payload review before source checks"],
  [hasJobsWithGptMissingRequestLedger, "record minimized JobsWithGPT source request history"],
  [hasFeedbackTechnicalCompanyLabels, "keep feedback reports plain-language"],
  [hasFeedbackSetupJargon, "keep feedback setup summary plain-language"],
  [hasRawFeedbackDebugEventDetails, "keep feedback debug event details readable"],
  [hasRawProblemHistoryContextDetails, "keep problem-history context details readable"],
  [hasRawErrorBoundaryDetails, "sanitize visible error-boundary details"],
  [hasTechnicalRecoveryCopy, "keep recovery copy plain-language"],
  [hasNonProtectiveScoreCopy, "keep score copy protective"],
  [hasLegacyPreferenceListCopy, "keep job-search docs plain-language"],
  [hasStaleStackOverflowJobsDeepLink, "remove discontinued Stack Overflow Jobs deep link"],
];

export function collectProductPolicyViolations(root, path) {
  return productPolicies.flatMap(([predicate, message]) =>
    predicate(root, path) ? [`${message}: ${path}`] : [],
  );
}
