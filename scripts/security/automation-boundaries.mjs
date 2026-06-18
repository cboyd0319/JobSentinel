import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function repoPath(root, path) {
  return join(root, path);
}

function readIfExists(root, path, violations) {
  const fullPath = repoPath(root, path);

  if (!existsSync(fullPath)) {
    violations.push(`missing file required for security sensor check: ${path}`);
    return "";
  }

  return readFileSync(fullPath, "utf8");
}

function includesAll(text, phrases) {
  return phrases.every((phrase) => text.includes(phrase));
}

export function checkBrowserAutomationBoundary(root, violations) {
  const page = readIfExists(
    root,
    "src-tauri/src/core/automation/browser/page.rs",
    violations,
  );

  if (
    !includesAll(page, [
      "serde_json::to_string(value)",
      "document.querySelector({selector})",
      "select.value = {value}",
    ])
  ) {
    violations.push(
      "browser automation select script must JSON-encode untrusted selector and value literals",
    );
  }

  if (/\.replace\(\s*'\\''\s*,\s*"\\\\'"\s*\)/.test(page)) {
    violations.push(
      "browser automation select script must not rely on manual single-quote escaping",
    );
  }
}
