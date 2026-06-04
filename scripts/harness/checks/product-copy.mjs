import { readFileSync } from "node:fs";
import { join } from "node:path";

const staleResumeOptimizerFramingPaths = new Set([
  "src/App.tsx",
  "src/components/AtsLiveScorePanel.tsx",
  "src/components/Navigation.tsx",
  "src/components/ResumeMatchScoreBreakdown.tsx",
  "src/contexts/KeyboardShortcutsContext.tsx",
  "src/pages/Resume.tsx",
  "src/pages/ResumeBuilder.tsx",
  "src/pages/ResumeOptimizer.tsx",
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
  "src/pages/ResumeBuilder.tsx",
  "src/components/resume-builder/steps/SkillsStep.tsx",
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
  "docs/features/one-click-apply.md",
  "docs/user/QUICK_START.md",
  "index.html",
  "package.json",
  "src/App.tsx",
  "src-tauri/Cargo.toml",
  "src-tauri/src/commands/automation.rs",
  "src-tauri/src/commands/errors.rs",
  "src-tauri/src/core/mod.rs",
  "src/components/Navigation.tsx",
  "src/components/automation/ApplicationPreview.tsx",
  "src/components/automation/ApplyButton.tsx",
  "src/components/automation/ProfileForm.tsx",
  "src/components/automation/ScreeningAnswersForm.tsx",
  "src/pages/ApplicationProfile.tsx",
  "src/pages/DashboardUI/DashboardHeader.tsx",
  "src/pages/SetupWizard.tsx",
  "tests/e2e/README.md",
  "tests/e2e/playwright/app.spec.ts",
  "tests/e2e/playwright/keyboard-navigation.spec.ts",
  "tests/e2e/playwright/one-click-apply.spec.ts",
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
  "src/components/GhostIndicator.tsx",
  "src/pages/DashboardUI/DashboardFiltersBar.tsx",
  "src/pages/SettingsPostingRiskSection.tsx",
  "src/pages/Settings.tsx",
]);
const payProtectionGuidancePaths = new Set([
  "docs/features/salary-ai.md",
  "src/pages/Salary.tsx",
]);
const payPlainLanguagePaths = new Set([
  "README.md",
  "ROADMAP.md",
  "docs/features/salary-ai.md",
  "docs/features/market-intelligence.md",
  "docs/features/resume-matcher.md",
  "docs/harness/readme-information-design.md",
  "docs/research/pay-equity.md",
  "src/pages/Salary.tsx",
]);

const payFloorRecoveryCopyPaths = new Set([
  "docs/user/QUICK_START.md",
  "src/pages/DashboardUI/noJobsEmptyStateCopy.ts",
]);

const feedbackLocalReportPaths = new Set([
  "README.md",
  "ROADMAP.md",
  "docs/README.md",
  "docs/ROADMAP.md",
  "docs/developer/CONTRIBUTING.md",
  "docs/features/json-resume-import.md",
  "docs/features/scraper-health.md",
  "docs/features/scrapers.md",
  "docs/features/user-data-management.md",
  "docs/harness/README.md",
  "docs/harness/change-contract.md",
  "docs/harness/verification-matrix.md",
  "docs/user/QUICK_START.md",
  "src/components/ComponentErrorBoundary.tsx",
  "src/components/ErrorBoundary.tsx",
  "src/components/ErrorLogPanel.tsx",
  "src/components/ModalErrorBoundary.tsx",
  "src/components/PageErrorBoundary.tsx",
  "src/components/feedback/DescriptionInput.tsx",
  "src/components/feedback/FeedbackModal.tsx",
  "src/components/feedback/SubmitOptions.tsx",
  "src/components/feedback/SuccessScreen.tsx",
  "src/hooks/useFeedback.ts",
  "src/pages/Settings.tsx",
  "src/services/feedbackService.ts",
  "src-tauri/src/commands/feedback/mod.rs",
  "src-tauri/src/commands/feedback/debug_log.rs",
  "src-tauri/src/commands/feedback/report.rs",
  "src-tauri/src/core/health/smoke_tests.rs",
  "src/mocks/handlers.ts",
  "src/utils/errorMessages.ts",
]);

const feedbackDebugEventFormattingPaths = new Set([
  "src/components/feedback/DebugInfoPreview.tsx",
  "src/services/feedbackService.ts",
]);

const problemHistoryContextFormattingPaths = new Set([
  "src/components/ErrorLogPanel.tsx",
]);

const errorBoundaryDisplayPaths = new Set([
  "src/components/ComponentErrorBoundary.tsx",
  "src/components/ErrorBoundary.tsx",
  "src/components/ModalErrorBoundary.tsx",
  "src/components/PageErrorBoundary.tsx",
]);

const plainRecoveryCopyPaths = new Set([
  ...errorBoundaryDisplayPaths,
  "src/components/ScraperHealthDashboard.tsx",
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
  "src/config/tourSteps.ts",
  "src/components/AtsLiveScorePanel.tsx",
  "src/components/ResumeMatchScoreBreakdown.tsx",
  "src/components/GhostIndicator.tsx",
  "src/components/ScoreDisplay.tsx",
  "src/components/ScoreDisplay.stories.tsx",
  "src/components/ScoreBreakdownModal.tsx",
  "src/utils/scoreUtils.ts",
  "src/pages/ResumeOptimizer.tsx",
  "src/pages/Dashboard.tsx",
  "src/pages/DashboardUI/filterLabels.ts",
  "src/pages/DashboardUI/DashboardFiltersBar.tsx",
  "src/pages/SetupWizard.tsx",
  "src/pages/SettingsResumeMatchingSection.tsx",
  "src/pages/SettingsPostingRiskSection.tsx",
  "src/pages/Settings.tsx",
]);
const plainJobSearchDocPaths = new Set([
  "docs/features/application-tracking.md",
  "docs/features/smart-scoring.md",
]);
const hiringTrendsCopyPaths = new Set([
  "docs/README.md",
  "docs/features/market-intelligence.md",
  "src/config/tourSteps.ts",
  "src/components/LocationHeatmap.tsx",
  "src/components/MarketAlertCard.tsx",
  "src/components/MarketSnapshotCard.tsx",
  "src/components/Navigation.tsx",
  "src/mocks/handlers/marketIntelligence.ts",
  "src/pages/Market.tsx",
  "src/pages/marketErrorCopy.ts",
  "tests/e2e/playwright/page-objects/MarketIntelligencePage.ts",
]);
const firstRunPlainCopyPaths = new Set([
  "src/App.tsx",
  "src/components/CareerProfileSelector.tsx",
  "src/config/tourSteps.ts",
  "src/pages/SetupWizard.tsx",
  "docs/user/QUICK_START.md",
]);
const installSecurityCopyPaths = new Set([
  "README.md",
  "docs/style-guide/GLOSSARY.md",
  "docs/user/QUICK_START.md",
]);

const ruleZeroPrecisionCopyPaths = new Set([
  "PRIVACY.md",
  "RESPONSIBLE_AI.md",
  "SECURITY.md",
  "README.md",
  "docs/features/notifications.md",
  "docs/features/one-click-apply.md",
  "docs/harness/readme-information-design.md",
  "docs/user/DEEP_LINKS.md",
  "docs/user/QUICK_START.md",
  "src/components/ErrorBoundary.tsx",
  "src/components/ModalErrorBoundary.tsx",
  "src/components/PageErrorBoundary.tsx",
]);

const publicIssueTemplatePrivacyPaths = new Set([
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/ISSUE_TEMPLATE/question.yml",
  ".github/ISSUE_TEMPLATE/scraper_issue.yml",
]);

