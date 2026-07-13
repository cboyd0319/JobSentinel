import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasAnswerHistoryRendererInvoke,
  hasApplicationAssistAutomaticResumeUpload,
  hasApplicationAssistUntrustedFormTarget,
  hasApplicationProfileResumePathExposure,
  hasAutomationScreenshotPathIpcExposure,
  hasBookmarkletTokenIpcExposure,
  hasDashboardFullConfigInvoke,
  hasFullImportedJobReturn,
  hasNonSettingsFullApplicationProfileInvoke,
  hasRawAnswerHistoryIpcExposure,
  hasRawJobImportUrlAfterPreview,
  hasStaleJobImportMockHandlers,
  hasStaleProfilePreviewMock,
} from "../harness/checks/ipc-minimization.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-ipc-minimization-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("ipc minimization rejects full profile calls outside the profile editor", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/application-assist/ApplyButton.tsx",
      'safeInvoke("get_application_profile");\n',
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ProfileForm.tsx",
      'invoke("get_application_profile");\n',
    );

    assert.equal(
      hasNonSettingsFullApplicationProfileInvoke(
        root,
        "src/features/application-assist/ApplyButton.tsx",
      ),
      true,
    );
    assert.equal(
      hasNonSettingsFullApplicationProfileInvoke(
        root,
        "src/features/application-assist/ProfileForm.tsx",
      ),
      false,
    );
  });
});

test("ipc minimization rejects full config calls from Dashboard", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/dashboard/DashboardPage.tsx",
      'cachedInvoke("get_config", undefined, 60000);\n',
    );

    assert.equal(
      hasDashboardFullConfigInvoke(
        root,
        "src/features/dashboard/DashboardPage.tsx",
      ),
      true,
    );
    assert.equal(
      hasDashboardFullConfigInvoke(
        root,
        "src/features/settings/SettingsPage.tsx",
      ),
      false,
    );
  });
});

test("ipc minimization rejects importing from raw input after preview", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/dashboard/components/JobImportModal.tsx",
      'await invoke("import_job_from_url", { url: url.trim() });\n',
    );

    assert.equal(
      hasRawJobImportUrlAfterPreview(
        root,
        "src/features/dashboard/components/JobImportModal.tsx",
      ),
      true,
    );
  });
});

test("ipc minimization rejects backend full imported job returns", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/commands/import.rs",
      [
        "pub async fn import_job_from_url(url: String) -> Result<Value, String> {",
        "  let job = state.database.get_job_by_id(job_id).await?;",
        "  serde_json::to_value(&job)",
        "}",
        "",
      ].join("\n"),
    );

    assert.equal(
      hasFullImportedJobReturn(root, "src-tauri/src/commands/import.rs"),
      true,
    );
  });
});

test("ipc minimization rejects stale import and profile mocks", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "function getMockApplicationProfilePreview() {",
        "  return { fullName: 'Jordan', resumeFilePath: '/private/resume.pdf' };",
        "}",
        "function importMockJobFromUrl() {",
        "  const job = { id: 1, title: 'Care Coordinator' };",
        "  return { ...job };",
        "}",
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'preview_job_import':",
        "      return {};",
        "    case 'import_job_from_url':",
        "      return importMockJobFromUrl();",
        "    case 'get_application_profile_preview':",
        "      return getMockApplicationProfilePreview();",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    assert.equal(
      hasStaleJobImportMockHandlers(root, "src/mocks/handlers.ts"),
      true,
    );
    assert.equal(
      hasStaleProfilePreviewMock(root, "src/mocks/handlers.ts"),
      true,
    );
  });
});

test("ipc minimization rejects bookmarklet token exposure across renderer IPC", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/commands/bookmarklet.rs",
      [
        "pub struct BookmarkletConfigResponse {",
        '  #[serde(rename = "authToken")]',
        "  pub auth_token: String,",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/BookmarkletGenerator.tsx",
      "const token = config.authToken; await navigator.clipboard.writeText(token);\n",
    );
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      "const bookmarkletConfig = { authToken: 'mock-token' };\n",
    );

    for (const path of [
      "src-tauri/src/commands/bookmarklet.rs",
      "src/components/BookmarkletGenerator.tsx",
      "src/mocks/handlers.ts",
    ]) {
      assert.equal(hasBookmarkletTokenIpcExposure(root, path), true);
    }
  });
});

test("ipc minimization rejects application resume path exposure across renderer IPC", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/commands/automation.rs",
      [
        "pub struct ApplicationProfileResponse {",
        "  pub resume_file_path: Option<String>,",
        "}",
        "let resume_path = profile.resume_file_path.as_ref().map(PathBuf::from);",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ProfileForm.tsx",
      [
        'import { open } from "@tauri-apps/plugin-dialog";',
        "setResumeFilePath(data.resumeFilePath);",
        "const input = { resume_file_path: selectedResumeFilePath };",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      "const applicationProfile = { resume_file_path: '<local-private-resume>' };\n",
    );

    for (const path of [
      "src-tauri/src/commands/automation.rs",
      "src/features/application-assist/ProfileForm.tsx",
      "src/mocks/handlers.ts",
    ]) {
      assert.equal(hasApplicationProfileResumePathExposure(root, path), true);
    }
  });
});

