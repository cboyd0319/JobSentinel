import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkTauriInvokes } from "./check-tauri-invokes.mjs";

function writeFixtureFile(root, path, content) {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-tauri-invokes-"));

  try {
    writeFixtureFile(
      root,
      "src-tauri/src/main.rs",
      `
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::jobs::search_jobs,
            commands::config::get_config,
        ]);
}
`,
    );

    writeFixtureFile(
      root,
      "README.md",
      "Current backend surface: **2 registered Tauri commands**.\n",
    );
    writeFixtureFile(
      root,
      "docs/README.md",
      "### Backend Modules (2 registered Tauri commands)\n\n- **ATS**: 10 commands\n",
    );
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      "- **2 registered Tauri commands** for backend modules\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      "Tauri command handlers. **169 total commands.**\n\n**Core Commands (18):**\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      "- **ats**: Application Tracking System with interview scheduler (10 commands)\n",
    );
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      "These 20 commands power the user data features.\n\n### Saved Searches (4 commands)\n",
    );

    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkTauriInvokes rejects hardcoded current command-count claims", () => {
  withFixture((root) => {
    const violations = checkTauriInvokes(root);

    assert.ok(
      violations.some((violation) =>
        violation.includes("docs/developer/ARCHITECTURE.md:1"),
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.some((violation) =>
        violation.includes("docs/README.md:3"),
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.some((violation) =>
        violation.includes("docs/features/user-data-management.md:1"),
      ),
      violations.join("\n"),
    );
  });
});

test("checkTauriInvokes rejects registered stub commands", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/main.rs",
      `
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::automation::take_automation_screenshot,
        ]);
}
`,
    );
    writeFixtureFile(
      root,
      "README.md",
      "Current backend surface: **1 registered Tauri commands**.\n",
    );
    writeFixtureFile(
      root,
      "docs/README.md",
      "### Backend Modules (1 registered Tauri commands)\n\n- **Automation**: browser control\n",
    );
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      "- **1 registered Tauri commands** for backend modules\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      "Tauri command handlers.\n\n**Automation Commands:**\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      "- **automation**: Browser control\n",
    );
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      "These commands power the user data features.\n\n### Saved Searches\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/automation.rs",
      `
#[tauri::command]
pub async fn take_automation_screenshot(path: String) -> Result<(), String> {
    tracing::info!("Command: take_automation_screenshot (path: {})", path);

    // Note: This is a placeholder - we'd need to track the current page.
    Err("Screenshot functionality requires active page context".to_string())
}
`,
    );

    const violations = checkTauriInvokes(root);

    assert.ok(
      violations.some((violation) =>
        violation.includes("take_automation_screenshot is registered but appears to be a stub"),
      ),
      violations.join("\n"),
    );
  });
});
