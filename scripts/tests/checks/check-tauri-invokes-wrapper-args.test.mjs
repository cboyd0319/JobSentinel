import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkTauriInvokes } from "../../checks/tauri-invokes.mjs";

function writeFixtureFile(root, path, content) {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-tauri-wrapper-args-"));

  try {
    writeFixtureFile(
      root,
      "src-tauri/src/main.rs",
      `
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            ipc::jobs::search_jobs,
            ipc::config::get_config,
        ]);
}
`,
    );
    writeFixtureFile(root, "README.md", "Current backend surface: **2 registered Tauri commands**.\n");
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

test("checkTauriInvokes rejects frontend command calls missing required object args", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/main.rs",
      `
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            ipc::user_data::create_saved_search,
        ]);
}
`,
    );
    writeFixtureFile(root, "README.md", "Current backend surface: **1 registered Tauri commands**.\n");
    writeFixtureFile(
      root,
      "docs/README.md",
      "### Backend Modules (1 registered Tauri commands)\n\n- **User Data**: saved searches\n",
    );
    writeFixtureFile(root, "docs/ROADMAP.md", "- **1 registered Tauri commands** for backend modules\n");
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      "Tauri command handlers.\n\n**User Data Commands:**\n",
    );
    writeFixtureFile(root, "docs/developer/GETTING_STARTED.md", "- **user_data**: Saved searches\n");
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      "These commands power the user data features.\n\n### Saved Searches\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/user_data.rs",
      `
#[tauri::command]
pub async fn create_saved_search(search: SavedSearch) -> Result<(), String> {
    Ok(())
}
`,
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/hooks/useDashboardSavedSearches.ts",
      `
import { safeInvoke } from "../../../platform/tauri/commandClient";

export async function saveSearch() {
  return safeInvoke("create_saved_search", { name: "Remote Rust" });
}
`,
    );

    const violations = checkTauriInvokes(root);

    assert.ok(
      violations.some((violation) =>
        violation.includes("invokes create_saved_search without required search argument"),
      ),
      violations.join("\n"),
    );
  });
});

test("checkTauriInvokes rejects unregistered wrapper command calls", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/dashboard/DashboardPage.tsx",
      `
import { cachedInvoke, safeInvoke } from "../../platform/tauri/commandClient";

export async function loadDashboard() {
  await cachedInvoke("missing_cached_command");
  await safeInvoke("missing_safe_command");
}
`,
    );

    const violations = checkTauriInvokes(root);

    assert.ok(
      violations.some((violation) =>
        violation.includes("invokes unregistered Tauri command: missing_cached_command"),
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.some((violation) =>
        violation.includes("invokes unregistered Tauri command: missing_safe_command"),
      ),
      violations.join("\n"),
    );
  });
});
