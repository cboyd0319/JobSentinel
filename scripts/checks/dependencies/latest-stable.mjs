import { readFileSync } from "node:fs";

import { cargoLatestStableException } from "../../dependency/cargo-latest-exceptions.mjs";
import { npmOverrideDependencyPins } from "../../dependency/npm-overrides.mjs";
import { collectCargoDependencySpecs } from "./cargo-pins.mjs";
import {
  directNpmDependencies,
  npmPackageManagerPin,
} from "./npm-pins.mjs";
import {
  collectCargoInstallPins,
  parseNodeRuntimePin,
  parseRustToolchainPin,
} from "./runtime-pins.mjs";
import {
  compareStableSemver,
  cratesIoHeaders,
  defaultRoot,
  fetchJson,
  fetchText,
  highestStableVersion,
  mapWithLimit,
  parseStableSemver,
  readJson,
  repoPath,
} from "./shared.mjs";

function rustStableVersionFromChannelToml(text) {
  const rawVersion = String(text).match(
    /^\s*\[pkg\.rust\][\s\S]*?^\s*version\s*=\s*"([^"]+)"/m,
  )?.[1];
  return rawVersion?.match(/\b\d+\.\d+\.\d+\b/)?.[0] ?? null;
}

export async function collectRuntimeLatestStableViolations(
  root = defaultRoot,
  { fetchImpl = globalThis.fetch } = {},
) {
  if (typeof fetchImpl !== "function") {
    return ["runtime latest-stable check requires a fetch-capable Node runtime"];
  }

  const violations = [];
  const nodePin = parseNodeRuntimePin(root);
  const rustPin = parseRustToolchainPin(root);

  if (!nodePin.error) {
    try {
      const nodeIndex = await fetchJson(fetchImpl, "https://nodejs.org/dist/index.json");
      const latestLts = highestStableVersion(
        nodeIndex
          .filter((release) => release.lts)
          .map((release) => String(release.version).replace(/^v/, "")),
      );
      if (!latestLts) {
        violations.push("Node.js release index has no stable LTS versions");
      } else if (compareStableSemver(nodePin.version, latestLts) !== 0) {
        violations.push(
          `.nvmrc is pinned to ${nodePin.version}; latest stable Node.js LTS version is ${latestLts}`,
        );
      }
    } catch (error) {
      violations.push(`Node.js latest-stable lookup failed: ${error.message}`);
    }
  }

  if (!rustPin.error) {
    try {
      const rustChannel = await fetchText(
        fetchImpl,
        "https://static.rust-lang.org/dist/channel-rust-stable.toml",
      );
      const latestRust = rustStableVersionFromChannelToml(rustChannel);
      if (!latestRust) {
        violations.push("Rust stable channel metadata did not include a stable version");
      } else if (compareStableSemver(rustPin.version, latestRust) !== 0) {
        violations.push(
          `rust-toolchain.toml is pinned to ${rustPin.version}; latest stable Rust version is ${latestRust}`,
        );
      }
    } catch (error) {
      violations.push(`Rust latest-stable lookup failed: ${error.message}`);
    }
  }

  const uniqueCargoInstalls = [
    ...new Map(
      collectCargoInstallPins(root)
        .filter((command) => command.version)
        .map((command) => [command.name, command]),
    ).values(),
  ];
  const checks = await mapWithLimit(uniqueCargoInstalls, 4, async (command) => {
    try {
      const metadata = await fetchJson(
        fetchImpl,
        `https://crates.io/api/v1/crates/${encodeURIComponent(command.name)}`,
        cratesIoHeaders,
      );
      const latest = highestStableVersion(
        (metadata.versions ?? [])
          .filter((version) => !version.yanked)
          .map((version) => version.num),
      );
      if (!latest) {
        return `crates.io has no stable non-yanked versions for ${command.name}`;
      }
      if (compareStableSemver(command.version, latest) !== 0) {
        return `${command.path}:${command.line} cargo install ${command.name} is pinned to ${command.version}; latest stable crates.io version is ${latest}`;
      }
    } catch (error) {
      return `crates.io latest-stable lookup failed for ${command.name}: ${error.message}`;
    }
    return null;
  });

  violations.push(...checks.filter(Boolean));
  return violations;
}

