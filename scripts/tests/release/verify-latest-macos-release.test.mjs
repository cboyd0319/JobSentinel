// Verifies public macOS release selection, checksum, SBOM and attestation contracts.
import assert from "node:assert/strict";
import test from "node:test";
import {
  expectedReleaseSbomNames,
  findChecksumAsset,
  findMacosDmgAsset,
  findReleaseAssetByName,
  parseArgs,
  parseSha256Checksum,
  validateReleaseSbomManifest,
  validateMacosAssetLabel,
  verifyGitHubAttestation,
  verifyLatestMacosRelease,
} from "../../release/verify-latest-macos-release.mjs";
import { fetchGitHubJson, githubApiHeaders } from "../../release/public-assets/http.mjs";

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
    requireSupplyChain: true,
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
      "--no-require-supply-chain",
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
      requireSupplyChain: false,
      smokeSeconds: 3,
    },
  );
});

test("release verifiers send the token only to the GitHub API", async () => {
  assert.deepEqual(githubApiHeaders("  test-token  "), {
    Accept: "application/vnd.github+json",
    Authorization: "Bearer test-token",
    "User-Agent": "JobSentinel-release-verifier",
  });
  assert.equal(githubApiHeaders("").Authorization, undefined);
  await assert.rejects(
    fetchGitHubJson("https://example.invalid/repos/x", { token: "t", fetchImpl: () => assert.fail("must not fetch") }),
    /Refusing to send GitHub API credentials outside/,
  );
});

