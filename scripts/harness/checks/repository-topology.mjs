import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";

import {
  cargoCommand,
  repositoryToolchainEnvironment,
} from "../../lib/rust-toolchain.mjs";

export const repositoryArchitectureContractPath =
  "scripts/harness/contracts/architecture.json";
export const repositoryArchitectureContractSchema =
  "jobsentinel.repository_architecture.v2";

function normalizePath(path) {
  return path.split(/[\\/]/).join("/").replace(/^\.\//, "");
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function uniqueStrings(value) {
  return Array.isArray(value) && value.every(nonEmpty) && new Set(value).size === value.length;
}

function sameMembers(actual, expected) {
  return [...actual].sort().join("\n") === [...expected].sort().join("\n");
}

function validateMemberMap(value, label, violations) {
  if (!isObject(value) || Object.keys(value).length === 0) {
    violations.push(`${label} must be a non-empty package-to-path object`);
    return [];
  }
  const paths = [];
  for (const [name, path] of Object.entries(value)) {
    if (!nonEmpty(name) || !nonEmpty(path)) violations.push(`${label} entries must have non-empty package names and paths`);
    else paths.push(normalizePath(path));
  }
  if (new Set(paths).size !== paths.length) violations.push(`${label} paths must be unique`);
  return Object.keys(value);
}

function validateGraph(graph, memberNames, label, violations) {
  if (!isObject(graph) || !sameMembers(Object.keys(graph), memberNames)) {
    violations.push(`${label} must define exactly one row for every member`);
    return;
  }
  for (const [name, dependencies] of Object.entries(graph)) {
    if (!uniqueStrings(dependencies)) {
      violations.push(`${label}.${name} must be a unique string list`);
      continue;
    }
    if (!sameMembers(dependencies, [...dependencies].sort())) violations.push(`${label}.${name} must be sorted`);
    for (const dependency of dependencies) {
      if (!memberNames.includes(dependency)) violations.push(`${label}.${name} names unknown member ${dependency}`);
      if (dependency === name) violations.push(`${label}.${name} must not depend on itself`);
    }
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(name, chain) {
    if (visiting.has(name)) {
      violations.push(`${label} contains a dependency cycle: ${[...chain, name].join(" -> ")}`);
      return;
    }
    if (visited.has(name)) return;
    visiting.add(name);
    for (const dependency of graph[name] ?? []) visit(dependency, [...chain, name]);
    visiting.delete(name);
    visited.add(name);
  }
  for (const name of memberNames) visit(name, []);
}

function loadContract(root, violations) {
  const path = join(root, repositoryArchitectureContractPath);
  if (!existsSync(path)) {
    violations.push(`add repository architecture contract: ${repositoryArchitectureContractPath}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    violations.push(`fix invalid ${repositoryArchitectureContractPath}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function validateContract(root, contract, violations) {
  if (contract.schema !== repositoryArchitectureContractSchema) violations.push(`repository architecture schema must be ${repositoryArchitectureContractSchema}`);
  for (const field of ["owner", "active_plan", "architecture_doc", "decision_log_id"]) {
    if (!nonEmpty(contract[field])) violations.push(`repository architecture ${field} must be non-empty`);
    else if (field !== "decision_log_id" && !existsSync(join(root, contract[field]))) violations.push(`repository architecture ${field} does not exist: ${contract[field]}`);
  }
  const memberNames = validateMemberMap(contract.members, "members", violations);
  validateGraph(contract.allowed_internal_dependencies, memberNames, "allowed_internal_dependencies", violations);
  if (!memberNames.includes("jobsentinel") || !memberNames.includes("jobsentinel-application")) violations.push("members must include jobsentinel and jobsentinel-application");
  if (!sameMembers(contract.allowed_internal_dependencies?.jobsentinel ?? [], ["jobsentinel-application"])) violations.push("desktop must depend only on jobsentinel-application for product behavior");
  if (!sameMembers(contract.allowed_internal_dependencies?.["jobsentinel-security"] ?? [], [])) violations.push("jobsentinel-security must have no internal dependencies");

  if (!isObject(contract.technology_owners) || Object.keys(contract.technology_owners).length === 0) violations.push("technology_owners must be a non-empty dependency-to-package object");
  else for (const [dependency, owner] of Object.entries(contract.technology_owners)) {
    const owners = Array.isArray(owner) ? owner : [owner];
    if (!nonEmpty(dependency) || !uniqueStrings(owners) || owners.some((name) => !memberNames.includes(name))) violations.push(`technology owner ${dependency} must name one or more unique workspace members`);
  }

  for (const field of ["top_level_directories", "frontend_directories", "script_directories", "required_paths", "forbidden_paths", "forbidden_dependencies"]) {
    if (!uniqueStrings(contract[field])) violations.push(`${field} must be a unique string list`);
  }
  for (const path of contract.required_paths ?? []) {
    if (!existsSync(join(root, path))) {
      violations.push(`required architecture path is missing: ${path}`);
    }
  }
  const modularization = contract.modularization;
  if (!nonEmpty(modularization?.rule)) violations.push("modularization must define its rule");
  if (!Array.isArray(modularization?.forbidden_path_patterns) || modularization.forbidden_path_patterns.length === 0) violations.push("modularization.forbidden_path_patterns must be non-empty");
  else for (const row of modularization.forbidden_path_patterns) {
    if (!nonEmpty(row?.pattern) || !nonEmpty(row?.reason)) violations.push("each modularization forbidden pattern requires pattern and reason");
    else try { new RegExp(row.pattern); } catch { violations.push(`invalid modularization pattern: ${row.pattern}`); }
  }
  for (const path of [contract.owner, contract.active_plan, contract.architecture_doc]) {
    if (!nonEmpty(path) || !existsSync(join(root, path))) continue;
    const text = readFileSync(join(root, path), "utf8");
    if (!text.includes(repositoryArchitectureContractPath)) violations.push(`${path} must reference ${repositoryArchitectureContractPath}`);
  }
  if (nonEmpty(contract.active_plan) && existsSync(join(root, contract.active_plan))) {
    const plan = readFileSync(join(root, contract.active_plan), "utf8");
    if (!plan.includes(contract.decision_log_id)) violations.push(`${contract.active_plan} must record decision ${contract.decision_log_id}`);
  }
}

function readMetadata(root, options, violations) {
  if (options.metadata) return options.metadata;
  const spawn = options.spawnSync ?? spawnSync;
  const result = spawn(cargoCommand(options.platform), ["metadata", "--no-deps", "--format-version", "1"], {
    cwd: root,
    env: repositoryToolchainEnvironment(root, options),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    const detail = String(result.stderr ?? result.error?.message ?? "unknown Cargo error").trim().slice(0, 1000);
    violations.push(`Cargo metadata failed for repository architecture: ${detail}`);
    return null;
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    violations.push(`Cargo metadata returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function workspacePackages(root, metadata, violations) {
  if (!Array.isArray(metadata?.packages) || !Array.isArray(metadata?.workspace_members)) {
    violations.push("Cargo metadata must contain packages and workspace_members arrays");
    return new Map();
  }
  const memberIds = new Set(metadata.workspace_members);
  const packages = new Map();
  for (const pkg of metadata.packages.filter((row) => memberIds.has(row.id))) {
    if (!nonEmpty(pkg.name) || !nonEmpty(pkg.manifest_path) || !Array.isArray(pkg.dependencies)) {
      violations.push("Cargo metadata workspace package is incomplete");
      continue;
    }
    const manifest = isAbsolute(pkg.manifest_path) ? pkg.manifest_path : resolve(root, pkg.manifest_path);
    const path = normalizePath(relative(root, dirname(manifest)));
    if (path.startsWith("../") || path === "..") violations.push(`workspace package ${pkg.name} is outside the repository`);
    if (packages.has(pkg.name)) violations.push(`workspace package name must be unique: ${pkg.name}`);
    packages.set(pkg.name, { ...pkg, path });
  }
  if (packages.size !== memberIds.size) violations.push("Cargo metadata workspace_members contains unresolved package IDs");
  return packages;
}

function validateWorkspace(root, contract, metadata, violations) {
  const packages = workspacePackages(root, metadata, violations);
  const actualNames = [...packages.keys()];
  const expectedNames = Object.keys(contract.members);
  if (!sameMembers(actualNames, expectedNames)) violations.push(`workspace members must be exactly: ${expectedNames.sort().join(", ")}`);
  for (const [name, pkg] of packages) {
    const expectedPath = contract.members[name];
    if (!expectedPath) violations.push(`workspace member ${name} has no locked architecture owner`);
    else if (pkg.path !== normalizePath(expectedPath)) violations.push(`workspace member ${name} must live at ${expectedPath}; found ${pkg.path}`);
    const internal = pkg.dependencies.map((row) => row.name).filter((name) => packages.has(name));
    const allowed = new Set(contract.allowed_internal_dependencies[name] ?? []);
    for (const dependency of internal) if (!allowed.has(dependency)) violations.push(`${name} has forbidden internal dependency ${dependency}`);
  }

  for (const [name, pkg] of packages) {
    const actualDependencies = new Set(pkg.dependencies.map((row) => row.name));
    for (const [dependency, owner] of Object.entries(contract.technology_owners)) {
      const owners = Array.isArray(owner) ? owner : [owner];
      if (!actualDependencies.has(dependency) || owners.includes(name)) continue;
      violations.push(`${name} uses ${dependency}, which belongs only to ${owners.join(", ")}`);
    }
    for (const dependency of contract.forbidden_dependencies) {
      if (actualDependencies.has(dependency)) violations.push(`${name} must not use retired target dependency ${dependency}`);
    }
  }
}

function listRepositoryFiles(root, options, violations) {
  if (options.files) return options.files.map(normalizePath);
  try {
    const exec = options.execFileSync ?? execFileSync;
    return exec("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8" })
      .split("\0")
      .map(normalizePath)
      .filter((path) => path && existsSync(join(root, path)));
  } catch (error) {
    violations.push(`repository architecture could not enumerate files: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
}

function validatePaths(contract, files, violations) {
  const scriptOwners = new Set(contract.script_directories);
  const scriptTestOwners = new Set(
    contract.script_directories.filter((owner) => owner !== "tests"),
  );
  for (const path of files) {
    const scriptPath = path.match(/^scripts\/([^/]+)(?:\/(.+))?$/);
    if (!scriptPath) continue;
    if (!scriptPath[2]) {
      violations.push(`root-level script is forbidden: ${path}`);
    } else if (!scriptOwners.has(scriptPath[1])) {
      violations.push(`undeclared script owner directory: ${path}`);
    }

    const scriptTestPath = path.match(/^scripts\/tests\/([^/]+)(?:\/(.+))?$/);
    if (!scriptTestPath) continue;
    if (!scriptTestPath[2]) {
      violations.push(`flat script test support file is forbidden: ${path}`);
    } else if (!scriptTestOwners.has(scriptTestPath[1])) {
      violations.push(`undeclared script test owner directory: ${path}`);
    }
  }

  for (const path of files) for (const row of contract.modularization.forbidden_path_patterns) {
    if (new RegExp(row.pattern).test(path)) violations.push(`${path}: ${row.reason}`);
  }

  for (const path of files) for (const prefix of contract.forbidden_paths) {
    if (path === prefix || path.startsWith(`${prefix}/`)) violations.push(`retired architecture path is forbidden: ${path}`);
  }
}

export function collectRepositoryTopologyViolations(root, options = {}) {
  const violations = [];
  const contract = loadContract(root, violations);
  if (!contract) return violations;
  validateContract(root, contract, violations);
  if (violations.length > 0) return [...new Set(violations)].sort();
  const metadata = readMetadata(root, options, violations);
  if (metadata) validateWorkspace(root, contract, metadata, violations);
  validatePaths(contract, listRepositoryFiles(root, options, violations), violations);
  return [...new Set(violations)].sort();
}
