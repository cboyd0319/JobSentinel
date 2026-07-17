export const staleJobImportMockSource = [
  "function importMockJobFromUrl(command) {",
  "  const job = { id: 1, title: 'Care Coordinator' };",
  "  switch (command) {",
  "    case 'preview_job_import':",
  "      return {};",
  "    case 'confirm_job_import':",
  "      return { value: { ...job } };",
  "    default:",
  "      return undefined;",
  "  }",
  "}",
  "",
].join("\n");

export const contradictoryPlansIndexSource = [
  "## Current Release Plans",
  "| Version | Status | Document |",
  "| ------- | ------ | -------- |",
  "| v2.7.0 | Unreleased | [Beta feedback system](completed/beta-feedback-system.md) |",
  "",
  "## Archived Plans",
  "| Version | Status | Document |",
  "| ------- | ------ | -------- |",
  "| v2.7.0 | Complete on main | [Beta feedback system](completed/beta-feedback-system.md) |",
  "",
].join("\n");

export const suggestionCategoryRustSource = `
pub enum SuggestionCategory {
    AddKeyword,
    RewordBullet,
    AddSection,
    ReorderContent,
    FormatFix,
}
`;

export const staleSuggestionCategoryLabelsSource =
  'type SuggestionCategory = "AddKeyword" | "RewordBullet" | "AddSection" | "RemoveItem";\n';

export const staleSuggestionCategoryMockSource =
  'type MockSuggestionCategory = "AddKeyword" | "RewordBullet" | "AddSection";\n';

export function writeBaseTauriInvokeFixture(root, writeFixtureFile) {
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
}

export function createTauriInvokeFixtureRunner(prefix) {
  const runFixture = createFixtureRunner(prefix);
  return (callback) =>
    runFixture((root) => {
      writeBaseTauriInvokeFixture(root, writeFixtureFile);
      return callback(root);
    });
}
import {
  createFixtureRunner,
  writeFixtureFile,
} from "./filesystem-fixture.mjs";
