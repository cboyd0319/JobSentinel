import { execFileSync } from "node:child_process";
import { closeSync, existsSync, lstatSync, openSync, readFileSync, readSync, realpathSync } from "node:fs";
import { extname, isAbsolute, join, relative } from "node:path";

const cache = new Map();
const globCache = new Map();
const repositoryStructurePolicyPath =
  "scripts/harness/contracts/repository-structure.json";
const requiredExceptionFields = [
  "owner",
  "reason",
  "approval_date",
  "retirement_condition",
];
const requiredExclusionFields = ["owner", "reason", "refresh_trigger"];
const canonicalLimits = {
  review_lines: 300,
  hard_lines: 500,
  review_bytes: 32768,
  hard_bytes: 65536,
};

export function normalizeRepoPath(path) {
  return path.split(/[\\/]/).join("/").replace(/^\.\//, "");
}

export function clearFileSizeContractCache() {
  cache.clear();
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function stringList(value) {
  return Array.isArray(value) ? value.filter(nonEmpty) : [];
}

function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function globToRegExp(pattern) {
  const normalized = normalizeRepoPath(pattern);
  if (globCache.has(normalized)) return globCache.get(normalized);
  let regex = "^";
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];
    if (char === "*" && next === "*") {
      if (normalized[index + 2] === "/") {
        regex += "(?:.*/)?";
        index += 2;
      } else {
        regex += ".*";
        index += 1;
      }
    } else if (char === "*") regex += "[^/]*";
    else if (char === "?") regex += "[^/]";
    else regex += escapeRegExp(char);
  }
  const compiled = new RegExp(`${regex}$`);
  globCache.set(normalized, compiled);
  return compiled;
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return { ...fallback, parse_error: error instanceof Error ? error.message : String(error) };
  }
}

