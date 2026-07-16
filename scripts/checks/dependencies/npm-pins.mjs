import { existsSync } from "node:fs";

import { npmOverrideDependencyPins } from "../../lib/dependency/npm-overrides.mjs";
import {
  defaultRoot,
  exactStableVersion,
  parseStableSemver,
  readJson,
  repoPath,
} from "./shared.mjs";

const npmDependencySections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];
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
const npmRegistryTarballPrefix = "https://registry.npmjs.org/";

export function directNpmDependencies(packageJson) {
  return npmDependencySections.flatMap((section) =>
    Object.entries(packageJson[section] ?? {}).map(([name, version]) => ({
      name,
      section,
      version: String(version),
    })),
  );
}

export function npmPackageManagerPin(packageJson) {
  const raw = String(packageJson.packageManager ?? "").trim();
  const match = raw.match(/^npm@([^+\s]+)(?:\+[0-9A-Za-z.-]+)?$/);
  return { raw, version: match ? exactStableVersion(match[1]) : null };
}

function npmLockPackageName(location) {
  const parts = String(location).split("/");
  const nodeModulesIndex = parts.lastIndexOf("node_modules");
  if (nodeModulesIndex === -1) return null;

  const name = parts[nodeModulesIndex + 1];
  if (!name) return null;
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
    if (!location || !packageEntry?.version) continue;

    const version = String(packageEntry.version);
    const name = npmLockPackageName(location);
    const resolved = packageEntry.resolved ? String(packageEntry.resolved) : "";
    if (resolved && !resolved.startsWith(npmRegistryTarballPrefix)) {
      violations.push(
        `${lockPath} ${location} resolved URL must use ${npmRegistryTarballPrefix}, found ${resolved}`,
      );
    } else if (resolved && !packageEntry.integrity) {
      violations.push(`${lockPath} ${location} must include an integrity hash for ${resolved}`);
    }

    if (name) {
      if (!lockedVersionsByName.has(name)) lockedVersionsByName.set(name, new Set());
      lockedVersionsByName.get(name).add(version);
    }
    if (
      !parseStableSemver(version) &&
      !(name && allowedNpmPrereleaseLockEntries.has(`${name}@${version}`))
    ) {
      violations.push(
        `${lockPath} ${location} must lock a stable semver package version or record an upstream-constrained exception, found ${name}@${version}`,
      );
    }
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
    if (
      override.name &&
      parseStableSemver(override.version) &&
      !lockedVersionsByName.get(override.name)?.has(override.version)
    ) {
      violations.push(
        `${lockPath} must contain override ${override.name} ${override.version} from ${override.label}`,
      );
    }
  }
  return violations;
}
