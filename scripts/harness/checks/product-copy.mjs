import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hasTechnicalFirstFallbackCopy } from "./product-copy/technical-first-fallback.mjs";
import { getTechnicalFirstPreflightResult } from "./product-copy/technical-first-preflight.mjs";
import { getTechnicalFirstDocsResult } from "./product-copy/technical-first-docs.mjs";
import { getTechnicalFirstUiResult } from "./product-copy/technical-first-ui.mjs";

const staleResumeOptimizerFramingPaths = new Set([
  "src/app/App.tsx",
  "src/features/resumes/builder/AtsLiveScorePanel.tsx",
  "src/app/Navigation.tsx",
  "src/components/ResumeMatchScoreBreakdown.tsx",
  "src/contexts/KeyboardShortcutsContext.tsx",
  "src/features/resumes/library/ResumeLibraryPage.tsx",
  "src/features/resumes/library/ResumeLibraryDropdown.tsx",
  "src/features/resumes/library/ResumeTextPreviewModal.tsx",
  "src/features/resumes/library/resumePageModel.ts",
  "src/features/resumes/builder/ResumeBuilderPage.tsx",
  "src/features/resumes/matching/ResumeMatchPage.tsx",
  "src/features/resumes/matching/ResumeMatchJobWordsOverview.tsx",
  "src/features/resumes/matching/ResumeMatchResultsPanel.tsx",
  "src/features/resumes/matching/resumeMatchModel.ts",
  "src-tauri/src/core/resume/mod.rs",
  "src-tauri/src/core/resume/templates.rs",
  "tests/e2e/playwright/resume-upload-matching.spec.ts",
  "docs/README.md",
  "docs/ROADMAP.md",
  "docs/features/resume-builder.md",
  "docs/features/resume-matcher.md",
  "docs/releases/v2.0.md",
  "docs/releases/v2.4.md",
  "docs/releases/v2.6.0.md",
  "docs/plans/active/current-work.md",
  "docs/user/QUICK_START.md",
]);

const resumeTemplateAudiencePaths = new Set([
  "src-tauri/src/core/resume/templates.rs",
  "src/mocks/handlers.ts",
  "src/features/resumes/builder/ResumeBuilderPage.tsx",
  "src/features/resumes/builder/ResumeBuilderPreviewStep.tsx",
  "src/features/resumes/builder/ResumeBuilderVisuals.tsx",
  "src/features/resumes/builder/steps/ContactStep.tsx",
  "src/features/resumes/builder/steps/EducationStep.tsx",
  "src/features/resumes/builder/steps/ExperienceStep.tsx",
  "src/features/resumes/builder/steps/SkillsStep.tsx",
  "src/features/resumes/builder/steps/SummaryStep.tsx",
  "docs/README.md",
  "docs/ROADMAP.md",
  "docs/features/resume-builder.md",
]);

const applicationAssistFramingPaths = new Set([
  "README.md",
  "docs/README.md",
  "docs/developer/ARCHITECTURE.md",
  "docs/developer/INTEGRATION_TESTING.md",
  "docs/developer/TESTING.md",
  "docs/features/application-assist.md",
  "docs/user/QUICK_START.md",
  "index.html",
  "package.json",
  "src/app/App.tsx",
  "src-tauri/Cargo.toml",
  "src-tauri/src/commands/automation.rs",
  "src-tauri/src/commands/errors.rs",
  "src-tauri/src/core/mod.rs",
  "src/app/Navigation.tsx",
  "src/features/application-assist/ApplicationPreview.tsx",
  "src/features/application-assist/ApplyButton.tsx",
  "src/features/application-assist/ProfileForm.tsx",
  "src/features/application-assist/ScreeningAnswersForm.tsx",
  "src/features/application-assist/ApplicationProfilePage.tsx",
  "src/features/dashboard/components/DashboardHeader.tsx",
  "src/features/onboarding/SetupWizard.tsx",
  "tests/e2e/README.md",
  "tests/e2e/playwright/app.spec.ts",
  "tests/e2e/playwright/keyboard-navigation.spec.ts",
  "tests/e2e/playwright/application-assist.spec.ts",
  "tests/e2e/playwright/page-objects/OneClickApplyPage.ts",
]);