const technicalFirstUserCopyPaths = new Set([
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/ISSUE_TEMPLATE/question.yml",
  ".github/ISSUE_TEMPLATE/scraper_issue.yml",
  "docs/ROADMAP.md",
  "profiles/README.md",
  "README.md",
  "docs/BOOKMARKLET.md",
  "src/components/AsyncButton.tsx",
  "src/components/BookmarkletGenerator.tsx",
  "src/components/CoverLetterTemplates.tsx",
  "src/components/DeepLinkGenerator.tsx",
  "src/components/ErrorBoundary.tsx",
  "src/components/ErrorLogPanel.tsx",
  "src/components/ScoreBreakdownModal.tsx",
  "src/components/ScoreDisplay.tsx",
  "src/components/ScraperHealthDashboard.tsx",
  "src/components/CareerProfileSelector.tsx",
  "src/components/JobImportModal.tsx",
  "src/components/JobCard.tsx",
  "src/components/AtsLiveScorePanel.tsx",
  "src/components/AnalyticsPanel.tsx",
  "src/components/DashboardWidgets.tsx",
  "src/services/aiGateway.ts",
  "src/components/NotificationPreferences.tsx",
  "src/components/resume-builder/steps/SkillsStep.tsx",
  "src/components/InterviewScheduler.tsx",
  "src/components/CommandPalette.tsx",
  "src/components/KeyboardShortcutsHelp.tsx",
  "src/components/LocationHeatmap.tsx",
  "src/components/MarketSnapshotCard.tsx",
  "src/components/Navigation.tsx",
  "src/components/automation/ApplyButton.tsx",
  "src/components/automation/ApplicationPreview.tsx",
  "src/components/automation/ProfileForm.tsx",
  "src/components/automation/ScreeningAnswerSuggestions.tsx",
  "src/components/automation/ScreeningAnswersForm.tsx",
  "src/components/feedback/DebugInfoPreview.tsx",
  "src/components/feedback/FeedbackModal.tsx",
  "src/components/feedback/SubmitOptions.tsx",
  "src/components/feedback/SuccessScreen.tsx",
  "src/hooks/useFeedback.ts",
  "src/mocks/handlers/atsPlatform.ts", "src/mocks/handlers/marketIntelligence.ts",
  "src/mocks/handlers/resumeBulletPrompts.ts", "src/mocks/handlers/resumeBuilder.ts",
  "src/mocks/handlers.ts",
  "src/contexts/UndoContext.tsx",
  "src/contexts/KeyboardShortcutsContext.tsx",
  "src-tauri/src/commands/errors.rs",
  "src-tauri/src/commands/bookmarklet.rs",
  "src-tauri/src/core/db/error.rs",
  "src-tauri/src/core/automation/error.rs",
  "src-tauri/src/core/resume/ats_analyzer.rs",
  "src-tauri/src/core/resume/matcher.rs",
  "src-tauri/src/core/salary/analyzer.rs",
  "src-tauri/src/core/scrapers/error.rs",
  "src-tauri/migrations/00000000000000_initial_schema.sql",
  "src/utils/api.ts",
  "src/pages/Resume.tsx",
  "src/pages/hooks/useDashboardAutoRefresh.ts",
  "src/pages/hooks/useDashboardJobOps.ts",
  "src/pages/hooks/useDashboardSavedSearches.ts",
  "src/pages/ResumeOptimizer.tsx",
  "src/pages/Applications.tsx",
  "src/pages/ApplicationProfile.tsx",
  "src/pages/Dashboard.tsx",
  "src/pages/dashboardErrorCopy.ts",
  "src/pages/marketErrorCopy.ts",
  "src/pages/DashboardUI/DashboardHeader.tsx",
  "src/pages/DashboardUI/noJobsEmptyStateCopy.ts",
  "src/pages/DashboardUI/DashboardFiltersBar.tsx",
  "src/pages/DashboardUI/filterLabels.ts",
  "src/pages/DashboardUI/QuickActions.tsx",
  "src/pages/Market.tsx",
  "src/pages/ResumeBuilder.tsx",
  "src/pages/Salary.tsx",
  "src/pages/SettingsConnectedJobSource.tsx",
  "src/pages/SettingsResumeMatchingSection.tsx",
  "src/pages/SettingsPostingRiskSection.tsx",
  "src/pages/SettingsSupportSections.tsx", "src/pages/Settings.tsx",
  "src/pages/SetupWizard.tsx",
  "src/utils/errorHelpers.ts",
  "src/utils/errorMessages.ts",
  "src/utils/safeErrorCopy.ts",
  "src/utils/formValidation.ts",
  "src/utils/sourceLabels.ts",
  "tests/e2e/playwright/application-tracking.spec.ts",
  "tests/e2e/playwright/page-objects/ApplicationsPage.ts",
  "docs/features/application-tracking.md",
  "docs/features/ghost-detection.md",
  "docs/features/market-intelligence.md",
  "docs/features/smart-scoring.md",
  "docs/features/notifications.md",
  "docs/features/one-click-apply.md",
  "docs/features/credentials-security.md",
  "docs/features/json-resume-import.md",
  "docs/features/remote-preference-scoring.md",
  "docs/features/resume-builder.md",
  "docs/features/resume-matcher.md",
  "docs/features/salary-ai.md",
  "docs/features/scraper-health.md",
  "docs/features/scrapers.md",
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
    new RegExp(["Fill", "\\s+", "out", "\\s+", "job", "\\s+", "applications", "\\s+", "in", "\\s+", "seconds"].join(""), "i"),
    new RegExp(["Speed", "\\s+", "up", "\\s+", "applications"].join(""), "i"),
    new RegExp(["forms?", "\\s+", "for", "\\s+", "you", "\\s+", "automatically"].join(""), "i"),
    new RegExp(["fields?", "\\s+", "that", "\\s+", "will", "\\s+", "be", "\\s+", "auto-filled"].join(""), "i"),
    new RegExp(["auto-fill", "\\s+", "screening", "\\s+", "questions"].join(""), "i"),
    new RegExp(["This", "\\s+", "information", "\\s+", "will", "\\s+", "be", "\\s+", "auto-filled"].join(""), "i"),
    new RegExp(["automatically", "\\s+", "uploaded", "\\s+", "when", "\\s+", "applying"].join(""), "i"),
    new RegExp(["Prepare", "\\s+", "to", "\\s+", "apply", "\\s+-\\s+", "fills", "\\s+", "form", "\\s+", "fields", "\\s+", "automatically"].join(""), "i"),
    new RegExp(["Form", "\\s+", "filling", "\\s+", "will", "\\s+", "begin", "\\s+", "shortly"].join(""), "i"),
    new RegExp(["Form", "\\s+", "Fill", "\\s+", "Failed"].join(""), "i"),
    new RegExp(["Form", "\\s+", "preparation", "\\s+", "(?:error|failed)"].join(""), "i"),
    new RegExp(["Form", "\\s+", "filled!"].join(""), "i"),
    new RegExp(["form", "\\s+", "filling", "\\s+", "failed"].join(""), "i"),
    new RegExp(["Max", "\\s+", "applications", "\\s+", "per", "\\s+", "day"].join(""), "i"),
    new RegExp(["Total", "\\s+", "Attempts"].join(""), "i"),
    new RegExp(["Success", "\\s+", "Rate"].join(""), "i"),
    new RegExp(["Submission", "\\s+", "Rate"].join(""), "i"),
    new RegExp(["Automation", "\\s+", "Settings"].join(""), "i"),
    new RegExp(["No", "\\s+", "Auto-Submit"].join(""), "i"),
    new RegExp(["automated", "\\s+", "browsers"].join(""), "i"),
    new RegExp(["automated", "\\s+", "submission"].join(""), "i"),
    new RegExp(["form", "\\s+", "filling", "\\s+", "automation"].join(""), "i"),
    new RegExp(["supports", "\\s+", "form", "\\s+", "automation"].join(""), "i"),
    new RegExp(["automation", "\\s+", "browser"].join(""), "i"),
    new RegExp(["Privacy-first", "\\s+", "job", "\\s+", "search", "\\s+", "automation"].join(""), "i"),
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
    /Job titles, company names, search words, and personal details are not included/i.test(text) ||
    /Extra app details:\s*\$\{sanitizeTextForStorage\(error\.stack\)\}/.test(text) ||
    /Screen details:\s*\$\{sanitizeTextForStorage\(error\.componentStack\)\}/.test(text)
  );
}

export function hasRawProblemHistoryContextDetails(root, path) {
  if (!problemHistoryContextFormattingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /JSON\.stringify\(error\.context\)|\{error\.(?:message|stack|componentStack)\}/.test(text);
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
  return /Great Match!|Highly recommended!|You might want to skip it|if you're desperate|if you are desperate|\{reason\}\s*<\/div>|Job Scoring Weights|Score factor weights|These weights determine|scoring weights|Configurable weights|Customize Weights|Weight Presets|Weight in overall score|Smart Scoring System|Smart scoring|\bdefault priorities\b|\bdefault priority\b|Match Priority Guide|Match Factors|These percentages|priority order|Format result:|>\s*\{factor\.weight\}%\s*<\/td>|>\s*\{factorPercentage\}%\s*<\/span>|>\s*\{Math\.round\(score\)\}%\s*<\/span>|\b\d+%\s+weight\b|\b\d+%\s+priority\b|\(\d+%\s+priority\)|\b\d+%\s+influence\b|\(\d+%\s+influence\)|Strong \(70%\+\)|Some \(40-69%\)|Low \(<40%\)|Excellent \(90%\+\)|Average \(50-69%\)|Low \(&lt;50%\)|AllScoreRanges|HighScore|AverageScore|LowScore|Strong Match|Good Match|Some Match|Low Match|Best Match First|Lowest Match First|Match Details|Part of overall score|strongest matches|strong matches for your saved search|weaker or adjacent matches|Low match|Strong match|How To Read Match Results|Overall match|Experience match|Education match|Posting Risk Warning|weighted averages based on component importance|Score \(High|Score \(Low|All Scores|label="Score"|Jobs are scored based|top scores|Each job is scored|sorted by match score|jobs scoring|Alert Threshold|scoring above your threshold|match percentage|match scores?|match score, source|Match Score|Match score:|Score:\s*\{filters\.scoreFilter\}|Sort:\s*\{filters\.sortBy\}|return\s+["'`](?:Excellent|Great|Poor)["'`]/i.test(text);
}

