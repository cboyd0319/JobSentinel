import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasFrontDoorMacosInstallerOverpromise,
  hasFrontDoorReleaseVersionPromise,
  hasSourceReleaseVersionPromise,
} from "./harness/checks/release-promises.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-release-promises-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("release promises reject front-door version promises", () => {
  withFixture((root) => {
    writeFixtureFile(root, "README.md", "### Planned for v2.7\n\nTracked for v2.7.\n");

    assert.equal(hasFrontDoorReleaseVersionPromise(root, "README.md"), true);
    assert.equal(hasFrontDoorReleaseVersionPromise(root, "docs/README.md"), false);
  });
});

test("release promises reject front-door macOS installer overpromises", () => {
  withFixture((root) => {
    writeFixtureFile(root, "README.md", "Current release includes Windows, macOS, and Linux installers.\n");

    assert.equal(hasFrontDoorMacosInstallerOverpromise(root, "README.md"), true);
    assert.equal(hasFrontDoorMacosInstallerOverpromise(root, "docs/README.md"), false);

    writeFixtureFile(
      root,
      "README.md",
      "Current release includes Windows and Linux installers plus a universal macOS package that is not notarized yet.\n",
    );

    assert.equal(hasFrontDoorMacosInstallerOverpromise(root, "README.md"), false);
  });
});

test("release promises reject runtime source version promises", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/pages/ResumeBuilder.tsx", 'const copy = "Coming in v2.7";\n');
    writeFixtureFile(root, "src/pages/ResumeBuilder.test.tsx", 'const copy = "Coming in v2.7";\n');

    assert.equal(hasSourceReleaseVersionPromise(root, "src/pages/ResumeBuilder.tsx"), true);
    assert.equal(hasSourceReleaseVersionPromise(root, "src/pages/ResumeBuilder.test.tsx"), false);
  });
});