const overconfidentGhostCopyPaths = new Set([
  "docs/README.md",
  "docs/ROADMAP.md",
  "docs/developer/ARCHITECTURE.md",
  "docs/features/ghost-detection.md",
  "docs/features/smart-scoring.md",
  "docs/releases/v1.4.md",
  "docs/style-guide/GLOSSARY.md",
  "docs/style-guide/WRITING-FOR-JOB-SEEKERS.md",
  "docs/user/QUICK_START.md",
  "src/features/dashboard/components/GhostIndicator.tsx",
  "src/features/dashboard/components/DashboardFiltersBar.tsx",
  "src/features/settings/search/SettingsPostingRiskSection.tsx",
  "src/features/settings/SettingsPage.tsx",
]);
const payProtectionGuidancePaths = new Set([
  "docs/features/pay-protection.md",
  "src/features/salary/NegotiationNotesCard.tsx",
  "src/features/salary/OfferReviewPanel.tsx",
  "src/features/salary/SalaryEvidenceCard.tsx",
  "src/features/salary/SalaryPage.tsx",
  "src/features/salary/SalarySearchCard.tsx",
]);
const payFloorRecoveryCopyPaths = new Set([
  "docs/user/QUICK_START.md",
  "src/features/dashboard/components/noJobsEmptyStateCopy.ts",
]);

const feedbackLocalReportPaths = new Set([
  "README.md",
  "ROADMAP.md",
  "docs/README.md",
  "docs/ROADMAP.md",
  "docs/developer/CONTRIBUTING.md",
  "docs/features/json-resume-import.md",
  "docs/features/job-source-status.md",
  "docs/features/job-sources.md",
  "docs/features/user-data-management.md",
  "docs/harness/README.md",
  "docs/harness/change-contract.md",
  "docs/harness/verification-matrix.md",
  "docs/user/QUICK_START.md",
  "src/features/dashboard/errors/ComponentErrorBoundary.tsx",
  "src/app/errors/ErrorBoundary.tsx",
  "src/features/settings/support/ErrorLogPanel.tsx",
  "src/features/dashboard/errors/ModalErrorBoundary.tsx",
  "src/app/errors/PageErrorBoundary.tsx",
  "src/features/settings/support/feedback/DescriptionInput.tsx",
  "src/features/settings/support/feedback/FeedbackModal.tsx",
  "src/features/settings/support/feedback/SubmitOptions.tsx",
  "src/features/settings/support/feedback/SuccessScreen.tsx",
  "src/hooks/useFeedback.ts",
  "src/features/settings/SettingsPage.tsx",
  "src/services/feedbackService.ts",
  "src-tauri/src/commands/feedback/mod.rs",
  "src-tauri/src/commands/feedback/debug_log.rs",
  "src-tauri/src/commands/feedback/report.rs",
  "src-tauri/src/core/health/smoke_tests.rs",
  "src/mocks/handlers.ts",
  "src/utils/errorMessages.ts",
]);

const feedbackDebugEventFormattingPaths = new Set([
  "src/features/settings/support/feedback/DebugInfoPreview.tsx",
  "src/services/feedbackService.ts",
]);

const problemHistoryContextFormattingPaths = new Set([
  "src/features/settings/support/ErrorLogPanel.tsx",
]);

const errorBoundaryDisplayPaths = new Set([
  "src/features/dashboard/errors/ComponentErrorBoundary.tsx",
  "src/app/errors/ErrorBoundary.tsx",
  "src/features/dashboard/errors/ModalErrorBoundary.tsx",
  "src/app/errors/PageErrorBoundary.tsx",
]);

const plainRecoveryCopyPaths = new Set([
  ...errorBoundaryDisplayPaths,
  "src/features/settings/sources/health/ScraperHealthDashboard.tsx",
  "src/features/settings/sources/health/scraperHealthDashboardModel.ts",
]);