export function hasLegacyPreferenceListCopy(root, path) {
  if (!plainJobSearchDocPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /Company Whitelist|Company Blacklist|Your Whitelist|Your blacklist|whitelisted companies|blacklisted companies|whitelist\/blacklist|Title matches allowlist|Title matches blocklist|Job-word boosters|Job-word boost|Boosted job words|Excluded job words|Job-Word Match|found, boosted|not boosted|boosters\/excluders/i.test(text);
}

export function hasTechnicalFirstUserCopy(root, path) {
  if (path === "src/utils/vitals.ts") {
    const text = readFileSync(join(root, path), "utf8");
    return /analytics service|analytics services|custom reporting|sendToAnalytics|telemetry/i.test(text);
  }

  if (path === "src/components/CompanyResearchPanel.tsx") {
    const text = readFileSync(join(root, path), "utf8");
    const companyResearchPatterns = [
      /Information about .* is being gathered/i,
      /Check back later for more details/i,
      /Request timed out/i,
      /Failed to load company information/i,
      /Taking longer than expected/i,
    ];

    return companyResearchPatterns.some((pattern) => pattern.test(text));
  }

  if (path === "src/utils/export.ts" || path === "src/utils/export.test.ts") {
    const text = readFileSync(join(root, path), "utf8");
    return /jobsentinel-config-\$\{date\}\.json|jobsentinel-config-\\d/.test(text);
  }

  if (path === "docs/README.md") {
    const text = readFileSync(join(root, path), "utf8");
    return /Job Source Adapters/i.test(text);
  }

  if (
    path === "src/components/MarketSnapshotCard.tsx" ||
    path === "src/components/MarketSnapshotCard.test.tsx"
  ) {
    const text = readFileSync(join(root, path), "utf8");
    const marketSnapshotPatterns = [
      /Market Sentiment/i,
      /market sentiment:/i,
      /<span>\{snapshot\.market_sentiment\}<\/span>/i,
      /getByText\(\/(?:bearish|neutral)\/i/i,
      /Market data/i,
      /market data/i,
      /No market snapshot yet/i,
    ];

    return marketSnapshotPatterns.some((pattern) => pattern.test(text));
  }

  if (hiringTrendsCopyPaths.has(path)) {
    const text = readFileSync(join(root, path), "utf8");
    const hiringTrendPatterns = [
      /Market Intel/i,
      /Market Intelligence/i,
      /(?:>\s*|["'`])Market Alerts(?:\s*<|["'`])/i,
      /Market snapshots/i,
      /(?:>\s*|["'`])Market alerts(?:\s*<|["'`])/i,
      /Loading market alerts/i,
      /No market alerts/i,
      /Failed to Load Market Data/i,
      /Market data unavailable/i,
      /Refresh Market Data/i,
      /job market trends/i,
      /Job Market by Location/i,
      /No location data yet/i,
      /No market snapshot yet/i,
      /monitored postings/i,
      /Skill demand/i,
      /real skill demand/i,
      /source bias/i,
      /sources currently monitored/i,
      /job-board bias/i,
      /Optional notification channels are used only if configured/i,
      /Notification delivery is optional and user-configured/i,
    ];

    if (hiringTrendPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }

    if (path === "src/pages/Market.tsx") {
      return false;
    }
  }

  if (firstRunPlainCopyPaths.has(path)) {
    const text = readFileSync(join(root, path), "utf8");
    const firstRunPatterns = [
      /setup wizard/i,
      /Loading setup wizard/i,
      /Career Path/i,
      /Review & Edit/i,
      /Customize Your Search/i,
      /Continue with This Path/i,
      /Continue with My Own Search/i,
      /My Own Search/i,
      /Starts with \{?profile\.keywordsBoost\.length\}? helpful skills/i,
      /Hacker News hiring posts/i,
    ];

    if (firstRunPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (installSecurityCopyPaths.has(path)) {
    const text = readFileSync(join(root, path), "utf8");
    const hasSecurityOverride = /Open Anyway|Run anyway/i.test(text);
    const hasDownloadCheck = /downloaded JobSentinel from the latest download page/i.test(text);

    if (hasSecurityOverride && !hasDownloadCheck) {
      return true;
    }
  }

  if (ruleZeroPrecisionCopyPaths.has(path)) {
    const text = readFileSync(join(root, path), "utf8");
    const ruleZeroPatterns = [
      /Your data is safe/i,
      /Your saved details are safe/i,
      /Your data stays yours\. Always/i,
      /No data is ever sent/i,
      /Works completely offline/i,
      /Sensitive data never written/i,
      /without exposing private data/i,
      /already sanitized before sharing/i,
      /Saved details are never stored in plain text/i,
      /Rule 0 privacy and security guarantee/i,
      /It does not share your profile details/i,
      /No tracking or analytics/i,
      /GitHub feedback, and Google Drive are user-configured/i,
      /External alerts\s*\|[^\n]*(?:GitHub|Google Drive)/i,
      /Feedback or issue-report sharing through configured GitHub or Google Drive/i,
      /Optional user-configured job-source addresses/i,
      /These addresses are off unless configured/i,
      /metadata only/i,
      /raw titles/i,
      /raw location/i,
      /raw local match reasons/i,
      /raw prompts/i,
      /payload minimization/i,
      /payload preview/i,
      /user-configured alerts/i,
      /user-configured\s+channels/i,
      /metadata logging/i,
      /local metadata logging/i,
      /source host/i,
      /title count/i,
      /work location mode/i,
      /requested-job limit/i,
    ];

    if (ruleZeroPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }

    if (path === "PRIVACY.md" || path === "SECURITY.md") {
      return false;
    }
  }

  if (publicIssueTemplatePrivacyPaths.has(path)) {
    const text = readFileSync(join(root, path), "utf8");

    if (!/Please don't include (?:any )?personal information/i.test(text)) {
      return true;
    }

    if (/redacts sensitive\s+details before you share it/i.test(text)) {
      return true;
    }

    if (!/redacts known\s+sensitive details before you review and share it/i.test(text)) {
      return true;
    }
  }

  if (payPlainLanguagePaths.has(path)) {
    const text = readFileSync(join(root, path), "utf8");
    const payJargonPatterns = [
      /under-anchoring/i,
      /under-leveling/i,
      /under-leveled/i,
      /What does it optimize for/i,
      /does not optimize for/i,
      /optimization target/i,
    ];

    if (payJargonPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (
    path === "README.md" ||
    path === "ROADMAP.md" ||
    path === "PRIVACY.md" ||
    path === "RESPONSIBLE_AI.md" ||
    path === "docs/harness/readme-information-design.md"
  ) {
    const text = readFileSync(join(root, path), "utf8");
    const frontDoorAtsPatterns = [
      /ATS transparency/i,
      /ATS-readable application clarity/i,
      /Manipulate ATS systems/i,
      /official ATS postings/i,
      /public ATS postings/i,
      /Company-site and ATS verification/i,
      /ATS pages/i,
    ];

    if (frontDoorAtsPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (!technicalFirstUserCopyPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");

  if (path.startsWith("docs/features/")) {
    const featureDocImplementationPatterns = [
      /^##\s*(?:Developer Notes|For Maintainers|Checks for Maintainers)\b/im,
      /Implementation references/i,
      /Important modules/i,
      /Tauri commands/i,
      /Backend core/i,
      /src-tauri\/src/i,
      /src\/pages\//i,
      /cargo test/i,
      /npm run test:run/i,
      /npm run lint:bloat/i,
      /Core tables/i,
      /Core commands/i,
      /HashMap-based/i,
      /O\(n\*?m\)/i,
      /SynonymMap::/i,
      /private saved-file reference/i,
      /saved resume state/i,
      /negative number for groups/i,
      /chat number/i,
    ];

    if (featureDocImplementationPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "README.md") {
    const readmePatterns = [
      /before scanning starts/i,
      /starts scanning/i,
      /source adapters/i,
      /common source HTTP client/i,
      /ATS platforms/i,
      /background monitoring/i,
      /job source adapter guide/i,
      /bounded requests/i,
      /bounded website reads/i,
      /health checks/i,
      /source-specific boundaries/i,
      /source-specific limits/i,
      /shared retry helpers/i,
      /Download the latest installer from\s*\[GitHub Releases\]/i,
      /Local SQLite storage/i,
      /Your OS credential store/i,
      /Support sharing links\s*\|[^\n]*(?:GitHub issue pages|Google Drive folders)/i,
    ];

    if (readmePatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/features/resume-matcher.md") {
    const resumeMatcherPatterns = [
      /ATS internals/i,
      /ATS manipulation/i,
      /not ATS\s+manipulation/i,
      /show the exact payload/i,
      /request metadata locally/i,
    ];

    if (resumeMatcherPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/features/application-tracking.md") {
    const applicationTrackingPatterns = [
      /Slack,\s*Discord,\s*Teams,\s*SMTP/i,
      /user configures them/i,
      /configured quiet period/i,
    ];

    if (applicationTrackingPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/features/user-data-management.md") {
    const userDataManagementPatterns = [
      /external channels are used only if configured/i,
      /raw private values/i,
      /redacted configuration summaries/i,
      /raw notes/i,
      /credentials,\s*private paths,\s*cookies,\s*webhook/i,
      /Developer Notes/i,
      /Implementation references/i,
      /src\/components\/CoverLetterTemplates\.tsx/i,
      /src-tauri\/src\/core\/user_data/i,
      /Tauri commands/i,
      /notificationPrefsExample/i,
      /advancedFilters/i,
      /save_notification_preferences/i,
      /minScoreThreshold/i,
      /npm run test:run/i,
      /cargo test --lib user_data/i,
      /Implementation rule/i,
    ];

    if (userDataManagementPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/features/credentials-security.md") {
    const credentialsSecurityPatterns = [
      /Credential\s*\|\s*Storage key\s*\|\s*Used for/i,
      /Slack webhook URL/i,
      /Discord webhook URL/i,
      /Microsoft Teams webhook URL/i,
      /Email SMTP password/i,
      /Credential values stay local/i,
      /whether a credential exists/i,
      /Plaintext config credential fields/i,
      /webhook URLs/i,
      /API\s+keys/i,
      /Credential command logs/i,
      /`config\.json`,\s*localStorage/i,
      /accidental commits,\s*backup tools,\s*or diagnostic bundles/i,
      /local app config or SQLite/i,
      /command line in the developer reference/i,
      /Invalid key\s*\|\s*App sent an unsupported saved-detail name/i,
      /Developer Reference/i,
      /Storage Names/i,
      /Frontend Integration/i,
      /Advanced Linux Keyring Check/i,
      /Secret Service provider/i,
      /CredentialKey/i,
      /store_credential/i,
      /jobsentinel_slack_webhook/i,
      /compatibility and diagnostics/i,
    ];

    if (credentialsSecurityPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/features/notifications.md" || path === "docs/user/QUICK_START.md") {
    const notificationDocPatterns = [
      /Email provider details/i,
      /Create New App/i,
      /From Scratch/i,
      /secure credential manager/i,
      /Legacy plain-text fields/i,
      /provider guidance/i,
      /channel is \*\*enabled\*\*/i,
      /verify the connection/i,
      /bot an admin/i,
      /manual provider setup/i,
      /For developers and the curious/i,
      /Webhooks are validated before sending/i,
      /Manual Email Server Reference/i,
      /Server Settings\s*>\s*Integrations/i,
      /Advanced Sending Server Reference/i,
      /already know how to create a Telegram bot/i,
      /Create a Telegram bot/i,
      /Telegram alert bot/i,
      /Telegram chat details/i,
      /Telegram setup details/i,
      /Telegram says "chat not found"/i,
      /bot is added/i,
      /give the bot permission/i,
    ];

    if (notificationDocPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (
    path === "src/components/AnalyticsPanel.tsx" &&
    /Could not load application summary\.\s*Please try again|Application Analytics|Status Distribution|Responses by Job Source|Average Response Time|Company Response Times|Detailed Status Breakdown|No analytics data available|Download analytics data|Close analytics|Analytics error|Loading analytics|job-analytics|Failed to fetch analytics|apps\s*·\s*\{?source\.response_rate\.toFixed\(0\)\}?\s*%\s*response/i.test(text)
  ) {
    return true;
  }

  if (
    path === "src/components/DashboardWidgets.tsx" &&
    (
      /setError\(\s*["'`]Could not load application summary["'`]\s*\)/i.test(text) ||
      /Analytics Dashboard|Analytics charts|Weekly Activity|Jobs by Source|Salary Distribution|Quick Stats/i.test(text)
    )
  ) {
    return true;
  }

  if (path === "src/components/JobImportModal.tsx") {
    const importPatterns = [
      /Missing details:\s*\{?preview\.missing_fields\.join/i,
      /preview\.missing_fields\.join\(\s*["'`],\s*["'`]\s*\)/i,
    ];
    if (importPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/pages/Settings.tsx" || path === "src/pages/SettingsConnectedJobSource.tsx") {
    const settingsPatterns = [
      /Review before anything is sent/i,
      />Endpoint</i,
      />Remote filter</i,
      />Result limit</i,
      /Not remote-only/i,
      /Get optional USAJobs access code/i,
      /USAJobs email,\s*keywords,\s*location/i,
      /label=["']Keywords["']/i,
      /posted-within choice/i,
      /\bresult limit\b/i,
      />\s*Posted within:/i,
      />\s*Max results:/i,
      /Optional USAJobs auto-check/i,
      /Automatic USAJobs checks contact USAJobs/i,
      /Source host/i,
      /(?:>\s*|["'`])Settings backup saved(?:\s*<|["'`])/,
      /Saved passwords and connection codes are left out for safety/i,
      /Config imported/i,
      /(?:>\s*|["'`])Basic Settings(?:\s*<|["'`])/,
      /(?:>\s*|["'`])More Settings(?:\s*<|["'`])/,
      /(?:>\s*|["'`])Advanced Settings(?:\s*<|["'`])/,
      /Greenhouse, Lever, and other popular job boards/i,
      /native OS notifications/i,
      /app is focused/i,
      /SMTP server/i,
      /SMTP port/i,
      /Connection Number/i,
      /Email provider details/i,
      /Provider address/i,
      /Provider number/i,
      /Use this only if your provider gives you manual email details/i,
      /Manual email setup/i,
      /automatic monitoring/i,
      /Auto-enable Slack if valid connection link entered/i,
      /Paste Slack connection link["'`]/i,
      /Advanced federal monitoring/i,
      /Request USAJobs access code/i,
      /\bautomatic checks\b/i,
      /automatic\s+USAJobs\s+checks/i,
      /Advanced chat alert/i,
      /\(Tech hubs\)/i,
      /HN Who's Hiring/i,
      /Hacker News Who's Hiring/i,
      /Turn Hacker News hiring post checks on or off/i,
      /\(Tech careers\)/i,
      /blocks automatic checks/i,
      /Optional USAJobs auto-check/i,
      /Automatic USAJobs checks contact USAJobs/i,
      /New scans use this warning behavior/i,
      /These job boards can be monitored when enabled/i,
      /Loading ghost config/i,
      /Server Settings\s*→\s*Integrations\s*→\s*create a channel connection\s*→\s*Copy link/i,
      /Channel\s*→\s*Connectors\s*→\s*create a channel connection\s*→\s*Copy link/i,
      /Browser Integration/i,
      /low-trust job postings/i,
      /Stale-posting warning after \(days\)/i,
      /Repeated-posting warning count/i,
      /Very short description limit \(characters\)/i,
      /Hide risky postings/i,
      /Resume-Based Scoring/i,
      /70%\s*resume match\s*\+\s*30%\s*search words/i,
      /<dt[^>]*>\s*Job-source link\s*<\/dt>/i,
      /Paste a job-source link from a service you trust/i,
      /uploaded resume/i,
      /Upload your resume/i,
      /uploaded,\s*scoring uses/i,
      /added,\s*scoring uses/i,
      /These logs can help diagnose it/i,
      /Turn this on to never miss a new posting/i,
      /Auto-scan job boards/i,
      /Company preference \(if configured\)/i,
      /["'`]Save failed["'`]/,
      /["'`]Test failed["'`]/,
      /saved connection detail\(s\) failed to save/i,
      /Share\s*\$\{savedFile\.fileName\}\s*only if you want help/i,
      /Recommended for you/i,
      /onClick=\{rec\.enable\}[\s\S]{0,220}>\s*Enable\s*<\/button>/i,
      /Message @BotFather to create a private alert bot/i,
      /already use Telegram for automatic alerts/i,
      /Telegram chat number/i,
      /Telegram destination number/i,
      /destination number Telegram shows/i,
      /@BotFather/i,
      /@userinfobot/i,
      /\/newbot/i,
      /Quick Setup \(2 minutes\)/i,
      />\s*Get USAJobs Access Code\s*</i,
      /USAJobs uses a free access code/i,
      /Looks up your approximate city from your internet\s+address\. Not saved unless added\./i,
      /Restart JobSentinel/i,
    ];

    if (settingsPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }

    return false;
  }

  if (
    path === "src-tauri/src/core/automation/error.rs" ||
    path === "src-tauri/src/core/scrapers/error.rs"
  ) {
    const start = text.indexOf("pub fn user_message");
    const end = text.indexOf("/// Sanitize", start);
    const userMessageBody = start === -1 ? "" : text.slice(start, end === -1 ? undefined : end);

    return /Failed to|Request timed out|CAPTCHA detected|Authentication required|Please check your credentials|An automation error occurred|manual intervention|required before submission|Resume issue|Form element .*not found|Page took too long to load \(/i.test(
      userMessageBody,
    );
  }

  if (path === "src/pages/Resume.tsx") {
    const resumePagePatterns = [
      /Programming Languages/i,
      /Cloud & DevOps/i,
      /Skills Extracted/i,
      /No skills extracted yet/i,
      /extract skills automatically/i,
      /Recent Match Results/i,
      /Score Breakdown/i,
      /Matched Skills/i,
      /["'`]Missing Skills/i,
      /You have all required skills!/i,
      /Gap Analysis/i,
      /skill\.confidence_score\s*\*\s*100/i,
      /Proficiency Distribution/i,
      /Proficiency level/i,
      /PROFICIENCY_LEVELS\s*=\s*\[[^\]]*Beginner[^\]]*Expert/i,
      /Failed to load resume/i,
      /No Resume Uploaded/i,
      /Resume uploaded/i,
      /Upload Resume/i,
      /Upload New/i,
      /Uploading\.\.\./i,
      /Uploaded:/i,
    ];

    if (resumePagePatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (
    path === "src/pages/ResumeBuilder.tsx" ||
    path === "src/components/resume-builder/steps/SkillsStep.tsx"
  ) {
    const resumeBuilderPatterns = [
      />\s*Proficiency\s*</i,
      /["'`]Proficiency["'`]/,
      /Select level/i,
      /PROFICIENCY_LEVELS\s*=\s*\[[^\]]*beginner[^\]]*expert/i,
      /charAt\(0\)\.toUpperCase\(\)\s*\+\s*level\.slice\(1\)/,
      /Failed to import skills/i,
      /Failed to generate preview/i,
      /Export failed/i,
      /Try restarting JobSentinel/i,
      /restarting JobSentinel/i,
      /Try restarting the app/i,
      /restarting the app/i,
      /more issues/i,
    ];

    if (resumeBuilderPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/pages/Salary.tsx") {
    const salaryPagePatterns = [
      /Seniority Level/i,
      /Entry Level \(0-2 years\)/i,
      /Mid Level \(3-5 years\)/i,
      /Principal\/Executive/i,
      /25th\s*%/i,
      /75th\s*%/i,
      /75th percentile/i,
      /25th percentile/i,
      /Strong target from higher range/i,
      /under-anchoring/i,
    ];

    if (salaryPagePatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (
    path === "src-tauri/src/core/resume/matcher.rs" ||
    path === "src-tauri/src/core/resume/ats_analyzer.rs" ||
    path === "src/mocks/handlers.ts" ||
    path === "src-tauri/src/core/salary/analyzer.rs" ||
    path === "src-tauri/migrations/00000000000000_initial_schema.sql"
  ) {
    const advisoryGuidancePatterns = [
      /Apply immediately/i,
      /Study the missing skills/i,
      /Consider upskilling/i,
      /Excellent offer!\s*Accept/i,
      /I was hoping/i,
      /top choice/i,
      /make this an easy decision/i,
      /skin in the game/i,
      /\(add specific metrics\)/i,
      /impact:\s*["'`](?:High|Medium)["'`]/i,
      /impact:\s*(?:"High"|"Medium")\.to_string\(\)/i,
      /Start bullet with action verb/i,
    ];

    if (advisoryGuidancePatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/pages/ResumeOptimizer.tsx") {
    const resumeMatchDetailPatterns = [
      /Improve Bullet Point/i,
      /Improved Version/i,
      /Could not improve bullet/i,
      /Tailor Resume for This Job/i,
      /Navigation not available/i,
      /Cannot navigate to Resume Builder/i,
      /Navigating to Resume Builder/i,
      /Job context has been saved/i,
      /Format Issues/i,
      />\s*\{issue\.severity\}\s*</i,
      /(^|[>\n])\s*Fix:\s*\{issue\.fix\}/i,
      /Impact:\s*\{suggestion\.impact\}/i,
      /Your resume data has been imported and analyzed/i,
      /ScoreItem\s+label=["'`]Completeness["'`]/,
      /choose or upload/i,
      /Choose or Upload Resume/i,
    ];

    if (resumeMatchDetailPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/components/AtsLiveScorePanel.tsx") {
    const resumeReadabilityPatterns = [
      /analyzing\.\.\./i,
      />\s*Job Context\s*</i,
      /View Full Analysis/i,
      /Format Issues/i,
      />\s*\{issue\.severity\}\s*</i,
      /(^|[>\n])\s*Fix:\s*\{issue\.fix\}/i,
      /Impact:\s*\{suggestion\.impact\}/i,
      /Include technical, workplace, and role-specific skills/i,
      /Add words from the job post/i,
      /ScoreBar\s+label=["'`]Complete["'`]/,
      /ScoreCard\s+label=["'`]Completeness["'`]/,
      />\s*View Details\s*</i,
      /Full Resume Readability Review/i,
      /\{analysis\.missing_keywords\.length\}\s+missing/i,
      /\{analysis\.format_issues\.length\}\s+issues/i,
    ];

    if (resumeReadabilityPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/features/resume-builder.md") {
    const resumeBuilderDocPatterns = [
      /proficiency levels/i,
      /expert, intermediate/i,
      /Readability Score/i,
      /\*\*Completeness\*\*/i,
      /Developer Details/i,
      /For developers and the curious/i,
      /Local Storage Model/i,
      /Tauri Commands/i,
      /resume_drafts/i,
      /consistent upload previews/i,
      /ready to upload to any job application/i,
      /Some upload previews and review tools/i,
      /ats-optimizer\.png/i,
      /\*\*80-100\*\*/i,
      /\*\*60-79\*\*/i,
      /\*\*40-59\*\*/i,
      /\*\*0-39\*\*/i,
      /create_resume_draft/i,
      /export_resume_docx/i,
      /analyze_resume_for_job/i,
      /Backend Files/i,
      /DOCX generation/i,
    ];

    return resumeBuilderDocPatterns.some((pattern) => pattern.test(text));
  }

  if (path === "docs/features/smart-scoring.md") {
    const smartScoringDocPatterns = [
      /advanced scoring configuration/i,
      /Developer Notes/i,
      /Current Tauri commands/i,
      /get_scoring_config/i,
      /update_scoring_config/i,
      /reset_scoring_config_cmd/i,
      /validate_scoring_config/i,
      /ScoringConfig/i,
      /recency proportions/i,
      /complete scoring model/i,
      /Internal field names/i,
      /Uploaded resume skills/i,
    ];

    if (smartScoringDocPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/features/json-resume-import.md") {
    const resumeImportDocPatterns = [
      /JSON Resume content\s*\|\s*JobSentinel draft field/i,
      /`basics\./i,
      /`(?:work|volunteer|education|skills|certificates|awards|projects)\[\]`/i,
      /Developer contract/i,
      /Implementation paths/i,
      /select_and_import_json_resume/i,
      /import_json_resume/i,
      /Returned renderer DTOs/i,
      /Run the focused Rust tests/i,
      /cd src-tauri/i,
      /cargo test core::resume::json_resume/i,
      /\bJSON Resume\b/i,
      /raw JSON strings/i,
      /JSON character length/i,
      /partial JSON Resume files/i,
      /malformed JSON errors/i,
      /JSON Resume schema/i,
      /JSON Resume registry/i,
    ];

    if (resumeImportDocPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/features/ghost-detection.md") {
    const ghostDetectionDocPatterns = [
      /low-trust listing/i,
      /Settings\s*>\s*Detection\s*>\s*Ghost Detection Settings/i,
      /Ghost Detection Settings/i,
      /For developers and the curious/i,
      /Signal Weights/i,
      /Database Schema/i,
      /API Commands/i,
      /Ghost configuration commands/i,
      /ghost_reasons TEXT/i,
      /\bghost_score\b/i,
      /\brepost_count\b/i,
      /invoke\("get_ghost_/i,
      /invoke\("set_ghost_config/i,
      /invoke\("reset_ghost_config/i,
    ];

    if (ghostDetectionDocPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/features/salary-ai.md") {
    return /seniority level|by title, location, and\s+seniority/i.test(text);
  }

  if (path === "docs/features/notifications.md") {
    const notificationDocPatterns = [
      /incoming webhook/i,
      /Advanced setup for Telegram bot users/i,
      /match strength/i,
      /match score/i,
      /fit label or percentage/i,
      /alert selectivity/i,
      /Slack Advanced Chat Setup/i,
      /Add New Webhook to Workspace/i,
      /Advanced Sending Server Reference/i,
      /Native OS notifications/i,
      /System notification daemon alerts/i,
      /https:\/\/api\.slack\.com\/messaging\/webhooks/i,
      /Message \[@BotFather\]/i,
      /Find the Telegram chat number/i,
      /email provider/i,
      /\|\s*Provider\s*\|\s*Server\s*\|\s*Port\s*\|/i,
      /All connections use TLS\/STARTTLS encryption/i,
      /Maintainer Notes/i,
      /Alert delivery details/i,
      /Parallel Sending/i,
      /Connection Link Checks/i,
      /Module Structure/i,
      /src-tauri\/src\/core\/notify/i,
      /hooks\.slack\.com\/services/i,
      /discord(?:app)?\.com\/api\/webhooks/i,
      /outlook\.office(?:365)?\.com\/webhook/i,
      /Telegram Bot API/i,
    ];

    if (notificationDocPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/user/QUICK_START.md") {
    const quickStartPatterns = [
      /Assets section/i,
      /For developers:\s*build from source/i,
      /For contributors/i,
      /Need developer setup/i,
      /Developer Setup/i,
      /Developers can build locally/i,
      /Node, Rust, and the Tauri/i,
      /npm run tauri:build/i,
      /bounded requests/i,
      /bounded website reads/i,
      /health checks/i,
      /source-specific boundaries/i,
      /source-specific limits/i,
      /shared retry helpers/i,
      /low-trust postings/i,
      /scan allowed sources immediately/i,
      /Ghost Job Detection/i,
      /force a refresh/i,
      /choose \*\*More Settings\*\*/i,
      /choose More Settings/i,
      /download list on the newest release/i,
      /Optional:\s*build it yourself/i,
      /build JobSentinel from the source code/i,
      /source-code setup guide/i,
      /developer tools and commands/i,
      /https:\/\/api\.slack\.com\/messaging\/webhooks/i,
      /Advanced:\s*where JobSentinel saves local files/i,
      /Support file locations/i,
      /%LOCALAPPDATA%\\JobSentinel\\jobs\.db/i,
      /watching the allowed sources/i,
      /Here's what happens automatically/i,
      /app password or sending details/i,
    ];

    if (quickStartPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/user/DEEP_LINKS.md") {
    const deepLinkPatterns = [
      /Privacy And Source Boundaries/i,
      /session cookies/i,
      /background collection/i,
      /Rate limiting/i,
      /\[developer guide\]/i,
      /^## Supported Sites/im,
      /Monitored sources?/i,
      /does not monitor directly/i,
      /local monitoring/i,
      /Advanced filters/i,
      /Contributors can also add sites in code/i,
      /Browser extension integration/i,
      /This is expected\s+-\s+log in to view results/i,
      /Bulk open \(open multiple sites at once\)/i,
    ];

    if (deepLinkPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/features/scraper-health.md" || path === "docs/features/scrapers.md") {
    const sourceDocPatterns = [
      /Job Source Adapters/i,
      /public, bounded source adapters/i,
      /feeds or APIs/i,
      /Requests\/hour/i,
      /Official\/public board API/i,
      /Official\/public postings API/i,
      /Official API with user-provided access code/i,
      /hidden LinkedIn endpoints/i,
      /HTML, RSS, JSON/i,
      /Adapter Flow/i,
      /SHA256\(/i,
      /source boundaries as adapters/i,
      /rate limits and bounded response reads/i,
      /^## Implementation Notes/im,
      /^## Verification/im,
      /official company or ATS postings/i,
      /public ATS APIs/i,
      /public ATS sources/i,
      /hidden endpoint/i,
      /CAPTCHA bypass/i,
      /anti-bot prone/i,
      /understand HTTP, selectors, credentials, or logs/i,
      /source-boundary check/i,
      /bounded public request/i,
      /source-specific limits/i,
      /shared retry helpers/i,
      /decoded bodies/i,
      /Public JSON endpoint/i,
      /Public job endpoint/i,
      /ATS feeds/i,
      /source host/i,
      /title count/i,
      /work location mode/i,
      /requested-job limit/i,
      /Scheduled adapters/i,
      /Source-check adapters/i,
      /Representative adapter limits/i,
      /bounded HTTP request/i,
      /parse into normalized jobs/i,
      /deduplicate/i,
      /Configured source/i,
      /source-policy check/i,
      /record health metadata/i,
      /Health And Diagnostics/i,
      /User-Configured External Sources/i,
      /local metadata only/i,
      /HN Who's Hiring/i,
      /Hacker News/i,
    ];

    if (sourceDocPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/pages/SetupWizard.tsx") {
    const setupWizardPatterns = [
      /Slack connection link/i,
      /hooks\.slack\.com\/services/i,
    ];

    if (setupWizardPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "docs/features/notifications.md") {
    if (/private connection link/i.test(text)) {
      return true;
    }
  }

  if (path === "src/utils/sourceLabels.ts") {
    return /Who's Hiring thread|HN Who's Hiring|Hacker News/i.test(text);
  }

  if (path === "src/components/automation/ApplicationPreview.tsx") {
    return [
      /CAPTCHA verification \(if present\)/i,
      /No profile configured/i,
      /Resume upload \(select your file\)/i,
      /set up your application profile first/i,
    ].some((pattern) => pattern.test(text));
  }

  if (path === "src/components/CoverLetterTemplates.tsx") {
    return [
      /\bsetError\(errorMsg\)/,
      /toast\.error\(\s*["'`]Failed to save template/i,
      /Failed to Load Templates/i,
      /Failed to copy/i,
      /Copied to clipboard/i,
      /Template filled and copied/i,
      /Check any bracketed blanks/i,
      /Please try again/i,
    ].some((pattern) => pattern.test(text));
  }

  if (path === "src/components/automation/ProfileForm.tsx") {
    return /Require manual approval|Failed to load profile|Failed to select file|Please fix the errors|Failed to save|Please try again|Taking longer than expected|Select your resume file \(PDF or DOCX\) for application review|Daily application review limit|Daily review limit:|<option value="50">50<\/option>/i.test(text);
  }

  if (path === "src/components/automation/ScreeningAnswersForm.tsx") {
    return /Dropdown selection|Please fix the errors|Failed to load answers|Please try again/i.test(text);
  }

  if (path === "src/components/automation/ScreeningAnswerSuggestions.tsx") {
    return /Failed to load suggestions|setError\(\s*["'`]Could not load saved answers["'`]\s*\)/i.test(text);
  }

  if (path === "src/pages/DashboardUI/noJobsEmptyStateCopy.ts") {
    return /Scan allowed sources|Local checks run on your schedule/i.test(text);
  }

  if (path === "src/pages/Dashboard.tsx") {
    return /Scanning job boards|Scan complete|Failed to load company research/i.test(text);
  }

  if (path === "src/components/InterviewScheduler.tsx") {
    return /Failed to load interviews|Technical Interview|Mark as Complete|>\s*Failed\s*<|Did not go well|feedbackOutcome\.charAt/.test(text) || /Interview Outcome:/.test(text);
  }

  if (path === "src/pages/DashboardUI/DashboardHeader.tsx") {
    return /Scanning job boards|Scanning\.\.\.|Ready to scan|Auto-refresh in/i.test(text);
  }

  if (path === "src/pages/Applications.tsx") {
    if (
      /\{reminder\.reminder_type\}\s*-\s*Due:/i.test(text) ||
      /applications list failed to load/i.test(text) ||
      /Status update failed/i.test(text) ||
      /Restart JobSentinel/i.test(text) ||
      /Move cards between columns, or use Space and arrow keys/i.test(text) ||
      />\s*Analytics\s*</i.test(text)
    ) {
      return true;
    }
  }

  if (path === "src/pages/dashboardErrorCopy.ts") {
    return /Job Search Failed/i.test(text);
  }

  if (path === "src/pages/ApplicationProfile.tsx") {
    return /Failed to load application history|Restart JobSentinel|Marked Sent|Ready to Send|Submission Rate/i.test(text);
  }

  if (path === "src/hooks/useFeedback.ts") {
    return /Failed to load system information|Please try again or copy the report instead|Could not open GitHub/i.test(
      text,
    );
  }

  if (path === "src/utils/api.ts") {
    return /Operation Failed|Support details:|An error occurred/i.test(text);
  }

  if (path === "src/utils/errorMessages.ts") {
    return /Notification Setup Failed|Slack Notification Failed|Discord Notification Failed|Teams Notification Failed|Email Notification Failed|Reminder Setup Failed|API key|API Limit|The database is currently in use|Configuration Missing|configuration file|webhook URL|SMTP credentials|contact support|technical:\s*technicalMessage|JSON\.stringify\(error\)|Try refreshing|restart the app|Check your internet connection and try again\.'|system date\/?time|system date and time|Try again in 10-15 minutes|Check your notification settings and try again\.'|Website Format Changed|Job Source Disabled|currently disabled|More Settings|View Job Sources|stopped accepting more requests|Security Certificate Issue|Resume Analysis Problem|analysis service|No resume has been uploaded|Upload your resume/i.test(
      text,
    );
  }

  if (path === "src/utils/formValidation.ts") {
    return /unsupported pattern symbols|Check brackets or special characters|Invalid regex pattern|unmatched brackets|Pattern is required/i.test(
      text,
    );
  }

  if (path === "src/pages/hooks/useDashboardJobOps.ts") {
    return /Undo failed|Redo failed|Bookmark Failed|Bulk Hide Failed|Bulk Bookmark Failed|Bulk Merge Failed|\d+\s+failed|Couldn't update bookmark\.\s*Try again|Try refreshing|refresh and try again|restart the app|None of the duplicate groups could be merged\. Try merging them individually/i.test(
      text,
    );
  }

  if (path === "src/contexts/UndoContext.tsx") {
    return /Undo failed|Redo failed|Try refreshing/i.test(text);
  }

  if (path === "src/pages/hooks/useDashboardAutoRefresh.ts") {
    return /Job scanning has failed 3 times in a row|manual search|Auto-refreshing|Scanning for new jobs|automatically\. Check your connection/i.test(text);
  }

  if (path === "src/components/BookmarkletGenerator.tsx") {
    const browserButtonPatterns = [
      /Advanced connection settings/i,
      /local safety code/i,
      /If this feels hard/i,
      /block page import/i,
      /Allow clipboard access and try again\./i,
      /when JobSentinel restarts/i,
      /Support settings/i,
      /Support number/i,
      /Help-only settings/i,
      /support reply/i,
      /Import Helper/i,
      /Advanced browser button setting/i,
      /Browser helper number/i,
      /import helper/i,
      /browser import settings/i,
      /browser import connection/i,
      /Could not update browser import/i,
    ];

    if (browserButtonPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src-tauri/src/commands/bookmarklet.rs") {
    return /Allow clipboard access and try again\.|import helper/i.test(text);
  }

  if (path === "docs/BOOKMARKLET.md") {
    return /advanced settings|another port|advanced connection settings|connection settings|Works best on individual job pages from:[\s\S]{0,260}(?:LinkedIn|Indeed|Glassdoor)|Official ATS job pages|public ATS sources|after restarting JobSentinel|If support asks, open \*\*Connection settings\*\*|local safety code|Debug reports must redact|import helper/i.test(
      text,
    );
  }

  if (path === "src/components/ErrorLogPanel.tsx") {
    return /Advanced: Save Support Details|Save extra app details \(support only\)|Save Extra Local Details|Save Full Local Problem Details|Use this only if a maintainer asks|\{displayMessage\}/i.test(
      text,
    );
  }

  if (path === "src/components/DeepLinkGenerator.tsx") {
    if (/does not monitor directly|Login required/i.test(text)) {
      return true;
    }
  }

  if (path === "src/components/ScraperHealthDashboard.tsx") {
    const sourceStatusPatterns = [
      /Check All Sources/i,
      /Official feed/i,
      /return\s+["'`]Feed["'`]/i,
      /\(retry\s+\$\{?retryAttempt\}?\)|\(retry\s+\d+\)/i,
      />\s*Access\s*</i,
      />\s*Source Type\s*</i,
      />\s*Can Read Jobs\s*</i,
      />\s*Not needed\s*</i,
      />\s*Recent Success\s*</i,
      /Checks Worked/i,
      /Check Time/i,
      /Last Worked/i,
      />\s*Issue\s*</i,
      /success_rate_24h\.toFixed\(0\)\s*\}\s*%/i,
      /Job Source Check Results/i,
      /Source Controls/i,
      /title=["']Source Check Results["']|\/\*\s*Source Check Results Modal\s*\*\//i,
    ];

    if (sourceStatusPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "SECURITY.md") {
    return /email the maintainer directly or use GitHub's private vulnerability/i.test(text);
  }

  if (path === "CODE_OF_CONDUCT.md") {
    return /reported by opening an issue or contacting\s+the maintainer directly/i.test(text);
  }

  if (path === "src/pages/Settings.tsx") {
    const settingsPatterns = [
      /native OS notifications/i,
      /app is focused/i,
      /SMTP server/i,
      /SMTP port/i,
      /Email provider details/i,
      /Provider address/i,
      /Provider number/i,
      /Use this only if your provider gives you manual email details/i,
      /email provider/i,
      /automatic monitoring/i,
      /Advanced federal monitoring/i,
      /Advanced chat alert/i,
      /\(Tech hubs\)/i,
      /HN Who's Hiring/i,
      /Hacker News Who's Hiring/i,
      /Turn Hacker News hiring post checks on or off/i,
      /\(Tech careers\)/i,
      /blocks automatic checks/i,
      /New scans use this warning behavior/i,
      /Browser Integration/i,
      /low-trust job postings/i,
      /Stale-posting warning after \(days\)/i,
      /Repeated-posting warning count/i,
      /Very short description limit \(characters\)/i,
      /Hide risky postings/i,
      /Resume-Based Scoring/i,
      /70%\s*resume match\s*\+\s*30%\s*search words/i,
      /Source host/i,
      /return\s+["'`]Failed["'`]/i,
      /return\s+["'`]Timed out["'`]/i,
    ];

    if (settingsPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/components/feedback/DebugInfoPreview.tsx") {
    const debugPreviewPatterns = [
      /App version/i,
      /^Platform$/im,
      /Device type/i,
    ];

    if (debugPreviewPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/pages/ResumeOptimizer.tsx") {
    const resumeOptimizerPatterns = [
      /Overall match:\s*\$\{/i,
      /Overall match:\s*\d+%/i,
      /How to fix:\s*\{/i,
      /How to fix:/i,
    ];

    if (resumeOptimizerPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/components/NotificationPreferences.tsx") {
    const notificationPreferencePatterns = [
      /Failed to load notification preferences/i,
      /Loading notification settings/i,
      /Failed to save["'`],\s*["'`]Your changes have been reverted/i,
      /Your last change was undone\.\s*Try again\./i,
      /All Notifications/,
      /Master switch/i,
      /enabled job boards/i,
      /Source Alert Rules/,
      /Which Jobs Alert You/,
      /sources and filters can interrupt you/i,
      /Detailed rules currently apply to Indeed, Greenhouse, Lever, and JobsWithGPT/i,
      /Match strength/i,
      /Alert selectivity/i,
      /\{config\.minScoreThreshold\}%/i,
      /Extra Filters/,
      /Only notify if title contains/,
      /Never notify if title contains/,
      /Minimum Salary/,
      /K\/year/i,
      /Remote Only/,
      /Favorite Companies/,
      /Companies to Skip/,
      /e\.g\., Senior, Lead, Staff/i,
      /placeholder=["'`]e\.g\., 90["'`]/i,
      /thousand per year/i,
    ];

    if (notificationPreferencePatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/components/CommandPalette.tsx") {
    const commandPalettePatterns = [
      /navigation:\s*["'`]Navigation["'`]/,
      /ui:\s*["'`]Interface["'`]/,
      />\s*to navigate\s*</,
      />\s*to select\s*</,
    ];

    if (commandPalettePatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/components/KeyboardShortcutsHelp.tsx") {
    const keyboardHelpPatterns = [
      /title:\s*["'`]Navigation["'`]/,
      /title:\s*["'`]Job Actions["'`]/,
      /title:\s*["'`]Global["'`]/,
      /title:\s*["'`]Filters & Search["'`]/,
      /description:\s*["'`]Toggle bookmark["'`]/,
      /description:\s*["'`]Toggle selection["'`]/,
      /title=["'`]Keyboard Shortcuts["'`]/,
      /Keyboard shortcuts reference/,
      /Use\s*<ShortcutKey>\?<\/ShortcutKey>\s*anytime/,
    ];

    if (keyboardHelpPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (path === "src/contexts/KeyboardShortcutsContext.tsx") {
    const keyboardShortcutContextPatterns = [
      /description:\s*["'`]Go to Market["'`]/,
      /description:\s*["'`]Show keyboard shortcuts help["'`]/,
      /description:\s*["'`]Focus search \/ filter["'`]/,
      /description:\s*["'`]Submit current form["'`]/,
      /description:\s*["'`]Create new item["'`]/,
    ];

    if (keyboardShortcutContextPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  const stalePatterns = [
    /Import JSON Resume/i,
    /Import Resume Data/i,
    /Invalid JSON/i,
    /Invalid resume JSON/i,
    /JSON Resume has been imported/i,
    /Resume Data \(JSON\)/i,
    /Resume Data in JSON format/i,
    /Paste your resume as JSON/i,
    /Exported resume details/i,
    /Paste exported resume details/i,
    /Please paste your resume details first/i,
    /Resume details not recognized/i,
    /Paste resume details exported from JobSentinel or (?:another supported tool|a supported resume tool)/i,
    /For a PDF resume, upload it on Resume Match first/i,
    /Paste a job post and resume details/i,
    /Browser session storage is unavailable/i,
    /Resume Builder cannot tailor against this job/i,
    /Navigate: j\/k, Open: o\/Enter, Hide: h/i,
    />\s*j\/k\/o\/h\s*</i,
    /AtsResumeData schema/i,
    /Question Pattern \(regex\)/i,
    /Start with in-app alerts now/i,
    /Greenhouse, Lever, and other popular job boards/i,
    /Patterns use regex matching/i,
    /Use regex patterns to match question text/i,
    /Invalid regex pattern\. Check for unmatched brackets or special characters\./i,
    /Pattern is required/i,
    /flexible \(regex\)/i,
    /Your credentials or API key/i,
    /API Limit Reached/i,
    /job board's API/i,
    /Database Busy/i,
    /Data Relationship Error/i,
    /exists in the database/i,
    /Database Corruption/i,
    /stay in the local database/i,
    /["']Configuration Missing["']/i,
    /["']Configuration Error["']/i,
    /["'`]Database Error["'`]/i,
    /["'`]Connection Error["'`]/i,
    /["'`]File Error["'`]/i,
    /["'`]Browser Error["'`]/i,
    /["'`]Invalid Input["'`]/i,
    /Missing required fields/i,
    /Name required/i,
    /Please enter a name for this search/i,
    /Invalid skill/i,
    /Please enter a skill name/i,
    /Missing input/i,
    /Please paste a job post first/i,
    /Please enter a bullet point to draft/i,
    /Profile required/i,
    /Please enter a valid email address/i,
    /Email is required/i,
    /Name is required/i,
    /This field is required/i,
    /Question wording is required/i,
    /Answer is required/i,
    /Please enter a job title and location/i,
    /Please enter a job link/i,
    /Please paste the full job link from your browser address bar/i,
    /Please enter a job title or work words/i,
    /Job title or work words\s+\*/i,
    /Missing information/i,
    /Please write a summary \(at least 10 characters\)/i,
    /Please add at least one work experience/i,
    /Please add at least one education entry/i,
    /Please add at least one skill/i,
    /Please fill skill details/i,
    /Please enter a valid URL/i,
    /URL is required/i,
    /URL must start with http:\/\/ or https:\/\//i,
    /Phone must be at least 10 digits/i,
    /Phone number must have/i,
    /Port must be between 1 and 65535/i,
    /Invalid email addresses/i,
    /Invalid job link/i,
    /This job link is not safe to open/i,
    /Some required information is missing/i,
    /Fill in all required fields/i,
    /Invalid Date or Time/i,
    /File Not Found/i,
    /A required file is missing/i,
    /Invalid date/i,
    /Invalid duration/i,
    /Interview cannot be scheduled in the past/i,
    /Application\s+\*/i,
    /Date & Time\s+\*/i,
    /Location \/ Meeting Link/i,
    /Select application\.\.\./i,
    /Browse\.\.\./i,
    /shortcut:\s*["'`]⌘[1-8]["'`]/i,
    /keys:\s*\[\s*["'`]⌘/i,
    />\s*⌘K\s*</i,
    /\(⌘[1-8]\)/i,
    /Click here to search/i,
    /Only when you click this/i,
    /click Search Now/i,
    /click Save/i,
    /click Submit yourself/i,
    /Click Submit yourself/i,
    /click the submit button yourself/i,
    /Did you click Submit/i,
    /personally click the Submit/i,
    /Yes, I clicked Submit/i,
    /Click into the form/i,
    /does not click Submit/i,
    /Click a label to add an auto-fill blank/i,
    /Click the ["'`*]*Import to JobSentinel["'`*]* (?:button|bookmark)/i,
    /Drag cards between columns/i,
    /["'`]Unexpected Error["'`]/i,
    /Database is busy/i,
    /Database may be damaged/i,
    /database may need repair/i,
    /SSL certificate error/i,
    /Config (?:exported|imported)/i,
    /title:\s*["'`]Invalid Email["'`]/i,
    /Permission Denied/i,
    /Resume Parsing Failed/i,
    /Document Too Large/i,
    /too long for processing/i,
    /configured\s+channel\b/i,
    /\bAdvanced Settings\b/,
    /Failed to import config/i,
    /app configuration file/i,
    /configuration file (?:is missing|is damaged)/i,
    /webhook URL/i,
    /Slack Webhook URL/i,
    /Paste your (?:Slack|Discord|Teams) webhook URL/i,
    /Email sending details/i,
    /\bSending address\b/i,
    /\bSending number\b/i,
    /Please try again later/i,
    /This took too long\.\s*Please try again/i,
    /JobSentinel ran into a problem\.\s*Please try again/i,
    /URL must use http:\/\/ or https:\/\//i,
    /URL must not include credentials/i,
    /Connection Number/i,
    /Advanced: build from source/i,
    /Save Extra Support Details/i,
    /GitHub is optional\.\s*Maintainers and contributors can/i,
    /GitHub is optional for maintainers and contributors/i,
    /so maintainers can fix it/i,
    /Troubleshooting\s*<HelpIcon text="If something is not working/i,
    /Optional maintainer issue/i,
    /Send to maintainers \(optional\)/i,
    /Open GitHub \(Optional\)/i,
    /Open GitHub Help Page/i,
    /This opens GitHub in your browser/i,
    /GitHub should have opened/i,
    /The GitHub page keeps replies and updates in one place/i,
    /Your feedback report has been saved/i,
    /The issue page keeps replies and updates in one place/i,
    /Review the issue,\s*then submit it/i,
    /\bpay floor\b/i,
    /contact support with the error details below/i,
    /contact support/i,
    /Restart JobSentinel/i,
    /restart the app/i,
    /technical:\s*technicalMessage/i,
    /JSON\.stringify\(error\)/i,
    /command palette/i,
    /Type a command/i,
    /No commands found/i,
    /toast\.error\([^)]*String\(error\)/s,
    /toast\.error\([^)]*String\(err\)/s,
    /\bsetError\(errorMsg\)/,
    /\bsetError\(errorMessage\)/,
    /\bsetError\(err\s+instanceof\s+Error\s*\?\s*err\.message\s*:\s*String\(err\)\)/,
    /\bsetError\(err\s+instanceof\s+Error\s*\?\s*err\.message\s*:\s*["'`][^"'`]*["'`]\)/,
    /const\s+message\s*=\s*err\s+instanceof\s+Error\s*\?\s*err\.message\s*:\s*String\(err\)/,
    /toast\.error\(["'`](?:Analysis|Improvement) failed["'`],\s*message\)/,
    /toast\.error\(["'`](?:Benchmark|Note drafting) failed["'`],\s*getErrorMessage\(err\)\)/,
    /toast\.error\(["'`]Error["'`],\s*errorMessage\s*\|\|\s*errMsg\)/,
    /toast\.error\(["'`]Something went wrong["'`]/i,
    /errorMessage=["'`]Failed to/i,
    /HN Who's Hiring/i,
    /Hacker News/i,
    /Something Went Wrong/i,
    /An unexpected error occurred/i,
    /Network connection issue/i,
    /Service temporarily unavailable/i,
    /Invalid input/i,
    /Data format error/i,
    /requested resource/i,
    /permission to access/i,
    /Request timed out/i,
    /External AI transport is not configured/i,
    /External AI is disabled by default\. Enable it before sending data/i,
    /External AI provider must be selected before sending data/i,
    /External AI sending is not set up/i,
    /Payload preview is required before any external AI request/i,
    /User approval is required before any external AI request/i,
    /Full database payloads must never be sent to external AI providers/i,
    /Sensitive data requires explicit user selection and sensitive-payload opt-in/i,
    /Error Details \(Development Only\)/i,
    /Error Stack \(Development Only\)/i,
    /Technical Details \(Development Only\)/i,
    /toast\.error\(["'`]Form preparation error["'`],\s*result\.errorMessage\)/,
    /\bsetFillError\(result\.errorMessage\)/,
    /\bsetError\(getErrorMessage\(err\)\)/,
    /\bsetError\(enhanced\.message\s*\|\|/,
    /\bsetError\(enhancedError\.userFriendly\?\.message\s*\|\|\s*getErrorMessage\(err\)\)/,
    /userFriendly\?\.message\s*(?:\|\||\)|$)/,
    /Get job alerts via Telegram bot/i,
    /Message @BotFather to create a private alert bot/i,
    /\bBot Token\b/i,
    /Telegram Connection Token/i,
    /Telegram Chat ID/i,
    /Telegram alert code/i,
    /alert code and destination number/i,
    /destination number/i,
    /connection token/i,
    /It only contacts job sources or alert services\s+needed for features you turn on/i,
    /monitor more official job sources/i,
    /\bSource address\b/i,
    /Optional source address/i,
    /\bJobs to ask for\b/i,
    /\bJobs requested\b/i,
    /https:\/\/example\.com\/jobswithgpt/i,
    />\s*Secure\s*</i,
    /Paste your bot token from @BotFather/i,
    /Chat ID \(e\.g\., \d+\)/i,
    /Incoming Webhooks/i,
    /incoming webhook connector/i,
    /Create a Webhook/i,
    /Webhooks\s*\u2192\s*New Webhook/i,
    /Incoming Webhook\s*\u2192\s*Configure/i,
    /Enter new webhook to update/i,
    /This doesn't look like a valid (?:Slack|Discord|Teams) webhook URL/i,
    /Invalid (?:Slack|Discord|Teams) webhook/i,
    /Early warning point:/i,
    /Hide-by-default point:/i,
    /\b(?:warning|hide)_threshold\.toFixed\(2\)/i,
    /webhook setup needed/i,
    /Slack webhook must/i,
    /Discord webhook must/i,
    /Teams webhook must/i,
    /Invalid Slack webhook path/i,
    /Invalid Discord webhook path/i,
    /Invalid Teams webhook path/i,
    /Double-check your webhook/i,
    /["'`]Save failed["'`]/i,
    /["'`]Test failed["'`]/i,
    /saved connection detail\(s\) failed to save/i,
    /\*\*Database:\*\*/i,
    /\*\*Credentials:\*\*/i,
    /Save local troubleshooting report/i,
    /For support only/i,
    /support only/i,
    /Some credentials unavailable/i,
    /Credentials (?:must be re-entered|stored securely)/i,
    /credential\(s\) failed to save/i,
    /Partially saved/i,
    /API tokens/i,
    /Regular passwords don't work with SMTP/i,
    /Sensitive data \(passwords, tokens\) excluded/i,
    /["'`]Copy Debug Report["'`]/i,
    /\*\*Copy Debug Report\*\*/i,
    /Settings,\s*then\s*Copy Debug Report/i,
    /Use Settings,\s*then\s*Copy Debug Report/i,
    /\[Report a problem\]\(https:\/\/github\.com\/cboyd0319\/JobSentinel\/issues\/new\)/i,
    /Found a bug\?\s*\[Open an issue\]/i,
    /share it only if you want help:\s*<https:\/\/github\.com\/cboyd0319\/JobSentinel\/issues>/i,
    /["'`]Debug report copied["'`]/i,
    /["'`]Could not copy debug report["'`]/i,
    /ANONYMIZED debug report/i,
    /label:\s*Debug Information/i,
    /Your debug report is in your clipboard/i,
    /Paste the debug report from your clipboard/i,
    /Debug Information box/i,
    /Include Debug Information/i,
    /Loading system information/i,
    /Loading debug information/i,
    /Anonymized Debug Information/i,
    /logs can help diagnose/i,
    /Helps troubleshoot faster/i,
    /removes private details before sharing/i,
    /Private details are removed/i,
    /private details removed/i,
    /Removed before sharing/i,
    /Saves a sanitized report/i,
    /Job titles, company names, search words, and personal details are not included/i,
    />\s*Page Check\s*</i,
    /Needs update/i,
    /["'`]Turn this source (?:on|off)["'`]/i,
    /["'`]Check this source now["'`]/i,
    /Privacy guaranteed/i,
    /Nothing is sent anywhere unless you set up notifications/i,
    /Everything stays on your computer\. No cloud, no accounts, no tracking\./i,
    /No cloud, no accounts, no tracking/i,
    /["'`]Error Logs["'`]/i,
    /["'`]Stack Trace["'`]/i,
    /["'`]Component Stack["'`]/i,
    /["'`]Technical details["'`]/i,
    /["'`]Save Log["'`]/i,
    /Too Many Requests/i,
    /too many requests to this job board/i,
    /increasing the delay between searches/i,
    /No profile configured/i,
    /set up your application profile first/i,
    /Require manual approval/i,
    /Currently scanning job boards|Ready to scan/i,
    /Auto-scan job boards/i,
    /Company preference \(if configured\)|configured preferences/i,
    /Failed to Load Market Data/i,
    /Failed to Load Templates/i,
    /Failed to load analytics data/i,
    /Failed to copy/i,
    /Copied to clipboard/i,
    /Template filled and copied/i,
    /Check any bracketed blanks/i,
    /Failed to load application history/i,
    /Failed to open link/i,
    /Unable to open the job link/i,
    /toast\.success\(["'`]Success["'`]/i,
    /toast\.error\(["'`]Error["'`],\s*errorMessage/i,
    /Import Job from URL/i,
    /Job URL/i,
    /Paste a job URL/i,
    /This job already exists in your database/i,
    /Failed to preview import/i,
    /Failed to import job/i,
    /Successfully imported/i,
    /Preview Import/i,
    /Fetching job details/i,
    /Missing fields/i,
    /Change URL/i,
    /["'`]Import Job["'`]/i,
    /USAJobs uses a free API key/i,
    /Where is my database/i,
    /Don't know what a webhook is/i,
    /special URL that lets JobSentinel/i,
    /check if the database is accessible/i,
    /Looks up your approximate city from your internet\s+address\. Not saved unless added\./i,
    /Popular with tech companies/i,
    /Blocked unsafe deep link URL/i,
    /Blocked unsafe job import URL/i,
    /Blocked unsafe application URL/i,
    /Invalid URL/i,
    /<SourceIcon\s*\/>\s*\{job\.source\}/s,
    /This job posting URL is not valid or safe to open/i,
    /Unable to open the job posting URL/i,
    /Import a job from any website URL/i,
    /Generate pre-filled search URLs/i,
    /job search URLs/i,
    /Job Title or Keywords/i,
    />\s*Weight\s*</i,
    /Please enter a job title or keywords/i,
    /^# Deep Link Generator/m,
    />\s*Deep Link Generator\s*</i,
    /Deep Links page/i,
    /(?:["']Generate Deep Links["']|>\s*Generate Deep Links\s*<)/i,
    /Enter a job title and click ["']Generate Deep Links["']/i,
    /URLs for 19\+ job sites/i,
    /URL Parameters/i,
    /URLs are generated locally/i,
    /site changes its URL format/i,
    /changed its URL format/i,
    /URL parameter support/i,
    /job title\/keywords/i,
    /we're just building URLs/i,
    /cannot scan automatically/i,
    /can't scan automatically/i,
    /does not check automatically/i,
    /automatic checking/i,
    /automated scans/i,
    /automated scanning/i,
    /No job-board limits from automated scanning/i,
    /Access sites that block automated scans/i,
    /Search links let you search these sites legally/i,
    /Application Funnel/i,
    /No funnel data yet/i,
    /Performance by Job Source/i,
    /Weekly Application Goal/i,
    /Goal achieved this week!/i,
    /Weakest Match First/i,
    /Use AND for words that must both appear/i,
    /Start with a minus sign to leave out a word:\s*-intern/i,
    /Min \$K/i,
    /Max \$K/i,
    /Minimum salary in thousands/i,
    /Maximum salary in thousands/i,
    /Min salary:\s*\$\{filters\.salaryMinFilter\}K/i,
    /Max salary:\s*\$\{filters\.salaryMaxFilter\}K/i,
    /Turn this on to never miss a new posting/i,
    /label:\s*source\s*===\s*["'`]all["'`]\s*\?\s*["'`]All Sources["'`]\s*:\s*source/i,
    /<li>Source:\s*\{filters\.sourceFilter\}<\/li>/i,
    /<span[^>]*>\s*\{job\.source\}\s*<\/span>/i,
    /<code[\s\S]{0,260}\{a\.questionPattern\}[\s\S]{0,260}<\/code>/i,
    /Smart Suggestions/i,
    /Based on your history/i,
    /% confident/i,
    /Modified\s*\{a\.timesModified\}×\s*\(\{Math\.round\(\(a\.timesModified\s*\/\s*a\.timesUsed\)\s*\*\s*100\)\}%\)/i,
    /modified\s*\{Math\.round\(suggestion\.modificationRate\s*\*\s*100\)\}%/i,
    /Bot Detection Triggered/i,
    /website thinks you're a bot/i,
    /This is a safety measure\. Reduce search frequency/i,
    /does not bypass CAPTCHA/i,
    /does not bypass site controls/i,
    /does not bypass human checks/i,
    /\|\s*Login and human checks\s*\|\s*Handled by you on the site\s*\|\s*Not bypassed\s*\|/i,
    /\[technical contributor guide\]/i,
    /CAPTCHA challenges/i,
    /Login and CAPTCHA/i,
    /anti-bot, or policy limits/i,
    /CAPTCHA detected/i,
    /CAPTCHA Keeps Appearing/i,
    /Complete CAPTCHA verification/i,
    /does not solve CAPTCHAs/i,
    /CAPTCHA verification \(if present\)/i,
    /Complete CAPTCHA verification if present/i,
    /^## CAPTCHA Verification/im,
    /application-system label/i,
    /Available placeholders \(click to insert\):/i,
    /Remember to replace the placeholders/i,
    /Check for \[bracketed\] placeholders that need manual editing/i,
    /<button[\s\S]{0,260}>\s*\{placeholder\}\s*<\/button>/i,
    /\*\*100% Legal:\*\*/i,
    /No automation or bots involved/i,
    /^## Comparison with Scrapers/im,
    /\*\*Use scanners for:\*\*/i,
    /\|\s*\*\*Automation\*\*\s*\|\s*Manual\s*\|\s*Fully automated\s*\|/i,
    /Browser Bookmarklet/i,
    /Create a new bookmark in your browser \(Cmd\/Ctrl\+D\)/i,
    /bookmark address field/i,
    /bookmarklet configuration/i,
    /Import jobs from any website/i,
    /from any website/i,
    /Browse to any job posting/i,
    /Supported Sites:/i,
    /Major Job Boards:/i,
    /Most modern career sites/i,
    /Google Careers/i,
    /Microsoft Careers/i,
    /Works best on individual job pages from:\s*(?:\n\s*-\s*(?:LinkedIn|Indeed|Glassdoor|ZipRecruiter|Dice|Monster|CareerBuilder|SimplyHired|We Work Remotely|Remote OK|FlexJobs|Wellfound))+?/i,
    /automatically extract the job details/i,
    /Bookmarklet Code/i,
    /Server Port/i,
    /Server Status/i,
    /Start Server/i,
    /Stop Server/i,
    /Make sure the app is running and bookmarklet server is enabled/i,
    /Paste the code into the URL\/Location field/i,
    /Any with Schema\.org data/i,
    /Official ATS job pages/i,
    /public ATS sources/i,
    /structured Schema\.org/i,
    /Schema\.org JobPosting/i,
    /Smart DOM Parsing/i,
    /DOM parsing/i,
    /structured data \(Schema\.org\)/i,
    /local safety token/i,
    /The job will be imported automatically/i,
    /\*\*No Scraping\*\*/i,
    /Add LinkedIn profile for tech roles/i,
    /Custom Setup/i,
    /I'll enter my own job titles and skills/i,
    /Pre-configured with/i,
    /Continue with This Profile/i,
    /Continue with Custom Setup/i,
    /Pre-filled from your/i,
    /Skills & Keywords/i,
    /Keywords to Avoid/i,
    /Add a keyword to avoid/i,
    /No excluded keywords/i,
    /keyword-only scoring/i,
    /resume match \+ 30% keywords/i,
    /scoring falls back to keyword matching/i,
    /Job title and keyword matches/i,
    /Search keywords/i,
    /Search keywords configured/i,
    /Technical Interview/i,
    /technical_interview:\s*["']Technical["']/i,
    /name:\s*["']Technical["']/i,
    /ghosted:\s*["'`]Ghosted["'`]/i,
    /["'`]ghosted["'`]\s*,\s*["'`]Ghosted["'`]/i,
    /label=["'`]Ghosted["'`]/i,
    /Detect Ghosted/i,
    /Ghosted detection complete/i,
    /marked as ghosted/i,
    /\|\s*Ghosted\s*\|/i,
    /\{suggestion\.category\}/,
    /Get Free API Key/i,
    /Quick Setup \(2 minutes\)/i,
    /Get USAJobs Access Code/i,
    /USAJobs uses a free access code/i,
    /Copy the API key from your email/i,
    /Copy API key from confirmation email/i,
    /Paste your API key here/i,
    /Required by USAJobs API/i,
    /Free API key required/i,
    /API key \(free\)/i,
    /Free API Key/i,
    /API Key Required/i,
    /SMTP credentials/i,
    /special API access/i,
    /check your API key/i,
    /report a bug/i,
    /Steps to reproduce/i,
    /I expected Y but got Z instead/i,
    /Scraper Issue/i,
    /scraper issue/i,
    /Affected Scraper/i,
    /Which job board scraper/i,
    /Scraper Health Dashboard/i,
    /Job source health details/i,
    /Scraper returns/i,
    /Jobs are being incorrectly parsed/i,
    /Rate limiting or blocking issues/i,
    /Save Detailed Local Report/i,
    /source health/i,
    /source-health checks/i,
    /job source health docs/i,
    /source health dashboard/i,
    /Settings troubleshooting dashboard/i,
    /^##\s*(?:Health And )?Troubleshooting/im,
    /\|\s*Troubleshooting\s*\|/i,
    /restricted automation policies/i,
    /source-specific boundaries/i,
    /source health checks/i,
    /Start with `config\/config\.example\.json`/i,
    /`title_allowlist`/i,
    /Paste resume app export here/i,
    /Resume app export not recognized/i,
    /^## Guarantees/im,
    /Pre-configured job search profiles[\s\S]{0,120}Copy one to use as your starting point/i,
    /### Option 1:\s*Use a Profile Directly/i,
    /Direct scraping from (?:Greenhouse|Lever) company pages/i,
    /Future:\s*company allowlist/i,
  ];

  return stalePatterns.some((pattern) => pattern.test(text));
}
