import { readFileSync } from "node:fs";
import { join } from "node:path";

const frontendErrorReportingPaths = new Set(["src/utils/errorReporting.ts"]);

const rawPrivateQueryLoggingPaths = new Set([
  "src-tauri/src/commands/automation.rs",
  "src-tauri/src/commands/jobs.rs",
  "src-tauri/src/core/db/queries.rs",
]);

const rawScraperLoggingPaths = new Set([
  "src-tauri/src/core/scrapers/cache.rs",
  "src-tauri/src/core/scrapers/dice.rs",
  "src-tauri/src/core/scrapers/glassdoor.rs",
  "src-tauri/src/core/scrapers/greenhouse.rs",
  "src-tauri/src/core/scrapers/http_client.rs",
  "src-tauri/src/core/scrapers/jobswithgpt.rs",
  "src-tauri/src/core/scrapers/lever/mod.rs",
  "src-tauri/src/core/scrapers/linkedin.rs",
  "src-tauri/src/core/scrapers/simplyhired.rs",
  "src-tauri/src/core/scrapers/usajobs.rs",
]);

const scraperLoopErrorLoggingPaths = new Set([
  "src-tauri/src/core/scrapers/greenhouse.rs",
  "src-tauri/src/core/scrapers/lever/mod.rs",
]);

const rawLocalPathLoggingPaths = new Set([
  "src-tauri/src/commands/ml.rs",
  "src-tauri/src/commands/resume.rs",
  "src-tauri/src/core/automation/browser/page.rs",
  "src-tauri/src/core/automation/form_filler.rs",
  "src-tauri/src/core/db/connection.rs",
  "src-tauri/src/core/db/integrity/backups.rs",
  "src-tauri/src/main.rs",
  "src-tauri/src/platforms/linux/mod.rs",
  "src-tauri/src/platforms/macos/mod.rs",
  "src-tauri/src/platforms/windows/mod.rs",
]);

const rawBackupPathErrorPaths = new Set(["src-tauri/src/core/db/integrity/backups.rs"]);

const mlRawLocalPathExposurePaths = new Set([
  "src-tauri/src/commands/ml.rs",
  "src-tauri/src/core/ml/model.rs",
]);

const mlErrorDisplayPrivacyPaths = new Set(["src-tauri/src/core/ml/mod.rs"]);

const mlRawLocalPathDocPaths = new Set(["docs/ML_FEATURE.md", "docs/ML_QUICKSTART.md"]);

const jobsWithGptPrivacyPaths = new Set(["src-tauri/src/core/scrapers/jobswithgpt.rs"]);
const linkedInPrivacyPaths = new Set(["src-tauri/src/core/scrapers/linkedin.rs"]);
const linkedInAuthPrivacyPaths = new Set(["src-tauri/src/commands/linkedin_auth.rs"]);

