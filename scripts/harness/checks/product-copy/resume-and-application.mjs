import { readFileSync } from "node:fs";
import { join } from "node:path";

const staleResumeOptimizerFramingPaths = new Set([
  "src/app/App.tsx",
  "src/features/resumes/builder/AtsLiveScorePanel.tsx",
  "src/app/Navigation.tsx",
  "src/app/keyboard/KeyboardShortcutsProvider.tsx",
  "src/features/resumes/library/ResumeLibraryPage.tsx",
  "src/features/resumes/library/ResumeLibraryDropdown.tsx",
  "src/features/resumes/library/ResumeTextPreviewModal.tsx",
  "src/features/resumes/library/resumePageModel.ts",
  "src/features/resumes/builder/ResumeBuilderPage.tsx",
  "src/features/resumes/matching/ResumeMatchPage.tsx",
  "src/features/resumes/matching/ResumeMatchJobWordsOverview.tsx",
  "src/features/resumes/matching/ResumeMatchResultsPanel.tsx",
  "src/features/resumes/matching/resumeMatchModel.ts",
  "crates/jobsentinel-application/src/resume/mod.rs",
  "crates/jobsentinel-documents/src/templates.rs",
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
  "crates/jobsentinel-documents/src/templates.rs",
  "src/dev-runtime/mocks/handlers.ts",
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
  "src-tauri/src/ipc/automation.rs",
  "src-tauri/src/ipc/errors.rs",
  "crates/jobsentinel-assistance/src/automation/mod.rs",
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
