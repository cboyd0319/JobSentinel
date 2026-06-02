import assert from "node:assert/strict";
import test from "node:test";
import {
  findChecksumAsset,
  findMacosDmgAsset,
  parseArgs,
  parseSha256Checksum,
  validateMacosAssetLabel,
} from "./verify-latest-macos-release.mjs";

test("latest macOS release verifier defaults to no-account public checks", () => {
  assert.deepEqual(parseArgs([]), {
    appName: "JobSentinel.app",
    assetPattern: "universal.dmg",
    expectedBundleMetadata: {
      bundleIdentifier: "com.jobsentinel.main",
      iconFile: "icon.icns",
      minimumSystemVersion: "13.0",
      productName: "JobSentinel",
      version: undefined,
    },
    expectedArchitectures: ["x86_64", "arm64"],
    installSmoke: true,
    launchSmoke: true,
    releaseTag: undefined,
    requireChecksum: true,
    requireNoAccountLabel: true,
    repo: "cboyd0319/JobSentinel",
    requireGatekeeper: false,
    smokeSeconds: 12,
  });
});

test("latest macOS release verifier supports scoped overrides", () => {
  assert.deepEqual(
    parseArgs([
      "--repo",
      "example/project",
      "--tag=v2.6.4",
      "--asset-pattern",
      "aarch64.dmg",
      "--expected-bundle-id",
      "com.example.project",
      "--expected-product-name",
      "Example",
      "--expected-version",
      "2.6.4",
      "--expected-icon-file",
      "example.icns",
      "--expected-minimum-system-version",
      "14.0",
      "--expected-architectures",
      "arm64",
      "--no-install-smoke",
      "--no-launch-smoke",
      "--no-require-checksum",
      "--require-gatekeeper",
      "--smoke-seconds",
      "3",
      "--app-name",
      "Example.app",
    ]),
    {
      appName: "Example.app",
      assetPattern: "aarch64.dmg",
      expectedBundleMetadata: {
        bundleIdentifier: "com.example.project",
        iconFile: "example.icns",
        minimumSystemVersion: "14.0",
        productName: "Example",
        version: "2.6.4",
      },
      expectedArchitectures: ["arm64"],
      installSmoke: false,
      launchSmoke: false,
      releaseTag: "v2.6.4",
      requireChecksum: false,
      requireNoAccountLabel: false,
      repo: "example/project",
      requireGatekeeper: true,
      smokeSeconds: 3,
    },
  );
});

test("latest macOS release verifier checks no-account asset labels", () => {
  assert.doesNotThrow(() =>
    validateMacosAssetLabel(
      { name: "JobSentinel_2.6.4_no-account_universal.dmg" },
      { requireNoAccountLabel: true },
    ),
  );
  assert.throws(
    () =>
      validateMacosAssetLabel(
        { name: "JobSentinel_2.6.4_universal.dmg" },
        { requireNoAccountLabel: true },
      ),
    /must include "_no-account_"/,
  );
  assert.throws(
    () =>
      validateMacosAssetLabel(
        { name: "JobSentinel_2.6.4_no-account_universal.dmg" },
        { requireGatekeeper: true },
      ),
    /must not use a no-account label/,
  );
});

test("latest macOS release verifier selects matching checksum asset", () => {
  const dmgAsset = {
    name: "JobSentinel_2.6.4_universal.dmg",
    browser_download_url: "https://example.invalid/macos.dmg",
  };
  const checksumAsset = findChecksumAsset(
    {
      assets: [
        {
          name: "JobSentinel_2.6.4_universal.dmg.sha256",
          browser_download_url: "https://example.invalid/macos.dmg.sha256",
        },
      ],
    },
    dmgAsset,
  );

  assert.equal(checksumAsset?.name, "JobSentinel_2.6.4_universal.dmg.sha256");
});

test("latest macOS release verifier parses SHA-256 checksum files", () => {
  assert.equal(
    parseSha256Checksum("abc123\n0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef  JobSentinel.dmg\n"),
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  );
  assert.throws(() => parseSha256Checksum("not a checksum"), /64-character hex digest/);
});

test("latest macOS release verifier selects universal HTTPS DMG asset", () => {
  const asset = findMacosDmgAsset(
    {
      assets: [
        {
          name: "JobSentinel_2.6.4_x64_en-US.msi",
          browser_download_url: "https://example.invalid/windows.msi",
        },
        {
          name: "JobSentinel_2.6.4_universal.dmg",
          browser_download_url: "https://example.invalid/macos.dmg",
        },
      ],
    },
    "universal.dmg",
  );

  assert.equal(asset?.name, "JobSentinel_2.6.4_universal.dmg");
});

test("latest macOS release verifier ignores non-HTTPS or non-matching DMG assets", () => {
  assert.equal(
    findMacosDmgAsset(
      {
        assets: [
          {
            name: "JobSentinel_2.6.4_universal.dmg",
            browser_download_url: "http://example.invalid/macos.dmg",
          },
          {
            name: "JobSentinel_2.6.4_aarch64.dmg",
            browser_download_url: "https://example.invalid/macos.dmg",
          },
        ],
      },
      "universal.dmg",
    ),
    undefined,
  );
});
