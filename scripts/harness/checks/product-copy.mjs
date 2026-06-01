import { readFileSync } from "node:fs";
import { join } from "node:path";

const staleResumeOptimizerFramingPaths = new Set([
  "src/App.tsx",
  "src/components/AtsLiveScorePanel.tsx",
  "src/components/Navigation.tsx",
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
  "docs/plans/active/research-backed-product-improvements.md",
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
  "src/pages/Settings.tsx",
]);

const payProtectionGuidancePaths = new Set([
  "docs/features/salary-ai.md",
  "src/pages/Salary.tsx",
]);

const feedbackLocalReportPaths = new Set([
  "README.md",
  "ROADMAP.md",
  "docs/README.md",
  "docs/ROADMAP.md",
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
  "src-tauri/src/commands/feedback/debug_log.rs",
  "src-tauri/src/commands/feedback/report.rs",
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
  "docs/features/notifications.md",
  "docs/features/smart-scoring.md",
  "docs/user/QUICK_START.md",
  "src/config/tourSteps.ts",
  "src/components/ResumeMatchScoreBreakdown.tsx",
  "src/components/ScoreDisplay.tsx",
  "src/components/ScoreBreakdownModal.tsx",
  "src/utils/scoreUtils.ts",
  "src/pages/Dashboard.tsx",
  "src/pages/DashboardUI/DashboardFiltersBar.tsx",
  "src/pages/Settings.tsx",
]);

const plainJobSearchDocPaths = new Set([
  "docs/features/application-tracking.md",
  "docs/features/smart-scoring.md",
]);

