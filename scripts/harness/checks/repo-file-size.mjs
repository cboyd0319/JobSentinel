import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  defaultFileSizeContract,
  fileSizeContractPath,
  fileSizeContractSchema,
  requiredExceptionFields,
} from "./repo-file-size-defaults.mjs";

const fileSizeContractCache = new Map();

export function normalizeRepoPath(path) {
  return path.split(/[\\/]/).join("/");
}

export function collectTrackedFileSizeViolations(root, path) {
  const contract = loadFileSizeContract(root);
  if (isIgnoredByFileSizeContract(path, contract.ignore_globs)) {
    return [];
  }

  const match = contractScopeForPath(path, contract.scopes);
  if (match === null) {
    return [];
  }

  const exception = contract.exceptionsByPath.get(path);
  const limit = exception?.max_lines ?? match.max_lines;
  const lineCount = countTextLines(readFileSync(join(root, path), "utf8"));
  if (lineCount <= limit) {
    return [];
  }

  return [
    `split oversized tracked file: ${path} has ${lineCount} lines (file-size contract max ${limit}, scope ${match.id})`,
  ];
}

export function collectFileSizeContractGlobalViolations(root) {
  const contract = loadFileSizeContract(root);
  const violations = [...contract.failures];

  for (const path of contract.exceptionsByPath.keys()) {
    if (!existsSync(join(root, path))) {
      violations.push(`remove stale file-size exception: ${path}`);
    }
  }

  return violations;
}

function loadFileSizeContract(root) {
  if (fileSizeContractCache.has(root)) {
    return fileSizeContractCache.get(root);
  }

  const contractFile = join(root, fileSizeContractPath);
  const rawContract = existsSync(contractFile)
    ? parseFileSizeContract(contractFile)
    : defaultFileSizeContract;
  const failures = validateFileSizeContract(rawContract, existsSync(contractFile), root);
  const exceptionsByPath = new Map();
  for (const row of Array.isArray(rawContract.exceptions) ? rawContract.exceptions : []) {
    if (isPlainObject(row) && typeof row.path === "string" && row.path.trim()) {
      exceptionsByPath.set(normalizeRepoPath(row.path), row);
    }
  }

  const contract = {
    failures,
    scopes: Array.isArray(rawContract.scopes) ? rawContract.scopes : [],
    ignore_globs: stringList(rawContract.ignore_globs),
    exceptionsByPath,
  };
  fileSizeContractCache.set(root, contract);
  return contract;
}

function parseFileSizeContract(contractFile) {
  try {
    return JSON.parse(readFileSync(contractFile, "utf8"));
  } catch (error) {
    return {
      ...defaultFileSizeContract,
      contract_parse_error: error instanceof Error ? error.message : String(error),
    };
  }
}

function validateFileSizeContract(contract, contractExists, root) {
  const failures = [];
  if (!contractExists && isJobSentinelPackageContractRequired(root)) {
    failures.push(`add file-size contract: ${fileSizeContractPath}`);
  }

  if (contract.contract_parse_error) {
    failures.push(`fix invalid file-size contract JSON: ${contract.contract_parse_error}`);
    return failures;
  }

  if (contract.schema !== fileSizeContractSchema) {
    failures.push(
      `fix file-size contract schema: expected ${fileSizeContractSchema}, found ${String(contract.schema ?? "")}`,
    );
  }

  if (!Array.isArray(contract.scopes) || contract.scopes.length === 0) {
    failures.push("fix file-size contract: scopes must be a non-empty array");
  } else {
    for (const scope of contract.scopes) {
      validateFileSizeScope(scope, failures);
    }
  }

  if (!Array.isArray(contract.exceptions)) {
    failures.push("fix file-size contract: exceptions must be an array");
  } else {
    validateFileSizeExceptions(contract.exceptions, failures);
  }

  return failures;
}

function isJobSentinelPackageContractRequired(root) {
  try {
    const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    return manifest?.name === "jobsentinel";
  } catch {
    return false;
  }
}

function validateFileSizeScope(scope, failures) {
  if (!isPlainObject(scope)) {
    failures.push("fix file-size contract: scope must be an object");
    return;
  }

  if (typeof scope.id !== "string" || !scope.id.trim()) {
    failures.push("fix file-size contract: scope id must be a non-empty string");
  }

  if (!stringList(scope.globs).length) {
    failures.push(`fix file-size contract ${scope.id ?? "unknown"}: globs must be non-empty`);
  }

  if (!Number.isInteger(scope.max_lines) || scope.max_lines <= 0) {
    failures.push(
      `fix file-size contract ${scope.id ?? "unknown"}: max_lines must be a positive integer`,
    );
  }
}

function validateFileSizeExceptions(exceptions, failures) {
  const seen = new Set();
  for (const row of exceptions) {
    if (!isPlainObject(row)) {
      failures.push("fix file-size contract: exception must be an object");
      continue;
    }

    const path = typeof row.path === "string" ? normalizeRepoPath(row.path) : "";
    if (!path) {
      failures.push("fix file-size contract: exception path must be non-empty");
      continue;
    }

    if (seen.has(path)) {
      failures.push(`fix duplicate file-size exception: ${path}`);
    }
    seen.add(path);

    if (!Number.isInteger(row.max_lines) || row.max_lines <= 0) {
      failures.push(`fix file-size exception ${path}: max_lines must be a positive integer`);
    }

    for (const field of requiredExceptionFields) {
      if (typeof row[field] !== "string" || !row[field].trim()) {
        failures.push(`fix file-size exception ${path}: ${field} must be non-empty`);
      }
    }
  }
}

function contractScopeForPath(path, scopes) {
  let selected = null;
  for (const scope of scopes) {
    if (!isPlainObject(scope) || !Number.isInteger(scope.max_lines)) {
      continue;
    }

    if (pathMatchesAny(path, stringList(scope.exclude_globs))) {
      continue;
    }

    if (!pathMatchesAny(path, stringList(scope.globs))) {
      continue;
    }

    if (selected === null || scope.max_lines < selected.max_lines) {
      selected = { id: scope.id, max_lines: scope.max_lines };
    }
  }
  return selected;
}

function isIgnoredByFileSizeContract(path, ignoreGlobs) {
  return pathMatchesAny(path, ignoreGlobs);
}

function pathMatchesAny(path, patterns) {
  return patterns.some((pattern) => globToRegExp(pattern).test(path));
}

const globRegExpCache = new Map();

function globToRegExp(pattern) {
  const normalized = normalizeRepoPath(pattern);
  if (globRegExpCache.has(normalized)) {
    return globRegExpCache.get(normalized);
  }

  let regex = "^";
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];

    if (char === "*" && next === "*") {
      const after = normalized[index + 2];
      if (after === "/") {
        regex += "(?:.*/)?";
        index += 2;
      } else {
        regex += ".*";
        index += 1;
      }
      continue;
    }

    if (char === "*") {
      regex += "[^/]*";
      continue;
    }

    if (char === "?") {
      regex += "[^/]";
      continue;
    }

    regex += escapeRegExp(char);
  }

  regex += "$";
  const compiled = new RegExp(regex);
  globRegExpCache.set(normalized, compiled);
  return compiled;
}

function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function stringList(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim())
    : [];
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function countTextLines(text) {
  if (text.length === 0) {
    return 0;
  }

  const trailingNewlineAdjustment = /\r?\n$/.test(text) ? 1 : 0;
  return text.split(/\r?\n/).length - trailingNewlineAdjustment;
}
