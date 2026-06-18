import assert from "node:assert/strict";
import test from "node:test";
import {
  findPlatformInstallerAssets,
  parseArgs,
  validatePublicReleaseSupplyChain,
  validateExactPublicInstallerAssetSet,
} from "./verify-public-release-assets.mjs";

test("public release verifier defaults to all supported platforms", () => {
  assert.deepEqual(parseArgs([]), {
    expectedVersion: undefined,
    platforms: ["windows", "macos", "linux"],
    releaseTag: undefined,
    repo: "cboyd0319/JobSentinel",
    requireAttestations: true,
    requireChecksum: true,
    requireSupplyChain: true,
  });
});

test("public release verifier supports scoped platform and supply-chain options", () => {
  assert.deepEqual(
    parseArgs([
      "--repo=example/project",
      "--tag",
      "v2.9.0",
      "--expected-version",
      "2.9.0",
      "--platforms",
      "windows,linux",
      "--no-require-checksum",
      "--no-require-supply-chain",
    ]),
    {
      expectedVersion: "2.9.0",
      platforms: ["windows", "linux"],
      releaseTag: "v2.9.0",
      repo: "example/project",
      requireAttestations: false,
      requireChecksum: false,
      requireSupplyChain: false,
    },
  );
});

test("public release verifier selects exact platform installer asset sets", () => {
  const release = {
    assets: [
      { name: "JobSentinel_2.9.0_x64_en-US.msi", browser_download_url: "https://example.invalid/win" },
      { name: "JobSentinel_2.9.0_no-account_universal.dmg", browser_download_url: "https://example.invalid/mac" },
      { name: "JobSentinel_2.9.0_amd64.AppImage", browser_download_url: "https://example.invalid/appimage" },
      { name: "JobSentinel_2.9.0_amd64.deb", browser_download_url: "https://example.invalid/deb" },
    ],
  };

  assert.deepEqual(
    findPlatformInstallerAssets(release, { platform: "linux", expectedVersion: "2.9.0" }).map(
      (asset) => asset.name,
    ),
    ["JobSentinel_2.9.0_amd64.AppImage", "JobSentinel_2.9.0_amd64.deb"],
  );
  assert.equal(
    findPlatformInstallerAssets(release, { platform: "windows", expectedVersion: "2.9.0" })[0].name,
    "JobSentinel_2.9.0_x64_en-US.msi",
  );
});

test("public release verifier rejects missing or duplicate installer assets", () => {
  assert.throws(
    () =>
      findPlatformInstallerAssets(
        {
          assets: [
            { name: "JobSentinel_2.9.0_a.AppImage", browser_download_url: "https://example.invalid/a" },
            { name: "JobSentinel_2.9.0_b.AppImage", browser_download_url: "https://example.invalid/b" },
            { name: "JobSentinel_2.9.0_amd64.deb", browser_download_url: "https://example.invalid/deb" },
          ],
        },
        { platform: "linux", expectedVersion: "2.9.0" },
      ),
    /Expected exactly one linux .AppImage asset/,
  );
  assert.throws(
    () => findPlatformInstallerAssets({ assets: [] }, { platform: "windows", expectedVersion: "2.9.0" }),
    /Expected exactly one windows .msi asset/,
  );
});

test("public release verifier rejects stale selected-platform installers and checksums", () => {
  const release = {
    assets: [
      { name: "JobSentinel-Windows-v2.9.0-x64.msi", browser_download_url: "https://example.invalid/win" },
      { name: "JobSentinel-Windows-v2.9.0-x64.msi.sha256", browser_download_url: "https://example.invalid/win.sha256" },
      { name: "JobSentinel-Windows-v2.8.0-x64.msi", browser_download_url: "https://example.invalid/old-win" },
      { name: "JobSentinel_2.8.0_no-account_universal.dmg.sha256", browser_download_url: "https://example.invalid/old-mac-sha" },
      { name: "JobSentinel-2.9.0-windows.sbom.spdx.json", browser_download_url: "https://example.invalid/sbom" },
    ],
  };
  const expectedAssets = [
    { name: "JobSentinel-Windows-v2.9.0-x64.msi" },
    { name: "JobSentinel_2.9.0_no-account_universal.dmg" },
  ];

  assert.throws(
    () =>
      validateExactPublicInstallerAssetSet(release, {
        platforms: ["windows", "macos"],
        expectedAssets,
      }),
    /stale or unexpected installer assets.*JobSentinel-Windows-v2\.8\.0-x64\.msi.*JobSentinel_2\.8\.0_no-account_universal\.dmg\.sha256/,
  );
});

