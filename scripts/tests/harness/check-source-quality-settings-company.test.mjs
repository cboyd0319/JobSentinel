import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasNotificationWebhookSaveWithoutValidation,
  hasRawSalaryCommandLogging,
  hasStaticCompanyRatingFallback,
  hasStaleSettingsPartialSaveMessage,
} from "../../harness/checks/source-quality.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-source-quality-settings-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("source quality rejects unsafe settings saves and raw salary logging", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/settings/SettingsPage.tsx",
      [
        'await storeCredential("discord_webhook", credentials.discord_webhook);',
        'toast.warning("Partially saved", `${failures.length} credential(s) failed to save. Config was saved.`);',
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src-tauri/src/ipc/salary.rs",
      'tracing::info!("Command: get_salary_benchmark (title: {}, location: {})", job_title, location);\n',
    );

    assert.equal(
      hasNotificationWebhookSaveWithoutValidation(
        root,
        "src/features/settings/SettingsPage.tsx",
      ),
      true,
    );
    assert.equal(
      hasStaleSettingsPartialSaveMessage(
        root,
        "src/features/settings/SettingsPage.tsx",
      ),
      true,
    );
    assert.equal(
      hasRawSalaryCommandLogging(root, "src-tauri/src/ipc/salary.rs"),
      true,
    );
  });
});

test("source quality accepts expanded credential validation arguments", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/settings/SettingsPage.tsx",
      [
        "const credentialValidationError = getCredentialValidationError(",
        "  credentials,",
        "  config,",
        "  credentialStatus,",
        ");",
        'await storeCredential("discord_webhook", credentials.discord_webhook);',
        "",
      ].join("\n"),
    );

    assert.equal(
      hasNotificationWebhookSaveWithoutValidation(
        root,
        "src/features/settings/SettingsPage.tsx",
      ),
      false,
    );
  });
});

test("source quality rejects static company fallback ratings", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/company-research/internal/directory/digitalEmployers.ts",
      [
        "const KNOWN_COMPANIES = {",
        "  example: {",
        '    industry: "Healthcare",',
        "    glassdoorRating: 4.7,",
        "  },",
        "};",
        "",
        "async function fetchCompanyInfo(companyName) { return companyName; }",
        "",
      ].join("\n"),
    );

    assert.equal(
      hasStaticCompanyRatingFallback(
        root,
        "src/features/company-research/internal/directory/digitalEmployers.ts",
      ),
      true,
    );
  });
});
