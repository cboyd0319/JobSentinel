import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const fullProfileAllowedPaths = new Set(["src/components/automation/ProfileForm.tsx"]);

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
    path.startsWith("src/mocks/") ||
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
  if (path !== "src/pages/Dashboard.tsx") {
    return false;
  }

  const text = stripTypeScriptComments(readIfPresent(root, path));
  return /["'`]get_config["'`]/.test(text);
}

export function hasRawJobImportUrlAfterPreview(root, path) {
  if (path !== "src/components/JobImportModal.tsx") {
    return false;
  }

  const text = stripTypeScriptComments(readIfPresent(root, path));
  return /["'`]import_job_from_url["'`][\s\S]{0,160}\{\s*url\s*:\s*(?:url(?:\.trim\(\))?|rawUrl)\s*\}/.test(
    text,
  );
}

export function hasFullImportedJobReturn(root, path) {
  if (path !== "src-tauri/src/commands/import.rs") {
    return false;
  }

  const text = stripRustTestModules(readIfPresent(root, path));
  return (
    /import_job_from_url[\s\S]{0,220}->\s*Result\s*<\s*(?:Value|serde_json::Value)\s*,\s*String\s*>/.test(
      text,
    ) ||
    /serde_json::to_value\s*\(\s*&job\s*\)/.test(text) ||
    /\.get_job_by_id\s*\(\s*job_id\s*\)/.test(text)
  );
}

export function hasStaleJobImportMockHandlers(root, path) {
  if (path !== "src/mocks/handlers.ts") {
    return false;
  }

  const text = readIfPresent(root, path);
  const requiredCommands = ["preview_job_import", "import_job_from_url"];
  const missingCommand = requiredCommands.some((command) => {
    return !new RegExp(`case\\s+["']${command}["']`).test(text);
  });

  const importReturnsOnlyId = /return\s*\{\s*jobId\s*:\s*job\.id\s*\}\s*;/.test(text);
  const importReturnsFullJob = /return\s*\{\s*\.\.\.job\s*\}\s*;/.test(text);

  return missingCommand || !importReturnsOnlyId || importReturnsFullJob;
}

export function hasStaleProfilePreviewMock(root, path) {
  if (path !== "src/mocks/handlers.ts") {
    return false;
  }

  const text = readIfPresent(root, path);
  const hasPreviewCase = /case\s+["']get_application_profile_preview["']/.test(text);
  const hasHasProfileCase = /case\s+["']has_application_profile["']/.test(text);
  const previewIncludesPrivateFields =
    /getMockApplicationProfilePreview[\s\S]{0,900}(?:resumeFilePath|defaultResumeId|defaultCoverLetterTemplate|maxApplicationsPerDay|createdAt|updatedAt)/.test(
      text,
    );

  return !hasPreviewCase || !hasHasProfileCase || previewIncludesPrivateFields;
}

export function hasBookmarkletTokenIpcExposure(root, path) {
  if (
    path !== "src-tauri/src/commands/bookmarklet.rs" &&
    path !== "src/components/BookmarkletGenerator.tsx" &&
    path !== "src/mocks/handlers.ts"
  ) {
    return false;
  }

  const text =
    path.endsWith(".rs")
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
    /X-JobSentinel-Token[\s\S]{0,120}(?:invoke|navigator\.clipboard|writeText)/.test(text)
  );
}

export function hasApplicationProfileResumePathExposure(root, path) {
  if (
    path !== "src-tauri/src/commands/automation.rs" &&
    path !== "src/components/automation/ProfileForm.tsx" &&
    path !== "src/mocks/handlers.ts"
  ) {
    return false;
  }

  const text =
    path.endsWith(".rs")
      ? stripRustTestModules(readIfPresent(root, path))
      : stripTypeScriptComments(readIfPresent(root, path));

  if (path === "src-tauri/src/commands/automation.rs") {
    return (
      /pub\s+struct\s+ApplicationProfileResponse\s*\{[^}]*\bresume_file_path\b[^}]*\}/.test(
        text,
      ) || /\bresumeFilePath\b/.test(text)
    );
  }

  return /\bresumeFilePath\b/.test(text);
}
