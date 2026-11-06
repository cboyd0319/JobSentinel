#!/usr/bin/env node
// Verifies exact release assets, supply chain and optional final-phase evidence.

import { appendFileSync } from "node:fs";
import { verifiedSnapshot } from "./release-snapshot.mjs";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  findAgentSkillsArchiveAssets,
  validateExactAgentSkillsAssetSet,
  validateAgentSkillsArchiveContents,
} from "./public-assets/agent-skills.mjs";
import { createReleaseClient } from "./public-assets/client.mjs";
import { verifyPhaseAssets } from "./phase-assets.mjs";
import { parseArgs } from "./public-assets/options.mjs";

export {
  expectedAgentSkillsArchiveNames,
  findAgentSkillsArchiveAssets,
  validateExactAgentSkillsAssetSet,
  listTarGzArchivePaths,
  listZipArchivePaths,
  validateAgentSkillsArchiveContents,
} from "./public-assets/agent-skills.mjs";
export { parseArgs } from "./public-assets/options.mjs";
import {
  expectedReleaseSbomNames,
  findChecksumAsset,
  findReleaseAssetByName,
  parseSha256Checksum,
  validateReleaseSbomDocument,
  verifyGitHubAttestation,
} from "./verify-latest-macos-release.mjs";

const spdxPredicateType = "https://spdx.dev/Document/v2.3";
const slsaPredicateType = "https://slsa.dev/provenance/v1";
export const publicReleaseAssetSpecs = {
  windows: [{ extension: ".msi" }, { extension: ".exe" }],
  macos: [{ extension: ".dmg" }],
  linux: [{ extension: ".AppImage" }, { extension: ".deb" }],
};

export function platformSignerWorkflow(repo, platform) {
  return `${repo}/.github/workflows/release-build-${platform}.yml`;
}

