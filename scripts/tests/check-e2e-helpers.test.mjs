import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { hasUnreferencedE2eTestHelper } from "../harness/checks/e2e-helpers.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-e2e-helpers-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("E2E helper ownership detects unreferenced helper files", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "tests/e2e/playwright/test-helpers.ts", "export const helper = 1;\n");
    writeFixtureFile(root, "tests/e2e/playwright/app.spec.ts", "import { test } from '@playwright/test';\n");
    execFileSync(
      "git",
      ["add", "tests/e2e/playwright/test-helpers.ts", "tests/e2e/playwright/app.spec.ts"],
      { cwd: root },
    );

    assert.equal(
      hasUnreferencedE2eTestHelper(root, "tests/e2e/playwright/test-helpers.ts"),
      true,
    );
  });
});

test("E2E helper ownership accepts active helper imports", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "tests/e2e/playwright/test-helpers.ts", "export const helper = 1;\n");
    writeFixtureFile(
      root,
      "tests/e2e/playwright/app.spec.ts",
      "import { helper } from './test-helpers';\n",
    );
    execFileSync(
      "git",
      ["add", "tests/e2e/playwright/test-helpers.ts", "tests/e2e/playwright/app.spec.ts"],
      { cwd: root },
    );

    assert.equal(
      hasUnreferencedE2eTestHelper(root, "tests/e2e/playwright/test-helpers.ts"),
      false,
    );
  });
});
