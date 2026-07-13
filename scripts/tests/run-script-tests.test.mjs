import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { discoverScriptTests } from "../harness/run-script-tests.mjs";

test("script test discovery is recursive and deterministic", () => {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-script-tests-"));
  try {
    mkdirSync(join(root, "z-family"));
    mkdirSync(join(root, "a-family", "nested"), { recursive: true });
    writeFileSync(join(root, "z-family", "z.test.mjs"), "");
    writeFileSync(join(root, "a-family", "nested", "b.test.mjs"), "");
    writeFileSync(join(root, "a-family", "a.test.mjs"), "");
    writeFileSync(join(root, "ignored.mjs"), "");

    assert.deepEqual(discoverScriptTests(root), [
      join(root, "a-family", "a.test.mjs"),
      join(root, "a-family", "nested", "b.test.mjs"),
      join(root, "z-family", "z.test.mjs"),
    ]);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});
