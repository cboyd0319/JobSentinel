import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasApplicationProfileResumePathExposure,
  hasBookmarkletTokenIpcExposure,
  hasDashboardFullConfigInvoke,
  hasFullImportedJobReturn,
  hasNonSettingsFullApplicationProfileInvoke,
  hasRawJobImportUrlAfterPreview,
  hasStaleJobImportMockHandlers,
  hasStaleProfilePreviewMock,
} from "./harness/checks/ipc-minimization.mjs";

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
      "src/components/automation/ApplyButton.tsx",
      'safeInvoke("get_application_profile");\n',
    );
    writeFixtureFile(
      root,
      "src/components/automation/ProfileForm.tsx",
      'invoke("get_application_profile");\n',
    );

    assert.equal(
      hasNonSettingsFullApplicationProfileInvoke(
        root,
        "src/components/automation/ApplyButton.tsx",
      ),
      true,
    );
    assert.equal(
      hasNonSettingsFullApplicationProfileInvoke(
        root,
        "src/components/automation/ProfileForm.tsx",
      ),
      false,
    );
  });
});

test("ipc minimization rejects full config calls from Dashboard", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/pages/Dashboard.tsx",
      'cachedInvoke("get_config", undefined, 60000);\n',
    );

    assert.equal(hasDashboardFullConfigInvoke(root, "src/pages/Dashboard.tsx"), true);
    assert.equal(hasDashboardFullConfigInvoke(root, "src/pages/Settings.tsx"), false);
  });
});

test("ipc minimization rejects importing from raw input after preview", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/components/JobImportModal.tsx",
      'await invoke("import_job_from_url", { url: url.trim() });\n',
    );

    assert.equal(
      hasRawJobImportUrlAfterPreview(root, "src/components/JobImportModal.tsx"),
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

    assert.equal(hasStaleJobImportMockHandlers(root, "src/mocks/handlers.ts"), true);
    assert.equal(hasStaleProfilePreviewMock(root, "src/mocks/handlers.ts"), true);
  });
});

test("ipc minimization rejects bookmarklet token exposure across renderer IPC", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/commands/bookmarklet.rs",
      [
        "pub struct BookmarkletConfigResponse {",
        "  #[serde(rename = \"authToken\")]",
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
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/components/automation/ProfileForm.tsx",
      "setResumeFilePath(data.resumeFilePath); const input = { value: resumeFilePath };\n",
    );
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      "const applicationProfile = { resumeFilePath: '/Users/jordan/private/resume.pdf' };\n",
    );

    for (const path of [
      "src-tauri/src/commands/automation.rs",
      "src/components/automation/ProfileForm.tsx",
      "src/mocks/handlers.ts",
    ]) {
      assert.equal(hasApplicationProfileResumePathExposure(root, path), true);
    }
  });
});
