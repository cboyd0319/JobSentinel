#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createWriteStream, mkdtempSync, rmSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import { gunzipSync, inflateRawSync } from "node:zlib";
import {
  expectedReleaseSbomNames,
  findChecksumAsset,
  findReleaseAssetByName,
  parseSha256Checksum,
  verifyGitHubAttestation,
} from "./verify-latest-macos-release.mjs";

const defaultRepo = "cboyd0319/JobSentinel";
const verifierUserAgent = "JobSentinel-public-release-verifier";
const spdxPredicateType = "https://spdx.dev/Document/v2.3";
const slsaPredicateType = "https://slsa.dev/provenance/v1";
const agentSkillNames = [
  "application-form-review",
  "application-tracking",
  "interview-prep",
  "job-posting-risk-review",
  "job-search-plan",
  "networking-outreach",
  "offer-pay-review",
  "resume-tailoring",
];

const crc32Table = new Uint32Array(256);
for (let index = 0; index < crc32Table.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crc32Table[index] = value >>> 0;
}

export const publicReleaseAssetSpecs = {
  windows: [{ extension: ".msi" }],
  macos: [{ extension: ".dmg" }],
  linux: [{ extension: ".AppImage" }, { extension: ".deb" }],
};

function getArgValue(args, name) {
  const exactIndex = args.indexOf(name);
  if (exactIndex >= 0) {
    return args[exactIndex + 1];
  }

  const prefixed = args.find((arg) => arg.startsWith(`${name}=`));
  return prefixed ? prefixed.slice(name.length + 1) : undefined;
}

function hasArg(args, name) {
  return args.some((arg) => arg === name || arg.startsWith(`${name}=`));
}

function splitList(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = crc32Table[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

export function parseArgs(args) {
  const platforms = splitList(getArgValue(args, "--platforms") ?? "windows,macos,linux");
  const requireSupplyChain =
    hasArg(args, "--require-supply-chain") || !hasArg(args, "--no-require-supply-chain");

  return {
    expectedVersion: getArgValue(args, "--expected-version"),
    platforms,
    releaseTag: getArgValue(args, "--tag"),
    repo: getArgValue(args, "--repo") ?? defaultRepo,
    requireAttestations:
      requireSupplyChain &&
      !hasArg(args, "--no-require-attestations") &&
      !hasArg(args, "--no-require-supply-chain"),
    requireChecksum: !hasArg(args, "--no-require-checksum"),
    requireSupplyChain,
  };
}

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

export function expectedAgentSkillsArchiveNames(expectedVersion) {
  const version = String(expectedVersion ?? "").trim().replace(/^v/i, "");
  return [
    `JobSentinel-${version}-agent-skills.tar.gz`,
    `JobSentinel-${version}-agent-skills.zip`,
  ];
}

function isAgentSkillsAssetName(name) {
  return /^JobSentinel-[0-9]+\.[0-9]+\.[0-9]+-agent-skills\.(?:tar\.gz|zip)(?:\.sha256)?$/.test(
    name,
  );
}

export function findAgentSkillsArchiveAssets(release, { expectedVersion }) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  return expectedAgentSkillsArchiveNames(expectedVersion).map((name) => {
    const asset = assets.find((candidate) => candidate?.name === name);
    if (!asset) {
      throw new Error(`Release is missing required Agent Skills archive: ${name}`);
    }

    const url =
      typeof asset.browser_download_url === "string" ? asset.browser_download_url : "";
    if (!url.startsWith("https://")) {
      throw new Error(`Agent Skills archive must use an HTTPS download URL: ${name}`);
    }

    return asset;
  });
}

export function validateExactAgentSkillsAssetSet(release, { expectedVersion }) {
  const expectedNames = new Set(
    expectedAgentSkillsArchiveNames(expectedVersion).flatMap((name) => [name, `${name}.sha256`]),
  );
  const unexpected = (Array.isArray(release?.assets) ? release.assets : [])
    .map((asset) => (typeof asset?.name === "string" ? asset.name : ""))
    .filter(Boolean)
    .filter(isAgentSkillsAssetName)
    .filter((name) => !expectedNames.has(name));

  if (unexpected.length > 0) {
    throw new Error(`Release contains stale or unexpected Agent Skills assets: ${unexpected.join(", ")}`);
  }
}

export function listTarGzArchivePaths(archive) {
  const tar = gunzipSync(archive);
  const paths = [];
  let offset = 0;

  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      if (!tar.subarray(offset).every((byte) => byte === 0)) {
        throw new Error("Agent Skills tar archive contains unexpected data after end marker.");
      }
      break;
    }

    const name = header.toString("utf8", 0, 100).replace(/\0.*$/u, "");
    const expectedChecksum = Number.parseInt(
      header.toString("utf8", 148, 156).replace(/\0.*$/u, "").trim() || "0",
      8,
    );
    const checksumHeader = Buffer.from(header);
    checksumHeader.fill(0x20, 148, 156);
    let actualChecksum = 0;
    for (const byte of checksumHeader) {
      actualChecksum += byte;
    }

    if (actualChecksum !== expectedChecksum) {
      throw new Error(`Agent Skills tar header checksum mismatch: ${name || "(unnamed entry)"}`);
    }

    const sizeText = header.toString("utf8", 124, 136).replace(/\0.*$/u, "").trim();
    const size = Number.parseInt(sizeText || "0", 8);
    if (!Number.isFinite(size) || size < 0) {
      throw new Error(`Invalid tar entry size for ${name || "(unnamed entry)"}.`);
    }

    paths.push(name);
    offset += 512 + Math.ceil(size / 512) * 512;
  }

  return paths;
}

