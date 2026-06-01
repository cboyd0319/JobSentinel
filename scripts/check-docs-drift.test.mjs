import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  collectMissingGrantFacingDocs,
  hasDocsReadmeReleaseLogShape,
  hasFrontDoorDocEmojiMarkers,
  hasOverbroadLocalStorageMigrationClaim,
  hasQuickStartEmojiMarkers,
  hasSpeculativeCloudDeploymentDoc,
  hasStaleHardcodedMigrationCount,
  hasStaleInformalMaintainerFooter,
} from "./harness/checks/docs-drift.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-docs-drift-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("docs drift check lists missing grant-facing docs", () => {
  withFixture((root) => {
    writeFixtureFile(root, "PRIVACY.md", "# Privacy\n");
    writeFixtureFile(root, "RESPONSIBLE_AI.md", "# Responsible AI\n");

    const missingDocs = collectMissingGrantFacingDocs(root);

    assert.ok(missingDocs.includes("ROADMAP.md"), missingDocs.join("\n"));
    assert.ok(
      missingDocs.includes("docs/research/pay-equity.md"),
      missingDocs.join("\n"),
    );
    assert.ok(!missingDocs.includes("PRIVACY.md"), missingDocs.join("\n"));
  });
});

test("docs drift check rejects speculative cloud deployment docs", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      "Cloud Architecture (not implemented)\n",
    );

    assert.equal(
      hasSpeculativeCloudDeploymentDoc(root, "docs/developer/ARCHITECTURE.md"),
      true,
    );
    assert.equal(hasSpeculativeCloudDeploymentDoc(root, "docs/README.md"), false);
  });
});

test("docs drift check rejects stale front-door doc shapes", () => {
  withFixture((root) => {
    writeFixtureFile(root, "README.md", `${String.fromCodePoint(0x2705)} ready\n`);
    writeFixtureFile(root, "docs/README.md", "### What's New in v2.7\n");

    assert.equal(hasFrontDoorDocEmojiMarkers(root, "README.md"), true);
    assert.equal(hasDocsReadmeReleaseLogShape(root, "docs/README.md"), true);
  });
});

test("docs drift check rejects stale user-facing markers", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      `${String.fromCodePoint(0x1f680)} Launch JobSentinel\n`,
    );
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      "Backend persistence for all user data (localStorage -> SQLite)\n",
    );

    assert.equal(hasQuickStartEmojiMarkers(root, "docs/user/QUICK_START.md"), true);
    assert.equal(hasOverbroadLocalStorageMigrationClaim(root, "docs/ROADMAP.md"), true);
  });
});

test("docs drift check rejects stale maintainer and migration claims", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/notes.md", "Maintained By**: The Rust Mac Overlord\n");
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      "Project currently has 42 SQLite migrations.\n",
    );

    assert.equal(hasStaleInformalMaintainerFooter(root, "docs/notes.md"), true);
    assert.equal(
      hasStaleHardcodedMigrationCount(root, "docs/developer/GETTING_STARTED.md"),
      true,
    );
  });
});
