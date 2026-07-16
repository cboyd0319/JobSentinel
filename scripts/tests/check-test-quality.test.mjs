import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkTestQuality } from "../check-test-quality.mjs";

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
      "crates/jobsentinel-assistance/src/automation/browser.rs",
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
      "crates/jobsentinel-assistance/src/automation/browser.rs:6 contains no-op true assertion",
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
      "crates/jobsentinel-application/src/scoring/mod.rs",
      `
#[cfg(test)]
mod tests {
    // ${disabledMarker} - these tests depend on old behavior
    /* // ${noCommitMarker}: ${reenableMarker} company matching
    #[test]
    fn skipped_behavior() {
        assert!(false);
    }
    */
}
`,
    );

    const violations = checkTestQuality(root);

    assert.deepEqual(violations, [
      "crates/jobsentinel-application/src/scoring/mod.rs:4 contains temporarily disabled test block",
      "crates/jobsentinel-application/src/scoring/mod.rs:5 contains temporarily disabled test block",
    ]);
  });
});

test("checkTestQuality rejects skipped test blocks", () => {
  withFixture((root) => {
    const skippedCall = "test" + ".skip";
    const noOpAssertion = "expect(" + "true).toBe(true);";
    writeFixtureFile(
      root,
      "src/components/Widget.test.tsx",
      `
import { test } from "vitest";

${skippedCall}("renders widget", () => {
  ${noOpAssertion}
});
`,
    );

    const violations = checkTestQuality(root);

    assert.deepEqual(violations, [
      "src/components/Widget.test.tsx:4 contains skipped unit test",
      "src/components/Widget.test.tsx:5 contains no-op true assertion",
    ]);
  });
});

test("checkTestQuality rejects empty JavaScript test bodies", () => {
  withFixture((root) => {
    const emptyBody = "{" + "}";
    writeFixtureFile(
      root,
      "scripts/empty-widget.test.mjs",
      `
import test from "node:test";

test("does nothing", () => ${emptyBody});
`,
    );

    const violations = checkTestQuality(root);

    assert.deepEqual(violations, [
      "scripts/empty-widget.test.mjs:4 contains empty test body",
    ]);
  });
});

test("checkTestQuality rejects empty Rust test bodies", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-domain/src/empty_test.rs",
      `
#[cfg(test)]
mod tests {
    #[test]
    fn does_nothing() {}
}
`,
    );

    const violations = checkTestQuality(root);

    assert.deepEqual(violations, [
      "crates/jobsentinel-domain/src/empty_test.rs:4 contains empty test body",
    ]);
  });
});

test("checkTestQuality scans Rust tests under workspace crates", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "crates/jobsentinel-domain/src/search/tests.rs",
      `
#[test]
fn search_contract() {
    assert!(true, "search works");
}
`,
    );

    const violations = checkTestQuality(root);

    assert.deepEqual(violations, [
      "crates/jobsentinel-domain/src/search/tests.rs:4 contains no-op true assertion",
    ]);
  });
});
