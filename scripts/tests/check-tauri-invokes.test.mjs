import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkTauriInvokes } from "../checks/tauri-invokes.mjs";

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
            ipc::jobs::search_jobs,
            ipc::config::get_config,
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
            ipc::automation::take_automation_screenshot,
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
      "src-tauri/src/ipc/automation.rs",
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

test("checkTauriInvokes resolves nested command module paths", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/main.rs",
      `
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            ipc::resume::resume_builder_ipc::update_resume_summary,
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
      "### Backend Modules\n\n- **Resume**: builder commands\n",
    );
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      "- **1 registered Tauri commands** for backend modules\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      "Tauri command handlers.\n\n**Resume Commands:**\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      "- **resume**: Resume builder\n",
    );
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      "These commands power user data features.\n\n### Saved Searches\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/resume.rs",
      `
#[path = "resume_builder_commands.rs"]
pub mod resume_builder_commands;
`,
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/resume_builder_commands.rs",
      `
#[tauri::command]
pub async fn update_resume_summary(resume_id: i64, summary: String) -> Result<(), String> {
    Ok(())
}
`,
    );
    writeFixtureFile(
      root,
      "src/features/resumes/builder/ResumeBuilderPage.tsx",
      `
import { invoke } from "@tauri-apps/api/core";

export async function saveSummary() {
  await invoke("update_resume_summary", { resumeId: 1, summary: "Focused operator." });
}
`,
    );

    const violations = checkTauriInvokes(root);

    assert.deepEqual(violations, []);
  });
});

test("checkTauriInvokes rejects signed-to-usize casts in command handlers", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/main.rs",
      `
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            ipc::market::get_historical_snapshots,
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
      "### Backend Modules (1 registered Tauri commands)\n\n- **Market**: analytics\n",
    );
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      "- **1 registered Tauri commands** for backend modules\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      "Tauri command handlers.\n\n**Market Commands:**\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      "- **market**: Market intelligence\n",
    );
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      "These commands power the user data features.\n\n### Saved Searches\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/market.rs",
      `
#[tauri::command]
pub async fn get_historical_snapshots(days: i64) -> Result<(), String> {
    market.get_historical_snapshots(days as usize).await;
    Ok(())
}
`,
    );

    const violations = checkTauriInvokes(root);

    assert.ok(
      violations.some((violation) =>
        violation.includes(
          "market::get_historical_snapshots casts a command value to usize",
        ),
      ),
      violations.join("\n"),
    );
  });
});

test("checkTauriInvokes rejects unvalidated command limits", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/main.rs",
      `
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            ipc::jobs::get_recent_jobs,
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
      "### Backend Modules (1 registered Tauri commands)\n\n- **Jobs**: search\n",
    );
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      "- **1 registered Tauri commands** for backend modules\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      "Tauri command handlers.\n\n**Jobs Commands:**\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      "- **jobs**: Search jobs\n",
    );
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      "These commands power the user data features.\n\n### Saved Searches\n",
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/jobs.rs",
      `
#[tauri::command]
pub async fn get_recent_jobs(limit: usize) -> Result<(), String> {
    database.get_recent_jobs(limit as i64).await;
    Ok(())
}
`,
    );

    const violations = checkTauriInvokes(root);

    assert.ok(
      violations.some((violation) =>
        violation.includes(
          "jobs::get_recent_jobs accepts a command limit without validation",
        ),
      ),
      violations.join("\n"),
    );
  });
});

test("checkTauriInvokes rejects frontend get_search_history calls without limit", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/main.rs",
      `
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            ipc::user_data::get_search_history,
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
      "### Backend Modules (1 registered Tauri commands)\n\n- **User Data**: history\n",
    );
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      "- **1 registered Tauri commands** for backend modules\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      "Tauri command handlers.\n\n**User Data Commands:**\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      "- **user_data**: Search history\n",
    );
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
pub async fn get_search_history(limit: i64) -> Result<(), String> {
    let limit = validate_command_limit_i64(limit)?;
    Ok(())
}
`,
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/hooks/useDashboardSearch.ts",
      `
import { invoke } from "@tauri-apps/api/core";

export async function loadSearchHistory() {
  return invoke<string[]>("get_search_history");
}
`,
    );

    const violations = checkTauriInvokes(root);

    assert.ok(
      violations.some((violation) =>
        violation.includes("invokes get_search_history without required limit argument"),
      ),
      violations.join("\n"),
    );
  });
});

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
    writeFixtureFile(
      root,
      "README.md",
      "Current backend surface: **1 registered Tauri commands**.\n",
    );
    writeFixtureFile(
      root,
      "docs/README.md",
      "### Backend Modules (1 registered Tauri commands)\n\n- **User Data**: saved searches\n",
    );
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      "- **1 registered Tauri commands** for backend modules\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      "Tauri command handlers.\n\n**User Data Commands:**\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      "- **user_data**: Saved searches\n",
    );
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
