#!/usr/bin/env node
// Verifies the public macOS DMG, its checksum, SBOM and attestations, and installs it for smoke checks.

import { execFile } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { parseSha256Checksum } from "./checksum.mjs";
import { parseStrictJson } from "./strict-json.mjs";
import { boundedTimeoutMs, downloadPublicAsset, envToken, fetchGitHubJson, fetchTagCommit, githubReleaseUrl } from "./public-assets/http.mjs";
import { validateReleaseAssetIdentity } from "./public-assets/release-set.mjs";
import { verifyMacosPackage } from "./verify-macos-package.mjs";
import { getArgValue, getRepoArg, hasArg, splitList, isMainModule } from "./args.mjs";

export { parseSha256Checksum } from "./checksum.mjs";

const defaultRepo = "cboyd0319/JobSentinel";
const spdxPredicateType = "https://spdx.dev/Document/v2.3";
const slsaPredicateType = "https://slsa.dev/provenance/v1";

export function parseArgs(args) {
  const expectedArchitectures =
    getArgValue(args, "--expected-architectures") ??
    getArgValue(args, "--expected-archs") ??
    "x86_64,arm64";
  const requireGatekeeper =
    hasArg(args, "--require-gatekeeper") && !hasArg(args, "--no-require-gatekeeper");

  return {
    appName: getArgValue(args, "--app-name") ?? "JobSentinel.app",
    assetPattern: getArgValue(args, "--asset-pattern") ?? "universal.dmg",
    expectedBundleMetadata: {
      bundleIdentifier: getArgValue(args, "--expected-bundle-id") ?? "com.jobsentinel.main",
      iconFile: getArgValue(args, "--expected-icon-file") ?? "icon.icns",
      minimumSystemVersion: getArgValue(args, "--expected-minimum-system-version") ?? "13.0",
      productName: getArgValue(args, "--expected-product-name") ?? "JobSentinel",
      version: getArgValue(args, "--expected-version"),
    },
    expectedArchitectures: splitList(expectedArchitectures),
    installSmoke: !hasArg(args, "--no-install-smoke"),
    launchSmoke: !hasArg(args, "--no-launch-smoke"),
    releaseTag: getArgValue(args, "--tag"),
    requireChecksum: !hasArg(args, "--no-require-checksum"),
    requireNoAccountLabel:
      hasArg(args, "--require-no-account-label") ||
      (!requireGatekeeper && !hasArg(args, "--no-require-no-account-label")),
    repo: getRepoArg(args, defaultRepo),
    requireGatekeeper,
    requireSupplyChain:
      hasArg(args, "--require-supply-chain") || !hasArg(args, "--no-require-supply-chain"),
    smokeSeconds: Number(getArgValue(args, "--smoke-seconds") ?? "12"),
  };
}

export function findMacosDmgAsset(release, assetPattern = "universal.dmg", expectedVersion) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const lowerPattern = assetPattern.toLowerCase();

  const matches = assets.filter((asset) => {
    const name = typeof asset?.name === "string" ? asset.name : "";
    const url =
      typeof asset?.browser_download_url === "string"
        ? asset.browser_download_url
        : "";
    const lowerName = name.toLowerCase();

    const versionMatches = expectedVersion ? lowerName.includes(`_${expectedVersion.toLowerCase()}_`) : true;

    return (
      lowerName.endsWith(".dmg") &&
      lowerName.includes(lowerPattern) &&
      versionMatches &&
      url.startsWith("https://")
    );
  });

  if (matches.length > 1) {
    throw new Error(
      `Multiple macOS DMG assets matched "${assetPattern}": ${matches.map((asset) => asset.name).join(", ")}`,
    );
  }

  return matches[0];
}

export function findChecksumAsset(release, dmgAsset) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const checksumName = `${dmgAsset?.name ?? ""}.sha256`;

  return assets.find((asset) => {
    const name = typeof asset?.name === "string" ? asset.name : "";
    const url =
      typeof asset?.browser_download_url === "string"
        ? asset.browser_download_url
        : "";

    return name === checksumName && url.startsWith("https://");
  });
}

export function expectedReleaseSbomNames(version, platform = "macos") {
  return {
    manifestName: `JobSentinel-${version}-${platform}.sbom-manifest.json`,
    sbomName: `JobSentinel-${version}-${platform}.sbom.spdx.json`,
  };
}

