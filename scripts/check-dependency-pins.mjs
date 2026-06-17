#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { collectCargoCompatibleUpdateViolations } from "./dependency/cargo-compatible-updates.mjs";
import {
  collectNpmCompatibleOutdatedViolations,
  collectNpmCompatibleUpdateViolations,
} from "./dependency/npm-compatible-updates.mjs";
import { npmOverrideDependencyPins } from "./dependency/npm-overrides.mjs";
import { collectWorkflowEnvironmentPinViolations } from "./dependency/workflow-environment-pins.mjs";
const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");

export {
  collectCargoCompatibleUpdateViolations,
  collectNpmCompatibleOutdatedViolations,
  collectNpmCompatibleUpdateViolations,
  npmOverrideDependencyPins,
};

const npmDependencySections = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
const cargoDependencySectionPattern =
  /^(?:dependencies|dev-dependencies|build-dependencies|target\..+\.dependencies)$/;
const workflowDirectory = ".github/workflows";
const cargoInstallScanRoots = [".github/workflows", "docs", "README.md"];
const npxInstallGuardScanRoots = [".github/workflows", ".husky", "scripts", "docs/developer", "docs/security", "tests/e2e/README.md", "README.md"];
const cratesIoHeaders = {
  "User-Agent": "JobSentinel dependency pin check (https://github.com/cboyd0319/JobSentinel)",
};

const allowedNpmPrereleaseLockEntries = new Map([
  ["@polka/url@1.0.0-next.29", "sirv@3.0.2 depends on ^1.0.0-next.24 and @polka/url publishes no stable 1.x version"],
  ["gensync@1.0.0-beta.2", "@babel/core@7.29.7 depends on ^1.0.0-beta.2 and gensync publishes no stable 1.x version"],
]);

function repoPath(root, path) {
  return join(root, path);
}

function readJson(root, path) {
  return JSON.parse(readFileSync(repoPath(root, path), "utf8"));
}

function readText(root, path) {
  return readFileSync(repoPath(root, path), "utf8");
}

