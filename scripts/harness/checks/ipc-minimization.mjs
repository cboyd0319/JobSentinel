import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const fullProfileAllowedPaths = new Set([
  "src/features/application-assist/ProfileForm.tsx",
]);

function readIfPresent(root, path) {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) {
    return "";
  }

  return readFileSync(fullPath, "utf8");
}

function stripTypeScriptComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function stripRustTestModules(text) {
  return text.replace(/#\[cfg\(test\)\]\s*mod\s+tests\s*\{[\s\S]*$/m, "");
}

export function hasNonSettingsFullApplicationProfileInvoke(root, path) {
  if (
    !path.startsWith("src/") ||
    path.startsWith("src/test-support/mocks/") ||
    path.includes("/mocks/") ||
    /\.test\.[tj]sx?$/.test(path) ||
    /\.spec\.[tj]sx?$/.test(path) ||
    fullProfileAllowedPaths.has(path)
  ) {
    return false;
  }

  const text = stripTypeScriptComments(readIfPresent(root, path));
  return /["'`]get_application_profile["'`]/.test(text);
}

export function hasDashboardFullConfigInvoke(root, path) {
  if (path !== "src/features/dashboard/DashboardPage.tsx") {
    return false;
  }

  const text = stripTypeScriptComments(readIfPresent(root, path));
  return /["'`]get_config["'`]/.test(text);
}

export function hasRawJobImportUrlAfterPreview(root, path) {
  if (path !== "src/features/dashboard/components/JobImportModal.tsx") {
    return false;
  }

  const text = stripTypeScriptComments(readIfPresent(root, path));
  return (
    /["'`]import_job_from_url["'`]/.test(text) ||
    /["'`]confirm_job_import["'`][\s\S]{0,160}\{\s*(?:url\s*:|importId\s*:\s*(?:url|rawUrl))/.test(
      text,
    )
  );
}

export function hasFullImportedJobReturn(root, path) {
  if (path !== "src-tauri/src/commands/import.rs") {
    return false;
  }

  const text = stripRustTestModules(readIfPresent(root, path));
  return (
    /confirm_job_import[\s\S]{0,220}->\s*Result\s*<\s*(?:Value|serde_json::Value)\s*,\s*String\s*>/.test(
      text,
    ) ||
    /serde_json::to_value\s*\(\s*&job\s*\)/.test(text) ||
    /\.get_job_by_id\s*\(\s*job_id\s*\)/.test(text)
  );
}

export function hasStaleJobImportMockHandlers(root, path) {
  const registryPath = existsSync(join(root, "src/test-support/mocks/commandRegistry.ts"))
    ? "src/test-support/mocks/commandRegistry.ts"
    : "src/test-support/mocks/handlers.ts";
  const ownerPath = "src/features/dashboard/mocks/jobImportCommands.ts";
  if (path !== registryPath && path !== ownerPath) {
    return false;
  }

  const text = readIfPresent(root, path);
  const requiredCommands = ["preview_job_import", "confirm_job_import"];
  const missingCommand = requiredCommands.some((command) => {
    const pattern =
      path === registryPath
        ? `["']${command}["']`
        : `case\\s+["']${command}["']`;
    return !new RegExp(pattern).test(text);
  });
  if (path === registryPath) {
    return missingCommand;
  }

  const importReturnsOnlyId = /\bjobId\s*:\s*job\.id\b/.test(text);
  const importReturnsFullJob = /\bvalue\s*:\s*\{\s*\.\.\.job\s*\}/.test(text);

  return missingCommand || !importReturnsOnlyId || importReturnsFullJob;
}

export function hasStaleProfilePreviewMock(root, path) {
  const registryPath = existsSync(join(root, "src/test-support/mocks/commandRegistry.ts"))
    ? "src/test-support/mocks/commandRegistry.ts"
    : "src/test-support/mocks/handlers.ts";
  const profileOwnerPath = "src/features/application-assist/mockProfile.ts";
  const hasProfileOwner = existsSync(join(root, profileOwnerPath));
  if (
    path !== registryPath &&
    (!hasProfileOwner || path !== profileOwnerPath)
  ) {
    return false;
  }

  const text = readIfPresent(root, path);
  if (path === registryPath) {
    const hasPreview = /["']get_application_profile_preview["']/.test(text);
    const hasProfile = /["']has_application_profile["']/.test(text);
    if (!hasPreview || !hasProfile) return true;
    if (hasProfileOwner) return false;
  }

  const previewBody = hasProfileOwner
    ? (/getMockApplicationProfilePreview[\s\S]*?\n\}/.exec(text)?.[0] ?? "")
    : text;
  return /(?:resumeFilePath|defaultResumeId|defaultCoverLetterTemplate|maxApplicationsPerDay|createdAt|updatedAt)/.test(
    previewBody,
  );
}

export function hasBookmarkletTokenIpcExposure(root, path) {
  if (
    path !== "src-tauri/src/commands/bookmarklet.rs" &&
    path !==
      "src/features/settings/sources/browser-import/BrowserImportSection.tsx" &&
    path !== "src/features/settings/mocks/commands.ts" &&
    path !== "src/test-support/mocks/handlers.ts"
  ) {
    return false;
  }

  const text = path.endsWith(".rs")
    ? stripRustTestModules(readIfPresent(root, path))
    : stripTypeScriptComments(readIfPresent(root, path));

  if (path === "src-tauri/src/commands/bookmarklet.rs") {
    return (
      /pub\s+struct\s+BookmarkletConfigResponse\s*\{[^}]*\bauth_token\b[^}]*\}/.test(
        text,
      ) ||
      /serde\s*\(\s*rename\s*=\s*"authToken"\s*\)/.test(text) ||
      /Ok\s*\(\s*BookmarkletConfigResponse\s*\{[^}]*\bauth_token\s*:/.test(text)
    );
  }

  return (
    /\bauthToken\b/.test(text) ||
    /X-JobSentinel-Token[\s\S]{0,120}(?:invoke|navigator\.clipboard|writeText)/.test(
      text,
    )
  );
}

export function hasApplicationProfileResumePathExposure(root, path) {
  if (
    path !== "src-tauri/src/commands/automation.rs" &&
    path !== "src/features/application-assist/ProfileForm.tsx" &&
    path !== "src/features/application-assist/mockProfile.ts" &&
    path !== "src/features/application-assist/mocks/commands.ts" &&
    path !== "src/test-support/mocks/handlers.ts"
  ) {
    return false;
  }

  const text = path.endsWith(".rs")
    ? stripRustTestModules(readIfPresent(root, path))
    : stripTypeScriptComments(readIfPresent(root, path));

  if (path === "src-tauri/src/commands/automation.rs") {
    return (
      /pub\s+struct\s+ApplicationProfileResponse\s*\{[^}]*\bresume_file_path\b[^}]*\}/.test(
        text,
      ) ||
      /\bresumeFilePath\b/.test(text) ||
      /resume_file_path[\s\S]{0,160}\.map\s*\(\s*(?:std::path::)?PathBuf::from\s*\)/.test(
        text,
      ) ||
      (/pub\s+async\s+fn\s+upsert_application_profile[\s\S]{0,700}\.upsert_profile\s*\(\s*&input\s*\)[\s\S]{0,120}\.await/.test(
        text,
      ) &&
        !/pub\s+async\s+fn\s+upsert_application_profile[\s\S]{0,350}prepare_application_profile_resume_input/.test(
          text,
        ))
    );
  }

  return (
    /\bresumeFilePath\b/.test(text) ||
    /\bresume_file_path\b/.test(text) ||
    /@tauri-apps\/plugin-dialog/.test(text)
  );
}

export function hasApplicationAssistAutomaticResumeUpload(root, path) {
  if (path !== "src-tauri/src/commands/automation.rs") {
    return false;
  }

  const text = stripRustTestModules(readIfPresent(root, path));
  return (
    /FormFiller::new\s*\(\s*profile\s*,\s*resume_path\s*\)/.test(text) ||
    /FormFiller::new\s*\(\s*profile\s*,\s*Some\s*\(/.test(text)
  );
}

export function hasApplicationAssistUntrustedFormTarget(root, path) {
  if (path !== "src-tauri/src/commands/automation.rs") {
    return false;
  }

  const text = stripRustTestModules(readIfPresent(root, path));
  const fillStart = text.indexOf("pub async fn fill_application_form");
  if (fillStart === -1) {
    return false;
  }

  const profileLoad = text.indexOf("ProfileManager::new", fillStart);
  const targetCheck = [
    "prepare_form_target(&job_url)",
    "prepare_form_target_for_fill(&job_url)",
  ]
    .map((snippet) => text.indexOf(snippet, fillStart))
    .filter((index) => index !== -1)
    .sort((left, right) => left - right)[0];

  return (
    profileLoad !== -1 && (targetCheck === -1 || targetCheck > profileLoad)
  );
}

export function hasAutomationScreenshotPathIpcExposure(root, path) {
  if (path !== "src-tauri/src/commands/automation.rs") {
    return false;
  }

  const text = stripRustTestModules(readIfPresent(root, path));
  return (
    /pub\s+struct\s+AttemptResponse\s*\{[^}]*\b(?:screenshot_path|confirmation_screenshot_path)\b/.test(
      text,
    ) ||
    /AttemptResponse\s*\{[^}]*\b(?:screenshot_path|confirmation_screenshot_path)\s*:/.test(
      text,
    )
  );
}

export function hasAnswerHistoryRendererInvoke(root, path) {
  if (
    !path.startsWith("src/") ||
    path.startsWith("src/test-support/mocks/") ||
    /\.test\.[tj]sx?$/.test(path) ||
    /\.spec\.[tj]sx?$/.test(path)
  ) {
    return false;
  }

  const text = stripTypeScriptComments(readIfPresent(root, path));
  return /["'`](?:get_answer_statistics|clear_answer_history)["'`]/.test(text);
}

export function hasRawAnswerHistoryIpcExposure(root, path) {
  if (
    path !== "src-tauri/src/commands/automation.rs" &&
    path !== "src/features/application-assist/ScreeningAnswerSuggestions.tsx" &&
    path !== "src/features/application-assist/mocks/commands.ts" &&
    path !== "src/test-support/mocks/handlers.ts"
  ) {
    return false;
  }

  const text = path.endsWith(".rs")
    ? stripRustTestModules(readIfPresent(root, path))
    : stripTypeScriptComments(readIfPresent(root, path));

  if (path === "src-tauri/src/commands/automation.rs") {
    return (
      /pub\s+struct\s+AnswerStatisticsResponse\s*\{[^}]*\bpub\s+(?:pattern|answer)\s*:/.test(
        text,
      ) ||
      /pub\s+struct\s+ModificationExampleResponse\s*\{[^}]*\bpub\s+(?:original_answer|modified_to|question_text)\s*:/.test(
        text,
      ) ||
      /AnswerSourceResponse[\s\S]{0,500}\boriginal_question\b/.test(text) ||
      /AnswerSourceResponse[\s\S]{0,500}\bpattern\s*:\s*String/.test(text)
    );
  }

  return /\boriginalQuestion\b|\bpattern\s*:\s*string\b/.test(text);
}
