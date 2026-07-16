import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  cleanGeneratedArtifacts,
  generatedArtifactDirectories,
} from "../../dev/clean-generated-artifacts.mjs";

test("generated artifact cleanup removes only the bounded allowlist", () => {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-clean-artifacts-"));
  try {
    for (const directory of generatedArtifactDirectories) {
      mkdirSync(join(root, directory), { recursive: true });
      writeFileSync(join(root, directory, "artifact.txt"), "generated\n");
    }
    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "src", "keep.ts"), "export {};\n");
    writeFileSync(join(root, "keep.txt"), "keep\n");

    assert.deepEqual(cleanGeneratedArtifacts(root), [...generatedArtifactDirectories]);
    for (const directory of generatedArtifactDirectories) {
      assert.equal(existsSync(join(root, directory)), false);
    }
    assert.equal(existsSync(join(root, "src", "keep.ts")), true);
    assert.equal(existsSync(join(root, "keep.txt")), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
