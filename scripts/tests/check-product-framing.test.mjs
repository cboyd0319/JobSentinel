import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasForbiddenJobSearchFraming,
  hasMissingFreeForeverEthos,
  hasMissingReadmeProductDefinition,
} from "../harness/checks/product-framing.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-product-framing-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("product framing requires the grant-facing README definition", () => {
  withFixture((root) => {
    writeFixtureFile(root, "README.md", "# JobSentinel\n\nLocal job search app.\n");

    assert.equal(hasMissingReadmeProductDefinition(root, "README.md"), true);
  });
});

test("product framing requires free-forever MIT wording in maintained docs", () => {
  withFixture((root) => {
    writeFixtureFile(root, "README.md", "# JobSentinel\n");
    writeFixtureFile(
      root,
      "docs/harness/README.md",
      "JobSentinel is free, will always stay free, and will always remain MIT licensed.\n",
    );
    writeFixtureFile(root, "docs/user/QUICK_START.md", "# Quick Start\n");

    assert.equal(hasMissingFreeForeverEthos(root, "README.md"), true);
    assert.equal(hasMissingFreeForeverEthos(root, "docs/harness/README.md"), true);
    assert.equal(hasMissingFreeForeverEthos(root, "docs/user/QUICK_START.md"), true);
  });
});

test("product framing blocks banned job-search phrases in text files", () => {
  withFixture((root) => {
    const bannedText = [
      ["Mass", "apply"].join(" "),
      ["beat", "the", "algorithm"].join(" "),
    ].join(" to ");
    const lockfileText = ["mass", "apply"].join(" ");

    writeFixtureFile(root, "docs/features/application-positioning.md", `${bannedText}.\n`);
    writeFixtureFile(root, "package-lock.json", `${lockfileText}\n`);

    assert.equal(
      hasForbiddenJobSearchFraming(root, "docs/features/application-positioning.md"),
      true,
    );
    assert.equal(hasForbiddenJobSearchFraming(root, "package-lock.json"), false);
  });
});
