import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ignoredTraversalPaths = new Set([
  ".claude",
  ".git",
  ".husky/_",
  "node_modules",
  "target",
]);

const allowedRootEntries = new Set([
  ".cargo",
  ".sqlx",
  ".claudeignore",
  ".env.example",
  ".github",
  ".gitignore",
  ".husky",
  ".lintstagedrc.json",
  ".markdownlint.json",
  ".nvmrc",
  ".storybook",
  ".vale",
  ".vale.ini",
  "AGENTS.md",
  "Cargo.lock",
  "Cargo.toml",
  "CHANGELOG.md",
  "CLAUDE.md",
  "CODE_OF_CONDUCT.md",
  "DESIGN.md",
  "LICENSE",
  "models.lock.toml",
  "PRIVACY.md",
  "README.md",
  "RESPONSIBLE_AI.md",
  "ROADMAP.md",
  "SECURITY.md",
  "clippy.toml",
  "config",
  "crates",
  "docs",
  "deny.toml",
  "eslint.config.js",
  "examples",
  "index.html",
  "package-lock.json",
  "package.json",
  "playwright.config.ts",
  "postcss.config.js",
  "profiles",
  "public",
  "resources",
  "rust-toolchain.toml",
  "rust-toolchain.toml",
  "scripts",
  "skills",
  "src",
  "src-tauri",
  "tailwind.config.js",
  "tests",
  "tsconfig.json",
  "tsconfig.node.json",
  "vite.config.ts",
  "vitest.config.ts",
  "validation",
  "clippy.toml",
  "deny.toml",
]);

const allowedTrackedGeneratedPaths = new Set([
  "docs/images/application-tracking.png",
  "docs/images/hiring-system-transparency.png",
  "docs/images/dashboard.png",
  "docs/images/logo.png",
  "docs/images/hiring-trends.png",
  "docs/images/application-assist.png",
  "docs/images/resume-builder.png",
  "docs/images/resume-matcher.png",
  "docs/images/pay-protection.png",
  "docs/images/settings.png",
  "src-tauri/gen/schemas/acl-manifests.json",
  "src-tauri/gen/schemas/capabilities.json",
  "src-tauri/gen/schemas/desktop-schema.json",
  "src-tauri/gen/schemas/macOS-schema.json",
]);

// Note: the local, gitignored `.claude/` agent settings directory is skipped
// via ignoredTraversalPaths above, matching scripts/checks/harness.mjs. It is a
// legitimate local override surface (see repo-first rules), not a disposable
// build artifact, so it must not be forbidden here.
const forbiddenArtifactDirs = new Set([
  ".vagrant",
  "coverage",
  "dist",
  "dist-ssr",
  "playwright-report",
  "storybook-static",
  "test_cache",
  "test_ml_cache",
  "test-results",
]);

const forbiddenRootSummaryPattern =
  /(?:_SUMMARY|_FIXES|_REPORT|_ANALYSIS|_ROADMAP|_GUIDE|_CHECKLIST|_IMPLEMENTATION|_PLAN)\.md$/;

const forbiddenFileExtensions = new Set([
  ".AppImage",
  ".bak",
  ".bk",
  ".db",
  ".db-shm",
  ".db-wal",
  ".deb",
  ".dmg",
  ".local",
  ".log",
  ".msi",
  ".njsproj",
  ".pdb",
  ".rpm",
  ".sln",
  ".suo",
  ".swo",
  ".swp",
  ".tmp",
  ".ntvs",
]);

const forbiddenFileNames = new Set([
  ".DS_Store",
  ".gitkeep",
  "Thumbs.db",
  "desktop.ini",
  "npm-debug.log",
  "yarn-debug.log",
  "yarn-error.log",
  "pnpm-debug.log",
  "lerna-debug.log",
]);

const forbiddenTrackedPlaceholderFiles = new Set([
  "tests/e2e/fixtures/.gitkeep",
  "tests/e2e/fixtures/README.md",
]);

const forbiddenTrackedOneOffDocs = new Set(["docs/intel-mac-support.md"]);

const fileSizeContractPath = "validation/file_size_contract.json";
const fileSizeContractSchema = "jobsentinel.file_size_contract.v1";
const requiredExceptionFields = ["owner", "reason", "follow_up_trigger"];