export function listZipArchivePaths(archive) {
  const paths = [];
  const localEntries = [];
  let offset = 0;

  while (offset + 30 <= archive.length) {
    const signature = archive.readUInt32LE(offset);
    if (signature !== 0x04034b50) {
      break;
    }

    const method = archive.readUInt16LE(offset + 8);
    const expectedCrc = archive.readUInt32LE(offset + 14);
    const compressedSize = archive.readUInt32LE(offset + 18);
    const uncompressedSize = archive.readUInt32LE(offset + 22);
    const nameLength = archive.readUInt16LE(offset + 26);
    const extraLength = archive.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const nameEnd = nameStart + nameLength;
    const bodyStart = nameEnd + extraLength;
    const bodyEnd = bodyStart + compressedSize;

    if (bodyEnd > archive.length) {
      throw new Error("Agent Skills ZIP archive has a truncated entry.");
    }

    const name = archive.toString("utf8", nameStart, nameEnd);
    const compressedBody = archive.subarray(bodyStart, bodyEnd);
    const body =
      method === 0 ? compressedBody : method === 8 ? inflateRawSync(compressedBody) : undefined;
    if (!body) {
      throw new Error(`Agent Skills ZIP archive uses unsupported compression method ${method}.`);
    }

    if (body.length !== uncompressedSize) {
      throw new Error(`Agent Skills ZIP entry size mismatch: ${name}`);
    }

    if (crc32(body) !== expectedCrc) {
      throw new Error(`Agent Skills ZIP entry CRC mismatch: ${name}`);
    }

    paths.push(name);
    localEntries.push({ name, offset });
    offset = bodyEnd;
  }

  const centralDirectoryOffset = offset;
  const centralEntries = [];
  while (offset + 46 <= archive.length && archive.readUInt32LE(offset) === 0x02014b50) {
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const localHeaderOffset = archive.readUInt32LE(offset + 42);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;
    const entryEnd = nameEnd + extraLength + commentLength;
    if (entryEnd > archive.length) {
      throw new Error("Agent Skills ZIP archive has a truncated central directory entry.");
    }

    centralEntries.push({
      localHeaderOffset,
      name: archive.toString("utf8", nameStart, nameEnd),
    });
    offset = entryEnd;
  }

  if (offset + 22 > archive.length || archive.readUInt32LE(offset) !== 0x06054b50) {
    throw new Error("Agent Skills ZIP archive is missing the end of central directory.");
  }

  const diskEntryCount = archive.readUInt16LE(offset + 8);
  const totalEntryCount = archive.readUInt16LE(offset + 10);
  const centralDirectorySize = archive.readUInt32LE(offset + 12);
  const reportedCentralDirectoryOffset = archive.readUInt32LE(offset + 16);
  const commentLength = archive.readUInt16LE(offset + 20);
  const archiveEnd = offset + 22 + commentLength;

  if (archiveEnd !== archive.length) {
    throw new Error("Agent Skills ZIP archive contains trailing data after central directory.");
  }

  if (
    diskEntryCount !== localEntries.length ||
    totalEntryCount !== localEntries.length ||
    centralEntries.length !== localEntries.length
  ) {
    throw new Error("Agent Skills ZIP central directory entry count mismatch.");
  }

  if (reportedCentralDirectoryOffset !== centralDirectoryOffset) {
    throw new Error("Agent Skills ZIP central directory offset mismatch.");
  }

  if (centralDirectorySize !== offset - centralDirectoryOffset) {
    throw new Error("Agent Skills ZIP central directory size mismatch.");
  }

  for (let index = 0; index < localEntries.length; index += 1) {
    if (
      centralEntries[index].name !== localEntries[index].name ||
      centralEntries[index].localHeaderOffset !== localEntries[index].offset
    ) {
      throw new Error("Agent Skills ZIP central directory does not match local entries.");
    }
  }

  return paths;
}

