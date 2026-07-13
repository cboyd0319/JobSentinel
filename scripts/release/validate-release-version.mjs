#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "../..");

export function normalizeReleaseVersion(value) {
  return String(value ?? "")
    .trim()
    .replace(/^refs\/tags\//, "")
    .replace(/^v/, "");
}

export function readReleaseVersions(root = defaultRoot) {
  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const tauriConfig = JSON.parse(readFileSync(join(root, "src-tauri/tauri.conf.json"), "utf8"));
  const cargoToml = readFileSync(join(root, "Cargo.toml"), "utf8");
  const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1];

  return {
    "package.json": packageJson.version,
    "src-tauri/tauri.conf.json": tauriConfig.version,
    "Cargo.toml": cargoVersion,
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
