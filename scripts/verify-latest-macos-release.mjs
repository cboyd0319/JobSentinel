#!/usr/bin/env node

import { createWriteStream, mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import { verifyMacosPackage } from "./verify-macos-package.mjs";

const defaultRepo = "cboyd0319/JobSentinel";

export function getArgValue(args, name) {
  const exactIndex = args.indexOf(name);
  if (exactIndex >= 0) {
    return args[exactIndex + 1];
  }

  const prefixed = args.find((arg) => arg.startsWith(`${name}=`));
  return prefixed ? prefixed.slice(name.length + 1) : undefined;
}

export function hasArg(args, name) {
  return args.some((arg) => arg === name || arg.startsWith(`${name}=`));
}

function splitList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

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
    repo: getArgValue(args, "--repo") ?? defaultRepo,
    requireGatekeeper,
    smokeSeconds: Number(getArgValue(args, "--smoke-seconds") ?? "12"),
  };
}

function releaseApiUrl({ repo, releaseTag }) {
  const base = `https://api.github.com/repos/${repo}/releases`;
  return releaseTag ? `${base}/tags/${encodeURIComponent(releaseTag)}` : `${base}/latest`;
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

export function parseSha256Checksum(content, expectedFileName) {
  const entries = [];

  for (const line of String(content ?? "").split(/\r?\n/)) {
    const match = line.match(/^\s*([a-fA-F0-9]{64})\s+\*?(.+?)\s*$/);
    if (match) {
      entries.push({
        digest: match[1].toLowerCase(),
        fileName: match[2],
      });
    }
  }

  if (entries.length !== 1) {
    throw new Error("SHA-256 checksum file must contain exactly one digest line.");
  }

  if (expectedFileName && basename(entries[0].fileName) !== expectedFileName) {
    throw new Error(
      `SHA-256 checksum filename expected ${expectedFileName}, found ${entries[0].fileName}.`,
    );
  }

  return entries[0].digest;
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
  await downloadFile(checksumAsset.browser_download_url, checksumPath);

  const expected = parseSha256Checksum(await readFile(checksumPath, "utf8"), basename(dmgPath));
  const actual = await sha256File(dmgPath);
  if (actual !== expected) {
    throw new Error(`SHA-256 checksum mismatch for ${dmgAsset.name}. Expected ${expected}, found ${actual}.`);
  }
  console.log(`SHA-256 checksum verified: ${actual}`);
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "JobSentinel-macOS-release-verifier",
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub release lookup failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function downloadFile(url, destination) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "JobSentinel-macOS-release-verifier",
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(`DMG download failed: ${response.status} ${response.statusText}`);
  }

  await pipeline(response.body, createWriteStream(destination));
}

export async function verifyLatestMacosRelease(options) {
  const release = await fetchJson(releaseApiUrl(options));
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
    await downloadFile(asset.browser_download_url, dmgPath);
    await verifyChecksum({
      release,
      dmgAsset: asset,
      dmgPath,
      requireChecksum: options.requireChecksum,
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

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