test("public release verifier exact asset set honors scoped platforms", () => {
  assert.doesNotThrow(() =>
    validateExactPublicInstallerAssetSet(
      {
        assets: [
          { name: "JobSentinel-Windows-v2.8.0-x64.msi", browser_download_url: "https://example.invalid/old-win" },
          { name: "JobSentinel_2.9.0_no-account_universal.dmg", browser_download_url: "https://example.invalid/mac" },
          { name: "JobSentinel_2.9.0_no-account_universal.dmg.sha256", browser_download_url: "https://example.invalid/mac-sha" },
        ],
      },
      {
        platforms: ["macos"],
        expectedAssets: [{ name: "JobSentinel_2.9.0_no-account_universal.dmg" }],
      },
    ),
  );
});

test("public release verifier requires exact version filename segment", () => {
  assert.throws(
    () =>
      findPlatformInstallerAssets(
        {
          assets: [
            { name: "JobSentinel_12.9.0_x64_en-US.msi", browser_download_url: "https://example.invalid/win" },
            { name: "JobSentinel_2.9.0.1_x64_en-US.msi", browser_download_url: "https://example.invalid/win-patch" },
          ],
        },
        { platform: "windows", expectedVersion: "2.9.0" },
      ),
    /Expected exactly one windows .msi asset/,
  );

  assert.equal(
    findPlatformInstallerAssets(
      {
        assets: [
          { name: "JobSentinel-Windows-v2.9.0-x64.msi", browser_download_url: "https://example.invalid/win" },
        ],
      },
      { platform: "windows", expectedVersion: "2.9.0" },
    )[0].name,
    "JobSentinel-Windows-v2.9.0-x64.msi",
  );
});

test("public release verifier validates SBOM manifest binding to every installer asset", () => {
  const digest = "0".repeat(64);
  assert.doesNotThrow(() =>
    validatePublicReleaseSupplyChain({
      manifest: {
        schemaVersion: 1,
        version: "2.9.0",
        platform: "linux",
        sbom: {
          fileName: "JobSentinel-2.9.0-linux.sbom.spdx.json",
          sha256: digest,
        },
        assets: [
          { fileName: "JobSentinel_2.9.0_amd64.AppImage", kind: "installer", sha256: digest },
          { fileName: "JobSentinel_2.9.0_amd64.deb", kind: "installer", sha256: digest },
        ],
      },
      sbom: {
        spdxVersion: "SPDX-2.3",
        SPDXID: "SPDXRef-DOCUMENT",
        packages: [{ name: "jobsentinel" }],
      },
      sbomDigest: digest,
      assetDigests: {
        "JobSentinel_2.9.0_amd64.AppImage": digest,
        "JobSentinel_2.9.0_amd64.deb": digest,
      },
      expectedVersion: "2.9.0",
      platform: "linux",
    }),
  );

  assert.throws(
    () =>
      validatePublicReleaseSupplyChain({
        manifest: {
          schemaVersion: 1,
          version: "2.9.0",
          platform: "linux",
          sbom: {
            fileName: "JobSentinel-2.9.0-linux.sbom.spdx.json",
            sha256: digest,
          },
          assets: [{ fileName: "JobSentinel_2.9.0_amd64.AppImage", kind: "installer", sha256: digest }],
        },
        sbom: {
          spdxVersion: "SPDX-2.3",
          SPDXID: "SPDXRef-DOCUMENT",
          packages: [{ name: "jobsentinel" }],
        },
        sbomDigest: digest,
        assetDigests: {
          "JobSentinel_2.9.0_amd64.AppImage": digest,
          "JobSentinel_2.9.0_amd64.deb": digest,
        },
        expectedVersion: "2.9.0",
        platform: "linux",
      }),
    /must include downloaded release asset JobSentinel_2\.9\.0_amd64\.deb/,
  );
});
