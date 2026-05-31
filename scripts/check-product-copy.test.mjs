import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasApplicationAssistAutomationFraming,
  hasEngineerFirstResumeTemplateCopy,
  hasOverconfidentGhostCopy,
  hasOverconfidentPayGuidance,
  hasStaleResumeOptimizerFraming,
} from "./harness/checks/product-copy.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-product-copy-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("product copy rejects stale Resume Optimizer framing", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/features/resume-matcher.md", "ATS Resume Optimizer\n");

    assert.equal(
      hasStaleResumeOptimizerFraming(root, "docs/features/resume-matcher.md"),
      true,
    );
    assert.equal(
      hasStaleResumeOptimizerFraming(root, "docs/features/ghost-detection.md"),
      false,
    );
  });
});

test("product copy rejects engineer-first resume template copy", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/features/resume-builder.md",
      "Technical Skills-First is perfect for engineering roles.\n",
    );

    assert.equal(
      hasEngineerFirstResumeTemplateCopy(root, "docs/features/resume-builder.md"),
      true,
    );
  });
});

test("product copy rejects application automation framing", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/features/one-click-apply.md", "One-Click Apply\n");

    assert.equal(
      hasApplicationAssistAutomationFraming(root, "docs/features/one-click-apply.md"),
      true,
    );
  });
});

test("product copy rejects overconfident ghost-risk copy", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/features/ghost-detection.md", "Likely Ghost\n");

    assert.equal(hasOverconfidentGhostCopy(root, "docs/features/ghost-detection.md"), true);
  });
});

test("product copy rejects overconfident pay guidance", () => {
  withFixture((root) => {
    writeFixtureFile(root, "docs/features/salary-ai.md", "Always negotiate.\n");

    assert.equal(hasOverconfidentPayGuidance(root, "docs/features/salary-ai.md"), true);
  });
});
