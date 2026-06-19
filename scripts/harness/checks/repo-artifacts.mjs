import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const ignoredTraversalPaths = new Set([
  ".git",
  ".husky/_",
  "node_modules",
  "src-tauri/target",
]);

const allowedRootEntries = new Set([
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
  "config",
  "docs",
  "eslint.config.js",
  "examples",
  "index.html",
  "package-lock.json",
  "package.json",
  "playwright.config.ts",
  "postcss.config.js",
  "profiles",
  "public",
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

const forbiddenArtifactDirs = new Set([
  ".claude",
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

const maintainableTextLineLimits = {
  doc: 900,
  frontend: 1200,
  rust: 1200,
  script: 900,
  test: 1200,
};

const legacyOversizedLineBudgets = new Map();

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

function getMaintainableTextLineLimit(path) {
  if (
    path === "package-lock.json" ||
    path === "src-tauri/Cargo.lock" ||
    path === "CHANGELOG.md" ||
    path.startsWith("docs/plans/archive/") ||
    path.startsWith("src-tauri/gen/")
  ) {
    return null;
  }

  const parts = path.split("/");
  const fileName = parts.at(-1) ?? path;

  if (
    /\.(?:png|jpe?g|icns|ico|webp|gif)$/i.test(fileName) ||
    (fileName.endsWith(".json") && fileName !== "package.json")
  ) {
    return null;
  }

  if (
    /\.(?:test|spec)\.(?:ts|tsx|js|jsx|mjs|rs)$/.test(path) ||
    path.includes("/tests.") ||
    path.endsWith("/tests.rs") ||
    /(^|\/)tests?\//.test(path)
  ) {
    return maintainableTextLineLimits.test;
  }

  if (path.startsWith("src/") && /\.(?:ts|tsx)$/.test(fileName)) {
    return maintainableTextLineLimits.frontend;
  }

  if (path.startsWith("src-tauri/src/") && fileName.endsWith(".rs")) {
    return maintainableTextLineLimits.rust;
  }

  if (path.startsWith("scripts/") && fileName.endsWith(".mjs")) {
    return maintainableTextLineLimits.script;
  }

  if (fileName.endsWith(".md")) {
    return maintainableTextLineLimits.doc;
  }

  return null;
}

export function collectTrackedFileSizeViolations(root, path) {
  const limit = getMaintainableTextLineLimit(path);
  if (limit === null) {
    return [];
  }

  const lineCount = countTextLines(readFileSync(join(root, path), "utf8"));
  if (lineCount <= limit) {
    return [];
  }

  const legacyBudget = legacyOversizedLineBudgets.get(path);
  if (legacyBudget !== undefined) {
    if (lineCount <= legacyBudget) {
      return [];
    }

    return [
      `split legacy oversized tracked file before growing it: ${path} has ${lineCount} lines (budget ${legacyBudget}, target ${limit})`,
    ];
  }

  return [
    `split oversized tracked file: ${path} has ${lineCount} lines (limit ${limit})`,
  ];
}

function countTextLines(text) {
  if (text.length === 0) {
    return 0;
  }

  const trailingNewlineAdjustment = /\r?\n$/.test(text) ? 1 : 0;
  return text.split(/\r?\n/).length - trailingNewlineAdjustment;
}
