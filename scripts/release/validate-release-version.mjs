#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "../..");

function cargoLockPackageVersion(text, packageName) {
  for (const block of text.split("[[package]]")) {
    if (block.match(/^\s*name\s*=\s*"([^"]+)"/m)?.[1] === packageName) {
      return block.match(/^\s*version\s*=\s*"([^"]+)"/m)?.[1];
    }
  }
  return undefined;
}

export function normalizeReleaseVersion(value) {
  return String(value ?? "")
    .trim()
    .replace(/^refs\/tags\//, "")
    .replace(/^v/, "");
}

export function readReleaseVersions(root = defaultRoot) {
  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const packageLock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
  const tauriConfig = JSON.parse(readFileSync(join(root, "src-tauri/tauri.conf.json"), "utf8"));
  const cargoToml = readFileSync(join(root, "Cargo.toml"), "utf8");
  const cargoLock = readFileSync(join(root, "Cargo.lock"), "utf8");
  const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
  const workspacePackageVersions = Object.fromEntries(
    [...cargoToml.matchAll(/^(jobsentinel-[a-z-]+)\s*=\s*\{[^}]*version\s*=\s*"=([^"]+)"[^}]*\}/gm)]
      .map(([, packageName, version]) => [packageName, version]),
  );

  return {
    "package.json": packageJson.version,
    "package-lock.json": packageLock.version,
    "package-lock.json root package": packageLock.packages?.[""]?.version,
    "src-tauri/tauri.conf.json": tauriConfig.version,
    "Cargo.toml": cargoVersion,
    "Cargo.lock jobsentinel": cargoLockPackageVersion(cargoLock, "jobsentinel"),
    ...Object.fromEntries(
      Object.entries(workspacePackageVersions).flatMap(([packageName, version]) => [
        [`Cargo.toml ${packageName} dependency`, version],
        [`Cargo.lock ${packageName}`, cargoLockPackageVersion(cargoLock, packageName)],
      ]),
    ),
  };
}

export function compareReleaseVersions(expectedValue, versions) {
  const expected = normalizeReleaseVersion(expectedValue);
  const failures = [];

  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(expected)) {
    failures.push(`Expected release version is invalid: ${expectedValue}`);
  }

  for (const [file, actual] of Object.entries(versions)) {
    if (!actual) {
      failures.push(`${file} is missing a version`);
      continue;
    }

    if (actual !== expected) {
      failures.push(`${file} has ${actual}; expected ${expected}`);
    }
  }

  return {
    expected,
    failures,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const expectedValue = process.argv[2] ?? process.env.GITHUB_REF_NAME;

  if (!expectedValue) {
    console.error("Usage: node scripts/release/validate-release-version.mjs <version-or-tag>");
    process.exitCode = 1;
  } else {
    const versions = readReleaseVersions();
    const result = compareReleaseVersions(expectedValue, versions);

    if (result.failures.length > 0) {
      console.error(`Release version check failed for ${result.expected || expectedValue}:`);
      for (const failure of result.failures) {
        console.error(`- ${failure}`);
      }
      process.exitCode = 1;
    } else {
      console.log(`Release version check passed: ${result.expected}`);
    }
  }
}
