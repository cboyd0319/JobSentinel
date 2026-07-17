import assert from "node:assert/strict";
import test from "node:test";
import { checkTauriInvokes } from "../../checks/tauri-invokes.mjs";
import { writeFixtureFile } from "../lib/filesystem-fixture.mjs";
import { createTauriInvokeFixtureRunner } from "../lib/source-fixtures.mjs";

const withFixture = createTauriInvokeFixtureRunner(
  "jobsentinel-tauri-wrapper-args-",
);

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
