import { readFileSync } from "node:fs";
import { join } from "node:path";
import { listTrackedFiles } from "./repo-artifacts.mjs";

export function hasStaleUserDataMockHandlers(root, path) {
  if (path !== "src/mocks/handlers.ts") {
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
    return !new RegExp(`case\\s+["']${command}["']`).test(text);
  });

  return missingRequiredCommand || /case\s+["']save_search["']/.test(text);
}

export function hasStaleDeepLinkMockHandlers(root, path) {
  if (path !== "src/mocks/handlers.ts") {
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
    return !new RegExp(`case\\s+["']${command}["']`).test(text);
  });
}

export function hasStaleFeedbackMockHandlers(root, path) {
  if (path !== "src/mocks/handlers.ts") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const requiredCommands = [
    "generate_feedback_report",
    "get_feedback_filename",
    "save_feedback_file",
    "open_github_issues",
    "open_google_drive",
    "reveal_saved_feedback_file",
  ];

  return requiredCommands.some((command) => {
    return !new RegExp(`case\\s+["']${command}["']`).test(text);
  });
}

export function hasStaleFeedbackSystemInfoArchitecture(root, path) {
  if (
    path !== "src/services/feedbackService.ts" &&
    path !== "src/components/feedback/DebugInfoPreview.tsx" &&
    path !== "src/mocks/handlers.ts"
  ) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  if (path === "src/mocks/handlers.ts") {
    return (
      /case\s+["']get_system_info["'][\s\S]{0,240}\barch\s*:/.test(text) ||
      /function\s+getMockSystemInfo\(\)[\s\S]{0,240}\barch\s*:/.test(text)
    );
  }

  return /\bsystemInfo\.arch\b|\barch\s*:\s*string\b/.test(text);
}

export function hasStaleResumeOptimizerMockHandlers(root, path) {
  if (path !== "src/mocks/handlers.ts") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const requiredCommands = [
    "analyze_resume_for_job",
    "analyze_resume_format",
    "get_ats_power_words",
    "improve_bullet_point",
  ];
  const missingRequiredCommand = requiredCommands.some((command) => {
    return !new RegExp(`case\\s+["']${command}["']`).test(text);
  });

  return (
    missingRequiredCommand ||
    /case\s+["']analyze_resume_format["'][\s\S]{0,240}\bissues\s*:/.test(text) ||
    /case\s+["']analyze_resume_format["'][\s\S]{0,300}\brecommendations\s*:/.test(text)
  );
}

export function hasStaleAtsKeywordMatchFrontendShape(root, path) {
  if (
    path !== "src/pages/ResumeOptimizer.tsx" &&
    path !== "src/components/AtsLiveScorePanel.tsx"
  ) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /\bfound_in\s*:\s*string\s*[;\n]/.test(text) || /\bcontext\s*:\s*string\s*[;\n]/.test(text);
}

export function hasUnsafeResumeOptimizerJsonParsing(root, path) {
  if (path !== "src/pages/ResumeOptimizer.tsx") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /const\s+resume:\s*AtsResumeData\s*=\s*JSON\.parse\(resumeJson\)/.test(text) ||
    !/function\s+isAtsResumeData/.test(text) ||
    !/parseAtsResumeInput/.test(text)
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
    path !== "src/mocks/handlers.ts"
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

function collectMockCommandCases(root) {
  const text = readFileSync(join(root, "src/mocks/handlers.ts"), "utf8");
  return new Set([...text.matchAll(/case\s+["']([^"']+)["']/g)].map((match) => match[1]));
}

export function missingRuntimeMockInvokeCases(root, path) {
  if (path !== "src/mocks/handlers.ts") {
    return [];
  }

  const mockCases = collectMockCommandCases(root);
  return [...collectRuntimeInvokeCommands(root)]
    .filter((command) => !mockCases.has(command))
    .sort();
}

export function hasStaleSalaryBenchmarkFrontendShape(root, path) {
  if (path !== "src/pages/Salary.tsx") {
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
  if (path !== "src/components/InterviewScheduler.tsx") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /\bthank_you_sent\b|\bsent_at\b/.test(text);
}

export function hasStaleResumeMatchSubscoreDisplay(root, path) {
  if (path !== "src/pages/Resume.tsx") {
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