export function findReleaseAssetByName(release, expectedName) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  return assets.find((asset) => {
    const name = typeof asset?.name === "string" ? asset.name : "";
    const url =
      typeof asset?.browser_download_url === "string"
        ? asset.browser_download_url
        : "";

    return name === expectedName && url.startsWith("https://");
  });
}

export function validateMacosAssetLabel(asset, { requireGatekeeper = false, requireNoAccountLabel = false } = {}) {
  const name = typeof asset?.name === "string" ? asset.name : "";
  const lowerName = name.toLowerCase();
  const hasNoAccountLabel = lowerName.includes("_no-account_");

  if (requireGatekeeper && hasNoAccountLabel) {
    throw new Error(
      `Gatekeeper-required macOS release asset must not use a no-account label: ${name}`,
    );
  }

  if (requireNoAccountLabel && !hasNoAccountLabel) {
    throw new Error(
      `No-account macOS release asset must include "_no-account_" in the file name: ${name}`,
    );
  }
}

async function sha256File(path) {
  const data = await readFile(path);
  return createHash("sha256").update(data).digest("hex");
}

async function verifyChecksum({ release, dmgAsset, dmgPath, requireChecksum }) {
  const checksumAsset = findChecksumAsset(release, dmgAsset);
  if (!checksumAsset) {
    if (requireChecksum) {
      throw new Error(`No SHA-256 checksum asset found for ${dmgAsset.name}. Expected ${dmgAsset.name}.sha256.`);
    }
    console.warn(`No SHA-256 checksum asset found for ${dmgAsset.name}; skipping checksum check.`);
    return;
  }

  const checksumPath = `${dmgPath}.sha256`;
  console.log(`Downloading public macOS checksum asset: ${checksumAsset.browser_download_url}`);
  await downloadPublicAsset(checksumAsset.browser_download_url, checksumPath);

  const expected = parseSha256Checksum(await readFile(checksumPath, "utf8"), basename(dmgPath));
  const actual = await sha256File(dmgPath);
  if (actual !== expected) {
    throw new Error(`SHA-256 checksum mismatch for ${dmgAsset.name}. Expected ${expected}, found ${actual}.`);
  }
  console.log(`SHA-256 checksum verified: ${actual}`);
}

export function validateReleaseSbomDocument({
  manifest,
  sbom,
  sbomDigest,
  expectedVersion,
  platform = "macos",
}) {
  const { manifestName, sbomName } = expectedReleaseSbomNames(expectedVersion, platform);
  if (manifest?.schemaVersion !== 1) {
    throw new Error(`${manifestName} must use schemaVersion 1.`);
  }

  if (manifest.version !== expectedVersion) {
    throw new Error(`${manifestName} version expected ${expectedVersion}, found ${manifest.version}.`);
  }

  if (manifest.platform !== platform) {
    throw new Error(`${manifestName} platform expected ${platform}, found ${manifest.platform}.`);
  }

  if (manifest.sbom?.fileName !== sbomName) {
    throw new Error(`${manifestName} must point to ${sbomName}.`);
  }

  if (manifest.sbom?.sha256 !== sbomDigest) {
    throw new Error(`${sbomName} SHA-256 does not match ${manifestName}.`);
  }

  if (sbom?.spdxVersion !== "SPDX-2.3" || sbom?.SPDXID !== "SPDXRef-DOCUMENT") {
    throw new Error(`${sbomName} must be an SPDX 2.3 JSON document.`);
  }

  if (!Array.isArray(sbom.packages) || sbom.packages.length === 0) {
    throw new Error(`${sbomName} must contain at least one package.`);
  }
  return { manifestName, sbomName };
}

export function validateReleaseSbomManifest({
  manifest,
  sbom,
  sbomDigest,
  dmgAsset,
  dmgDigest,
  expectedVersion,
  platform = "macos",
}) {
  const { manifestName } = validateReleaseSbomDocument({
    manifest,
    sbom,
    sbomDigest,
    expectedVersion,
    platform,
  });
  const assetEntry = manifest.assets?.find((asset) => asset.fileName === dmgAsset.name);
  if (!assetEntry) {
    throw new Error(`${manifestName} must include downloaded DMG asset ${dmgAsset.name}.`);
  }

  if (assetEntry.kind !== "installer") {
    throw new Error(`${manifestName} must mark ${dmgAsset.name} as an installer asset.`);
  }

  if (assetEntry.sha256 !== dmgDigest) {
    throw new Error(`${manifestName} SHA-256 for ${dmgAsset.name} does not match downloaded DMG.`);
  }
}