test("latest macOS release verifier refuses asset URLs not bound to the repository and tag", async () => {
  const name = "JobSentinel_3.0.0_no-account_universal.dmg";
  const exact = `https://github.com/o/r/releases/download/v3.0.0/${name}`;
  for (const url of [`https://evil.example.test/${name}`, `https://github.com/other/r/releases/download/v3.0.0/${name}`, exact.replace("v3.0.0", "v2.9.0")]) {
    const requests = [];
    const fetchImpl = async (requested) => {
      requests.push(requested);
      return Response.json({ tag_name: "v3.0.0", draft: false, assets: [{ name, state: "uploaded", browser_download_url: url }] });
    };
    await assert.rejects(
      verifyLatestMacosRelease(parseArgs(["--repo", "o/r", "--tag", "v3.0.0"]), { fetchImpl, token: "" }),
      /download URL is not bound to v3\.0\.0 in o\/r/,
    );
    assert.deepEqual(requests, ["https://api.github.com/repos/o/r/releases/tags/v3.0.0"], "no tag lookup or download follows");
  }
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

test("latest macOS release verifier selects expected SBOM assets by exact name and HTTPS", () => {
  assert.deepEqual(expectedReleaseSbomNames("2.9.0"), {
    manifestName: "JobSentinel-2.9.0-macos.sbom-manifest.json",
    sbomName: "JobSentinel-2.9.0-macos.sbom.spdx.json",
  });
  assert.equal(
    findReleaseAssetByName(
      {
        assets: [
          {
            name: "JobSentinel-2.9.0-macos.sbom.spdx.json",
            browser_download_url: "https://example.invalid/sbom",
          },
          {
            name: "JobSentinel-2.9.0-macos.sbom-manifest.json",
            browser_download_url: "http://example.invalid/manifest",
          },
        ],
      },
      "JobSentinel-2.9.0-macos.sbom.spdx.json",
    )?.browser_download_url,
    "https://example.invalid/sbom",
  );
  assert.equal(
    findReleaseAssetByName(
      {
        assets: [
          {
            name: "JobSentinel-2.9.0-macos.sbom-manifest.json",
            browser_download_url: "http://example.invalid/manifest",
          },
        ],
      },
      "JobSentinel-2.9.0-macos.sbom-manifest.json",
    ),
    undefined,
  );
});

test("latest macOS release verifier parses SHA-256 checksum files", () => {
  assert.equal(
    parseSha256Checksum(
      "abc123\n0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef  JobSentinel.dmg\n",
      "JobSentinel.dmg",
    ),
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  );
  assert.throws(() => parseSha256Checksum("not a checksum"), /exactly one digest line/);
  assert.throws(
    () =>
      parseSha256Checksum(
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef  Other.dmg\n",
        "JobSentinel.dmg",
      ),
    /filename expected JobSentinel.dmg/,
  );
});

test("latest macOS release verifier validates SBOM manifest binding to downloaded DMG", () => {
  const digest = "0".repeat(64);
  assert.doesNotThrow(() =>
    validateReleaseSbomManifest({
      manifest: {
        schemaVersion: 1,
        version: "2.9.0",
        platform: "macos",
        sbom: {
          fileName: "JobSentinel-2.9.0-macos.sbom.spdx.json",
          sha256: digest,
        },
        assets: [
          {
            fileName: "JobSentinel_2.9.0_no-account_universal.dmg",
            kind: "installer",
            sha256: digest,
          },
        ],
      },
      sbom: {
        spdxVersion: "SPDX-2.3",
        SPDXID: "SPDXRef-DOCUMENT",
        packages: [{ name: "jobsentinel" }],
      },
      sbomDigest: digest,
      dmgAsset: { name: "JobSentinel_2.9.0_no-account_universal.dmg" },
      dmgDigest: digest,
      expectedVersion: "2.9.0",
    }),
  );

  assert.throws(
    () =>
      validateReleaseSbomManifest({
        manifest: {
          schemaVersion: 1,
          version: "2.9.0",
          platform: "macos",
          sbom: {
            fileName: "JobSentinel-2.9.0-macos.sbom.spdx.json",
            sha256: digest,
          },
          assets: [],
        },
        sbom: {
          spdxVersion: "SPDX-2.3",
          SPDXID: "SPDXRef-DOCUMENT",
          packages: [{ name: "jobsentinel" }],
        },
        sbomDigest: digest,
        dmgAsset: { name: "JobSentinel_2.9.0_no-account_universal.dmg" },
        dmgDigest: digest,
        expectedVersion: "2.9.0",
      }),
    /must include downloaded DMG asset/,
  );
});

const ghHelp = "Flags:\n      --source-digest string\n      --source-ref string\n";
const attestationCall = {
  artifactPath: "/tmp/JobSentinel.dmg",
  repo: "example/project",
  predicateType: "https://slsa.dev/provenance/v1",
  sourceDigest: "a".repeat(40),
  sourceRef: "refs/tags/v3.0.0",
};

test("latest macOS release verifier invokes gh attestation with repo, workflow, and predicate", async () => {
  const calls = [];
  const run = (command, args, options) => {
    calls.push([command, args, options.timeout]);
    return { status: 0, stdout: args.includes("--help") ? ghHelp : "", stderr: "" };
  };
  await verifyGitHubAttestation({ ...attestationCall, run });
  await verifyGitHubAttestation({ ...attestationCall, run });

  assert.deepEqual(calls[0], ["gh", ["attestation", "verify", "--help"], 30_000]);
  assert.equal(calls.length, 3, "the flag check runs once per gh");
  assert.equal(calls[1][2], 120_000);
  assert.equal(calls[1][0], "gh");
  assert.deepEqual(calls[1][1], [
    "attestation",
    "verify",
    "/tmp/JobSentinel.dmg",
    "--repo",
    "example/project",
    "--predicate-type",
    "https://slsa.dev/provenance/v1",
    "--signer-workflow",
    "example/project/.github/workflows/release-build-macos.yml",
    "--source-digest",
    "a".repeat(40),
    "--source-ref",
    "refs/tags/v3.0.0",
  ]);

  await assert.rejects(
    () => verifyGitHubAttestation({ artifactPath: "/tmp/x", repo: "example/project", predicateType: "p", run: () => assert.fail("must not run") }),
    /requires the tag commit and refs\/tags\/<tag>/,
  );

  await assert.rejects(
    () =>
      verifyGitHubAttestation({
        artifactPath: "/tmp/JobSentinel.dmg",
        repo: "example/project",
        predicateType: "https://spdx.dev/Document/v2.3",
        sourceDigest: "a".repeat(40),
        sourceRef: "refs/tags/v3.0.0",
        run(_command, args) {
          return args.includes("--help") ? { status: 0, stdout: ghHelp, stderr: "" } : { status: 1, stdout: "verification failed", stderr: "" };
        },
      }),
    /GitHub attestation verification failed/,
  );
});

test("attestation verification fails closed when gh lacks the source-binding flags", async () => {
  const calls = [];
  const oldGh = (_command, args) => {
    calls.push(args);
    return { status: 0, stdout: "Flags:\n      --repo string\n      --source-digest string\n", stderr: "" };
  };
  await assert.rejects(() => verifyGitHubAttestation({ ...attestationCall, run: oldGh }), /must support --source-digest and --source-ref \(missing --source-ref\); upgrade the GitHub CLI/);
  assert.deepEqual(calls, [["attestation", "verify", "--help"]], "no verification runs without the flags");
  const missingGh = () => ({ error: new Error("spawn gh ENOENT"), status: null, stdout: "", stderr: "" });
  await assert.rejects(() => verifyGitHubAttestation({ ...attestationCall, run: missingGh }), /\(spawn gh ENOENT\)/);
});

test("attestation calls are bounded by the remaining publication budget", async () => {
  const timeouts = [];
  const run = (_command, args, options) => {
    timeouts.push(options.timeout);
    return { status: 0, stdout: args.includes("--help") ? ghHelp : "", stderr: "" };
  };
  await verifyGitHubAttestation({ ...attestationCall, run, deadline: Date.now() + 5_000 });
  assert(timeouts.length === 2 && timeouts.every((timeout) => timeout > 0 && timeout <= 5_000), String(timeouts));
  await assert.rejects(
    () => verifyGitHubAttestation({ ...attestationCall, run: () => assert.fail("must not run"), deadline: Date.now() - 1 }),
    /budget exhausted/,
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

test("latest macOS release verifier rejects duplicate matching assets", () => {
  assert.throws(
    () =>
      findMacosDmgAsset(
        {
          assets: [
            {
              name: "JobSentinel_2.6.4_universal.dmg",
              browser_download_url: "https://example.invalid/macos.dmg",
            },
            {
              name: "JobSentinel_2.6.4_no-account_universal.dmg",
              browser_download_url: "https://example.invalid/macos-no-account.dmg",
            },
          ],
        },
        "universal.dmg",
      ),
    /Multiple macOS DMG assets matched/,
  );
});

test("latest macOS release verifier can bind assets to release version", () => {
  const asset = findMacosDmgAsset(
    {
      assets: [
        {
          name: "JobSentinel_2.6.3_universal.dmg",
          browser_download_url: "https://example.invalid/old.dmg",
        },
        {
          name: "JobSentinel_2.6.4_universal.dmg",
          browser_download_url: "https://example.invalid/current.dmg",
        },
      ],
    },
    "universal.dmg",
    "2.6.4",
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
