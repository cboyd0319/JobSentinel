import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  collectFilesystemBloat,
  collectUnexpectedRootEntries,
  isTrackedBloat,
  listTrackedFiles,
  normalizeRepoPath,
} from "./harness/checks/repo-artifacts.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-artifacts-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("normalizeRepoPath converts Windows-style paths", () => {
  assert.equal(normalizeRepoPath("src\\components\\Settings.tsx"), "src/components/Settings.tsx");
});

test("artifact checks reject unexpected root entries and local artifacts", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "README.md", "# JobSentinel\n");
    writeFixtureFile(root, "scratch.log", "local log\n");
    writeFixtureFile(root, "dist/bundle.js", "generated\n");
    mkdirSync(join(root, "src/unused"), { recursive: true });

    assert.deepEqual(collectUnexpectedRootEntries(root).sort(), [
      "dist is not in the root allowlist",
      "scratch.log is not in the root allowlist",
    ]);

    assert.deepEqual(collectFilesystemBloat(root).sort(), [
      "dist/ is a disposable local artifact",
      "scratch.log is a disposable local artifact",
      "src/unused/ is an empty local directory",
    ]);
  });
});

test("tracked artifact checks preserve allowed generated schemas", () => {
  assert.equal(isTrackedBloat("src-tauri/gen/schemas/capabilities.json"), false);
  assert.equal(isTrackedBloat("src-tauri/gen/temporary-output.json"), true);
  assert.equal(isTrackedBloat("src/components/settings/README.md"), true);
  assert.equal(isTrackedBloat("IMPLEMENTATION_REPORT.md"), true);
});

test("listTrackedFiles returns normalized existing tracked files only", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "src/app.js", "export {};\n");
    writeFixtureFile(root, "src/deleted.js", "export {};\n");
    execFileSync("git", ["add", "package.json", "src/app.js", "src/deleted.js"], {
      cwd: root,
    });
    rmSync(join(root, "src/deleted.js"));

    assert.deepEqual(listTrackedFiles(root), ["package.json", "src/app.js"]);
  });
});