function fileMetrics(root, path) {
  const fullPath = join(root, path);
  const stat = lstatSync(fullPath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("governed path must be a regular file, not a symlink or special entry");
  const realRelative = relative(realpathSync(root), realpathSync(fullPath));
  if (realRelative.startsWith("..") || isAbsolute(realRelative)) throw new Error("governed path resolves outside the repository");
  const buffer = Buffer.allocUnsafe(65536);
  let lineBreaks = 0;
  let lineBytes = 0;
  let maxLineBytes = 0;
  let lastByte = null;
  const descriptor = openSync(fullPath, "r");
  try {
    for (;;) {
      const count = readSync(descriptor, buffer, 0, buffer.length, null);
      if (count === 0) break;
      for (let index = 0; index < count; index += 1) {
        const byte = buffer[index];
        if (byte === 10) {
          lineBreaks += 1;
          maxLineBytes = Math.max(maxLineBytes, lineBytes - (lastByte === 13 ? 1 : 0));
          lineBytes = 0;
        } else {
          lineBytes += 1;
        }
        lastByte = byte;
      }
    }
  } finally {
    closeSync(descriptor);
  }
  maxLineBytes = Math.max(maxLineBytes, lineBytes);
  return {
    lines: stat.size === 0 ? 0 : lineBreaks + (lastByte === 10 ? 0 : 1),
    bytes: stat.size,
    maxLineBytes,
  };
}

function load(root) {
  if (cache.has(root)) return cache.get(root);
  const policyPath = join(root, repositoryStructurePolicyPath);
  const policy = existsSync(policyPath) ? readJson(policyPath, {}) : { missing: true };
  const loaded = {
    policy,
    scopes: Array.isArray(policy.file_size?.scopes)
      ? policy.file_size.scopes
      : [],
    extensions: new Set(stringList(policy.included_extensions)),
    exclusions: Array.isArray(policy.non_hand_authored_exclusions)
      ? policy.non_hand_authored_exclusions
      : [],
    exceptions: new Map(
      (Array.isArray(policy.exceptions) ? policy.exceptions : []).map((row) => [
        normalizeRepoPath(String(row?.path ?? "")),
        row,
      ]),
    ),
  };
  cache.set(root, loaded);
  return loaded;
}

function excluded(path, rows) {
  return rows.some((row) => {
    const ownerPath = normalizeRepoPath(String(row?.path ?? ""));
    return path === ownerPath || path.startsWith(`${ownerPath}/`);
  });
}

function scopesFor(path, scopes) {
  const matches = scopes.filter((scope) =>
    stringList(scope.globs).some((glob) => globToRegExp(glob).test(path)),
  );
  const specific = matches.filter((scope) => scope.id !== "maintained-source-fallback");
  return specific.length > 0 ? specific : matches;
}

function validatePolicy(root, loaded) {
  const { policy } = loaded;
  const failures = [];
  if (policy.missing) failures.push(`add canonical structure policy: ${repositoryStructurePolicyPath}`);
  if (policy.parse_error) failures.push(`fix invalid ${repositoryStructurePolicyPath}: ${policy.parse_error}`);
  if (policy.schema_version !== 1) failures.push(`${repositoryStructurePolicyPath} schema_version must be 1`);
  for (const [field, value] of Object.entries(canonicalLimits)) {
    if (policy.source_limits?.[field] !== value) failures.push(`${repositoryStructurePolicyPath} source_limits.${field} must be ${value}`);
  }
  if (loaded.extensions.size === 0) failures.push(`${repositoryStructurePolicyPath} included_extensions must be non-empty`);
  if (loaded.scopes.length === 0) {
    failures.push(`${repositoryStructurePolicyPath} file_size.scopes must be non-empty`);
  }
  for (const scope of loaded.scopes) {
    if (!nonEmpty(scope?.id) || stringList(scope?.globs).length === 0) {
      failures.push(
        `${repositoryStructurePolicyPath} file_size scope ${String(scope?.id ?? "<missing>")} requires an id and globs`,
      );
    }
  }
  const exclusionPaths = new Set();
  for (const row of loaded.exclusions) {
    const path = normalizeRepoPath(String(row?.path ?? ""));
    if (!path || /[*?]/.test(path)) failures.push(`non-hand-authored exclusion must use an exact path: ${path || "<missing>"}`);
    if (exclusionPaths.has(path)) failures.push(`duplicate non-hand-authored exclusion: ${path}`);
    exclusionPaths.add(path);
    for (const field of ["category", ...requiredExclusionFields]) if (!nonEmpty(row?.[field])) failures.push(`non-hand-authored exclusion ${path}: ${field} is required`);
    if (path && !existsSync(join(root, path))) failures.push(`remove stale non-hand-authored exclusion: ${path}`);
  }
  const exceptionPaths = new Set();
  for (const [path, row] of loaded.exceptions) {
    if (!path || /[*?]/.test(path)) failures.push(`source-limit exception must use an exact path: ${path || "<missing>"}`);
    if (exceptionPaths.has(path)) failures.push(`duplicate source-limit exception: ${path}`);
    exceptionPaths.add(path);
    for (const field of requiredExceptionFields) if (!nonEmpty(row?.[field])) failures.push(`source-limit exception ${path}: ${field} is required`);
    if (!/^20\d{2}-\d{2}-\d{2}$/.test(String(row?.approval_date ?? ""))) failures.push(`source-limit exception ${path}: approval_date must be ISO`);
    if (!Array.isArray(row?.affected_rules) || row.affected_rules.length === 0 || row.affected_rules.some((rule) => !["hard_lines", "hard_bytes"].includes(rule))) failures.push(`source-limit exception ${path}: affected_rules must name hard_lines or hard_bytes`);
    if (!Number.isInteger(row?.max_lines) || !Number.isInteger(row?.max_bytes)) failures.push(`source-limit exception ${path}: temporary line and byte ceilings are required`);
    if (!existsSync(join(root, path))) {
      failures.push(`remove stale source-limit exception: ${path}`);
      continue;
    }
    let metrics;
    try {
      metrics = fileMetrics(root, path);
    } catch (error) {
      failures.push(`source-limit exception ${path}: unsafe or unreadable source: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const actualRules = [
      ...(metrics.lines > canonicalLimits.hard_lines ? ["hard_lines"] : []),
      ...(metrics.bytes > canonicalLimits.hard_bytes ? ["hard_bytes"] : []),
    ];
    if (actualRules.length === 0) failures.push(`remove retired source-limit exception: ${path}`);
    if (JSON.stringify([...new Set(row.affected_rules)].sort()) !== JSON.stringify(actualRules.sort())) failures.push(`source-limit exception ${path}: affected_rules do not match current metrics`);
  }
  return failures;
}

export function collectTrackedFileSizeViolations(root, inputPath) {
  const path = normalizeRepoPath(inputPath);
  const loaded = load(root);
  if (!loaded.extensions.has(extname(path)) || excluded(path, loaded.exclusions)) return [];
  if (!existsSync(join(root, path))) return [];
  const scopes = scopesFor(path, loaded.scopes);
  if (scopes.length === 0) return [`classify source or configuration in ${repositoryStructurePolicyPath}: ${path}`];
  const exception = loaded.exceptions.get(path);
  const maxLines = exception?.max_lines ?? canonicalLimits.hard_lines;
  const maxBytes = exception?.max_bytes ?? canonicalLimits.hard_bytes;
  const maxLineBytes = canonicalLimits.hard_bytes;
  let metrics;
  try {
    metrics = fileMetrics(root, path);
  } catch (error) {
    return [`reject unsafe or unreadable governed source ${path}: ${error instanceof Error ? error.message : String(error)}`];
  }
  const violations = [];
  if (metrics.lines > maxLines) violations.push(`split oversized source: ${path} has ${metrics.lines} lines; temporary maximum is ${maxLines}`);
  if (metrics.bytes > maxBytes) violations.push(`split oversized source: ${path} has ${metrics.bytes} bytes; temporary maximum is ${maxBytes}`);
  if (metrics.maxLineBytes > maxLineBytes) violations.push(`split oversized source line: ${path} has ${metrics.maxLineBytes} bytes; maximum is ${maxLineBytes}`);
  return violations;
}

export function listGovernedFiles(root, exec = execFileSync) {
  const output = exec("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8" });
  return output.split("\0").map(normalizeRepoPath).filter(Boolean).sort();
}

export function listChangedFiles(root, exec = execFileSync) {
  const options = { cwd: root, encoding: "utf8" };
  const tracked = exec(
    "git",
    ["diff", "--name-only", "--diff-filter=ACMR", "-z", "HEAD", "--"],
    options,
  );
  const untracked = exec(
    "git",
    ["ls-files", "--others", "--exclude-standard", "-z"],
    options,
  );
  return [...new Set(`${tracked}${untracked}`.split("\0").map(normalizeRepoPath).filter(Boolean))].sort();
}

export function collectFileSizeContractGlobalViolations(root) {
  return validatePolicy(root, load(root));
}

export function collectRepositoryFileSizeReviewCandidates(root, options = {}) {
  const loaded = load(root);
  const files = options.paths ?? listGovernedFiles(root, options.execFileSync);
  return files.filter((path) => {
    if (!loaded.extensions.has(extname(path)) || excluded(path, loaded.exclusions) || !existsSync(join(root, path))) return false;
    const metrics = fileMetrics(root, path);
    return metrics.lines > canonicalLimits.review_lines || metrics.bytes > canonicalLimits.review_bytes;
  });
}

export function collectRepositoryFileSizeViolations(root, options = {}) {
  const violations = collectFileSizeContractGlobalViolations(root);
  let files;
  try {
    files = listGovernedFiles(root, options.execFileSync);
  } catch (error) {
    return [...violations, `source scan could not enumerate repository files: ${error instanceof Error ? error.message : String(error)}`];
  }
  for (const path of files) violations.push(...collectTrackedFileSizeViolations(root, path));
  return [...new Set(violations)].sort();
}
