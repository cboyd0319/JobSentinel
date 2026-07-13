#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import { collectCargoCompatibleUpdateViolations } from "../dependency/cargo-compatible-updates.mjs";
import {
  collectNpmCompatibleOutdatedViolations,
  collectNpmCompatibleUpdateViolations,
} from "../dependency/npm-compatible-updates.mjs";
import { npmOverrideDependencyPins } from "../dependency/npm-overrides.mjs";
import { collectTauriLinuxDebDependencyViolations } from "../dependency/tauri-linux-deb.mjs";
import { collectCargoPinViolations } from "./dependencies/cargo-pins.mjs";
import {
  collectCargoLatestStableViolations,
  collectNpmLatestStableViolations,
  collectRuntimeLatestStableViolations,
} from "./dependencies/latest-stable.mjs";
import { collectNpmPinViolations } from "./dependencies/npm-pins.mjs";
import { collectRuntimePinViolations } from "./dependencies/runtime-pins.mjs";
import { defaultRoot } from "./dependencies/shared.mjs";

export { collectCargoDependencySpecs } from "./dependencies/cargo-pins.mjs";
export {
  collectCargoLatestStableViolations,
  collectNpmLatestStableViolations,
  collectRuntimeLatestStableViolations,
};
export { collectNpmPinViolations };
export { collectRuntimePinViolations };
export { collectCargoPinViolations };
export {
  compareStableSemver,
  highestStableVersion,
  parseStableSemver,
} from "./dependencies/shared.mjs";
export {
  collectCargoCompatibleUpdateViolations,
  collectNpmCompatibleOutdatedViolations,
  collectNpmCompatibleUpdateViolations,
  collectTauriLinuxDebDependencyViolations,
  npmOverrideDependencyPins,
};

export function collectDependencyPinViolations(root = defaultRoot) {
  return [
    ...collectRuntimePinViolations(root),
    ...collectNpmPinViolations(root),
    ...collectCargoPinViolations(root),
  ];
}

export async function collectLatestStableViolations(root = defaultRoot) {
  return [
    ...collectDependencyPinViolations(root),
    ...(await collectRuntimeLatestStableViolations(root)),
    ...(await collectNpmLatestStableViolations(root)),
    ...(await collectCargoLatestStableViolations(root)),
    ...collectNpmCompatibleUpdateViolations(root),
    ...collectNpmCompatibleOutdatedViolations(root),
    ...collectCargoCompatibleUpdateViolations(root),
  ];
}

export async function main(argv = process.argv.slice(2), root = defaultRoot) {
  const checkLatest = argv.includes("--latest");
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log("Usage: node scripts/checks/dependency-pins.mjs [--latest]");
    console.log("");
    console.log("Default: offline exact-pin and lockfile consistency checks.");
    console.log(
      "--latest: also query npm/crates.io latest stable direct/override versions and run npm/Cargo lockfile freshness checks.",
    );
    return;
  }

  const violations = checkLatest
    ? await collectLatestStableViolations(root)
    : collectDependencyPinViolations(root);
  if (violations.length > 0) {
    console.error("Dependency pin check failed:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    checkLatest
      ? "Dependency pin check passed: exact runtime/tool/package-manager pins, workflow OS runner and apt-package pins, exact direct and override pins, latest stable package manager/direct/override dependencies/tools, stable lockfile policy, and lockfile freshness verified."
      : "Dependency pin check passed: exact runtime/tool/package-manager pins, workflow OS runner and apt-package pins, package, crate, and override pins, plus stable lockfile policy verified.",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