const protectiveScoreCopyPaths = new Set([
  "PRIVACY.md",
  "RESPONSIBLE_AI.md",
  "docs/features/notifications.md",
  "docs/features/resume-matcher.md",
  "docs/features/smart-scoring.md",
  "docs/plans/active/current-work.md",
  "docs/style-guide/GLOSSARY.md",
  "docs/style-guide/WRITING-FOR-JOB-SEEKERS.md",
  "docs/user/QUICK_START.md",
  "src/app/onboarding/tourSteps.ts",
  "src/features/resumes/builder/AtsLiveScorePanel.tsx",
  "src/components/ResumeMatchScoreBreakdown.tsx",
  "src/features/dashboard/components/GhostIndicator.tsx",
  "src/components/ScoreDisplay.tsx",
  "src/components/ScoreDisplay.stories.tsx",
  "src/features/dashboard/components/ScoreBreakdownModal.tsx",
  "src/utils/scoreUtils.ts",
  "src/features/resumes/library/ResumeTextPreviewModal.tsx",
  "src/features/resumes/library/resumePageModel.ts",
  "src/features/resumes/matching/ResumeMatchPage.tsx",
  "src/features/resumes/matching/ResumeMatchJobWordsOverview.tsx",
  "src/features/resumes/matching/ResumeMatchResultsPanel.tsx",
  "src/features/resumes/matching/resumeMatchModel.ts",
  "src/features/dashboard/DashboardPage.tsx",
  "src/features/dashboard/components/filterLabels.ts",
  "src/features/dashboard/components/DashboardFiltersBar.tsx",
  "src/features/onboarding/SetupWizard.tsx",
  "src/features/onboarding/SetupWizardSearchSummary.tsx",
  "src/features/onboarding/setupWizardPreferences.ts",
  "src/features/settings/matching/SettingsResumeMatchingSection.tsx",
  "src/features/settings/search/SettingsPostingRiskSection.tsx",
  "src/features/settings/sources/SettingsJobSourcesSection.tsx",
  "src/features/settings/SettingsPage.tsx",
]);
const plainJobSearchDocPaths = new Set([
  "docs/features/application-tracking.md",
  "docs/features/smart-scoring.md",
]);
const technicalFirstUserCopyPaths = new Set([
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/ISSUE_TEMPLATE/question.yml",
  ".github/ISSUE_TEMPLATE/scraper_issue.yml",
  "docs/ROADMAP.md",
  "examples/profiles/README.md",
  "README.md",
  "docs/features/browser-import.md",
  "src/components/AsyncButton.tsx",
  "src/features/settings/sources/browser-import/BrowserImportControls.tsx",
  "src/features/settings/sources/browser-import/BrowserImportSection.tsx",
  "src/features/applications/CoverLetterTemplates.tsx",
  "src/features/search-links/SearchLinksForm.tsx",
  "src/features/search-links/SearchLinksPage.tsx",
  "src/features/search-links/SearchLinksResults.tsx",
  "src/app/errors/ErrorBoundary.tsx",
  "src/features/settings/support/ErrorLogPanel.tsx",
  "src/features/dashboard/components/ScoreBreakdownModal.tsx",
  "src/components/ScoreDisplay.tsx",
  "src/features/settings/sources/health/ScraperHealthDashboard.tsx",
  "src/features/settings/sources/health/scraperHealthDashboardModel.ts",
  "src/features/onboarding/CareerProfileSelector.tsx",
  "src/features/dashboard/components/JobImportModal.tsx",
  "src/features/dashboard/components/JobCard.tsx",
  "src/features/dashboard/components/jobCardGuidance.ts",
  "src/features/resumes/builder/AtsLiveScorePanel.tsx",
  "src/features/applications/AnalyticsPanel.tsx",
  "src/features/dashboard/components/DashboardWidgets.tsx",
  "src/services/aiGateway.ts",
  "src/features/settings/notifications/NotificationPreferences.tsx",
  "src/features/resumes/builder/steps/ContactStep.tsx",
  "src/features/resumes/builder/steps/EducationStep.tsx",
  "src/features/resumes/builder/steps/ExperienceStep.tsx",
  "src/features/resumes/builder/steps/SkillsStep.tsx",
  "src/features/resumes/builder/steps/SummaryStep.tsx",
  "src/features/applications/InterviewScheduler.tsx",
  "src/app/commands/CommandPalette.tsx",
  "src/app/commands/KeyboardShortcutsHelp.tsx",
  "src/features/market/LocationHeatmap.tsx",
  "src/features/market/MarketHeader.tsx",
  "src/features/market/MarketPanels.tsx",
  "src/features/market/MarketSnapshotCard.tsx",
  "src/app/Navigation.tsx",
  "src/features/application-assist/ApplyButton.tsx",
  "src/features/application-assist/ApplicationPreview.tsx",
  "src/features/application-assist/ProfileForm.tsx",
  "src/features/application-assist/ScreeningAnswerSuggestions.tsx",
  "src/features/application-assist/ScreeningAnswersForm.tsx",
  "src/features/settings/support/feedback/DebugInfoPreview.tsx",
  "src/features/settings/support/feedback/FeedbackModal.tsx",
  "src/features/settings/support/feedback/SubmitOptions.tsx",
  "src/features/settings/support/feedback/SuccessScreen.tsx",
  "src/hooks/useFeedback.ts",
  "src/mocks/handlers/atsPlatform.ts",
  "src/features/market/mockHandlers.ts",
  "src/features/resumes/mocks/resumeAnalysisRunner.ts",
  "src/features/resumes/mocks/resumeBulletPrompts.ts",
  "src/features/resumes/mocks/resumeBuilder.ts",
  "src/features/resumes/mocks/resumeKeywordMatching.ts",
  "src/features/resumes/mocks/resumeRequirementReview.ts",
  "src/mocks/handlers.ts",
  "src/contexts/UndoContext.tsx",
  "src/contexts/KeyboardShortcutsContext.tsx",
  "src-tauri/src/commands/errors.rs",
  "src-tauri/src/commands/bookmarklet.rs",
  "src-tauri/src/core/db/error.rs",
  "src-tauri/src/core/automation/error.rs",
  "src-tauri/src/core/resume/ats_analyzer.rs",
  "src-tauri/src/core/resume/ats_analyzer/bullet_prompts.rs",
  "src-tauri/src/core/resume/matcher.rs",
  "src-tauri/src/core/salary/analyzer.rs",
  "src-tauri/src/core/scrapers/error.rs",
  "src-tauri/migrations/00000000000000_initial_schema.sql",
  "src/utils/api.ts",
  "src/features/resumes/library/ResumeLibraryPage.tsx",
  "src/features/dashboard/hooks/useDashboardAutoRefresh.ts",
  "src/features/dashboard/hooks/useDashboardJobOps.ts",
  "src/features/dashboard/hooks/useDashboardSavedSearches.ts",
  "src/features/resumes/matching/ResumeMatchPage.tsx",
  "src/features/applications/ApplicationsPage.tsx",
  "src/features/application-assist/ApplicationProfilePage.tsx",
  "src/features/dashboard/DashboardPage.tsx",
  "src/pages/dashboardErrorCopy.ts",
  "src/features/market/errorCopy.ts",
  "src/features/dashboard/components/DashboardHeader.tsx",
  "src/features/dashboard/components/noJobsEmptyStateCopy.ts",
  "src/features/dashboard/components/DashboardFiltersBar.tsx",
  "src/features/dashboard/components/filterLabels.ts",
  "src/features/dashboard/components/QuickActions.tsx",
  "src/features/market/MarketPage.tsx",
  "src/features/resumes/builder/ResumeBuilderPage.tsx",
  "src/features/resumes/builder/ResumeBuilderPreviewStep.tsx",
  "src/features/resumes/builder/ResumeBuilderVisuals.tsx",
  "src/features/resumes/library/ResumeLibraryDropdown.tsx",
  "src/features/resumes/matching/ResumeMatchJobWordsOverview.tsx",
  "src/features/resumes/matching/ResumeMatchResultsPanel.tsx",
  "src/features/resumes/library/ResumeTextPreviewModal.tsx",
  "src/features/resumes/library/resumePageModel.ts",
  "src/features/resumes/matching/resumeMatchModel.ts",
  "src/features/salary/NegotiationNotesCard.tsx",
  "src/features/salary/OfferReviewPanel.tsx",
  "src/features/salary/SalaryEvidenceCard.tsx",
  "src/features/salary/SalaryPage.tsx",
  "src/features/salary/SalarySearchCard.tsx",
  "src/features/settings/sources/SettingsConnectedJobSource.tsx",
  "src/features/settings/sources/SettingsJobSourcesSection.tsx",
  "src/features/settings/matching/SettingsResumeMatchingSection.tsx",
  "src/features/settings/search/SettingsPostingRiskSection.tsx",
  "src/features/settings/shared/SettingsSecurityBadge.tsx",
  "src/features/settings/support/SettingsSupportSections.tsx",
  "src/features/settings/SettingsPage.tsx",
  "src/features/onboarding/SetupWizard.tsx",
  "src/features/onboarding/SetupWizardSearchSummary.tsx",
  "src/features/onboarding/setupWizardPreferences.ts",
  "src/utils/errorHelpers.ts",
  "src/utils/errorMessages.ts",
  "src/utils/safeErrorCopy.ts",
  "src/utils/formValidation.ts",
  "src/utils/sourceLabels.ts",
  "tests/e2e/playwright/application-tracking.spec.ts",
  "tests/e2e/playwright/page-objects/ApplicationsPage.ts",
  "docs/features/application-tracking.md",
  "docs/features/ghost-detection.md",
  "docs/features/hiring-trends.md",
  "docs/features/smart-scoring.md",
  "docs/features/notifications.md",
  "docs/features/application-assist.md",
  "docs/features/saved-secrets.md",
  "docs/features/json-resume-import.md",
  "docs/features/remote-preference-scoring.md",
  "docs/features/resume-builder.md",
  "docs/features/resume-matcher.md",
  "docs/features/pay-protection.md",
  "docs/features/job-source-status.md",
  "docs/features/job-sources.md",
  "docs/features/synonym-matching.md",
  "docs/features/user-data-management.md",
  "docs/harness/readme-information-design.md",
  "docs/user/DEEP_LINKS.md",
  "docs/user/QUICK_START.md",
  "CODE_OF_CONDUCT.md",
  "PRIVACY.md",
  "SECURITY.md",
]);
export function hasStaleResumeOptimizerFraming(root, path) {
  if (!staleResumeOptimizerFramingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const stalePatterns = [
    /Resume Optimizer/i,
    /\bATS Optimizer\b/i,
    /ATS\s+Optimizer/i,
    /\bATS Resume Optimizer\b/i,
    /ATS\s+Score/i,
    /ATS\s+Format\s+Score/i,
    /Full\s+ATS\s+Analysis/i,
    /AI-powered resume analysis/i,
    /AI-powered job matching/i,
    /ATS\s+parsing/i,
    /ATS-friendly templates/i,
    /ATS-optimized templates/i,
    /ATS-friendly language and power words/i,
    /\bPower Words\b/i,
    /Strong Resume Words/i,
    /View Strong Resume Words/i,
    /get past the robots/i,
    /resume-filtering software/i,
    /software that companies use to filter/i,
    /filter resumes before a human/i,
    /pass these filters/i,
    /pass ATS filters/i,
    /Resume upload and parsing/i,
    /Choose a saved resume or upload a PDF resume/i,
    /choose or upload/i,
    /Upload a resume to see detailed match information/i,
    /No resume uploaded/i,
    /Please upload a resume in Resume Match first/i,
    /Upload and review a resume in Resume Match first/i,
    /what keywords you're missing/i,
    /might get filtered out/i,
    /probably won't pass/i,
    /ATS-compatible/i,
    /ATS-parseable HTML/i,
    /ATS-safe design rules/i,
    /Works with any ATS/i,
    /ATS systems look for/i,
    /commonly recognized by ATS systems/i,
    /optimization recommendations/i,
    /Words To Add/i,
    /= Words to add/i,
    /Only add these words/i,
  ];

  return stalePatterns.some((pattern) => pattern.test(text));
}

export function hasEngineerFirstResumeTemplateCopy(root, path) {
  if (!resumeTemplateAudiencePaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const stalePatterns = [
    /Technical Skills-First/i,
    /Perfect for engineering roles/i,
    /Engineering roles - skills first/i,
    /Tech companies - clean and minimal/i,
    /Technical & soft skills/i,
    /Technical and professional skills/i,
    /Classic, Modern, Technical, Executive, Military/i,
  ];

  return stalePatterns.some((pattern) => pattern.test(text));
}

export function hasApplicationAssistAutomationFraming(root, path) {
  if (!applicationAssistFramingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const stalePatterns = [
    new RegExp(["One", "-Click", "\\s+", "Apply"].join(""), "i"),
    new RegExp(["Quick", "\\s+", "Apply"].join(""), "i"),
    new RegExp(
      [
        "Fill",
        "\\s+",
        "out",
        "\\s+",
        "job",
        "\\s+",
        "applications",
        "\\s+",
        "in",
        "\\s+",
        "seconds",
      ].join(""),
      "i",
    ),
    new RegExp(["Speed", "\\s+", "up", "\\s+", "applications"].join(""), "i"),
    new RegExp(
      ["forms?", "\\s+", "for", "\\s+", "you", "\\s+", "automatically"].join(
        "",
      ),
      "i",
    ),
    new RegExp(
      [
        "fields?",
        "\\s+",
        "that",
        "\\s+",
        "will",
        "\\s+",
        "be",
        "\\s+",
        "auto-filled",
      ].join(""),
      "i",
    ),
    new RegExp(
      ["auto-fill", "\\s+", "screening", "\\s+", "questions"].join(""),
      "i",
    ),
    new RegExp(
      [
        "This",
        "\\s+",
        "information",
        "\\s+",
        "will",
        "\\s+",
        "be",
        "\\s+",
        "auto-filled",
      ].join(""),
      "i",
    ),
    new RegExp(
      [
        "automatically",
        "\\s+",
        "uploaded",
        "\\s+",
        "when",
        "\\s+",
        "applying",
      ].join(""),
      "i",
    ),
    new RegExp(
      [
        "Prepare",
        "\\s+",
        "to",
        "\\s+",
        "apply",
        "\\s+-\\s+",
        "fills",
        "\\s+",
        "form",
        "\\s+",
        "fields",
        "\\s+",
        "automatically",
      ].join(""),
      "i",
    ),
    new RegExp(
      [
        "Form",
        "\\s+",
        "filling",
        "\\s+",
        "will",
        "\\s+",
        "begin",
        "\\s+",
        "shortly",
      ].join(""),
      "i",
    ),
    new RegExp(["Form", "\\s+", "Fill", "\\s+", "Failed"].join(""), "i"),
    new RegExp(
      ["Form", "\\s+", "preparation", "\\s+", "(?:error|failed)"].join(""),
      "i",
    ),
    new RegExp(["Form", "\\s+", "filled!"].join(""), "i"),
    new RegExp(["form", "\\s+", "filling", "\\s+", "failed"].join(""), "i"),
    new RegExp(
      ["Max", "\\s+", "applications", "\\s+", "per", "\\s+", "day"].join(""),
      "i",
    ),
    new RegExp(["Total", "\\s+", "Attempts"].join(""), "i"),
    new RegExp(["Success", "\\s+", "Rate"].join(""), "i"),
    new RegExp(["Submission", "\\s+", "Rate"].join(""), "i"),
    new RegExp(["Automation", "\\s+", "Settings"].join(""), "i"),
    new RegExp(["No", "\\s+", "Auto-Submit"].join(""), "i"),
    new RegExp(["automated", "\\s+", "browsers"].join(""), "i"),
    new RegExp(["automated", "\\s+", "submission"].join(""), "i"),
    new RegExp(["form", "\\s+", "filling", "\\s+", "automation"].join(""), "i"),
    new RegExp(
      ["supports", "\\s+", "form", "\\s+", "automation"].join(""),
      "i",
    ),
    new RegExp(["automation", "\\s+", "browser"].join(""), "i"),
    new RegExp(
      [
        "Privacy-first",
        "\\s+",
        "job",
        "\\s+",
        "search",
        "\\s+",
        "automation",
      ].join(""),
      "i",
    ),
    /aria-label=\{`Application tracking system:/i,
    /title=\{atsInfo\?\.automationNotes/i,
    /Settings\s*>\s*Application Assist/i,
    /Code profile/i,
  ];

  return stalePatterns.some((pattern) => pattern.test(text));
}

export function hasOverconfidentGhostCopy(root, path) {
  if (!overconfidentGhostCopyPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const stalePatterns = [
    /fake\/stale job postings/i,
    /fake\/stale/i,
    /fake or stale job postings/i,
    /fake or stale postings/i,
    /fake job postings/i,
    /fake postings/i,
    /fake or outdated job posting/i,
    /real opportunities/i,
    /Real Jobs Only/i,
    /Likely Real/i,
    /Possible Ghost/i,
    /Potential Ghost Job/i,
    /Likely Ghost/i,
    /Ghost warning:/i,
    /Ghost Job Warning/i,
    /Mark as real job/i,
    /Confirm ghost job/i,
    /Probably fake/i,
    /Probably a ghost/i,
    /Almost certainly filled/i,
    /definitely real/i,
    /posting that isn't real/i,
    /ghost score from 0\.0/i,
    /ghost jobs, statistics/i,
    /warning threshold/i,
    /Stale Job Threshold/i,
    /Repost Threshold/i,
    /Weight Adjustments/i,
    /Stale postings weight/i,
    /Repost frequency weight/i,
    /Generic description weight/i,
    /Vague title weight/i,
    /Unrealistic requirements weight/i,
    /Missing salary weight/i,
    /Advanced controls/i,
    /company or ATS source/i,
    /company or ATS page/i,
    /Company-site or ATS presence/i,
    /Generic Content/i,
  ];

  return stalePatterns.some((pattern) => pattern.test(text));
}

export function hasOverconfidentPayGuidance(root, path) {
  if (!payProtectionGuidancePaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const stalePatterns = [
    /Know your worth/i,
    /Negotiate with confidence/i,
    /maximize your compensation/i,
    /exactly what to say/i,
    /Copy-paste templates for asking for more money/i,
    /Always negotiate/i,
    /average salary increase from negotiation is 10-15%/i,
    /verified salaries/i,
    /guaranteed raise/i,
    /women just need to ask/i,
    /confidence fixes pay gaps/i,
    /protected-class-based script/i,
  ];

  return stalePatterns.some((pattern) => pattern.test(text));
}

export function hasNonProtectivePayFloorRecoveryCopy(root, path) {
  if (!payFloorRecoveryCopyPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const stalePatterns = [
    /Lower your minimum salary to \$0 temporarily/i,
    /set (?:your )?(?:minimum salary|salary floor|pay floor) to \$0/i,
    /remove (?:your )?(?:minimum salary|salary floor|pay floor)/i,
    /disable (?:your )?(?:minimum salary|salary floor|pay floor)/i,
    /broaden .*lowest pay/i,
    /adjust .*lowest pay/i,
  ];

  return stalePatterns.some((pattern) => pattern.test(text));
}

export function hasFeedbackLocalReportDrift(root, path) {
  if (!feedbackLocalReportPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const stalePatterns = [
    /\bDebug reports\b/i,
    /sanitized debug reports?/i,
    /safe debug report/i,
    /\bsafe report\b/i,
    /\bCopy Safe Report\b/i,
    /\bSave Safe Report\b/i,
    /\bSafe report copied\b/i,
    /\bSafe report saved\b/i,
    /\bSafe report details\b/i,
    /\bsafe report so you can paste\b/i,
    /Open Shared Folder/i,
    /Works without a GitHub or Google account/i,
    /Paste it into a GitHub issue/i,
    /Attach .* to a GitHub issue/i,
    /attach it to a GitHub issue/i,
    /open an issue on GitHub/i,
    /This opens GitHub in your browser/i,
    /GitHub should have opened/i,
    /The GitHub page keeps replies and updates in one place/i,
    /jobsentinel-debug-report\.txt/i,
    /saved debug report/i,
    /submittedVia:\s*"github"\s*\|\s*"drive"/i,
    /submittedVia\s*:\s*"drive"/i,
    /submitViaDrive/i,
    /onSubmitDrive/i,
    /DriveIcon/i,
    /Google Drive flow/i,
    /Can you reproduce it/i,
    /Select a category first/i,
    /Continue to Submit/i,
    /Choose Submission Method/i,
    /Describe Your Feedback/i,
    /Report type:\s*(?:Bug Report|Feature Idea)/i,
    /return\s+["'`](?:Bug Report|Feature Idea)["'`]/i,
    /Bug Report Template/i,
    /Feature Request Template/i,
    /Error logs:\s*\(run with `RUST_LOG=debug`\)/i,
    /No debug events recorded/i,
    /Debug Log \(\{\} events\)/i,
    /\[(?:APP_STARTED|VIEW_NAVIGATED|COMMAND|ERROR|SCRAPER|FEATURE)\]/i,
    /format!\(\s*["'`]\[\{\}\]\s+\{\:\?\}\\n["'`]/i,
    /Support-only details:/i,
    /["'`]SUPPORT DETAILS["'`]/,
    />\s*Clear All\s*</i,
  ];

  return stalePatterns.some((pattern) => pattern.test(text));
}

export function hasRawFeedbackDebugEventDetails(root, path) {
  if (!feedbackDebugEventFormattingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /JSON\.stringify\(event\.details\)/.test(text);
}

export function hasFeedbackTechnicalCompanyLabels(root, path) {
  if (path !== "src/services/feedbackService.ts") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /Company (?:blocklist|allowlist)/.test(text);
}

export function hasFeedbackSetupJargon(root, path) {
  if (!feedbackDebugEventFormattingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /\$\{configSummary\.(?:keywords_count|notifications_configured)\}\s+configured/.test(
      text,
    ) ||
    /\?\s*["']configured["']\s*:\s*["']not configured["']/.test(text) ||
    /\bmore events\b/i.test(text) ||
    /\bevent:\s*["']Event["']/.test(text) ||
    /frontend errors omitted/i.test(text) ||
    /removes private details before sharing/i.test(text) ||
    /Private details are removed/i.test(text) ||
    /private details removed/i.test(text) ||
    /Removed before sharing/i.test(text) ||
    /Saves a sanitized report/i.test(text) ||
    /Job titles, company names, search words, and personal details are not included/i.test(
      text,
    ) ||
    /Extra app details:\s*\$\{sanitizeTextForStorage\(error\.stack\)\}/.test(
      text,
    ) ||
    /Screen details:\s*\$\{sanitizeTextForStorage\(error\.componentStack\)\}/.test(
      text,
    )
  );
}

export function hasRawProblemHistoryContextDetails(root, path) {
  if (!problemHistoryContextFormattingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /JSON\.stringify\(error\.context\)|\{error\.(?:message|stack|componentStack)\}/.test(
    text,
  );
}

export function hasRawErrorBoundaryDetails(root, path) {
  if (!errorBoundaryDisplayPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /\bthis\.state\.error\.(?:message|stack)\b/.test(text) ||
    /sanitizeTextForStorage\(\s*(?:message|error\.message|this\.state\.error\.message)\s*\)/.test(
      text,
    )
  );
}

export function hasTechnicalRecoveryCopy(root, path) {
  if (!plainRecoveryCopyPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const stalePatterns = [
    /\{this\.props\.componentName\}\s*Error/,
    /\$\{pageName\s*\|\|\s*["']Page["']\}\s*Error/,
    /Error occurred\s*\{/,
    /Multiple errors detected/,
    /Retry attempt\s*\{/,
    /aria-label=["']Close error dialog["']/,
    /CardHeader\s+title=["']Error["']/,
    /window state/i,
    /This section failed to load/i,
    /This window failed to load/i,
    /Please close and try again later/i,
    /Try closing and checking back later/i,
    /This page may be temporarily unavailable/i,
    /Try reloading the app/i,
    /Reload App/i,
    /Reset App Window & Reload/i,
    /If reload does not work/i,
    /Support details \(development only\)/i,
    /Show support details/i,
    /No support details available/i,
    /Automatic error reporting/i,
    /error reporting system/i,
    /Clear Temporary App Data/i,
  ];

  return stalePatterns.some((pattern) => pattern.test(text));
}

export function hasNonProtectiveScoreCopy(root, path) {
  if (!protectiveScoreCopyPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /Great Match!|Highly recommended!|You might want to skip it|if you're desperate|if you are desperate|\{reason\}\s*<\/div>|Job Scoring Weights|Score factor weights|These weights determine|scoring weights|Configurable weights|Customize Weights|Weight Presets|Weight in overall score|Smart Scoring System|Smart scoring|\bdefault priorities\b|\bdefault priority\b|Match Priority Guide|Match Factors|These percentages|priority order|Format result:|>\s*\{factor\.weight\}%\s*<\/td>|>\s*\{factorPercentage\}%\s*<\/span>|>\s*\{Math\.round\(score\)\}%\s*<\/span>|\b\d+%\s+weight\b|\b\d+%\s+priority\b|\(\d+%\s+priority\)|\b\d+%\s+influence\b|\(\d+%\s+influence\)|Strong \(70%\+\)|Some \(40-69%\)|Low \(<40%\)|Excellent \(90%\+\)|Average \(50-69%\)|Low \(&lt;50%\)|AllScoreRanges|HighScore|AverageScore|LowScore|Strong Match|Good Match|Some Match|Low Match|Best Match First|Lowest Match First|Match Details|Part of overall score|strongest matches|strong matches for your saved search|weaker or adjacent matches|Low match|Strong match|How To Read Match Results|Overall match|Experience match|Education match|Posting Risk Warning|weighted averages based on component importance|Score \(High|Score \(Low|All Scores|label="Score"|Jobs are scored based|top scores|Each job is scored|sorted by match score|jobs scoring|Alert Threshold|scoring above your threshold|match percentage|match scores?|match score, source|Match Score|Match score:|Score:\s*\{filters\.scoreFilter\}|Sort:\s*\{filters\.sortBy\}|return\s+["'`](?:Excellent|Great|Poor)["'`]/i.test(
    text,
  );
}

export function hasLegacyPreferenceListCopy(root, path) {
  if (!plainJobSearchDocPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /Title matches allowlist|Title matches blocklist|Job-word boosters|Job-word boost|Boosted job words|Excluded job words|Job-Word Match|found, boosted|not boosted|boosters\/excluders/i.test(
    text,
  );
}

export function hasTechnicalFirstUserCopy(root, path) {
  const preflightResult = getTechnicalFirstPreflightResult(root, path);
  if (preflightResult !== undefined) {
    return preflightResult;
  }

  if (!technicalFirstUserCopyPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");

  const docsResult = getTechnicalFirstDocsResult(path, text);
  if (docsResult !== undefined) {
    return docsResult;
  }

  const uiResult = getTechnicalFirstUiResult(path, text);
  if (uiResult !== undefined) {
    return uiResult;
  }

  return hasTechnicalFirstFallbackCopy(text);
}
