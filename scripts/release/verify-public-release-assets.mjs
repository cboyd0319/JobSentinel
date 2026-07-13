#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createWriteStream, mkdtempSync, rmSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import {
  expectedAgentSkillsArchiveNames,
  findAgentSkillsArchiveAssets,
  validateExactAgentSkillsAssetSet,
  listTarGzArchivePaths,
  listZipArchivePaths,
  validateAgentSkillsArchiveContents,
} from "./public-assets/agent-skills.mjs";
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
  verifyGitHubAttestation,
} from "./verify-latest-macos-release.mjs";

const verifierUserAgent = "JobSentinel-public-release-verifier";
const spdxPredicateType = "https://spdx.dev/Document/v2.3";
const slsaPredicateType = "https://slsa.dev/provenance/v1";
export const publicReleaseAssetSpecs = {
  windows: [{ extension: ".msi" }, { extension: ".exe" }],
  macos: [{ extension: ".dmg" }],
  linux: [{ extension: ".AppImage" }, { extension: ".deb" }],
};

function releaseApiUrl({ repo, releaseTag }) {
  const base = `https://api.github.com/repos/${repo}/releases`;
  return releaseTag ? `${base}/tags/${encodeURIComponent(releaseTag)}` : `${base}/latest`;
}

function githubFetchHeaders({
  acceptJson = false,
  token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "",
} = {}) {
  const headers = {
    "User-Agent": verifierUserAgent,
  };

  if (acceptJson) {
    headers.Accept = "application/vnd.github+json";
  }

  const trimmedToken = token.trim();
  if (trimmedToken) {
    headers.Authorization = `Bearer ${trimmedToken}`;
  }

  return headers;
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

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: githubFetchHeaders({ acceptJson: true }),
  });

  if (!response.ok) {
    throw new Error(`GitHub release lookup failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function downloadFile(url, destination) {
  const response = await fetch(url, {
    headers: githubFetchHeaders(),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Release asset download failed: ${response.status} ${response.statusText}`);
  }

  await pipeline(response.body, createWriteStream(destination));
}

async function verifyChecksum({ release, asset, assetPath, requireChecksum }) {
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
  await downloadFile(checksumAsset.browser_download_url, checksumPath);

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
  await downloadFile(manifestAsset.browser_download_url, manifestPath);
  console.log(`Downloading public ${platform} SBOM asset: ${sbomAsset.browser_download_url}`);
  await downloadFile(sbomAsset.browser_download_url, sbomPath);

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

  for (const assetPath of assetPaths) {
    verifyGitHubAttestation({
      artifactPath: assetPath,
      repo,
      predicateType: slsaPredicateType,
    });
    verifyGitHubAttestation({
      artifactPath: assetPath,
      repo,
      predicateType: spdxPredicateType,
    });
  }
}

async function verifyPlatform({ release, platform, expectedVersion, options, tempRoot, assets }) {
  const assetDigests = {};
  const assetPaths = [];

  for (const asset of assets) {
    const assetPath = join(tempRoot, basename(asset.name));
    console.log(`Downloading public ${platform} release asset: ${asset.browser_download_url}`);
    await downloadFile(asset.browser_download_url, assetPath);

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
    requireAttestations: options.requireAttestations,
    assetPaths,
  });

  console.log(`Public ${platform} release assets verified.`);
}

async function verifyAgentSkillsArchives({ release, expectedVersion, options, tempRoot }) {
  const assets = findAgentSkillsArchiveAssets(release, { expectedVersion });

  for (const asset of assets) {
    const assetPath = join(tempRoot, basename(asset.name));
    console.log(`Downloading public Agent Skills archive: ${asset.browser_download_url}`);
    await downloadFile(asset.browser_download_url, assetPath);

    const assetStat = await stat(assetPath);
    if (!assetStat.isFile() || assetStat.size === 0) {
      throw new Error(`Downloaded Agent Skills archive is empty: ${asset.name}`);
    }

    await verifyChecksum({
      release,
      asset,
      assetPath,
      requireChecksum: options.requireChecksum,
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
      });
    }
  }

  console.log("Public Agent Skills archives verified.");
}

export async function verifyPublicReleaseAssets(options) {
  const release = await fetchJson(releaseApiUrl(options));
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

    await verifyAgentSkillsArchives({
      release,
      expectedVersion,
      options,
      tempRoot,
    });

    for (const platform of options.platforms) {
      await verifyPlatform({
        release,
        platform,
        expectedVersion,
        options,
        tempRoot,
        assets: platformAssets.get(platform),
      });
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

  await verifyPublicReleaseAssets(options);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
