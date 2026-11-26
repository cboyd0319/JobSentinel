// Proves doctor warns, never fails, when the local Vale differs from the release workflow's pinned Vale.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { checkValeVersion, pinnedValeVersion } from "../../dev/vale-version.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function withPin(line, run) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-vale-"));
  try {
    mkdirSync(join(root, ".github/workflows"), { recursive: true });
    writeFileSync(join(root, ".github/workflows/release.yml"), `jobs:\n  prose:\n    env:\n${line}\n`);
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const vale = (output) => (command, args) => {
  assert.deepEqual([command, args], ["vale", ["--version"]]);
  return output;
};

test("the Vale pin is read from the release workflow", () => {
  assert.match(pinnedValeVersion(repoRoot), /^\d+\.\d+\.\d+$/);
  withPin('      VALE_VERSION: "3.15.1"', (root) => assert.equal(pinnedValeVersion(root), "3.15.1"));
});

test("a matching Vale passes and a different, missing or unpinned Vale only warns", () => {
  withPin('      VALE_VERSION: "3.15.1"', (root) => {
    assert.equal(checkValeVersion(root, { execFileSync: vale("vale version 3.15.1\n") }).status, "pass");
    const drift = checkValeVersion(root, { execFileSync: vale("vale version 3.28.1\n") });
    assert.equal(drift.status, "warn");
    assert.match(drift.detail, /vale version 3\.28\.1; the hosted prose lint pins Vale 3\.15\.1/);
    const missing = checkValeVersion(root, { execFileSync: () => { throw new Error("ENOENT"); } });
    assert.deepEqual([missing.status, missing.detail], ["warn", "vale unavailable; the hosted prose lint uses Vale 3.15.1"]);
  });
  withPin("      OTHER: x", (root) => assert.equal(checkValeVersion(root, { execFileSync: vale("vale version 3.15.1") }).status, "warn"));
});