function validateAgentSkillsArchivePaths(paths, { expectedVersion, assetName }) {
  const version = String(expectedVersion ?? "").trim().replace(/^v/i, "");
  const prefix = `JobSentinel-${version}-agent-skills/skills`;
  const missing = [];

  for (const path of paths) {
    const parts = path.split("/");
    if (path.startsWith("/") || parts.includes("..")) {
      throw new Error(`Agent Skills archive contains unsafe path: ${path}`);
    }

    if (parts.some((part) => part.startsWith("."))) {
      throw new Error(`Agent Skills archive contains hidden path: ${path}`);
    }

    if (!path.startsWith(`${prefix}/`)) {
      throw new Error(`Agent Skills archive contains path outside expected Agent Skills root: ${path}`);
    }
  }

  if (!paths.includes(`${prefix}/README.md`)) {
    missing.push(`${prefix}/README.md`);
  }

  for (const skillName of agentSkillNames) {
    const skillPrefix = `${prefix}/${skillName}`;
    for (const requiredPath of [
      `${skillPrefix}/SKILL.md`,
      `${skillPrefix}/agents/openai.yaml`,
    ]) {
      if (!paths.includes(requiredPath)) {
        missing.push(requiredPath);
      }
    }

    if (!paths.some((path) => path.startsWith(`${skillPrefix}/assets/`))) {
      missing.push(`${skillPrefix}/assets/`);
    }

    if (!paths.some((path) => path.startsWith(`${skillPrefix}/references/`))) {
      missing.push(`${skillPrefix}/references/`);
    }
  }

  if (missing.length > 0) {
    throw new Error(`${assetName} is missing required Agent Skills entries: ${missing.join(", ")}`);
  }
}

export function validateAgentSkillsArchiveContents({ assetName, archive, expectedVersion }) {
  const paths = assetName.endsWith(".tar.gz")
    ? listTarGzArchivePaths(archive)
    : assetName.endsWith(".zip")
      ? listZipArchivePaths(archive)
      : undefined;

  if (!paths) {
    throw new Error(`Unsupported Agent Skills archive type: ${assetName}`);
  }

  validateAgentSkillsArchivePaths(paths, { assetName, expectedVersion });
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
