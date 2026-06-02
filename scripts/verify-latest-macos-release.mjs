#!/usr/bin/env node

import { createWriteStream, mkdtempSync, rmSync } from "node:fs";
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
    repo: getArgValue(args, "--repo") ?? defaultRepo,
    requireGatekeeper: hasArg(args, "--require-gatekeeper") && !hasArg(args, "--no-require-gatekeeper"),
    smokeSeconds: Number(getArgValue(args, "--smoke-seconds") ?? "12"),
  };
}

function releaseApiUrl({ repo, releaseTag }) {
  const base = `https://api.github.com/repos/${repo}/releases`;
  return releaseTag ? `${base}/tags/${encodeURIComponent(releaseTag)}` : `${base}/latest`;
}

export function findMacosDmgAsset(release, assetPattern = "universal.dmg") {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const lowerPattern = assetPattern.toLowerCase();

  return assets.find((asset) => {
    const name = typeof asset?.name === "string" ? asset.name : "";
    const url =
      typeof asset?.browser_download_url === "string"
        ? asset.browser_download_url
        : "";
    const lowerName = name.toLowerCase();

    return (
      lowerName.endsWith(".dmg") &&
      lowerName.includes(lowerPattern) &&
      url.startsWith("https://")
    );
  });
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
  const asset = findMacosDmgAsset(release, options.assetPattern);
  const expectedBundleMetadata = {
    ...options.expectedBundleMetadata,
    version:
      options.expectedBundleMetadata?.version ??
      (typeof release.tag_name === "string" ? release.tag_name.replace(/^v/, "") : undefined),
  };

  if (!asset) {
    const names = (release.assets ?? []).map((item) => item.name).join(", ");
    throw new Error(
      `No macOS DMG asset matched "${options.assetPattern}" on ${release.tag_name ?? "latest release"}. Assets: ${names || "(none)"}`,
    );
  }

  const tempRoot = mkdtempSync(join(tmpdir(), "jobsentinel-public-macos-"));
  const dmgPath = join(tempRoot, basename(asset.name));

  try {
    console.log(`Downloading public macOS release asset: ${asset.browser_download_url}`);
    await downloadFile(asset.browser_download_url, dmgPath);
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
