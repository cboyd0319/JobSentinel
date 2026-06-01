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
    new RegExp(["Privacy-first", "\\s+", "job", "\\s+", "search", "\\s+", "automation"].join(""), "i"),
    /Settings\s*>\s*Application Assist/i,
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
