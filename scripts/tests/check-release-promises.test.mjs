import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasFrontDoorMacosDistributionOverpromise,
  hasFrontDoorMacosInstallerOverpromise,
  hasFrontDoorLegacyMacosVerifierOverclaim,
  hasFrontDoorReleaseVersionPromise,
  hasFrontDoorWindowsLinuxReleaseOverpromise,
  hasSourceReleaseVersionPromise,
} from "../harness/checks/release-promises.mjs";

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

test("release promises reject front-door macOS distribution overpromises", () => {
  withFixture((root) => {
    writeFixtureFile(root, "README.md", "The macOS package is notarized and Gatekeeper-ready.\n");

    assert.equal(hasFrontDoorMacosDistributionOverpromise(root, "README.md"), true);
    assert.equal(hasFrontDoorMacosDistributionOverpromise(root, "docs/README.md"), false);

    writeFixtureFile(
      root,
      "README.md",
      "The macOS package is not Developer ID signed or notarized yet.\n",
    );

    assert.equal(hasFrontDoorMacosDistributionOverpromise(root, "README.md"), false);
  });
});

test("release promises reject runtime source version promises", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/features/resumes/builder/ResumeBuilderPage.tsx", 'const copy = "Coming in v2.7";\n');
    writeFixtureFile(root, "src/features/resumes/builder/ResumeBuilderPage.test.tsx", 'const copy = "Coming in v2.7";\n');

    assert.equal(hasSourceReleaseVersionPromise(root, "src/features/resumes/builder/ResumeBuilderPage.tsx"), true);
    assert.equal(hasSourceReleaseVersionPromise(root, "src/features/resumes/builder/ResumeBuilderPage.test.tsx"), false);
  });
});

test("release promises reject Windows and Linux claims for unreleased source version", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      [
        "| Source version | `2.7.7` in `main` |",
        "| Latest full cross-platform release | `v2.7.5` |",
        "Windows and Linux 2.7.7 installers are production ready.",
      ].join("\n"),
    );

    assert.equal(hasFrontDoorWindowsLinuxReleaseOverpromise(root, "README.md"), true);

    writeFixtureFile(
      root,
      "README.md",
      [
        "| Source version | `2.7.7` in `main` |",
        "| Latest full cross-platform release | `v2.7.5` |",
        "Windows and Linux 2.7.7 assets are still pending target-platform verification.",
      ].join("\n"),
    );

    assert.equal(hasFrontDoorWindowsLinuxReleaseOverpromise(root, "README.md"), false);
  });
});

test("release promises reject legacy macOS current-verifier overclaims", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      [
        "The public no-account macOS package for `v2.7.7` has a universal DMG,",
        "matching `.sha256` checksum, public release verifier, install smoke,",
        "launch smoke, and private isolated local-data smoke.",
      ].join("\n"),
    );

    assert.equal(hasFrontDoorLegacyMacosVerifierOverclaim(root, "README.md"), true);
    assert.equal(hasFrontDoorLegacyMacosVerifierOverclaim(root, "docs/README.md"), false);

    writeFixtureFile(
      root,
      "README.md",
      [
        "The published `v2.7.7` macOS package is a legacy fallback that predates",
        "the current public release verifier and isolated local-data smoke.",
      ].join("\n"),
    );

    assert.equal(hasFrontDoorLegacyMacosVerifierOverclaim(root, "README.md"), false);
  });
});
