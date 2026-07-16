import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../../checks/repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(
    join(tmpdir(), "jobsentinel-repo-bloat-feedback-mocks-"),
  );

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects stale user-data mock handlers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/dev-runtime/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'get_search_history':",
        "      return [];",
        "    case 'list_saved_searches':",
        "      return [];",
        "    case 'save_search':",
        "      return {};",
        "    case 'delete_saved_search':",
        "      return undefined;",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/dev-runtime/mocks/handlers.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync user-data mock command handlers: src/dev-runtime/mocks/handlers.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale deep-link mock handlers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/dev-runtime/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'get_supported_sites':",
        "      return [];",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/dev-runtime/mocks/handlers.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync deep-link mock command handlers: src/dev-runtime/mocks/handlers.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale job-import mock handlers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/dev-runtime/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'preview_job_import':",
        "      return {};",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/dev-runtime/mocks/handlers.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync job-import mock command handlers: src/dev-runtime/mocks/handlers.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects job-import mocks returning full jobs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/dev-runtime/features/dashboard/jobImportCommands.ts",
      [
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
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/dev-runtime/features/dashboard/jobImportCommands.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync job-import mock command handlers: src/dev-runtime/features/dashboard/jobImportCommands.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat accepts job-import mocks returning only job id", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/dev-runtime/features/dashboard/jobImportCommands.ts",
      [
        "function importMockJobFromUrl(command) {",
        "  const job = { id: 1, title: 'Care Coordinator' };",
        "  switch (command) {",
        "    case 'preview_job_import':",
        "      return {};",
        "    case 'confirm_job_import':",
        "      return { value: { jobId: job.id } };",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/dev-runtime/features/dashboard/jobImportCommands.ts",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      !violations.includes(
        "sync job-import mock command handlers: src/dev-runtime/features/dashboard/jobImportCommands.ts",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale feedback mock handlers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/dev-runtime/mocks/handlers.ts",
      [
        "export async function mockInvoke(cmd) {",
        "  switch (cmd) {",
        "    case 'generate_feedback_report':",
        "      return '';",
        "    default:",
        "      return undefined;",
        "  }",
        "}",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src/dev-runtime/mocks/handlers.ts"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync feedback mock command handlers: src/dev-runtime/mocks/handlers.ts",
      ),
      violations.join("\n"),
    );
  });
});