function assetNameMatchesVersion(name, expectedVersion) {
  const version = String(expectedVersion ?? "").trim().replace(/^v/i, "");
  if (!version) {
    return false;
  }

  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^0-9a-z.])v?${escapedVersion}($|[^0-9a-z.])`, "i").test(
    String(name ?? ""),
  );
}

function platformSpec(platform) {
  const spec = publicReleaseAssetSpecs[platform];
  if (!spec) {
    throw new Error(`Unsupported release platform: ${platform}`);
  }
  return spec;
}

export function findPlatformInstallerAssets(release, { platform, expectedVersion }) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];

  return platformSpec(platform).map(({ extension }) => {
    const matches = assets.filter((asset) => {
      const name = typeof asset?.name === "string" ? asset.name : "";
      const url =
        typeof asset?.browser_download_url === "string"
          ? asset.browser_download_url
          : "";

      return (
        name.endsWith(extension) &&
        assetNameMatchesVersion(name, expectedVersion) &&
        url.startsWith("https://")
      );
    });

    if (matches.length !== 1) {
      const names = matches.map((asset) => asset.name).join(", ") || "(none)";
      throw new Error(
        `Expected exactly one ${platform} ${extension} asset for ${expectedVersion}; found ${matches.length}: ${names}`,
      );
    }

    return matches[0];
  });
}

function selectedPlatformAssetExtensions(platforms) {
  return new Set(
    platforms.flatMap((platform) => platformSpec(platform).map(({ extension }) => extension)),
  );
}

function selectedAssetExtension(name, selectedExtensions) {
  for (const extension of selectedExtensions) {
    if (name.endsWith(extension) || name.endsWith(`${extension}.sha256`)) {
      return extension;
    }
  }

  return undefined;
}

export function validateExactPublicInstallerAssetSet(release, { platforms, expectedAssets }) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const selectedExtensions = selectedPlatformAssetExtensions(platforms);
  const expectedNames = new Set(
    expectedAssets.flatMap((asset) => [asset.name, `${asset.name}.sha256`]),
  );
  const unexpected = assets
    .map((asset) => (typeof asset?.name === "string" ? asset.name : ""))
    .filter(Boolean)
    .filter((name) => selectedAssetExtension(name, selectedExtensions))
    .filter((name) => !expectedNames.has(name));

  if (unexpected.length > 0) {
    throw new Error(
      `Release contains stale or unexpected installer assets for selected platforms: ${unexpected.join(", ")}`,
    );
  }
}

export function validatePublicationPlatformScope(release, platforms) {
  const excluded = Object.keys(publicReleaseAssetSpecs).filter(platform => !platforms.includes(platform));
  const extensions = selectedPlatformAssetExtensions(excluded);
  if (release.assets.some(asset => selectedAssetExtension(asset.name, extensions))) {
    throw new Error("Draft contains installers outside the advertised platform scope.");
  }
}

export function validateWindowsUnsignedAssetLabel(asset, { requireWindowsUnsignedLabel }) {
  if (!requireWindowsUnsignedLabel) return;

  const name = typeof asset?.name === "string" ? asset.name : "";
  if (!name.toLowerCase().includes("_unsigned")) {
    throw new Error(
      `Unsigned Windows no-account release asset must include "_unsigned" in the file name: ${name}`,
    );
  }
}

async function sha256File(path) {
  const data = await readFile(path);
  return createHash("sha256").update(data).digest("hex");
}

async function verifyChecksum({ release, asset, assetPath, requireChecksum, downloadFile }) {
  const checksumAsset = findChecksumAsset(release, asset);
  if (!checksumAsset) {
    if (requireChecksum) {
      throw new Error(`No SHA-256 checksum asset found for ${asset.name}. Expected ${asset.name}.sha256.`);
    }
    console.warn(`No SHA-256 checksum asset found for ${asset.name}; skipping checksum check.`);
    return await sha256File(assetPath);
  }

  const checksumPath = `${assetPath}.sha256`;
  console.log(`Downloading public checksum asset: ${checksumAsset.browser_download_url}`);
  await downloadFile(checksumAsset, checksumPath);

  const expected = parseSha256Checksum(await readFile(checksumPath, "utf8"), basename(assetPath));
  const actual = await sha256File(assetPath);
  if (actual !== expected) {
    throw new Error(`SHA-256 checksum mismatch for ${asset.name}. Expected ${expected}, found ${actual}.`);
  }

  return actual;
}

export function validatePublicReleaseSupplyChain({
  manifest,
  sbom,
  sbomDigest,
  assetDigests,
  expectedVersion,
  platform,
}) {
  const { manifestName } = validateReleaseSbomDocument({
    manifest,
    sbom,
    sbomDigest,
    expectedVersion,
    platform,
  });

  for (const [fileName, digest] of Object.entries(assetDigests)) {
    const assetEntry = manifest.assets?.find((asset) => asset.fileName === fileName);
    if (!assetEntry) {
      throw new Error(`${manifestName} must include downloaded release asset ${fileName}.`);
    }

    if (assetEntry.kind !== "installer") {
      throw new Error(`${manifestName} must mark ${fileName} as an installer asset.`);
    }

    if (assetEntry.sha256 !== digest) {
      throw new Error(`${manifestName} SHA-256 for ${fileName} does not match downloaded asset.`);
    }
  }
}

async function verifySupplyChain({
  release,
  platform,
  assetDigests,
  expectedVersion,
  tempRoot,
  repo,
  requireSupplyChain,
  requireAttestations,
  assetPaths,
  expectedRevision,
  downloadFile,
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

  const manifestPath = join(tempRoot, manifestName);
  const sbomPath = join(tempRoot, sbomName);
  console.log(`Downloading public ${platform} SBOM manifest asset: ${manifestAsset.browser_download_url}`);
  await downloadFile(manifestAsset, manifestPath);
  console.log(`Downloading public ${platform} SBOM asset: ${sbomAsset.browser_download_url}`);
  await downloadFile(sbomAsset, sbomPath);

  validatePublicReleaseSupplyChain({
    manifest: JSON.parse(await readFile(manifestPath, "utf8")),
    sbom: JSON.parse(await readFile(sbomPath, "utf8")),
    sbomDigest: await sha256File(sbomPath),
    assetDigests,
    expectedVersion,
    platform,
  });

  if (!requireAttestations) {
    return;
  }

  const signerWorkflow = platformSignerWorkflow(repo, platform);
  for (const assetPath of assetPaths) {
    verifyGitHubAttestation({
      artifactPath: assetPath,
      repo,
      predicateType: slsaPredicateType,
      signerWorkflow,
      expectedRevision,
    });
    verifyGitHubAttestation({
      artifactPath: assetPath,
      repo,
      predicateType: spdxPredicateType,
      signerWorkflow,
      expectedRevision,
    });
  }
}

async function verifyPlatform({ release, platform, expectedVersion, options, tempRoot, assets, downloadFile }) {
  const assetDigests = {};
  const assetPaths = [];

  for (const asset of assets) {
    const assetPath = join(tempRoot, basename(asset.name));
    console.log(`Downloading public ${platform} release asset: ${asset.browser_download_url}`);
    await downloadFile(asset, assetPath);

    const assetStat = await stat(assetPath);
    if (!assetStat.isFile() || assetStat.size === 0) {
      throw new Error(`Downloaded ${platform} release asset is empty: ${asset.name}`);
    }

    if (platform === "windows") {
      validateWindowsUnsignedAssetLabel(asset, {
        requireWindowsUnsignedLabel: options.requireWindowsUnsignedLabel,
      });
    }

    assetDigests[asset.name] = await verifyChecksum({
      release,
      asset,
      assetPath,
      requireChecksum: options.requireChecksum,
      downloadFile,
    });
    assetPaths.push(assetPath);
  }

  await verifySupplyChain({
    release,
    platform,
    assetDigests,
    expectedVersion,
    tempRoot,
    repo: options.repo,
    requireSupplyChain: options.requireSupplyChain,
    requireAttestations: options.requireAttestations && !(options.localMacos && platform === "macos"),
    assetPaths,
    expectedRevision: options.expectedRevision,
    downloadFile,
  });

  console.log(`Public ${platform} release assets verified.`);
}

async function verifyAgentSkillsArchives({ release, expectedVersion, options, tempRoot, downloadFile }) {
  const assets = findAgentSkillsArchiveAssets(release, { expectedVersion });

  for (const asset of assets) {
    const assetPath = join(tempRoot, basename(asset.name));
    console.log(`Downloading public Agent Skills archive: ${asset.browser_download_url}`);
    await downloadFile(asset, assetPath);

    const assetStat = await stat(assetPath);
    if (!assetStat.isFile() || assetStat.size === 0) {
      throw new Error(`Downloaded Agent Skills archive is empty: ${asset.name}`);
    }

    await verifyChecksum({
      release,
      asset,
      assetPath,
      requireChecksum: options.requireChecksum,
      downloadFile,
    });
    validateAgentSkillsArchiveContents({
      archive: await readFile(assetPath),
      assetName: asset.name,
      expectedVersion,
    });

    if (options.requireAttestations) {
      verifyGitHubAttestation({
        artifactPath: assetPath,
        repo: options.repo,
        predicateType: slsaPredicateType,
        signerWorkflow: `${options.repo}/.github/workflows/release-stage.yml`,
        expectedRevision: options.expectedRevision,
      });
    }
  }

  console.log("Public Agent Skills archives verified.");
}

export async function verifyPublicReleaseAssets(options) {
  const client = createReleaseClient(options);
  const release = await client.release();
  const downloaded = new Map(), digests = new Map();
  const downloadFile = async (asset, path) => {
    if (downloaded.get(asset.id ?? asset.name) !== path) await client.download(asset, path);
    downloaded.set(asset.id ?? asset.name, path);
    digests.set(asset.id, await sha256File(path));
  };
  const expectedVersion =
    options.expectedVersion ??
    (typeof release.tag_name === "string" ? release.tag_name.replace(/^v/, "") : undefined);

  if (!expectedVersion) {
    throw new Error("Could not determine expected release version.");
  }

  const tempRoot = mkdtempSync(join(tmpdir(), "jobsentinel-public-release-"));
  try {
    const platformAssets = new Map(
      options.platforms.map((platform) => [
        platform,
        findPlatformInstallerAssets(release, { platform, expectedVersion }),
      ]),
    );
    validateExactPublicInstallerAssetSet(release, {
      platforms: options.platforms,
      expectedAssets: [...platformAssets.values()].flat(),
    });
    validateExactAgentSkillsAssetSet(release, { expectedVersion });
    if (options.requirePhases) validatePublicationPlatformScope(release, options.platforms);

    if (options.requirePhases || options.localMacos) {
      await verifyPhaseAssets({ release, tempRoot, downloadFile, revision: options.expectedRevision,
        version: expectedVersion, platforms: options.platforms, localMacos: options.localMacos,
        macosAsset: platformAssets.get("macos")?.[0] });
    }

    await verifyAgentSkillsArchives({
      release,
      expectedVersion,
      options,
      tempRoot,
      downloadFile,
    });

    for (const platform of options.platforms) {
      await verifyPlatform({
        release,
        platform,
        expectedVersion,
        options,
        tempRoot,
        downloadFile,
        assets: platformAssets.get(platform),
      });
    }
    if (options.requirePhases) {
      return verifiedSnapshot(release, await client.release(), digests, options.expectedSnapshot);
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

export async function main({ args = process.argv.slice(2) } = {}) {
  const options = parseArgs(args);
  if (options.platforms.length === 0) {
    throw new Error("At least one platform must be specified.");
  }

  const snapshot = await verifyPublicReleaseAssets(options);
  if (options.writeSnapshotOutput) {
    if (!snapshot || !process.env.GITHUB_OUTPUT) throw new Error("Verified snapshot output requires GITHUB_OUTPUT.");
    appendFileSync(process.env.GITHUB_OUTPUT, `snapshot=${snapshot}\n`);
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
