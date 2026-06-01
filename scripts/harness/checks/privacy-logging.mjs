import { readFileSync } from "node:fs";
import { join } from "node:path";

const frontendErrorReportingPaths = new Set(["src/utils/errorReporting.ts"]);

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
