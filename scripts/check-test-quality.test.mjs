import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkTestQuality } from "./check-test-quality.mjs";

function writeFixtureFile(root, path, content) {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-test-quality-"));

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkTestQuality rejects no-op Rust assertions", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src-tauri/src/core/browser.rs",
      `
#[cfg(test)]
mod tests {
    #[test]
    fn creates_browser() {
        assert!(true, "browser created");
    }
}
`,
    );

    const violations = checkTestQuality(root);

    assert.deepEqual(violations, [
      "src-tauri/src/core/browser.rs:6 contains no-op true assertion",
    ]);
  });
});

test("checkTestQuality rejects temporarily disabled test blocks", () => {
  withFixture((root) => {
    const disabledMarker = "TEMPORARILY " + "DISABLED";
    const noCommitMarker = "NO" + "COMMIT";
    const reenableMarker = "Re-enable after " + "implementing";
    writeFixtureFile(
      root,
      "src-tauri/src/core/scoring/mod.rs",
      `
#[cfg(test)]
mod tests {
    // ${disabledMarker} - these tests depend on old behavior
    /* // ${noCommitMarker}: ${reenableMarker} company matching
    #[test]
    fn skipped_behavior() {}
    */
}
`,
    );

    const violations = checkTestQuality(root);

    assert.deepEqual(violations, [
      "src-tauri/src/core/scoring/mod.rs:4 contains temporarily disabled test block",
      "src-tauri/src/core/scoring/mod.rs:5 contains temporarily disabled test block",
    ]);
  });
});