const attestationFlagsChecked = new WeakSet();

/** Runs a command without blocking the event loop, so cancellation signals are handled while it runs. */
export function runCommand(command, args, { timeout, maxBuffer = 1024 * 1024 * 10 }) {
  return new Promise((resolveRun) => {
    execFile(command, args, { encoding: "utf8", timeout, maxBuffer }, (error, stdout, stderr) => {
      const status = error ? (typeof error.code === "number" ? error.code : null) : 0;
      resolveRun({ status, stdout, stderr, error: status === null ? error : undefined });
    });
  });
}

/** Fails closed, once per `run`, unless this gh lists the flags that bind an attestation to the tag commit and ref. */
export async function assertGhAttestationFlags({ run = runCommand, deadline } = {}) {
  if (attestationFlagsChecked.has(run)) return;
  const result = await run("gh", ["attestation", "verify", "--help"], { timeout: boundedTimeoutMs(30_000, deadline) });
  const help = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  const missing = ["--source-digest", "--source-ref"].filter((flag) => !help.includes(flag));
  if (result.error || result.status !== 0 || missing.length > 0) {
    const reason = result.error?.message ?? (result.status !== 0 ? `exit ${result.status}` : `missing ${missing.join(", ")}`);
    throw new Error(`gh attestation verify must support --source-digest and --source-ref (${reason}); upgrade the GitHub CLI.`);
  }
  attestationFlagsChecked.add(run);
}

/** Runs one gh attestation verification, bounded by 120 s and the caller's deadline. */
export async function verifyGitHubAttestation({
  artifactPath,
  repo,
  predicateType,
  signerWorkflow = `${repo}/.github/workflows/release-build-macos.yml`,
  sourceDigest,
  sourceRef,
  run = runCommand,
  deadline,
}) {
  if (!/^[0-9a-f]{40}$/.test(String(sourceDigest)) || !String(sourceRef).startsWith("refs/tags/v")) {
    throw new Error(`GitHub attestation verification for ${artifactPath} requires the tag commit and refs/tags/<tag>.`);
  }
  await assertGhAttestationFlags({ run, deadline });
  const result = await run(
    "gh",
    [
      "attestation",
      "verify",
      artifactPath,
      "--repo",
      repo,
      "--predicate-type",
      predicateType,
      "--signer-workflow",
      signerWorkflow,
      "--source-digest",
      sourceDigest,
      "--source-ref",
      sourceRef,
    ],
    { timeout: boundedTimeoutMs(120_000, deadline) },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const output = String(result.stderr || result.stdout).trim();
    throw new Error(
      `GitHub attestation verification failed for ${artifactPath} (${predicateType}): ${output}`,
    );
  }
}