export async function collectNpmLatestStableViolations(
  root = defaultRoot,
  { fetchImpl = globalThis.fetch } = {},
) {
  if (typeof fetchImpl !== "function") {
    return ["npm latest-stable check requires a fetch-capable Node runtime"];
  }

  const packageJson = readJson(root, "package.json");
  const directDependencies = directNpmDependencies(packageJson);
  const overrideDependencies = npmOverrideDependencyPins(packageJson)
    .filter((dependency) => dependency.name && parseStableSemver(dependency.version))
    .map((dependency) => ({
      label: dependency.label,
      name: dependency.name,
      version: dependency.version,
    }));
  const packageManager = npmPackageManagerPin(packageJson);
  const packageManagerTarget = packageManager.version
    ? [
        {
          label: "package.json packageManager npm",
          name: "npm",
          version: packageManager.version,
        },
      ]
    : [];
  const dependencyTargets = directDependencies.map((dependency) => ({
    label: `package.json ${dependency.name}`,
    name: dependency.name,
    version: dependency.version,
  }));
  const targets = packageManagerTarget.concat(
    dependencyTargets,
    overrideDependencies,
  );

  const checks = await mapWithLimit(targets, 8, async (dependency) => {
    try {
      const metadata = await fetchJson(
        fetchImpl,
        `https://registry.npmjs.org/${encodeURIComponent(dependency.name)}`,
      );
      const latest = highestStableVersion(Object.keys(metadata.versions ?? {}));
      if (!latest) return `npm registry has no stable versions for ${dependency.name}`;
      if (compareStableSemver(dependency.version, latest) !== 0) {
        return `${dependency.label} is pinned to ${dependency.version}; latest stable npm version is ${latest}`;
      }
    } catch (error) {
      return `npm latest-stable lookup failed for ${dependency.name}: ${error.message}`;
    }
    return null;
  });
  return checks.filter(Boolean);
}

export async function collectCargoLatestStableViolations(
  root = defaultRoot,
  { fetchImpl = globalThis.fetch } = {},
) {
  if (typeof fetchImpl !== "function") {
    return ["Cargo latest-stable check requires a fetch-capable Node runtime"];
  }

  const cargoTomlText = readFileSync(repoPath(root, "Cargo.toml"), "utf8");
  const dependencies = collectCargoDependencySpecs(cargoTomlText).filter(
    (dependency) => dependency.version?.startsWith("="),
  );
  const uniqueDependencies = [
    ...new Map(dependencies.map((dependency) => [dependency.name, dependency])).values(),
  ];
  const checks = await mapWithLimit(uniqueDependencies, 6, async (dependency) => {
    try {
      const metadata = await fetchJson(
        fetchImpl,
        `https://crates.io/api/v1/crates/${encodeURIComponent(dependency.name)}`,
        cratesIoHeaders,
      );
      const latest = highestStableVersion(
        (metadata.versions ?? [])
          .filter((version) => !version.yanked)
          .map((version) => version.num),
      );
      if (!latest) {
        return `crates.io has no stable non-yanked versions for ${dependency.name}`;
      }

      const current = dependency.version.slice(1);
      if (compareStableSemver(current, latest) !== 0) {
        if (cargoLatestStableException(dependency, dependencies, cargoTomlText)) {
          return null;
        }
        return `Cargo.toml ${dependency.name} is pinned to ${current}; latest stable crates.io version is ${latest}`;
      }
    } catch (error) {
      return `crates.io latest-stable lookup failed for ${dependency.name}: ${error.message}`;
    }
    return null;
  });
  return checks.filter(Boolean);
}
