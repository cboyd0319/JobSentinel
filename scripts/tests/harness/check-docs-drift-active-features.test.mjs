import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasActiveUserDocGlyphMarkers,
  hasConfusingApplicationTrackingAtsLabel,
  hasNotificationsDocGlyphMarkers,
  hasSmartScoringDocGlyphMarkers,
  hasStaleApplicationTrackingDocClaims,
  hasStaleSmartScoringSalaryMarkerClaim,
  hasSynonymOrRemotePreferenceDocDrift,
} from "../../harness/checks/docs-drift.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-docs-drift-features-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("docs drift check rejects active feature labels and stale claims", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "docs/features/application-tracking.md",
      "Application Tracking System (ATS)\nPhase 2 (Future)\n",
    );
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      "Predicted salaries are marked with a $ icon. ✓\n",
    );
    writeFixtureFile(root, "docs/features/notifications.md", "provider → channel\n");
    writeFixtureFile(root, "docs/features/user-data-management.md", "data ├─ saved\n");
    writeFixtureFile(root, "docs/features/synonym-matching.md", "Custom Synonyms (v2.1+)\n");

    assert.equal(
      hasStaleApplicationTrackingDocClaims(root, "docs/features/application-tracking.md"),
      true,
    );
    assert.equal(
      hasConfusingApplicationTrackingAtsLabel(root, "docs/features/application-tracking.md"),
      true,
    );
    assert.equal(hasStaleSmartScoringSalaryMarkerClaim(root, "docs/features/smart-scoring.md"), true);
    assert.equal(hasSmartScoringDocGlyphMarkers(root, "docs/features/smart-scoring.md"), true);
    assert.equal(hasNotificationsDocGlyphMarkers(root, "docs/features/notifications.md"), true);
    assert.equal(
      hasActiveUserDocGlyphMarkers(root, "docs/features/user-data-management.md"),
      true,
    );
    assert.equal(
      hasSynonymOrRemotePreferenceDocDrift(root, "docs/features/synonym-matching.md"),
      true,
    );
  });
});
