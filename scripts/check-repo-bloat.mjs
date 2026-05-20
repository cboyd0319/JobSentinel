#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");

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
  ".markdownlint-cli2.jsonc",
  ".markdownlint.json",
  ".storybook",
  ".vale",
  ".vale.ini",
  "AGENTS.md",
  "CHANGELOG.md",
  "CLAUDE.md",
  "CODE_OF_CONDUCT.md",
  "LICENSE",
  "README.md",
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
  "scripts",
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
  "docs/images/ats-optimizer.png",
  "docs/images/dashboard-light.png",
  "docs/images/dashboard.png",
  "docs/images/keyboard-shortcuts.png",
  "docs/images/logo.png",
  "docs/images/market-intelligence.png",
  "docs/images/one-click-apply.png",
  "docs/images/resume-builder.png",
  "docs/images/resume-matcher.png",
  "docs/images/salary-ai.png",
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

function normalizeRepoPath(path) {
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

function collectUnexpectedRootEntries(root) {
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

function collectFilesystemBloat(root, dir = root) {
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

      violations.push(...collectFilesystemBloat(root, fullPath));
      continue;
    }

    if (entry.isFile() && isForbiddenFileName(entry.name)) {
      violations.push(`${rel} is a disposable local artifact`);
    }
  }

  return violations;
}

function listTrackedFiles(root) {
  return execFileSync("git", ["ls-files"], {
    cwd: root,
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter(Boolean)
    .map(normalizeRepoPath)
    .filter((path) => existsSync(join(root, path)));
}

function isTrackedBloat(path) {
  if (allowedTrackedGeneratedPaths.has(path)) {
    return false;
  }

  if (forbiddenTrackedPlaceholderFiles.has(path)) {
    return true;
  }

  const parts = path.split("/");
  const fileName = parts.at(-1) ?? path;

  if (parts.length > 1 && /^test[_-].*\.sh$/.test(fileName) && parts[0] !== "scripts") {
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

export function checkRepoBloat(root = defaultRoot) {
  const violations = [];

  if (!existsSync(root)) {
    return [`repo root does not exist: ${root}`];
  }

  for (const rootEntry of collectUnexpectedRootEntries(root)) {
    violations.push(`classify root entry or move/remove it: ${rootEntry}`);
  }

  for (const artifact of collectFilesystemBloat(root)) {
    violations.push(`remove local artifact: ${artifact}`);
  }

  for (const path of listTrackedFiles(root)) {
    if (isTrackedBloat(path)) {
      violations.push(`remove tracked generated or disposable file: ${path}`);
    }
  }

  return violations.sort();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.argv[2] ? resolve(process.argv[2]) : defaultRoot;
  const violations = checkRepoBloat(root);

  if (violations.length > 0) {
    console.error("Repo bloat check failed:");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log("Repo bloat check passed.");
}
