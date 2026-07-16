import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  compareReleaseVersions,
  normalizeReleaseVersion,
  readReleaseVersions,
} from "../../release/validate-release-version.mjs";

function makeReleaseFixture(version) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-release-version-"));
  mkdirSync(join(root, "src-tauri"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ version }));
  writeFileSync(
    join(root, "package-lock.json"),
    JSON.stringify({ version, packages: { "": { version } } }),
  );
  writeFileSync(
    join(root, "src-tauri/tauri.conf.json"),
    JSON.stringify({ version }),
  );
  writeFileSync(
    join(root, "Cargo.toml"),
    `[workspace.package]\nversion = "${version}"\n[workspace.dependencies]\njobsentinel-domain = { path = "crates/jobsentinel-domain", version = "=${version}" }\n`,
  );
  writeFileSync(
    join(root, "Cargo.lock"),
    `[[package]]\nname = "jobsentinel"\nversion = "${version}"\n\n[[package]]\nname = "jobsentinel-domain"\nversion = "${version}"\n`,
  );
  return root;
}

test("normalizeReleaseVersion accepts tags and plain versions", () => {
  assert.equal(normalizeReleaseVersion("v2.6.4"), "2.6.4");
  assert.equal(normalizeReleaseVersion("refs/tags/v2.6.4"), "2.6.4");
  assert.equal(normalizeReleaseVersion("2.6.4"), "2.6.4");
});

test("readReleaseVersions reads the complete version contract", () => {
  const root = makeReleaseFixture("2.6.4");

  assert.deepEqual(readReleaseVersions(root), {
    "package.json": "2.6.4",
    "package-lock.json": "2.6.4",
    "package-lock.json root package": "2.6.4",
    "src-tauri/tauri.conf.json": "2.6.4",
    "Cargo.toml": "2.6.4",
    "Cargo.toml jobsentinel-domain dependency": "2.6.4",
    "Cargo.lock jobsentinel": "2.6.4",
    "Cargo.lock jobsentinel-domain": "2.6.4",
  });
});

test("compareReleaseVersions passes when all metadata matches", () => {
  const result = compareReleaseVersions("v2.6.4", {
    "package.json": "2.6.4",
    "src-tauri/tauri.conf.json": "2.6.4",
    "Cargo.toml": "2.6.4",
  });

  assert.equal(result.expected, "2.6.4");
  assert.deepEqual(result.failures, []);
});

test("compareReleaseVersions reports mismatched metadata", () => {
  const result = compareReleaseVersions("2.6.4", {
    "package.json": "2.6.5",
    "src-tauri/tauri.conf.json": "2.6.4",
    "Cargo.toml": undefined,
  });

  assert.deepEqual(result.failures, [
    "package.json has 2.6.5; expected 2.6.4",
    "Cargo.toml is missing a version",
  ]);
});