function stripRustTestModules(text) {
  let output = text;

  output = output.replace(/#\[cfg\(test\)\]\s*mod\s+tests\s*\{[\s\S]*$/m, "");

  output = output.replace(/#\[cfg\(test\)\]\s*[\s\S]*?#\[test\][\s\S]*?\n\s*\}/g, "");

  output = output.replace(/#\[test\]\s*fn\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}/g, "");

  output = output.replace(
    /#\[tokio::test\]\s*async\s+fn\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}/g,
    "",
  );

  return output;
}

function stripTypeScriptComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

export function hasRawAutomationDropdownValueLogging(root, path) {
  if (path !== "src-tauri/src/core/automation/browser/page.rs") {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /tracing::debug!\(\s*"Selected option[^"]*"[\s\S]{0,120},\s*value\b/.test(
    productionText,
  );
}

export function hasRawFrontendErrorReporterForwarding(root, path) {
  if (!frontendErrorReportingPaths.has(path)) {
    return false;
  }

  const text = stripTypeScriptComments(readFileSync(join(root, path), "utf8"));
  return (
    /originalConsoleError\.apply\(\s*console\s*,\s*args\s*\)/.test(text) ||
    /window\.onerror\s*=\s*\([\s\S]{0,640}return\s+false\s*;/.test(text) ||
    /window\.onunhandledrejection\s*=\s*\([\s\S]{0,720}if\s*\(\s*!import\.meta\.env\.DEV\s*\)\s*\{[\s\S]{0,120}event\.preventDefault\(\)/.test(
      text,
    )
  );
}

export function hasRawPrivateQueryLogging(root, path) {
  if (!rawPrivateQueryLoggingPaths.has(path)) {
    return false;
  }

  return /\b(?:query|question|pattern):\s*'?\{(?::\?)?\}'?/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasRawScraperUrlOrQueryLogging(root, path) {
  if (!rawScraperLoggingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /(?:URL|url|fetching|Fetching[^"]*(?:API|for|query)):\s*\{\}|(?:query|location)\s*=\s*%self\.(?:query|location)/.test(
    text,
  ) || /MCP request:\s*\{\}[^;]*request/.test(text) ||
    /MCP error:\s*\{\}[^;]*error/.test(text) ||
    /USAJobs API error:\s*\{\}\s*-\s*\{\}[^;]*body/.test(text) ||
    /tracing::(?:debug|info|warn|error)!\([^;]*,\s*url\s*\)/.test(text) ||
    /format!\([^)]*\{url\}/.test(text);
}

export function hasRawScraperLoopErrorLogging(root, path) {
  if (!scraperLoopErrorLoggingPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /tracing::(?:error|warn)!\(\s*"Failed to scrape \{\}:\s*\{\}"\s*,\s*company\.name\s*,\s*e\s*\)/.test(
    productionText,
  );
}

export function hasUnboundedExternalResponseBodyRead(root, path) {
  if (
    !path.startsWith("src-tauri/src/") ||
    !path.endsWith(".rs") ||
    path === "src-tauri/src/core/http_body.rs"
  ) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /\.(?:text|bytes|chunk)\(\)\s*\.await|\.json(?:::<[^)]*>)?\(\)\s*\.await/.test(
    productionText,
  );
}

export function hasRawLocalPathLogging(root, path) {
  if (!rawLocalPathLoggingPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /tracing::(?:debug|info|warn|error)!\([^;]*(?:\bpath:\s*\{\}|display\(\)|(?:path|dir|directory|backup|database|configuration)[^;]*\{:\?\})/.test(
    text,
  );
}

export function hasRawBackupPathError(root, path) {
  if (!rawBackupPathErrorPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /Backup file not found:\s*\{\}[\s\S]{0,80}backup_path\.display\(\)/.test(
    productionText,
  );
}

export function hasMlRawLocalPathExposure(root, path) {
  if (!mlRawLocalPathExposurePaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /\bpub\s+model_path\s*:\s*PathBuf\b/.test(productionText) ||
    /Ok\(format!\(\s*"Model downloaded to \{:\?\}"\s*,\s*model_path\s*\)\)/.test(
      productionText,
    ) ||
    /tracing::info!\(\s*"Model downloaded successfully to \{:\?\}"\s*,\s*model_dir\s*\)/.test(
      productionText,
    ) ||
    /failed to read model weights from \{:\?\}[\s\S]{0,120}model_path/.test(productionText)
  );
}

export function hasMlRawErrorDisplay(root, path) {
  if (!mlErrorDisplayPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /#\[error\("\s*(?:model not downloaded|model loading failed|inference failed|tokenization failed|download failed|IO error)[^"]*:\s*\{0\}"\)\]/.test(
    productionText,
  );
}

export function hasMlRawLocalPathDoc(root, path) {
  if (!mlRawLocalPathDocPaths.has(path)) {
    return false;
  }

  return /\bmodel_path\s*:\s*string\b/.test(readFileSync(join(root, path), "utf8"));
}

export function hasRawJobsWithGptDebug(root, path) {
  if (!jobsWithGptPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /#\[derive\([^)]*Debug[^)]*\)\]\s*pub struct (?:JobsWithGptScraper|JobQuery)\b/.test(
    productionText,
  );
}

export function hasRawLinkedInDebug(root, path) {
  if (!linkedInPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return /#\[derive\([^)]*Debug[^)]*\)\]\s*pub struct LinkedInScraper\b/.test(productionText);
}

export function hasLinkedInLoginCookieReturn(root, path) {
  if (!linkedInAuthPrivacyPaths.has(path)) {
    return false;
  }

  const productionText = stripRustTestModules(readFileSync(join(root, path), "utf8"));
  return (
    /cookie_result\.map\(\s*\|\(\s*cookie\b/.test(productionText) ||
    /tx\.send\(\s*cookie_result\.map\(\s*\|\([^)]*\)\|\s*cookie\s*\)\s*\)/.test(productionText) ||
    /Send result back\s*\([^)]*cookie value/.test(productionText)
  );
}
