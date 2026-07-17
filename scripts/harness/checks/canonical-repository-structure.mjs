import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { extname, isAbsolute, join, relative } from "node:path";
import ts from "typescript";

import { listGovernedFiles, normalizeRepoPath } from "./repo-file-size.mjs";

const policyPath = "scripts/harness/contracts/repository-structure.json";
const architecturePath = "docs/architecture/repository.md";
const sourceExtensions = new Set([
  ".cjs", ".cs", ".css", ".hcl", ".js", ".jsx", ".mjs", ".php", ".ps1", ".py",
  ".rs", ".sh", ".sql", ".tf", ".ts", ".tsx",
]);
const configurationExtensions = new Set([
  ".csproj", ".json", ".props", ".slnx", ".targets", ".tfvars", ".toml",
  ".yaml", ".yml",
]);

function strings(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim())
    : [];
}

function under(path, root) {
  return path === root || path.startsWith(`${root}/`);
}

function readPolicy(root, violations) {
  if (!existsSync(join(root, policyPath))) {
    violations.push(`add canonical repository structure owner: ${policyPath}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(join(root, policyPath), "utf8"));
  } catch (error) {
    violations.push(`fix invalid ${policyPath}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function validateUnits(root, structure, violations) {
  const units = Array.isArray(structure.units) ? structure.units : [];
  if (units.length === 0) violations.push(`${policyPath} must declare real repository units`);
  const ids = new Set();
  for (const unit of units) {
    const id = String(unit?.id ?? "");
    if (!id || ids.has(id)) violations.push(`${policyPath} unit ids must be unique and non-empty: ${id || "<missing>"}`);
    ids.add(id);
    for (const field of ["root", "manifest", "public_entrypoint", "kind"]) {
      if (typeof unit?.[field] !== "string" || !unit[field].trim()) violations.push(`${policyPath} unit ${id || "<missing>"}: ${field} is required`);
    }
    for (const field of ["root", "manifest", "public_entrypoint"]) {
      const path = normalizeRepoPath(String(unit?.[field] ?? ""));
      if (path && !existsSync(join(root, path))) violations.push(`${policyPath} unit ${id}: ${field} does not exist: ${path}`);
    }
  }
}

function validateFiles(root, policy, files, violations) {
  const structure = policy.structure ?? {};
  const sourceRoots = strings(structure.allowed_source_roots);
  const configRoots = strings(structure.allowed_configuration_roots);
  const rootSources = new Set(strings(structure.allowed_root_source_files));
  const rootConfig = new Set(strings(structure.allowed_root_configuration_files));
  const rootFiles = new Set(strings(structure.allowed_root_files));
  const standalone = new Set(strings(structure.allowed_standalone_source_files));
  const exclusions = Array.isArray(policy.non_hand_authored_exclusions)
    ? policy.non_hand_authored_exclusions.map((row) => normalizeRepoPath(String(row?.path ?? "")))
    : [];
  const topLevels = new Set(strings(structure.allowed_top_level_directories));
  const realRoot = realpathSync(root);
  const portablePaths = new Map();
  for (const path of files) {
    const normalized = normalizeRepoPath(path);
    const portableKey = normalized.normalize("NFC").toLowerCase();
    const prior = portablePaths.get(portableKey);
    if (prior && prior !== normalized) violations.push(`repository paths collide on case-insensitive or Unicode-normalizing filesystems: ${prior} and ${normalized}`);
    else portablePaths.set(portableKey, normalized);
    for (const component of normalized.split("/")) {
      if (!component || component === "." || component === ".." || /[<>:"|?*\u0000-\u001f]/.test(component) || /[ .]$/.test(component) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(component) || Buffer.byteLength(component) > 255) {
        violations.push(`repository path is not portable to Windows and macOS: ${normalized}`);
        break;
      }
    }
    const fullPath = join(root, normalized);
    if (existsSync(fullPath)) {
      try {
        const stat = lstatSync(fullPath);
        const resolved = relative(realRoot, realpathSync(fullPath));
        if (stat.isSymbolicLink() || resolved.startsWith("..") || isAbsolute(resolved)) {
          violations.push(`repository path must not be a symlink or resolve outside the repository: ${normalized}`);
          continue;
        }
      } catch (error) {
        violations.push(`repository path is unsafe or unreadable: ${normalized}: ${error instanceof Error ? error.message : String(error)}`);
        continue;
      }
    }
    const first = normalized.split("/", 1)[0];
    if (!normalized.includes("/") && !rootFiles.has(normalized)) {
      violations.push(`classify root file in ${policyPath}: ${normalized}`);
    }
    if (normalized.includes("/") && !topLevels.has(first)) violations.push(`move path into an approved top-level root: ${normalized}`);
    if (exclusions.some((entry) => under(normalized, entry))) continue;
    const extension = extname(normalized);
    if (rootConfig.has(normalized)) continue;
    if (sourceExtensions.has(extension)) {
      if (!rootSources.has(normalized) && !standalone.has(normalized) && !sourceRoots.some((entry) => under(normalized, entry))) {
        violations.push(`move hand-authored source into an approved source root: ${normalized}`);
      }
    } else if (configurationExtensions.has(extension)) {
      if (!configRoots.some((entry) => under(normalized, entry)) && !sourceRoots.some((entry) => under(normalized, entry))) {
        violations.push(`move configuration into an approved source or configuration root: ${normalized}`);
      }
    }
  }
}

function readTypeScriptConfig(path, violations) {
  const result = ts.readConfigFile(path, ts.sys.readFile);
  if (result.error) {
    violations.push(`fix invalid TypeScript project configuration ${path}: ${ts.flattenDiagnosticMessageText(result.error.messageText, " ")}`);
    return null;
  }
  return result.config;
}

function normalizeProjectReference(path) {
  const normalized = normalizeRepoPath(String(path ?? "").replace(/^\.\//, ""));
  if (normalized.endsWith(".json")) return normalized;
  return normalized.endsWith("/tsconfig") ? `${normalized}.json` : `${normalized}/tsconfig.json`;
}

function validateTypeScriptProjectGraph(root, files, violations) {
  if (!files.includes("tsconfig.json") || !files.includes("package.json")) return;
  let packageJson;
  try {
    packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  } catch (error) {
    violations.push(`fix invalid package.json before validating the TypeScript project graph: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  if (!/\btsc\s+--build\b/.test(String(packageJson.scripts?.typecheck ?? ""))) {
    violations.push("package.json scripts.typecheck must use tsc --build so project references are enforced");
  }
  const rootConfig = readTypeScriptConfig(join(root, "tsconfig.json"), violations);
  if (!rootConfig) return;
  const references = new Set((rootConfig.references ?? []).map((row) => normalizeProjectReference(row?.path)));
  const projects = files.filter((path) => /(^|\/)tsconfig[^/]*\.json$/.test(path) && path !== "tsconfig.json");
  for (const project of projects) {
    const config = readTypeScriptConfig(join(root, project), violations);
    if (!config) continue;
    if (config.compilerOptions?.composite === true && !references.has(project)) {
      violations.push(`tsconfig.json must reference composite project ${project}`);
    }
  }
  if (!files.includes("tsconfig.node.json")) return;
  const nodeConfig = readTypeScriptConfig(join(root, "tsconfig.node.json"), violations);
  if (!nodeConfig) return;
  if (nodeConfig.compilerOptions?.composite !== true) violations.push("tsconfig.node.json must be composite");
  if (nodeConfig.compilerOptions?.noEmit === true) violations.push("referenced tsconfig.node.json cannot disable emit");
  if (!String(nodeConfig.compilerOptions?.outDir ?? "").replace(/^\.\//, "").startsWith("node_modules/.cache/")) {
    violations.push("tsconfig.node.json must emit only into the ignored node_modules/.cache directory");
  }
  const parsed = ts.parseJsonConfigFileContent(nodeConfig, ts.sys, root, undefined, join(root, "tsconfig.node.json"));
  for (const diagnostic of parsed.errors) {
    violations.push(`fix tsconfig.node.json: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`);
  }
  const ownedFiles = new Set(parsed.fileNames.map((path) => normalizeRepoPath(path.slice(root.length + 1))));
  const configSurfaces = files.filter((path) => /^[^/]+\.config\.tsx?$/.test(path) || /^\.storybook\/[^/]+\.tsx?$/.test(path));
  for (const path of configSurfaces) {
    if (!ownedFiles.has(path)) violations.push(`tsconfig.node.json must own TypeScript configuration surface ${path}`);
  }
}

export function collectCanonicalRepositoryStructureViolations(root, options = {}) {
  const violations = [];
  if (!existsSync(join(root, architecturePath))) violations.push(`add canonical architecture owner: ${architecturePath}`);
  const policy = readPolicy(root, violations);
  if (!policy) return violations;
  if (policy.schema_version !== 1) violations.push(`${policyPath} schema_version must be 1`);
  if (policy.scale_assumption?.lines !== 2000000 || policy.scale_assumption?.files !== 50000) violations.push(`${policyPath} must encode the 2000000-line and 50000-file scale assumption`);
  for (const extension of strings(policy.included_extensions)) {
    const classifications = Number(sourceExtensions.has(extension)) + Number(configurationExtensions.has(extension));
    if (classifications !== 1) violations.push(`${policyPath} included extension must have exactly one structural class: ${extension}`);
  }
  const structure = policy.structure ?? {};
  for (const field of ["allowed_source_roots", "allowed_root_files", "allowed_top_level_directories", "units"]) {
    if (!Array.isArray(structure[field]) || structure[field].length === 0) violations.push(`${policyPath} structure.${field} must be non-empty`);
  }
  for (const path of [...strings(structure.allowed_root_source_files), ...strings(structure.allowed_root_configuration_files)]) {
    if (!strings(structure.allowed_root_files).includes(path)) {
      violations.push(`${policyPath} structure.allowed_root_files must include declared root source or configuration: ${path}`);
    }
  }
  for (const path of [...strings(structure.allowed_source_roots), ...strings(structure.allowed_configuration_roots)]) {
    if (!existsSync(join(root, path))) violations.push(`remove empty or missing approved root from ${policyPath}: ${path}`);
  }
  for (const row of Array.isArray(policy.non_hand_authored_exclusions) ? policy.non_hand_authored_exclusions : []) {
    const path = normalizeRepoPath(String(row?.path ?? ""));
    if (["generated", "vendored"].includes(row?.category) && strings(structure.allowed_source_roots).some((sourceRoot) => under(path, sourceRoot))) {
      violations.push(`move ${row.category} content outside hand-authored source roots: ${path}`);
    }
  }
  for (const command of ["architecture_check", "source_limit_check", "full_graph_check"]) {
    if (typeof structure[command] !== "string" || !structure[command].trim()) violations.push(`${policyPath} structure.${command} is required`);
  }
  validateUnits(root, structure, violations);
  let files;
  try {
    files = listGovernedFiles(root, options.execFileSync)
      .filter((path) => existsSync(join(root, path)));
  } catch (error) {
    violations.push(`repository structure scan could not enumerate tracked and untracked nonignored files: ${error instanceof Error ? error.message : String(error)}`);
    return violations;
  }
  validateFiles(root, policy, files, violations);
  validateTypeScriptProjectGraph(root, files, violations);
  return [...new Set(violations)].sort();
}
