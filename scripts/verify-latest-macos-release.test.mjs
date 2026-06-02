import assert from "node:assert/strict";
import test from "node:test";
import {
  findMacosDmgAsset,
  parseArgs,
} from "./verify-latest-macos-release.mjs";

test("latest macOS release verifier defaults to strict public release checks", () => {
  assert.deepEqual(parseArgs([]), {
    appName: "JobSentinel.app",
    assetPattern: "universal.dmg",
    expectedArchitectures: ["x86_64", "arm64"],
    launchSmoke: true,
    releaseTag: undefined,
    repo: "cboyd0319/JobSentinel",
    requireGatekeeper: true,
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
      "--expected-architectures",
      "arm64",
      "--no-launch-smoke",
      "--no-require-gatekeeper",
      "--smoke-seconds",
      "3",
      "--app-name",
      "Example.app",
    ]),
    {
      appName: "Example.app",
      assetPattern: "aarch64.dmg",
      expectedArchitectures: ["arm64"],
      launchSmoke: false,
      releaseTag: "v2.6.4",
      repo: "example/project",
      requireGatekeeper: false,
      smokeSeconds: 3,
    },
  );
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
