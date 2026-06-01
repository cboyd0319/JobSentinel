import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasContradictoryPlansIndexReleaseStatus,
  hasDuplicateDocsScreenshotCapture,
  hasUnreferencedDocsImage,
  isJobSentinelProject,
} from "./harness/checks/repo-integrity.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-integrity-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function trackFixtureFiles(root, paths) {
  execFileSync("git", ["add", ...paths], { cwd: root });
}

test("repo integrity detects the JobSentinel package manifest", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", '{"name":"jobsentinel"}\n');

    assert.equal(isJobSentinelProject(root), true);
  });
});

test("repo integrity rejects unreferenced docs images and accepts active references", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "docs/images/used.png", "");
    writeFixtureFile(root, "docs/images/unused.png", "");
    writeFixtureFile(root, "README.md", "![Used](docs/images/used.png)\n");
    writeFixtureFile(root, "docs/releases/v2.0.md", "![Ignored](../images/unused.png)\n");
    trackFixtureFiles(root, [
      "docs/images/used.png",
      "docs/images/unused.png",
      "README.md",
      "docs/releases/v2.0.md",
    ]);

    assert.equal(hasUnreferencedDocsImage(root, "docs/images/used.png"), false);
    assert.equal(hasUnreferencedDocsImage(root, "docs/images/unused.png"), true);
    assert.equal(hasUnreferencedDocsImage(root, "docs/images/logo.svg"), false);
  });
});

test("repo integrity rejects duplicate screenshot capture targets", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "tests/e2e/playwright/screenshots.spec.ts",
      [
        'await page.screenshot({ path: screenshotPath(testInfo, "dashboard.png") });',
        'await page.screenshot({ path: screenshotPath(testInfo, "dashboard.png") });',
        "",
      ].join("\n"),
    );

    assert.equal(
      hasDuplicateDocsScreenshotCapture(root, "tests/e2e/playwright/screenshots.spec.ts"),
      true,
    );
  });
});

test("repo integrity rejects contradictory plans index release status", () => {
  withGitFixture((root) => {
    writeFixtureFile(
      root,
      "docs/plans/README.md",
      [
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
      ].join("\n"),
    );

    assert.equal(
      hasContradictoryPlansIndexReleaseStatus(root, "docs/plans/README.md"),
      true,
    );
  });
});
