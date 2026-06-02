import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import {
  buildTauriArgs,
  getArchSuffix,
  getMacBuildPaths,
  getReleaseDir,
  hasArg,
} from "./build-macos-dmg.mjs";

test("macOS DMG builder defaults to app bundle builds", () => {
  assert.deepEqual(buildTauriArgs([]), ["build", "--bundles", "app"]);
  assert.deepEqual(buildTauriArgs(["--target", "universal-apple-darwin"]), [
    "build",
    "--target",
    "universal-apple-darwin",
    "--bundles",
    "app",
  ]);
});

test("macOS DMG builder preserves explicit bundle args", () => {
  assert.equal(hasArg(["build", "--bundles", "app"], "--bundles"), true);
  assert.deepEqual(buildTauriArgs(["--bundles", "app"]), ["build", "--bundles", "app"]);
});

test("macOS DMG builder resolves release directories", () => {
  assert.equal(getReleaseDir("/repo", []), join("/repo", "src-tauri", "target", "release"));
  assert.equal(
    getReleaseDir("/repo", ["--target", "universal-apple-darwin"]),
    join("/repo", "src-tauri", "target", "universal-apple-darwin", "release"),
  );
});

test("macOS DMG builder maps target and local architecture suffixes", () => {
  assert.equal(getArchSuffix("universal-apple-darwin", "arm64"), "universal");
  assert.equal(getArchSuffix("aarch64-apple-darwin", "x64"), "aarch64");
  assert.equal(getArchSuffix("x86_64-apple-darwin", "arm64"), "x64");
  assert.equal(getArchSuffix(undefined, "arm64"), "aarch64");
  assert.equal(getArchSuffix(undefined, "x64"), "x64");
});

test("macOS DMG builder names app and DMG outputs from metadata", () => {
  const paths = getMacBuildPaths("/repo", ["--target=universal-apple-darwin"], {
    productName: "JobSentinel",
    version: "2.6.4",
  });

  assert.equal(
    paths.appPath,
    join(
      "/repo",
      "src-tauri",
      "target",
      "universal-apple-darwin",
      "release",
      "bundle",
      "macos",
      "JobSentinel.app",
    ),
  );
  assert.equal(
    paths.dmgPath,
    join(
      "/repo",
      "src-tauri",
      "target",
      "universal-apple-darwin",
      "release",
      "bundle",
      "dmg",
      "JobSentinel_2.6.4_universal.dmg",
    ),
  );
});
