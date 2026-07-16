#!/usr/bin/env node

// YAGNI enforcement sensor. Every direct dependency must earn its place with a
// one-line rationale (engineering-principles.md ladder step 4). Adding a direct
// npm or Cargo dependency without a matching rationale fails harness:check, and
// a rationale for a dependency that no longer exists fails too.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { collectCargoDependencySpecs } from "./dependency-pins.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "../..");
const rationalePath = "validation/dependency_rationale.json";

function readJson(root, path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function directNpmDependencies(root) {
  const pkg = readJson(root, "package.json");
  return new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
  ]);
}

function directCargoDependencies(root) {
  const cargoToml = join(root, "Cargo.toml");
  if (!existsSync(cargoToml)) {
    return new Set();
  }
  return new Set(
    collectCargoDependencySpecs(readFileSync(cargoToml, "utf8"))
      .filter((spec) => !spec.path)
      .map((spec) => spec.name),
  );
}

function unusedCargoWorkspaceDependencies(root) {
  const cargoToml = join(root, "Cargo.toml");
  const policyFile = join(root, "repository-structure-policy.json");
  if (!existsSync(cargoToml) || !existsSync(policyFile)) return [];

  const registry = collectCargoDependencySpecs(readFileSync(cargoToml, "utf8"))
    .filter((spec) => spec.section === "workspace.dependencies")
    .map((spec) => spec.name);
  const policy = readJson(root, "repository-structure-policy.json");
  const manifests = (policy.structure?.units ?? [])
    .map((unit) => unit.manifest)
    .filter((path) => path !== "Cargo.toml" && existsSync(join(root, path)));
  const used = new Set(
    manifests.flatMap((path) =>
      collectCargoDependencySpecs(readFileSync(join(root, path), "utf8")).map(
        (spec) => spec.name,
      ),
    ),
  );
  return registry
    .filter((name) => !used.has(name))
    .map((name) => `remove unused Cargo workspace dependency from Cargo.toml: ${name}`);
}

function hasReason(reasons, name) {
  return typeof reasons[name] === "string" && reasons[name].trim() !== "";
}

// ecosystem labels each side of the comparison so violations are unambiguous.
function reconcile(direct, reasons, ecosystem) {
  const violations = [];

  for (const name of [...direct].sort()) {
    if (!hasReason(reasons, name)) {
      violations.push(`add ${ecosystem} dependency rationale in ${rationalePath}: ${name}`);
    }
  }

  for (const name of Object.keys(reasons).sort()) {
    if (!direct.has(name)) {
      violations.push(
        `remove stale ${ecosystem} dependency rationale in ${rationalePath}: ${name}`,
      );
    }
  }

  return violations;
}

export function checkDependencyRationale(root = defaultRoot) {
  if (!existsSync(join(root, rationalePath))) {
    return [`missing dependency rationale file: ${rationalePath}`];
  }

  const contract = readJson(root, rationalePath);

  return [
    ...reconcile(directNpmDependencies(root), contract.npm ?? {}, "npm"),
    ...reconcile(directCargoDependencies(root), contract.cargo ?? {}, "cargo"),
    ...unusedCargoWorkspaceDependencies(root),
  ];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const positional = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  const root = positional ? resolve(positional) : defaultRoot;
  const violations = checkDependencyRationale(root);

  if (violations.length > 0) {
    console.error("Dependency rationale check failed:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exit(1);
  }

  console.log("Dependency rationale check passed. Every direct dependency is justified.");
}
