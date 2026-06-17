#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");

const npmDependencySections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

const cargoDependencySectionPattern =
  /^(?:dependencies|dev-dependencies|build-dependencies|target\..+\.dependencies)$/;

const allowedNpmPrereleaseLockEntries = new Map([
  [
    "@polka/url@1.0.0-next.29",
    "sirv@3.0.2 depends on ^1.0.0-next.24 and @polka/url publishes no stable 1.x version",
  ],
  [
    "gensync@1.0.0-beta.2",
    "@babel/core@7.29.7 depends on ^1.0.0-beta.2 and gensync publishes no stable 1.x version",
  ],
]);

function repoPath(root, path) {
  return join(root, path);
}

function readJson(root, path) {
  return JSON.parse(readFileSync(repoPath(root, path), "utf8"));
}

export function parseStableSemver(version) {
  const match = String(version).match(/^v?(\d+)\.(\d+)\.(\d+)(?:\+[0-9A-Za-z.-]+)?$/);

  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    raw: String(version).replace(/^v/, "").split("+")[0],
  };
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

function directNpmDependencies(packageJson) {
  const entries = [];

  for (const section of npmDependencySections) {
    for (const [name, version] of Object.entries(packageJson[section] ?? {})) {
      entries.push({ name, section, version: String(version) });
    }
  }

  return entries;
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

  for (const dependency of directDependencies) {
    if (!parseStableSemver(dependency.version)) {
      violations.push(
        `${packageJsonPath} ${dependency.section}.${dependency.name} must use an exact stable version, found ${dependency.version}`,
      );
    }
  }

  if (!existsSync(repoPath(root, lockPath))) {
    violations.push(`missing required npm lockfile: ${lockPath}`);
    return violations;
  }

  const packageLock = readJson(root, lockPath);
  const lockRoot = packageLock.packages?.[""] ?? {};

  for (const [location, packageEntry] of Object.entries(packageLock.packages ?? {})) {
    if (!location || !packageEntry?.version) {
      continue;
    }

    const version = String(packageEntry.version);
    if (parseStableSemver(version)) {
      continue;
    }

    const name = npmLockPackageName(location);
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

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );

  return results;
}

async function fetchJson(fetchImpl, url, headers = {}) {
  const response = await fetchImpl(url, { headers });

  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }

  return response.json();
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
  const checks = await mapWithLimit(directDependencies, 8, async (dependency) => {
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
        return `package.json ${dependency.name} is pinned to ${dependency.version}; latest stable npm version is ${latest}`;
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
        {
          "User-Agent":
            "JobSentinel dependency pin check (https://github.com/cboyd0319/JobSentinel)",
        },
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

export function collectNpmCompatibleUpdateViolations(root = defaultRoot, { spawn = spawnSync } = {}) {
  const result = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["update", "--package-lock-only", "--dry-run", "--ignore-scripts"],
    {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 10,
    },
  );

  if (result.error) {
    return [`npm update dry-run failed: ${result.error.message}`];
  }

  if (result.status !== 0) {
    return [
      `npm update dry-run exited ${result.status}: ${String(result.stderr || result.stdout).trim()}`,
    ];
  }

  const output = `${result.stdout}\n${result.stderr}`.trim();
  if (!output || output.includes("up to date")) {
    return [];
  }

  if (/\b(?:added|changed|removed|updated)\b/i.test(output)) {
    const firstLine = output.split(/\r?\n/).find(Boolean) ?? output;
    return [`package-lock.json has compatible updates pending: ${firstLine}`];
  }

  return [];
}

export function collectCargoCompatibleUpdateViolations(root = defaultRoot, { spawn = spawnSync } = {}) {
  const result = spawn(
    "cargo",
    ["update", "--dry-run", "--verbose", "--manifest-path", repoPath(root, "src-tauri/Cargo.toml")],
    {
      cwd: repoPath(root, "src-tauri"),
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 10,
    },
  );

  if (result.error) {
    return [`cargo update dry-run failed: ${result.error.message}`];
  }

  if (result.status !== 0) {
    return [
      `cargo update dry-run exited ${result.status}: ${String(result.stderr || result.stdout).trim()}`,
    ];
  }

  const updateLines = `${result.stdout}\n${result.stderr}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      return /^(Adding|Downgrading|Removing|Updating)\s/.test(line) &&
        !line.includes("crates.io index");
    });

  return updateLines.map((line) => `Cargo.lock has a compatible update pending: ${line}`);
}

export function collectDependencyPinViolations(root = defaultRoot) {
  return [
    ...collectNpmPinViolations(root),
    ...collectCargoPinViolations(root),
  ];
}

export async function collectLatestStableViolations(root = defaultRoot) {
  return [
    ...collectDependencyPinViolations(root),
    ...(await collectNpmLatestStableViolations(root)),
    ...(await collectCargoLatestStableViolations(root)),
    ...collectNpmCompatibleUpdateViolations(root),
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
    console.log("--latest: also query npm/crates.io latest stable direct versions and run npm/Cargo lockfile dry-runs.");
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
    console.log("Dependency pin check passed: exact direct pins, latest stable direct dependencies, stable lockfile policy, and lockfile freshness verified.");
  } else {
    console.log("Dependency pin check passed: exact direct package and crate pins plus stable lockfile policy verified.");
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
