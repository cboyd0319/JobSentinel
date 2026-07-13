import { existsSync, readFileSync } from "node:fs";

import { defaultRoot, parseStableSemver, repoPath } from "./shared.mjs";

const cargoDependencySectionPattern =
  /^(?:workspace\.dependencies|dependencies|dev-dependencies|build-dependencies|target\..+\.dependencies)$/;

function stripCargoComment(line) {
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index - 1] !== "\\") {
      quoted = !quoted;
    } else if (char === "#" && !quoted) {
      return line.slice(0, index);
    }
  }
  return line;
}

function parseCargoDependencyVersion(rawSpec) {
  const spec = rawSpec.trim();
  return (
    spec.match(/^"([^"]+)"/)?.[1] ??
    spec.match(/\bversion\s*=\s*"([^"]+)"/)?.[1] ??
    null
  );
}

function parseCargoDependencyPath(rawSpec) {
  return rawSpec.match(/\bpath\s*=\s*"([^"]+)"/)?.[1] ?? null;
}

export function collectCargoDependencySpecs(cargoTomlText) {
  const dependencies = [];
  let currentSection = "";

  cargoTomlText.split(/\r?\n/).forEach((rawLine, index) => {
    const line = stripCargoComment(rawLine).trim();
    if (!line) return;

    const section = line.match(/^\[([^\]]+)\]$/);
    if (section) {
      currentSection = section[1];
      return;
    }
    if (!cargoDependencySectionPattern.test(currentSection)) return;

    const dependency = line.match(/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/);
    if (!dependency) return;
    dependencies.push({
      name: dependency[1],
      section: currentSection,
      version: parseCargoDependencyVersion(dependency[2]),
      path: parseCargoDependencyPath(dependency[2]),
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
    if (!currentName || !currentVersion) return;
    if (!versions.has(currentName)) versions.set(currentName, new Set());
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
    if (version) currentVersion = version[1];
  }
  flush();
  return versions;
}

export function collectCargoPinViolations(root = defaultRoot) {
  const violations = [];
  const manifestPath = "Cargo.toml";
  const lockPath = "Cargo.lock";
  if (!existsSync(repoPath(root, manifestPath))) {
    return [`missing required Cargo manifest: ${manifestPath}`];
  }

  const dependencies = collectCargoDependencySpecs(
    readFileSync(repoPath(root, manifestPath), "utf8"),
  );
  for (const dependency of dependencies) {
    if (dependency.path && !dependency.version) continue;
    if (!dependency.version) {
      violations.push(
        `${manifestPath}:${dependency.line} ${dependency.name} must declare an exact stable version`,
      );
    } else if (!dependency.version.startsWith("=")) {
      violations.push(
        `${manifestPath}:${dependency.line} ${dependency.name} must use an exact =version pin, found ${dependency.version}`,
      );
    } else if (!parseStableSemver(dependency.version.slice(1))) {
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
        violations.push(
          `${lockPath} ${name} must lock a stable semver crate version, found ${version}`,
        );
      }
    }
  }

  for (const dependency of dependencies) {
    if (
      !dependency.version?.startsWith("=") ||
      !parseStableSemver(dependency.version.slice(1))
    ) {
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