const defaultFileSizeContract = {
  schema: fileSizeContractSchema,
  scopes: [
    {
      id: "frontend-source",
      globs: ["src/**/*.ts", "src/**/*.tsx"],
      exclude_globs: [
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
        "src/mocks/**",
        "src/shared/*Taxonomy.ts",
        "src/shared/*Taxonomy.json",
        "src/shared/*Entries.ts",
      ],
      max_lines: 700,
    },
    {
      id: "shared-taxonomies",
      globs: [
        "src/shared/*Taxonomy.ts",
        "src/shared/*Taxonomy.json",
        "src/shared/*Entries.ts",
      ],
      max_lines: 2000,
    },
    {
      id: "frontend-tests-and-mocks",
      globs: ["src/**/*.test.ts", "src/**/*.test.tsx", "src/mocks/**/*.ts"],
      max_lines: 1200,
    },
    {
      id: "rust-source",
      globs: ["src-tauri/src/**/*.rs", "crates/**/*.rs"],
      exclude_globs: [
        "src-tauri/src/**/*test*.rs",
        "src-tauri/src/**/tests.rs",
        "src-tauri/src/**/tests/**/*.rs",
        "src-tauri/src/**/*tests/**/*.rs",
        "crates/**/*test*.rs",
        "crates/**/tests.rs",
        "crates/**/tests/**/*.rs",
        "crates/**/*tests/**/*.rs",
      ],
      max_lines: 700,
    },
    {
      id: "rust-tests",
      globs: [
        "src-tauri/src/**/*test*.rs",
        "src-tauri/src/**/tests.rs",
        "src-tauri/src/**/tests/**/*.rs",
        "src-tauri/src/**/*tests/**/*.rs",
        "src-tauri/tests/**/*.rs",
        "crates/**/*test*.rs",
        "crates/**/tests.rs",
        "crates/**/tests/**/*.rs",
        "crates/**/*tests/**/*.rs",
        "crates/*/tests/**/*.rs",
      ],
      max_lines: 1200,
    },
    {
      id: "cross-runtime-resources",
      globs: ["resources/**/*.json"],
      max_lines: 2000,
    },
    {
      id: "scripts",
      globs: ["scripts/**/*.mjs"],
      exclude_globs: ["scripts/tests/**"],
      max_lines: 900,
    },
    {
      id: "script-tests",
      globs: ["scripts/tests/**/*.mjs"],
      max_lines: 1200,
    },
    {
      id: "docs",
      globs: ["*.md", "docs/**/*.md"],
      max_lines: 900,
    },
  ],
  ignore_globs: [
    ".git/**",
    "node_modules/**",
    "target/**",
    "target/**",
    "crates/**/target/**",
    "package-lock.json",
    "Cargo.lock",
    "Cargo.lock",
    "src-tauri/gen/**",
    "docs/plans/archive/**",
  ],
  exceptions: [],
};

const fileSizeContractCache = new Map();

export function normalizeRepoPath(path) {
  return path.split(/[\\/]/).join("/");
}

function shouldSkipTraversal(relPath) {
  const normalized = normalizeRepoPath(relPath);
  const parts = normalized.split("/");

  if (ignoredTraversalPaths.has(normalized)) {
    return true;
  }

  return parts.some((part) => part === "node_modules" || part === ".git");
}

function isForbiddenFileName(name) {
  if (forbiddenFileNames.has(name)) {
    return true;
  }

  if (name.endsWith("~")) {
    return true;
  }

  if (/\.sw.$/.test(name) || name.endsWith("storybook.log")) {
    return true;
  }

  if (
    name.startsWith("npm-debug.log") ||
    name.startsWith("yarn-debug.log") ||
    name.startsWith("yarn-error.log") ||
    name.startsWith("pnpm-debug.log") ||
    name.startsWith("lerna-debug.log")
  ) {
    return true;
  }

  return forbiddenFileExtensions.has(extname(name));
}

function isForbiddenEmptyDirectory(path) {
  return /^(?:docs|examples|profiles|scripts|src|tests)\//.test(path) ||
    path.startsWith("src-tauri/src/");
}

export function collectUnexpectedRootEntries(root) {
  const violations = [];

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const rel = normalizeRepoPath(entry.name);

    if (ignoredTraversalPaths.has(rel) || rel === ".git" || rel === "node_modules") {
      continue;
    }

    if (!allowedRootEntries.has(rel)) {
      violations.push(`${rel} is not in the root allowlist`);
    }
  }

  return violations;
}

export function collectFilesystemBloat(root, dir = root) {
  const violations = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    const rel = normalizeRepoPath(relative(root, fullPath));

    if (shouldSkipTraversal(rel)) {
      continue;
    }

    if (entry.isDirectory()) {
      if (forbiddenArtifactDirs.has(entry.name)) {
        violations.push(`${rel}/ is a disposable local artifact`);
        continue;
      }

      if (isForbiddenEmptyDirectory(rel) && readdirSync(fullPath).length === 0) {
        violations.push(`${rel}/ is an empty local directory`);
        continue;
      }

      violations.push(...collectFilesystemBloat(root, fullPath));
      continue;
    }

    if (entry.isFile() && isForbiddenFileName(entry.name)) {
      violations.push(`${rel} is a disposable local artifact`);
    }
  }

  return violations;
}

export function listTrackedFiles(root) {
  return execFileSync("git", ["ls-files"], {
    cwd: root,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean)
    .map(normalizeRepoPath)
    .filter((path) => existsSync(join(root, path)));
}

export function isTrackedBloat(path) {
  if (allowedTrackedGeneratedPaths.has(path)) {
    return false;
  }

  if (forbiddenTrackedPlaceholderFiles.has(path)) {
    return true;
  }

  if (forbiddenTrackedOneOffDocs.has(path)) {
    return true;
  }

  const parts = path.split("/");
  const fileName = parts.at(-1) ?? path;

  if (fileName === ".gitkeep") {
    return true;
  }

  if (parts.length > 1 && /^test[_-].*\.sh$/.test(fileName) && parts[0] !== "scripts") {
    return true;
  }

  if (parts[0] === "src" && extname(fileName) === ".md") {
    return true;
  }

  if (parts.length === 1 && forbiddenRootSummaryPattern.test(fileName)) {
    return true;
  }

  if (
    parts.some((part) =>
      ["coverage", "dist", "dist-ssr", "playwright-report", "test-results"].includes(part),
    )
  ) {
    return true;
  }

  if (path.startsWith("tests/e2e/docs/")) {
    return true;
  }

  if (path.startsWith("src-tauri/gen/") && !path.startsWith("src-tauri/gen/schemas/")) {
    return true;
  }

  return isForbiddenFileName(fileName);
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