const technicalFirstUserCopyPaths = new Set([
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/scraper_issue.yml",
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
  "src/components/NotificationPreferences.tsx",
  "src/components/InterviewScheduler.tsx",
  "src/components/CommandPalette.tsx",
  "src/components/KeyboardShortcutsHelp.tsx",
  "src/components/Navigation.tsx",
  "src/components/automation/ApplyButton.tsx",
  "src/components/automation/ScreeningAnswersForm.tsx",
  "src/components/feedback/DebugInfoPreview.tsx",
  "src/components/feedback/FeedbackModal.tsx",
  "src/components/feedback/SuccessScreen.tsx",
  "src/mocks/handlers.ts",
  "src/contexts/KeyboardShortcutsContext.tsx",
  "src-tauri/src/commands/errors.rs",
  "src/pages/Resume.tsx",
  "src/pages/hooks/useDashboardJobOps.ts",
  "src/pages/hooks/useDashboardSavedSearches.ts",
  "src/pages/ResumeOptimizer.tsx",
  "src/pages/Applications.tsx",
  "src/pages/Dashboard.tsx",
  "src/pages/DashboardUI/DashboardFiltersBar.tsx",
  "src/pages/DashboardUI/QuickActions.tsx",
  "src/pages/Market.tsx",
  "src/pages/ResumeBuilder.tsx",
  "src/pages/Salary.tsx",
  "src/pages/Settings.tsx",
  "src/pages/SetupWizard.tsx",
  "src/utils/errorMessages.ts",
  "src/utils/formValidation.ts",
  "tests/e2e/playwright/application-tracking.spec.ts",
  "tests/e2e/playwright/page-objects/ApplicationsPage.ts",
  "docs/features/application-tracking.md",
  "docs/features/smart-scoring.md",
  "docs/features/notifications.md",
  "docs/features/one-click-apply.md",
  "docs/features/scrapers.md",
  "docs/features/user-data-management.md",
  "docs/user/DEEP_LINKS.md",
  "docs/user/QUICK_START.md",
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
    /get past the robots/i,
    /resume-filtering software/i,
    /software that companies use to filter/i,
    /filter resumes before a human/i,
    /pass these filters/i,
    /pass ATS filters/i,
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
    new RegExp(["Form", "\\s+", "filled!"].join(""), "i"),
    new RegExp(["form", "\\s+", "filling", "\\s+", "failed"].join(""), "i"),
    new RegExp(["Max", "\\s+", "applications", "\\s+", "per", "\\s+", "day"].join(""), "i"),
    new RegExp(["Total", "\\s+", "Attempts"].join(""), "i"),
    new RegExp(["Success", "\\s+", "Rate"].join(""), "i"),
    new RegExp(["Automation", "\\s+", "Settings"].join(""), "i"),
    new RegExp(["No", "\\s+", "Auto-Submit"].join(""), "i"),
    new RegExp(["automated", "\\s+", "browsers"].join(""), "i"),
    new RegExp(["automated", "\\s+", "submission"].join(""), "i"),
    new RegExp(["form", "\\s+", "filling", "\\s+", "automation"].join(""), "i"),
    new RegExp(["supports", "\\s+", "form", "\\s+", "automation"].join(""), "i"),
    new RegExp(["automation", "\\s+", "browser"].join(""), "i"),
    new RegExp(["Privacy-first", "\\s+", "job", "\\s+", "search", "\\s+", "automation"].join(""), "i"),
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
    /No debug events recorded/i,
    /Debug Log \(\{\} events\)/i,
    /\[(?:APP_STARTED|VIEW_NAVIGATED|COMMAND|ERROR|SCRAPER|FEATURE)\]/i,
    /format!\(\s*["'`]\[\{\}\]\s+\{\:\?\}\\n["'`]/i,
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
  ];

  return stalePatterns.some((pattern) => pattern.test(text));
}

export function hasNonProtectiveScoreCopy(root, path) {
  if (!protectiveScoreCopyPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /Great Match!|Highly recommended!|You might want to skip it|if you're desperate|if you are desperate|\{reason\}\s*<\/div>|Job Scoring Weights|These weights determine|scoring weights|Configurable weights|Customize Weights|Weight Presets|Weight in overall score|\b\d+%\s+weight\b|weighted averages based on component importance|Score \(High|Score \(Low|All Scores|label="Score"|Jobs are scored based|top scores|Each job is scored|sorted by match score|jobs scoring|Alert Threshold|scoring above your threshold|match score, source|Match Score|Match score:|Score:\s*\{filters\.scoreFilter\}|Sort:\s*\{filters\.sortBy\}|return\s+["'`](?:Excellent|Great|Poor)["'`]/i.test(text);
}

export function hasLegacyPreferenceListCopy(root, path) {
  if (!plainJobSearchDocPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /Company Whitelist|Company Blacklist|Your Whitelist|Your blacklist|whitelisted companies|blacklisted companies|whitelist\/blacklist|Title matches allowlist|Title matches blocklist|Job-word boosters|Job-word boost|Boosted job words|Excluded job words|Job-Word Match|found, boosted|not boosted|boosters\/excluders/i.test(text);
}

export function hasTechnicalFirstUserCopy(root, path) {
  if (!technicalFirstUserCopyPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
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
    ];

    if (resumePagePatterns.some((pattern) => pattern.test(text))) {
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
    /Patterns use regex matching/i,
    /Use regex patterns to match question text/i,
    /Invalid regex pattern\. Check for unmatched brackets or special characters\./i,
    /Pattern is required/i,
    /flexible \(regex\)/i,
    /Your credentials or API key/i,
    /API Limit Reached/i,
    /job board's API/i,
    /Database Busy/i,
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
    /["'`]Unexpected Error["'`]/i,
    /Database is busy/i,
    /Database may be damaged/i,
    /database may need repair/i,
    /SSL certificate error/i,
    /Config (?:exported|imported)/i,
    /\bAdvanced Settings\b/,
    /Failed to import config/i,
    /Failed to load notification preferences/i,
    /Failed to save["'`],\s*["'`]Your changes have been reverted/i,
    /Source Alert Rules/i,
    /Minimum Salary/,
    /K\/year/i,
    /app configuration file/i,
    /configuration file (?:is missing|is damaged)/i,
    /webhook URL/i,
    /Slack Webhook URL/i,
    /Paste your (?:Slack|Discord|Teams) webhook URL/i,
    /contact support with the error details below/i,
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
    /connection token/i,
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
    /\*\*Database:\*\*/i,
    /\*\*Credentials:\*\*/i,
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
    />\s*Page Check\s*</i,
    />\s*Actions\s*</i,
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
    /automated scans/i,
    /automated scanning/i,
    /No job-board limits from automated scanning/i,
    /Access sites that block automated scans/i,
    /Search links let you search these sites legally/i,
    /\*\*100% Legal:\*\*/i,
    /No automation or bots involved/i,
    /^## Comparison with Scrapers/im,
    /\*\*Use scanners for:\*\*/i,
    /\|\s*\*\*Automation\*\*\s*\|\s*Manual\s*\|\s*Fully automated\s*\|/i,
    /Browser Bookmarklet/i,
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
    /Scraper Issue/i,
    /scraper issue/i,
    /Affected Scraper/i,
    /Which job board scraper/i,
    /Scraper Health Dashboard/i,
    /Scraper returns/i,
    /Jobs are being incorrectly parsed/i,
    /Rate limiting or blocking issues/i,
    /Pre-configured job search profiles[\s\S]{0,120}Copy one to use as your starting point/i,
    /### Option 1:\s*Use a Profile Directly/i,
    /Direct scraping from (?:Greenhouse|Lever) company pages/i,
    /Future:\s*company allowlist/i,
  ];

  return stalePatterns.some((pattern) => pattern.test(text));
}
