import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { listTrackedFiles } from "./repo-artifacts.mjs";

const mockCommandRegistryPath = "src/test-support/mocks/commandRegistry.ts";
const legacyMockCommandRegistryPath = "src/test-support/mocks/handlers.ts";

function activeMockCommandRegistryPath(root) {
  return existsSync(join(root, mockCommandRegistryPath))
    ? mockCommandRegistryPath
    : legacyMockCommandRegistryPath;
}

function hasRegisteredCommand(text, command) {
  return new RegExp(`["']${command}["']`).test(text);
}

export function hasStaleUserDataMockHandlers(root, path) {
  if (path !== activeMockCommandRegistryPath(root)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const requiredCommands = [
    "seed_default_templates",
    "list_cover_letter_templates",
    "get_cover_letter_template",
    "create_cover_letter_template",
    "update_cover_letter_template",
    "delete_cover_letter_template",
    "get_notification_preferences",
    "save_notification_preferences",
    "get_search_history",
    "add_search_history",
    "clear_search_history",
    "list_saved_searches",
    "create_saved_search",
    "use_saved_search",
    "delete_saved_search",
  ];
  const missingRequiredCommand = requiredCommands.some((command) => {
    return !hasRegisteredCommand(text, command);
  });

  return missingRequiredCommand || hasRegisteredCommand(text, "save_search");
}

export function hasStaleDeepLinkMockHandlers(root, path) {
  if (path !== activeMockCommandRegistryPath(root)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const requiredCommands = [
    "generate_deep_links",
    "generate_deep_link",
    "get_supported_sites",
    "get_sites_by_category_cmd",
    "open_deep_link",
  ];

  return requiredCommands.some((command) => {
    return !hasRegisteredCommand(text, command);
  });
}

export function hasStaleFeedbackMockHandlers(root, path) {
  if (path !== activeMockCommandRegistryPath(root)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const requiredCommands = [
    "generate_feedback_report",
    "get_feedback_filename",
    "save_feedback_file",
    "open_github_issues",
    "reveal_saved_feedback_file",
  ];

  return requiredCommands.some((command) => {
    return !hasRegisteredCommand(text, command);
  });
}

export function hasStaleFeedbackSystemInfoArchitecture(root, path) {
  const mockSystemInfoPath = existsSync(
    join(root, "src/shared/errorReporting/mocks/supportReports.ts"),
  )
    ? "src/shared/errorReporting/mocks/supportReports.ts"
    : legacyMockCommandRegistryPath;
  if (
    path !== "src/features/settings/support/feedback/feedbackClient.ts" &&
    path !== "src/features/settings/support/feedback/feedbackReportFormatting.ts" &&
    path !== "src/features/settings/support/feedback/DebugInfoPreview.tsx" &&
    path !== mockSystemInfoPath
  ) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  if (path === mockSystemInfoPath) {
    return (
      /(?:function\s+getMockSystemInfo\(\)|case\s+["']get_system_info["'])[\s\S]{0,240}\barch\s*:/.test(
        text,
      )
    );
  }

  return /\bsystemInfo\.arch\b|\barch\s*:\s*string\b/.test(text);
}

export function hasStaleResumeOptimizerMockHandlers(root, path) {
  const registryPath = activeMockCommandRegistryPath(root);
  if (
    path !== registryPath &&
    path !== "src/features/resumes/mocks/resumeAnalysis.ts"
  ) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const requiredCommands = [
    "analyze_resume_for_job",
    "analyze_resume_format",
    "get_ats_power_words",
    "improve_bullet_point",
  ];
  const missingRequiredCommand =
    path === registryPath &&
    requiredCommands.some((command) => !hasRegisteredCommand(text, command));

  return (
    missingRequiredCommand ||
    /case\s+["']analyze_resume_format["'][\s\S]{0,240}\bissues\s*:/.test(text) ||
    /case\s+["']analyze_resume_format["'][\s\S]{0,300}\brecommendations\s*:/.test(text)
  );
}

export function hasStaleAtsKeywordMatchFrontendShape(root, path) {
  if (
    path !== "src/features/resumes/matching/ResumeMatchPage.tsx" &&
    path !== "src/features/resumes/matching/resumeMatchModel.ts" &&
    path !== "src/features/resumes/builder/AtsLiveScorePanel.tsx"
  ) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /\bfound_in\s*:\s*string\s*[;\n]/.test(text) || /\bcontext\s*:\s*string\s*[;\n]/.test(text);
}

const resumeSuggestionCategoryPaths = new Set([
  "crates/jobsentinel-documents/src/ats_analyzer.rs",
  "src/features/resumes/matching/ResumeMatchPage.tsx",
  "src/features/resumes/matching/resumeMatchModel.ts",
  "src/features/resumes/builder/AtsLiveScorePanel.tsx",
  "src/features/resumes/builder/AtsLiveScorePanelModel.ts",
  legacyMockCommandRegistryPath,
  "src/features/resumes/mocks/resumeAnalysis.ts",
]);

const fallbackResumeSuggestionCategories = [
  "AddKeyword",
  "RewordBullet",
  "AddSection",
  "ReorderContent",
  "FormatFix",
];

function readOptionalFile(root, path) {
  const fullPath = join(root, path);
  return existsSync(fullPath) ? readFileSync(fullPath, "utf8") : "";
}

function collectBackendResumeSuggestionCategories(root) {
  const text = readOptionalFile(root, "crates/jobsentinel-documents/src/ats_analyzer.rs");
  const enumBody = /pub\s+enum\s+SuggestionCategory\s*\{(?<body>[\s\S]*?)\n\}/.exec(text)
    ?.groups?.body;

  if (!enumBody) {
    return fallbackResumeSuggestionCategories;
  }

  const categories = [...enumBody.matchAll(/^\s*([A-Z][A-Za-z0-9_]*)\s*,/gm)].map(
    (match) => match[1],
  );

  return categories.length > 0 ? categories : fallbackResumeSuggestionCategories;
}

function hasMissingResumeSuggestionCategories(text, categories) {
  return categories.some((category) => !new RegExp(`["']${category}["']`).test(text));
}

function hasStaleResumeSuggestionLabels(text, categories) {
  return (
    /\bRemoveItem\b/.test(text) ||
    (categories.includes("FormatFix") &&
      !/case\s+["']FormatFix["'][\s\S]{0,120}return\s+["']Safety check["']/.test(text)) ||
    (categories.includes("ReorderContent") &&
      !/case\s+["']ReorderContent["'][\s\S]{0,120}return\s+["']Reorder content["']/.test(text))
  );
}

export function hasResumeSuggestionCategoryDrift(root, path) {
  if (!resumeSuggestionCategoryPaths.has(path)) {
    return false;
  }

  const categories = collectBackendResumeSuggestionCategories(root);
  const liveScoreModelText =
    readOptionalFile(root, "src/features/resumes/builder/AtsLiveScorePanelModel.ts") ||
    readOptionalFile(root, "src/features/resumes/builder/AtsLiveScorePanel.tsx");
  const frontendTexts = [
    readOptionalFile(root, "src/features/resumes/matching/resumeMatchModel.ts"),
    liveScoreModelText,
  ].filter(Boolean);

  for (const text of frontendTexts) {
    if (
      hasMissingResumeSuggestionCategories(text, categories) ||
      hasStaleResumeSuggestionLabels(text, categories)
    ) {
      return true;
    }
  }

  const mockText = [
    readOptionalFile(root, "src/features/resumes/mocks/resumeAnalysis.ts") ||
      readOptionalFile(root, legacyMockCommandRegistryPath),
  ].join("\n");
  return Boolean(mockText) && hasMissingResumeSuggestionCategories(mockText, categories);
}

export function hasUnsafeResumeMatchJsonParsing(root, path) {
  if (
    path !== "src/features/resumes/matching/ResumeMatchPage.tsx" &&
    path !== "src/features/resumes/matching/resumeMatchModel.ts" &&
    path !== "src/features/resumes/matching/resumeMatchValidation.ts"
  ) {
    return false;
  }

  const pageText = readOptionalFile(root, "src/features/resumes/matching/ResumeMatchPage.tsx");
  const modelText = readOptionalFile(root, "src/features/resumes/matching/resumeMatchModel.ts");
  const validationText = readOptionalFile(
    root,
    "src/features/resumes/matching/resumeMatchValidation.ts",
  );
  const changedText = readFileSync(join(root, path), "utf8");
  const validationContractText = `${modelText}\n${validationText}`;
  return (
    /const\s+resume:\s*AtsResumeData\s*=\s*JSON\.parse\(resumeJson\)/.test(changedText) ||
    !/parseAtsResumeInput/.test(pageText) ||
    !/function\s+isAtsResumeData/.test(validationContractText) ||
    !/export\s+function\s+parseAtsResumeInput/.test(validationContractText)
  );
}

function stripTypeScriptComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function isRuntimeFrontendSource(path) {
  return (
    path.startsWith("src/") &&
    /\.(ts|tsx)$/.test(path) &&
    !path.endsWith(".d.ts") &&
    !/\.test\.(ts|tsx)$/.test(path) &&
    !/\.stories\.(ts|tsx)$/.test(path) &&
    path !== "src/test-support/mocks/handlers.ts"
  );
}

function collectRuntimeInvokeCommands(root) {
  const commands = new Set();
  const commandPattern =
    /\b(?:cachedInvoke|safeInvokeWithToast|safeInvoke|invokeCommand|invoke)(?:<[^>]+>)?\(\s*["']([^"']+)["']/g;

  for (const path of listTrackedFiles(root).filter(isRuntimeFrontendSource)) {
    const text = stripTypeScriptComments(readFileSync(join(root, path), "utf8"));
    for (const match of text.matchAll(commandPattern)) {
      commands.add(match[1]);
    }
  }

  return commands;
}

function collectRegisteredMockCommands(root) {
  const registryPath = activeMockCommandRegistryPath(root);
  const text = readFileSync(join(root, registryPath), "utf8");
  const pattern = registryPath === mockCommandRegistryPath
    ? /["']([a-z][a-z0-9_]+)["']/g
    : /case\s+["']([^"']+)["']/g;
  return new Set([...text.matchAll(pattern)].map((match) => match[1]));
}

export function missingRuntimeMockInvokeCases(root, path) {
  if (path !== activeMockCommandRegistryPath(root)) {
    return [];
  }

  const mockCases = collectRegisteredMockCommands(root);
  return [...collectRuntimeInvokeCommands(root)]
    .filter((command) => !mockCases.has(command))
    .sort();
}

export function hasStaleSalaryBenchmarkFrontendShape(root, path) {
  if (path !== "src/features/salary/model.ts") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /\brole\s*:\s*string\s*[;\n]/.test(text) ||
    /\bp50\s*:\s*number\s*[;\n]/.test(text) ||
    /\bp90\s*:\s*number\s*[;\n]/.test(text) ||
    /\bbenchmark\.(role|p25|p50|p75|p90)\b/.test(text) ||
    /\bvalue\s*:\s*["']executive["']/.test(text)
  );
}

export function hasStaleInterviewFollowupFrontendShape(root, path) {
  if (path !== "src/features/applications/InterviewScheduler.tsx") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /\bthank_you_sent\b|\bsent_at\b/.test(text);
}

export function hasStaleResumeMatchSubscoreDisplay(root, path) {
  if (path !== "src/features/resumes/library/ResumeLibraryPage.tsx") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /width:\s*`\$\{match\.(?:skills|experience|education)_match_score\}%`/.test(text) ||
    /Math\.round\(match\.(?:skills|experience|education)_match_score\)/.test(text)
  );
}

export function hasStaleResumeE2eMatchSeed(root, path) {
  if (path !== "tests/e2e/playwright/resume-upload-matching.spec.ts") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /\b(?:overall_match_score|skills_match_score|experience_match_score|education_match_score)\s*:\s*(?:[2-9]\d*|1\d+|1\.[1-9]\d*)\b/.test(text) ||
    /gap_analysis\s*:\s*["'`][^"'`]*[\u2713\u2715\u2717]/u.test(text)
  );
}