function listFiles(root, path, predicate) {
  const fullPath = repoPath(root, path);

  if (!existsSync(fullPath)) {
    return [];
  }

  if (!statSync(fullPath).isDirectory()) {
    return predicate(path) ? [path] : [];
  }

  const files = [];
  for (const entry of readdirSync(fullPath, { withFileTypes: true })) {
    const childPath = `${path}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...listFiles(root, childPath, predicate));
      continue;
    }

    if (predicate(childPath)) {
      files.push(childPath);
    }
  }

  return files.sort();
}

export function parseStableSemver(version) {
  const match = String(version).match(/^v?(\d+)\.(\d+)\.(\d+)(?:\+[0-9A-Za-z.-]+)?$/);

  if (!match) {
    return null;
  }

  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), raw: String(version).replace(/^v/, "").split("+")[0] };
}

export function compareStableSemver(left, right) {
  const parsedLeft = typeof left === "string" ? parseStableSemver(left) : left;
  const parsedRight = typeof right === "string" ? parseStableSemver(right) : right;

  if (!parsedLeft || !parsedRight) {
    throw new Error(`Cannot compare non-stable semver values: ${left}, ${right}`);
  }

  for (const key of ["major", "minor", "patch"]) {
    if (parsedLeft[key] !== parsedRight[key]) {
      return parsedLeft[key] - parsedRight[key];
    }
  }

  return 0;
}

export function highestStableVersion(versions) {
  return versions
    .map((version) => parseStableSemver(version))
    .filter(Boolean)
    .sort(compareStableSemver)
    .at(-1)?.raw;
}

function exactStableVersion(value) {
  const version = String(value).trim().replace(/^v/, "");
  return parseStableSemver(version)?.raw ?? null;
}

function workflowFiles(root) {
  return listFiles(root, workflowDirectory, (path) => /\.(?:ya?ml)$/.test(path));
}

function markdownPolicyFiles(root) {
  return cargoInstallScanRoots.flatMap((path) =>
    listFiles(root, path, (candidate) => candidate.endsWith(".md") || /\.ya?ml$/.test(candidate)),
  );
}

function parseNodeRuntimePin(root) {
  const path = ".nvmrc";
  if (!existsSync(repoPath(root, path))) {
    return { path, version: null, error: `${path} is missing` };
  }

  const version = readText(root, path).trim();
  const stable = exactStableVersion(version);
  if (!stable) return { path, version, error: `${path} must pin an exact stable Node.js version, found ${version || "empty"}` };

  return { path, version: stable };
}

function parseRustToolchainPin(root) {
  const path = "rust-toolchain.toml";
  if (!existsSync(repoPath(root, path))) {
    return { path, version: null, error: `${path} is missing` };
  }

  const text = readText(root, path);
  const channel = text.match(/^\s*channel\s*=\s*"([^"]+)"/m)?.[1];
  const stable = exactStableVersion(channel ?? "");
  if (!stable) return { path, version: channel ?? "", error: `${path} channel must pin an exact stable Rust version, found ${channel ?? "missing"}` };

  return { path, version: stable };
}

function parseCargoInstallVersion(rest) {
  const optionVersion = rest.match(/(?:^|\s)--version(?:=|\s+)(=?v?\d+\.\d+\.\d+(?:\+[0-9A-Za-z.-]+)?)(?=\s|$)/);
  if (optionVersion) {
    return exactStableVersion(optionVersion[1].replace(/^=/, ""));
  }

  const crateAtVersion = rest.match(/^@?(?:[A-Za-z0-9_-]+)?@(?<version>v?\d+\.\d+\.\d+(?:\+[0-9A-Za-z.-]+)?)(?=\s|$)/);
  return crateAtVersion?.groups?.version ? exactStableVersion(crateAtVersion.groups.version) : null;
}

function parseCargoInstallCommands(text, path) {
  const commands = [];
  const lines = text.split(/\r?\n/);
  const pattern = /\bcargo\s+install\s+([A-Za-z0-9_-]+)((?:\s+[^\n`#;&|]+)*)/g;

  lines.forEach((line, index) => {
    for (const match of line.matchAll(pattern)) {
      const rest = match[2] ?? "";
      commands.push({ name: match[1], version: parseCargoInstallVersion(rest), locked: /(?:^|\s)--locked(?=\s|$)/.test(rest), path, line: index + 1 });
    }
  });

  return commands;
}

function collectCargoInstallPins(root) {
  return markdownPolicyFiles(root).flatMap((path) =>
    parseCargoInstallCommands(readText(root, path), path),
  );
}

function collectNpxInstallGuardViolations(root) {
  const installCapableNpxPattern = /(^|[\s`"'>|;&(])npx\s+(?!--no-install(?:\s|$))/;
  const isPolicyFile = (candidate) =>
    candidate.startsWith(".husky/") ||
    (!candidate.endsWith(".test.mjs") && /\.(?:md|mjs|sh|ya?ml)$/.test(candidate));
  return npxInstallGuardScanRoots
    .flatMap((path) => listFiles(root, path, isPolicyFile))
    .flatMap((path) => readText(root, path).split(/\r?\n/).flatMap((line, index) =>
      installCapableNpxPattern.test(line)
        ? [`${path}:${index + 1} npx-based commands must include --no-install so repo-local pinned tools cannot fall back to registry installs`]
        : []));
}

function workflowToolPinViolations(root, nodeVersion, rustVersion) {
  const violations = [];

  for (const path of workflowFiles(root)) {
    const lines = readText(root, path).split(/\r?\n/);
    lines.forEach((line, index) => {
      const nodeMatch = line.match(/\bnode-version:\s*["']?([^"'\s]+)["']?/);
      if (nodeMatch) {
        const pinned = exactStableVersion(nodeMatch[1]);
        if (!pinned) {
          violations.push(`${path}:${index + 1} node-version must pin an exact stable version, found ${nodeMatch[1]}`);
        } else if (nodeVersion && pinned !== nodeVersion) {
          violations.push(`${path}:${index + 1} node-version must match .nvmrc ${nodeVersion}, found ${pinned}`);
        }
      }

      const rustMatch = line.match(/\btoolchain:\s*["']?([^"'\s]+)["']?/);
      if (rustMatch) {
        const pinned = exactStableVersion(rustMatch[1]);
        if (!pinned) {
          violations.push(`${path}:${index + 1} Rust toolchain must pin an exact stable version, found ${rustMatch[1]}`);
        } else if (rustVersion && pinned !== rustVersion) {
          violations.push(`${path}:${index + 1} Rust toolchain must match rust-toolchain.toml ${rustVersion}, found ${pinned}`);
        }
      }
    });
  }

  return violations;
}

export function collectRuntimePinViolations(root = defaultRoot) {
  const violations = [];
  const nodePin = parseNodeRuntimePin(root);
  const rustPin = parseRustToolchainPin(root);

  if (nodePin.error) {
    violations.push(nodePin.error);
  }

  if (rustPin.error) {
    violations.push(rustPin.error);
  }

  violations.push(...workflowToolPinViolations(root, nodePin.version, rustPin.version));

  const seenCargoInstalls = new Map();
  for (const command of collectCargoInstallPins(root)) {
    const location = `${command.path}:${command.line} cargo install ${command.name}`;
    if (!command.version) {
      violations.push(`${location} must include an exact stable --version pin`);
    }

    if (!command.locked) {
      violations.push(`${location} must include --locked`);
    }

    const previous = seenCargoInstalls.get(command.name);
    if (previous && previous.version !== command.version) {
      violations.push(
        `${location} must match ${previous.path}:${previous.line}; found ${command.version ?? "missing"}, expected ${previous.version ?? "missing"}`,
      );
    } else {
      seenCargoInstalls.set(command.name, command);
    }
  }

  violations.push(...collectWorkflowEnvironmentPinViolations(root));
  violations.push(...collectNpxInstallGuardViolations(root));

  return violations;
}

function directNpmDependencies(packageJson) {
  return npmDependencySections.flatMap((section) =>
    Object.entries(packageJson[section] ?? {}).map(([name, version]) => ({
      name,
      section,
      version: String(version),
    })),
  );
}

function npmPackageManagerPin(packageJson) {
  const raw = String(packageJson.packageManager ?? "").trim();
  const match = raw.match(/^npm@([^+\s]+)(?:\+[0-9A-Za-z.-]+)?$/);
  const version = match ? exactStableVersion(match[1]) : null;

  return { raw, version };
}

function npmLockPackageName(location) {
  const parts = String(location).split("/");
  const nodeModulesIndex = parts.lastIndexOf("node_modules");

  if (nodeModulesIndex === -1) {
    return null;
  }

  const name = parts[nodeModulesIndex + 1];
  if (!name) {
    return null;
  }

  if (name.startsWith("@")) {
    const scopedName = parts[nodeModulesIndex + 2];
    return scopedName ? `${name}/${scopedName}` : null;
  }

  return name;
}

export function collectNpmPinViolations(root = defaultRoot) {
  const violations = [];
  const packageJsonPath = "package.json";
  const lockPath = "package-lock.json";

  if (!existsSync(repoPath(root, packageJsonPath))) {
    return [`missing required dependency manifest: ${packageJsonPath}`];
  }

  const packageJson = readJson(root, packageJsonPath);
  const directDependencies = directNpmDependencies(packageJson);
  const overridePins = npmOverrideDependencyPins(packageJson);
  const packageManager = npmPackageManagerPin(packageJson);

  if (!packageManager.version) {
    violations.push(
      `${packageJsonPath} packageManager must pin npm to an exact stable version, found ${packageManager.raw || "missing"}`,
    );
  }

  for (const dependency of directDependencies) {
    if (!parseStableSemver(dependency.version)) {
      violations.push(
        `${packageJsonPath} ${dependency.section}.${dependency.name} must use an exact stable version, found ${dependency.version}`,
      );
    }
  }

  for (const override of overridePins) {
    if (!override.name || !parseStableSemver(override.version)) {
      violations.push(
        `${override.label} must use an exact stable override version, found ${override.version}`,
      );
    }
  }

  if (!existsSync(repoPath(root, lockPath))) {
    violations.push(`missing required npm lockfile: ${lockPath}`);
    return violations;
  }

  const packageLock = readJson(root, lockPath);
  const lockRoot = packageLock.packages?.[""] ?? {};
  const lockedVersionsByName = new Map();

  for (const [location, packageEntry] of Object.entries(packageLock.packages ?? {})) {
    if (!location || !packageEntry?.version) {
      continue;
    }

    const version = String(packageEntry.version);
    const name = npmLockPackageName(location);
    if (name) {
      if (!lockedVersionsByName.has(name)) {
        lockedVersionsByName.set(name, new Set());
      }
      lockedVersionsByName.get(name).add(version);
    }

    if (parseStableSemver(version)) {
      continue;
    }

    const key = `${name}@${version}`;
    if (name && allowedNpmPrereleaseLockEntries.has(key)) {
      continue;
    }

    violations.push(
      `${lockPath} ${location} must lock a stable semver package version or record an upstream-constrained exception, found ${key}`,
    );
  }

  for (const dependency of directDependencies) {
    const locked = packageLock.packages?.[`node_modules/${dependency.name}`]?.version;
    const rootDeclared = lockRoot[dependency.section]?.[dependency.name];

    if (locked !== dependency.version) {
      violations.push(
        `${lockPath} lock entry for ${dependency.name} must match ${dependency.version}, found ${locked ?? "missing"}`,
      );
    }

    if (rootDeclared !== dependency.version) {
      violations.push(
        `${lockPath} root ${dependency.section}.${dependency.name} must match ${dependency.version}, found ${rootDeclared ?? "missing"}`,
      );
    }
  }

  for (const override of overridePins) {
    if (!override.name || !parseStableSemver(override.version)) {
      continue;
    }

    if (!lockedVersionsByName.get(override.name)?.has(override.version)) {
      violations.push(
        `${lockPath} must contain override ${override.name} ${override.version} from ${override.label}`,
      );
    }
  }

  return violations;
}

function stripCargoComment(line) {
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"' && line[index - 1] !== "\\") {
      quoted = !quoted;
      continue;
    }

    if (char === "#" && !quoted) {
      return line.slice(0, index);
    }
  }

  return line;
}

function parseCargoDependencyVersion(rawSpec) {
  const spec = rawSpec.trim();
  const shorthand = spec.match(/^"([^"]+)"/);

  if (shorthand) {
    return shorthand[1];
  }

  const tableVersion = spec.match(/\bversion\s*=\s*"([^"]+)"/);

  if (tableVersion) {
    return tableVersion[1];
  }

  return null;
}

export function collectCargoDependencySpecs(cargoTomlText) {
  const dependencies = [];
  let currentSection = "";
  const lines = cargoTomlText.split(/\r?\n/);

  lines.forEach((rawLine, index) => {
    const line = stripCargoComment(rawLine).trim();

    if (!line) {
      return;
    }

    const section = line.match(/^\[([^\]]+)\]$/);
    if (section) {
      currentSection = section[1];
      return;
    }

    if (!cargoDependencySectionPattern.test(currentSection)) {
      return;
    }

    const dependency = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
    if (!dependency) {
      return;
    }

    dependencies.push({
      name: dependency[1],
      section: currentSection,
      version: parseCargoDependencyVersion(dependency[2]),
      line: index + 1,
    });
  });

  return dependencies;
}

function parseCargoLockPackageVersions(cargoLockText) {
  const versions = new Map();
  let currentName = null;
  let currentVersion = null;

  function flush() {
    if (!currentName || !currentVersion) {
      return;
    }

    if (!versions.has(currentName)) {
      versions.set(currentName, new Set());
    }

    versions.get(currentName).add(currentVersion);
  }

  for (const rawLine of cargoLockText.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (line === "[[package]]") {
      flush();
      currentName = null;
      currentVersion = null;
      continue;
    }

    const name = line.match(/^name\s*=\s*"([^"]+)"/);
    if (name) {
      currentName = name[1];
      continue;
    }

    const version = line.match(/^version\s*=\s*"([^"]+)"/);
    if (version) {
      currentVersion = version[1];
    }
  }

  flush();
  return versions;
}

export function collectCargoPinViolations(root = defaultRoot) {
  const violations = [];
  const manifestPath = "src-tauri/Cargo.toml";
  const lockPath = "src-tauri/Cargo.lock";

  if (!existsSync(repoPath(root, manifestPath))) {
    return [`missing required Cargo manifest: ${manifestPath}`];
  }

  const dependencies = collectCargoDependencySpecs(readFileSync(repoPath(root, manifestPath), "utf8"));

  for (const dependency of dependencies) {
    if (!dependency.version) {
      violations.push(
        `${manifestPath}:${dependency.line} ${dependency.name} must declare an exact stable version`,
      );
      continue;
    }

    if (!dependency.version.startsWith("=")) {
      violations.push(
        `${manifestPath}:${dependency.line} ${dependency.name} must use an exact =version pin, found ${dependency.version}`,
      );
      continue;
    }

    if (!parseStableSemver(dependency.version.slice(1))) {
      violations.push(
        `${manifestPath}:${dependency.line} ${dependency.name} must pin a stable semver version, found ${dependency.version}`,
      );
    }
  }

  if (!existsSync(repoPath(root, lockPath))) {
    violations.push(`missing required Cargo lockfile: ${lockPath}`);
    return violations;
  }

  const lockedVersions = parseCargoLockPackageVersions(
    readFileSync(repoPath(root, lockPath), "utf8"),
  );

  for (const [name, versions] of lockedVersions.entries()) {
    for (const version of versions) {
      if (!parseStableSemver(version)) {
        violations.push(`${lockPath} ${name} must lock a stable semver crate version, found ${version}`);
      }
    }
  }

  for (const dependency of dependencies) {
    if (!dependency.version?.startsWith("=") || !parseStableSemver(dependency.version.slice(1))) {
      continue;
    }

    const expected = dependency.version.slice(1);
    if (!lockedVersions.get(dependency.name)?.has(expected)) {
      violations.push(
        `${lockPath} must contain ${dependency.name} ${expected} from ${manifestPath}:${dependency.line}`,
      );
    }
  }

  return violations;
}

async function mapWithLimit(items, limit, callback) {
  const results = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await callback(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));

  return results;
}

async function fetchJson(fetchImpl, url, headers = {}) {
  const response = await fetchImpl(url, { headers });

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return response.json();
}

async function fetchText(fetchImpl, url, headers = {}) {
  const response = await fetchImpl(url, { headers });

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return response.text();
}

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
        violations.push(`.nvmrc is pinned to ${nodePin.version}; latest stable Node.js LTS version is ${latestLts}`);
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
  const cargoInstallChecks = await mapWithLimit(uniqueCargoInstalls, 4, async (command) => {
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

  violations.push(...cargoInstallChecks.filter(Boolean));
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
    ? [{ label: "package.json packageManager npm", name: "npm", version: packageManager.version }]
    : [];
  const dependencyTargets = directDependencies.map((dependency) => ({
    label: `package.json ${dependency.name}`,
    name: dependency.name,
    version: dependency.version,
  }));
  const checkTargets = packageManagerTarget.concat(dependencyTargets, overrideDependencies);

  const checks = await mapWithLimit(checkTargets, 8, async (dependency) => {
    try {
      const metadata = await fetchJson(
        fetchImpl,
        `https://registry.npmjs.org/${encodeURIComponent(dependency.name)}`,
      );
      const latest = highestStableVersion(Object.keys(metadata.versions ?? {}));

      if (!latest) {
        return `npm registry has no stable versions for ${dependency.name}`;
      }

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

  const dependencies = collectCargoDependencySpecs(
    readFileSync(repoPath(root, "src-tauri/Cargo.toml"), "utf8"),
  ).filter((dependency) => dependency.version?.startsWith("="));
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
        return `Cargo.toml ${dependency.name} is pinned to ${current}; latest stable crates.io version is ${latest}`;
      }
    } catch (error) {
      return `crates.io latest-stable lookup failed for ${dependency.name}: ${error.message}`;
    }

    return null;
  });

  return checks.filter(Boolean);
}

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
  const help = argv.includes("--help") || argv.includes("-h");

  if (help) {
    console.log("Usage: node scripts/check-dependency-pins.mjs [--latest]");
    console.log("");
    console.log("Default: offline exact-pin and lockfile consistency checks.");
    console.log("--latest: also query npm/crates.io latest stable direct/override versions and run npm/Cargo lockfile freshness checks.");
    return;
  }

  const violations = checkLatest
    ? await collectLatestStableViolations(root)
    : collectDependencyPinViolations(root);

  if (violations.length > 0) {
    console.error("Dependency pin check failed:");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exitCode = 1;
    return;
  }

  if (checkLatest) {
    console.log("Dependency pin check passed: exact runtime/tool/package-manager pins, workflow OS runner and apt-package pins, exact direct and override pins, latest stable package manager/direct/override dependencies/tools, stable lockfile policy, and lockfile freshness verified.");
  } else {
    console.log("Dependency pin check passed: exact runtime/tool/package-manager pins, workflow OS runner and apt-package pins, package, crate, and override pins, plus stable lockfile policy verified.");
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
