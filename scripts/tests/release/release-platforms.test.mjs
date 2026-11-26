// Verifies the release platform declaration contract and its agreement with the release workflow matrix.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildReleasePlatformDeclaration,
  releasePlatformSelections,
  validateReleasePlatformDeclaration,
} from "../../release/release-platforms.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const base = { version: "3.0.0", tag: "v3.0.0", sourceRevision: "a".repeat(40) };

test("declaration hosted platforms match every release workflow matrix selection", () => {
  const workflow = readFileSync(resolve(repoRoot, ".github/workflows/release.yml"), "utf8");
  const cases = [...workflow.matchAll(/^ {12}([a-z-]+)\)\n {14}matrix='(\[.*\])'$/gm)];
  assert.deepEqual(cases.map(([, selection]) => selection).sort(), Object.keys(releasePlatformSelections).sort());
  for (const [, selection, matrix] of cases) {
    const hosted = Object.entries(releasePlatformSelections[selection])
      .filter(([, source]) => source === "hosted")
      .map(([platform]) => platform);
    assert.deepEqual(JSON.parse(matrix).map((entry) => entry.platform_key), hosted, selection);
  }
});

test("declaration validation accepts its own build and returns ordered platforms", () => {
  const declaration = buildReleasePlatformDeclaration({ ...base, selection: "windows-linux" });
  assert.deepEqual(validateReleasePlatformDeclaration(declaration, { ...base, selection: "windows-linux" }), {
    platforms: ["windows", "macos", "linux"],
    sources: { windows: "hosted", macos: "local", linux: "hosted" },
  });
});

test("declaration validation fails closed on tampering and mismatches", () => {
  const valid = buildReleasePlatformDeclaration({ ...base, selection: "linux" });
  const cases = [
    [{ ...valid, platforms: { linux: "hosted", windows: "hosted" } }, /platforms do not match selection linux/],
    [{ ...valid, selection: "everything" }, /unsupported selection everything/],
    [{ ...valid, version: "2.9.5" }, /version expected 3\.0\.0/],
    [{ ...valid, tag: "v2.9.5" }, /tag expected v3\.0\.0/],
    [{ ...valid, sourceRevision: "HEAD" }, /sourceRevision expected a{40}/],
    [{ ...valid, schemaVersion: 2 }, /schemaVersion 1/],
    [{ ...valid, extra: true }, /unexpected fields: extra/],
    [null, /must be a JSON object/],
  ];
  for (const [declaration, message] of cases) {
    assert.throws(() => validateReleasePlatformDeclaration(declaration, base), message);
  }
  assert.throws(
    () => validateReleasePlatformDeclaration(valid, { ...base, selection: "all" }),
    /selection expected all, found linux/,
  );
  assert.throws(
    () => validateReleasePlatformDeclaration(valid, { ...base, requestedPlatforms: ["linux", "macos"] }),
    /does not match declared platforms linux/,
  );
  assert.throws(() => buildReleasePlatformDeclaration({ ...base, selection: "bsd" }), /unsupported selection bsd/);
});
