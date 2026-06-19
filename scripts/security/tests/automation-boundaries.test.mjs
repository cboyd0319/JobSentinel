import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkBrowserAutomationBoundary } from "../automation-boundaries.mjs";

function mkdtempRoot(prefix) {
  const root = join(tmpdir(), `${prefix}${process.pid}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(root, { recursive: true });
  return root;
}

function writeAutomationPage(root, text) {
  const pageDir = join(root, "src-tauri/src/core/automation/browser");
  mkdirSync(pageDir, { recursive: true });
  writeFileSync(join(pageDir, "page.rs"), text);
}

test("checkBrowserAutomationBoundary accepts JSON-encoded select script literals", () => {
  const root = mkdtempRoot("jobsentinel-automation-boundary-good-");
  writeAutomationPage(
    root,
    [
      "fn javascript_string_literal(value: &str) { serde_json::to_string(value); }",
      "fn dropdown_select_script(selector: &str, value: &str) {",
      "  document.querySelector({selector});",
      "  select.value = {value};",
      "}",
    ].join("\n"),
  );

  const violations = [];
  checkBrowserAutomationBoundary(root, violations);

  assert.deepEqual(violations, []);
});

test("checkBrowserAutomationBoundary rejects manual single-quote escaping", () => {
  const root = mkdtempRoot("jobsentinel-automation-boundary-unsafe-");
  writeAutomationPage(
    root,
    String.raw`
      let script = format!(
        "const select = document.querySelector('{}'); select.value = '{}';",
        selector.replace('\'', "\\'"),
        value.replace('\'', "\\'")
      );
    `,
  );

  const violations = [];
  checkBrowserAutomationBoundary(root, violations);

  assert(
    violations.includes(
      "browser automation select script must JSON-encode untrusted selector and value literals",
    ),
  );
  assert(
    violations.includes(
      "browser automation select script must not rely on manual single-quote escaping",
    ),
  );
});
