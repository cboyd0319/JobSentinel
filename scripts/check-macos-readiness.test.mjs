import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  assertMacosReadinessDocsMatch,
  formatMacosReadinessReport,
  noAccountCompletionPercentage,
  readMacosDevelopmentReadinessClaims,
  readReadmeMacosReadinessPercent,
} from "./check-macos-readiness.mjs";

test("macOS readiness report separates public and no-account completion", () => {
  const report = {
    criteria: [],
    externalBlockers: [
      {
        detail: "Needed for public signing.",
        id: "Apple Developer Program account and Developer ID certificate",
        ok: false,
        points: 2,
      },
    ],
    noAccountCeiling: 94,
    noAccountScore: 94,
    percentage: 94,
  };

  assert.equal(noAccountCompletionPercentage(report), 100);
  assert.match(formatMacosReadinessReport(report), /macOS full-public readiness: 94%/);
  assert.match(formatMacosReadinessReport(report), /No-account path completion: 100%/);
  assert.match(formatMacosReadinessReport(report), /No-account score: 94\/94/);
});

test("macOS readiness parser reads the README full-public percentage", () => {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-macos-readiness-"));

  try {
    writeFileSync(
      join(root, "README.md"),
      "**Current macOS full-public-readiness: 94%; no-account path completion: 100%.**\n",
    );

    assert.equal(readReadmeMacosReadinessPercent(root), 94);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("macOS development docs separate public and no-account readiness", () => {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-macos-readiness-"));

  try {
    mkdirSync(join(root, "docs/developer"), { recursive: true });
    writeFileSync(
      join(root, "docs/developer/MACOS_DEVELOPMENT.md"),
      "Current macOS full-public-readiness is 94%; no-account path completion is 100%.\n",
    );

    assert.deepEqual(readMacosDevelopmentReadinessClaims(root), {
      fullPublicPercent: 94,
      noAccountCompletionPercent: 100,
      staleNoAccountReleaseReadinessPercent: null,
    });
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("macOS readiness docs guard rejects stale no-account percentage wording", () => {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-macos-readiness-"));
  const report = {
    criteria: [],
    externalBlockers: [],
    noAccountCeiling: 94,
    noAccountScore: 94,
    percentage: 94,
  };

  try {
    mkdirSync(join(root, "docs/developer"), { recursive: true });
    writeFileSync(
      join(root, "README.md"),
      "**Current macOS full-public-readiness: 94%; no-account path completion: 100%.**\n",
    );
    writeFileSync(
      join(root, "docs/developer/MACOS_DEVELOPMENT.md"),
      "Current no-account release-readiness is 94%.\n",
    );

    assert.throws(
      () => assertMacosReadinessDocsMatch(report, root),
      /stale no-account release-readiness wording/,
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});