async function verifyReleaseSupplyChain({
  release,
  dmgAsset,
  dmgPath,
  expectedVersion,
  platform = "macos",
  repo,
  requireSupplyChain,
  sourceDigest,
  sourceRef,
}) {
  const { manifestName, sbomName } = expectedReleaseSbomNames(expectedVersion, platform);
  const manifestAsset = findReleaseAssetByName(release, manifestName);
  const sbomAsset = findReleaseAssetByName(release, sbomName);
  if (!manifestAsset || !sbomAsset) {
    const message = `Release is missing required supply-chain assets: ${manifestName}, ${sbomName}.`;
    if (requireSupplyChain) {
      throw new Error(message);
    }
    console.warn(`${message} Skipping supply-chain verification.`);
    return;
  }

  const manifestPath = `${dmgPath}.${manifestName}`;
  const sbomPath = `${dmgPath}.${sbomName}`;
  console.log(`Downloading public macOS SBOM manifest asset: ${manifestAsset.browser_download_url}`);
  await downloadPublicAsset(manifestAsset.browser_download_url, manifestPath);
  console.log(`Downloading public macOS SBOM asset: ${sbomAsset.browser_download_url}`);
  await downloadPublicAsset(sbomAsset.browser_download_url, sbomPath);

  const manifest = parseStrictJson(await readFile(manifestPath, "utf8"), `macOS SBOM manifest ${manifestName}`);
  const sbom = JSON.parse(await readFile(sbomPath, "utf8"));
  validateReleaseSbomManifest({
    manifest,
    sbom,
    sbomDigest: await sha256File(sbomPath),
    dmgAsset,
    dmgDigest: await sha256File(dmgPath),
    expectedVersion,
    platform,
  });
  console.log(`Release SBOM manifest verified: ${manifestName}`);

  if (!requireSupplyChain) {
    return;
  }

  await verifyGitHubAttestation({
    artifactPath: dmgPath,
    repo,
    predicateType: slsaPredicateType,
    sourceDigest,
    sourceRef,
  });
  await verifyGitHubAttestation({
    artifactPath: dmgPath,
    repo,
    predicateType: spdxPredicateType,
    sourceDigest,
    sourceRef,
  });
  console.log("GitHub artifact attestations verified for macOS DMG.");
}

export async function verifyLatestMacosRelease(options, { fetchImpl = fetch, token = envToken() } = {}) {
  const release = await fetchGitHubJson(githubReleaseUrl(options.repo, options.releaseTag), { fetchImpl, token });
  if (release.draft !== false || typeof release.tag_name !== "string") {
    throw new Error("Public macOS verification needs a published release with a tag.");
  }
  // Every asset's first download hop must be https://github.com/<repo>/releases/download/<tag>/<name>.
  validateReleaseAssetIdentity(release, { repo: options.repo, tag: release.tag_name, draft: false });
  const tagCommit = await fetchTagCommit(options.repo, release.tag_name, { fetchImpl, token });
  const expectedBundleMetadata = {
    ...options.expectedBundleMetadata,
    version:
      options.expectedBundleMetadata?.version ??
      (typeof release.tag_name === "string" ? release.tag_name.replace(/^v/, "") : undefined),
  };
  const asset = findMacosDmgAsset(
    release,
    options.assetPattern,
    expectedBundleMetadata.version,
  );

  if (!asset) {
    const names = (release.assets ?? []).map((item) => item.name).join(", ");
    throw new Error(
      `No macOS DMG asset matched "${options.assetPattern}" on ${release.tag_name ?? "latest release"}. Assets: ${names || "(none)"}`,
    );
  }
  validateMacosAssetLabel(asset, {
    requireGatekeeper: options.requireGatekeeper,
    requireNoAccountLabel: options.requireNoAccountLabel,
  });

  const tempRoot = mkdtempSync(join(tmpdir(), "jobsentinel-public-macos-"));
  const dmgPath = join(tempRoot, basename(asset.name));

  try {
    console.log(`Downloading public macOS release asset: ${asset.browser_download_url}`);
    await downloadPublicAsset(asset.browser_download_url, dmgPath);
    await verifyChecksum({
      release,
      dmgAsset: asset,
      dmgPath,
      requireChecksum: options.requireChecksum,
    });
    await verifyReleaseSupplyChain({
      release,
      dmgAsset: asset,
      dmgPath,
      expectedVersion: expectedBundleMetadata.version,
      repo: options.repo,
      requireSupplyChain: options.requireSupplyChain,
      sourceDigest: tagCommit,
      sourceRef: `refs/tags/${release.tag_name}`,
    });
    await verifyMacosPackage({
      appName: options.appName,
      dmgPath,
      expectedBundleMetadata,
      expectedArchitectures: options.expectedArchitectures,
      installSmoke: options.installSmoke,
      launchSmoke: options.launchSmoke,
      requireGatekeeper: options.requireGatekeeper,
      smokeSeconds: options.smokeSeconds,
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

export async function main({ args = process.argv.slice(2) } = {}) {
  const options = parseArgs(args);
  if (!Number.isFinite(options.smokeSeconds) || options.smokeSeconds < 1) {
    throw new Error(`Invalid --smoke-seconds value: ${options.smokeSeconds}`);
  }

  await verifyLatestMacosRelease(options);
}

if (isMainModule(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
