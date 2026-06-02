import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  buildAppCodesignArgs,
  buildDmgCodesignArgs,
  buildMacosTauriEnv,
  buildNotarytoolSubmitArgs,
  buildTauriArgs,
  formatDmgChecksum,
  shouldNotarizeDmg,
  getArchSuffix,
  getMacBuildPaths,
  getReleaseDir,
  getSigningIdentity,
  hasPartialNotarizationCredentials,
  hasArg,
  prependPathDir,
  redactNotarytoolArgs,
  removeStaleDmgArtifacts,
  staleDmgArtifactNames,
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

test("macOS DMG builder prefers rustup toolchain PATH when available", () => {
  assert.equal(prependPathDir("/usr/bin:/bin", "/rustup/toolchain/bin"), "/rustup/toolchain/bin:/usr/bin:/bin");
  assert.equal(prependPathDir("/rustup/toolchain/bin:/usr/bin", "/rustup/toolchain/bin"), "/rustup/toolchain/bin:/usr/bin");

  assert.deepEqual(buildMacosTauriEnv({ PATH: "/usr/bin" }, null), { PATH: "/usr/bin" });
  assert.deepEqual(buildMacosTauriEnv({ PATH: "/usr/bin", RUST_LOG: "debug" }, "/rustup/toolchain/bin"), {
    PATH: "/rustup/toolchain/bin:/usr/bin",
    RUST_LOG: "debug",
  });
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

test("macOS DMG builder formats public checksum artifact content", () => {
  assert.equal(
    formatDmgChecksum("/tmp/JobSentinel_2.6.4_universal.dmg", "0123456789abcdef"),
    "0123456789abcdef  JobSentinel_2.6.4_universal.dmg\n",
  );
});

test("macOS DMG builder identifies stale no-account artifact variants", () => {
  assert.deepEqual(
    Array.from(staleDmgArtifactNames("JobSentinel_2.6.4_universal.dmg")).sort(),
    [
      "JobSentinel_2.6.4_no-account_universal.dmg",
      "JobSentinel_2.6.4_no-account_universal.dmg.sha256",
      "JobSentinel_2.6.4_universal.dmg",
      "JobSentinel_2.6.4_universal.dmg.sha256",
    ],
  );
  assert.deepEqual(
    Array.from(staleDmgArtifactNames("JobSentinel_2.6.4_aarch64.dmg")).sort(),
    [
      "JobSentinel_2.6.4_aarch64.dmg",
      "JobSentinel_2.6.4_aarch64.dmg.sha256",
      "JobSentinel_2.6.4_aarch64_no-account_macos.dmg",
      "JobSentinel_2.6.4_aarch64_no-account_macos.dmg.sha256",
    ],
  );
});

test("macOS DMG builder removes stale DMG and checksum artifacts", () => {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-macos-artifacts-"));

  try {
    for (const name of [
      "JobSentinel_2.6.4_universal.dmg",
      "JobSentinel_2.6.4_universal.dmg.sha256",
      "JobSentinel_2.6.4_no-account_universal.dmg",
      "JobSentinel_2.6.4_no-account_universal.dmg.sha256",
      "rw.JobSentinel_2.6.4_universal.dmg",
      "keep.txt",
    ]) {
      writeFileSync(join(root, name), "fixture");
    }

    removeStaleDmgArtifacts([root], "JobSentinel_2.6.4_universal.dmg");

    assert.equal(existsSync(join(root, "JobSentinel_2.6.4_universal.dmg")), false);
    assert.equal(existsSync(join(root, "JobSentinel_2.6.4_universal.dmg.sha256")), false);
    assert.equal(existsSync(join(root, "JobSentinel_2.6.4_no-account_universal.dmg")), false);
    assert.equal(existsSync(join(root, "JobSentinel_2.6.4_no-account_universal.dmg.sha256")), false);
    assert.equal(existsSync(join(root, "rw.JobSentinel_2.6.4_universal.dmg")), false);
    assert.equal(existsSync(join(root, "keep.txt")), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("macOS DMG builder resolves signing identity from release env", () => {
  assert.equal(getSigningIdentity({ APPLE_SIGNING_IDENTITY: "Developer ID Application: Chad" }), "Developer ID Application: Chad");
  assert.equal(getSigningIdentity({ JOBSENTINEL_MACOS_SIGNING_IDENTITY: "Local Identity" }), "Local Identity");
  assert.equal(getSigningIdentity({ MACOS_SIGNING_IDENTITY: "Legacy Identity" }), "Legacy Identity");
  assert.equal(getSigningIdentity({}), "-");
});

test("macOS DMG builder builds notarytool args for Apple ID credentials", () => {
  assert.deepEqual(
    buildNotarytoolSubmitArgs("/tmp/JobSentinel.dmg", {
      APPLE_ID: "developer@example.com",
      APPLE_PASSWORD: "@env:APPLE_APP_PASSWORD",
      APPLE_TEAM_ID: "ABCDE12345",
    }),
    [
      "notarytool",
      "submit",
      "/tmp/JobSentinel.dmg",
      "--apple-id",
      "developer@example.com",
      "--password",
      "@env:APPLE_PASSWORD",
      "--team-id",
      "ABCDE12345",
      "--wait",
    ],
  );
});

test("macOS DMG builder builds notarytool args for API key credentials", () => {
  assert.deepEqual(
    buildNotarytoolSubmitArgs("/tmp/JobSentinel.dmg", {
      APPLE_API_KEY: "KEYID12345",
      APPLE_API_ISSUER: "00000000-0000-0000-0000-000000000000",
      APPLE_API_KEY_PATH: "/private/AuthKey_KEYID12345.p8",
    }),
    [
      "notarytool",
      "submit",
      "/tmp/JobSentinel.dmg",
      "--key-id",
      "KEYID12345",
      "--key",
      "/private/AuthKey_KEYID12345.p8",
      "--wait",
      "--issuer",
      "00000000-0000-0000-0000-000000000000",
    ],
  );
});

test("macOS DMG builder builds notarytool args for keychain profile", () => {
  assert.deepEqual(
    buildNotarytoolSubmitArgs("/tmp/JobSentinel.dmg", {
      JOBSENTINEL_MACOS_NOTARY_PROFILE: "jobsentinel-notary",
    }),
    [
      "notarytool",
      "submit",
      "/tmp/JobSentinel.dmg",
      "--keychain-profile",
      "jobsentinel-notary",
      "--wait",
    ],
  );
});

test("macOS DMG builder detects partial notarization credentials", () => {
  assert.equal(hasPartialNotarizationCredentials({ APPLE_ID: "developer@example.com" }), true);
  assert.equal(
    hasPartialNotarizationCredentials({
      APPLE_ID: "developer@example.com",
      APPLE_PASSWORD: "@env:APPLE_APP_PASSWORD",
      APPLE_TEAM_ID: "ABCDE12345",
    }),
    false,
  );
  assert.equal(hasPartialNotarizationCredentials({}), false);
});

test("macOS DMG builder treats false notarization mode as authoritative", () => {
  assert.equal(
    shouldNotarizeDmg({
      JOBSENTINEL_MACOS_NOTARIZE_DMG: "false",
      APPLE_ID: "developer@example.com",
      APPLE_PASSWORD: "@env:APPLE_APP_PASSWORD",
      APPLE_TEAM_ID: "ABCDE12345",
    }),
    false,
  );
  assert.equal(shouldNotarizeDmg({ JOBSENTINEL_MACOS_NOTARIZE_DMG: "true" }), true);
  assert.equal(
    shouldNotarizeDmg({
      APPLE_ID: "developer@example.com",
      APPLE_PASSWORD: "@env:APPLE_APP_PASSWORD",
      APPLE_TEAM_ID: "ABCDE12345",
    }),
    true,
  );
  assert.equal(shouldNotarizeDmg({}), false);
});

test("macOS DMG builder redacts notarytool auth values in logs", () => {
  assert.deepEqual(
    redactNotarytoolArgs([
      "notarytool",
      "submit",
      "JobSentinel.dmg",
      "--apple-id",
      "developer@example.com",
      "--password",
      "secret-password",
      "--team-id",
      "ABCDE12345",
      "--wait",
    ]),
    [
      "notarytool",
      "submit",
      "JobSentinel.dmg",
      "--apple-id",
      "<redacted>",
      "--password",
      "<redacted>",
      "--team-id",
      "<redacted>",
      "--wait",
    ],
  );
});

test("macOS DMG builder uses hardened runtime and timestamp for Developer ID app signing", () => {
  assert.deepEqual(
    buildAppCodesignArgs("Developer ID Application: Chad (ABCDE12345)", "/tmp/JobSentinel.app"),
    [
      "--force",
      "--deep",
      "--sign",
      "Developer ID Application: Chad (ABCDE12345)",
      "--options",
      "runtime",
      "--timestamp",
      "/tmp/JobSentinel.app",
    ],
  );
  assert.deepEqual(buildAppCodesignArgs("-", "/tmp/JobSentinel.app"), [
    "--force",
    "--deep",
    "--sign",
    "-",
    "/tmp/JobSentinel.app",
  ]);
});

test("macOS DMG builder timestamps Developer ID disk image signatures", () => {
  assert.deepEqual(
    buildDmgCodesignArgs("Developer ID Application: Chad (ABCDE12345)", "/tmp/JobSentinel.dmg"),
    [
      "--force",
      "--sign",
      "Developer ID Application: Chad (ABCDE12345)",
      "--timestamp",
      "/tmp/JobSentinel.dmg",
    ],
  );
  assert.deepEqual(buildDmgCodesignArgs("-", "/tmp/JobSentinel.dmg"), [
    "--force",
    "--sign",
    "-",
    "/tmp/JobSentinel.dmg",
  ]);
});