test("ipc minimization rejects automatic resume uploads from Application Assist", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/commands/automation.rs",
      [
        "let resume_path = trusted_application_resume_path(profile.resume_file_path.as_deref(), dir)?;",
        "let filler = FormFiller::new(profile, resume_path).with_screening_answers(screening_answers);",
        "",
      ].join("\n"),
    );

    assert.equal(
      hasApplicationAssistAutomaticResumeUpload(
        root,
        "src-tauri/src/commands/automation.rs",
      ),
      true,
    );
    assert.equal(
      hasApplicationAssistAutomaticResumeUpload(
        root,
        "src-tauri/src/commands/jobs.rs",
      ),
      false,
    );
  });
});

test("ipc minimization rejects Application Assist profile load before target trust check", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/commands/automation.rs",
      [
        "pub async fn fill_application_form(job_url: String) -> Result<(), String> {",
        "  let profile_manager = ProfileManager::new(state.database.pool().clone());",
        "  let (job_url, platform) = prepare_form_target(&job_url)?;",
        "  Ok(())",
        "}",
        "",
      ].join("\n"),
    );

    assert.equal(
      hasApplicationAssistUntrustedFormTarget(
        root,
        "src-tauri/src/commands/automation.rs",
      ),
      true,
    );

    writeFixtureFile(
      root,
      "src-tauri/src/commands/automation.rs",
      [
        "pub async fn fill_application_form(job_url: String) -> Result<(), String> {",
        "  let (job_url, platform) = prepare_form_target_for_fill(&job_url).await?;",
        "  let profile_manager = ProfileManager::new(state.database.pool().clone());",
        "  Ok(())",
        "}",
        "",
      ].join("\n"),
    );

    assert.equal(
      hasApplicationAssistUntrustedFormTarget(
        root,
        "src-tauri/src/commands/automation.rs",
      ),
      false,
    );
  });
});

test("ipc minimization rejects automation screenshot path IPC", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/commands/automation.rs",
      [
        "pub struct AttemptResponse {",
        "  pub screenshot_path: Option<String>,",
        "  pub confirmation_screenshot_path: Option<String>,",
        "}",
        "let response = AttemptResponse { screenshot_path: a.screenshot_path };",
        "",
      ].join("\n"),
    );

    assert.equal(
      hasAutomationScreenshotPathIpcExposure(
        root,
        "src-tauri/src/commands/automation.rs",
      ),
      true,
    );
  });
});

test("ipc minimization rejects raw screening answer history IPC", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/commands/automation.rs",
      [
        "pub struct AnswerStatisticsResponse {",
        "  pub pattern: String,",
        "  pub answer: String,",
        "}",
        "pub struct ModificationExampleResponse {",
        "  pub original_answer: String,",
        "  pub modified_to: String,",
        "  pub question_text: String,",
        "}",
        "pub enum AnswerSourceResponse {",
        "  Manual { pattern: String, answer_id: i64 },",
        "  Historical { original_question: String },",
        "}",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ScreeningAnswerSuggestions.tsx",
      "type AnswerSource = { type: 'historical'; originalQuestion: string } | { type: 'manual'; pattern: string };\n",
    );
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      "const suggestion = { source: { type: 'historical', originalQuestion: 'What salary?' } };\n",
    );

    assert.equal(
      hasRawAnswerHistoryIpcExposure(
        root,
        "src-tauri/src/commands/automation.rs",
      ),
      true,
    );
    assert.equal(
      hasRawAnswerHistoryIpcExposure(
        root,
        "src/features/application-assist/ScreeningAnswerSuggestions.tsx",
      ),
      true,
    );
    assert.equal(
      hasRawAnswerHistoryIpcExposure(root, "src/mocks/handlers.ts"),
      true,
    );
  });
});

test("ipc minimization rejects renderer answer-history management calls", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/application-assist/ScreeningAnswerSuggestions.tsx",
      'await invoke("get_answer_statistics", { pattern });\nawait invoke("clear_answer_history");\n',
    );
    writeFixtureFile(
      root,
      "src/features/application-assist/ScreeningAnswerSuggestions.test.tsx",
      'expect(command).toBe("get_answer_statistics");\n',
    );

    assert.equal(
      hasAnswerHistoryRendererInvoke(
        root,
        "src/features/application-assist/ScreeningAnswerSuggestions.tsx",
      ),
      true,
    );
    assert.equal(
      hasAnswerHistoryRendererInvoke(
        root,
        "src/features/application-assist/ScreeningAnswerSuggestions.test.tsx",
      ),
      false,
    );
  });
});
