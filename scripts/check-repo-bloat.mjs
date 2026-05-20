#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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

const speculativeCloudDeploymentDocs = new Map([
  [
    "docs/developer/ARCHITECTURE.md",
    /Cloud Architecture \(not implemented\)|Cloud Backend \(GCP\/AWS\)|or in the cloud/,
  ],
  ["docs/developer/GETTING_STARTED.md", /src-tauri\/src\/cloud\/|GCP\/AWS deployment/],
  ["docs/ROADMAP.md", /GCP Cloud Run \/ AWS Lambda deployment/],
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

  if (fileName === ".gitkeep") {
    return true;
  }

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

function hasSpeculativeCloudDeploymentDoc(root, path) {
  const pattern = speculativeCloudDeploymentDocs.get(path);

  if (!pattern) {
    return false;
  }

  return pattern.test(readFileSync(join(root, path), "utf8"));
}

function hasStaleInformalMaintainerFooter(root, path) {
  if (!path.endsWith(".md")) {
    return false;
  }

  return /Maintained By\**:\s*The Rust Mac Overlord/i.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasStaleHardcodedMigrationCount(root, path) {
  if (path !== "docs/developer/GETTING_STARTED.md") {
    return false;
  }

  return /\b\d+\s+SQLite migrations\b/.test(readFileSync(join(root, path), "utf8"));
}

function hasStaleIntegrationFixtureDirectoryClaim(root, path) {
  if (path !== "docs/developer/INTEGRATION_TESTING.md") {
    return false;
  }

  return /fixtures\/\s+# Test HTML\/JSON responses|Test HTML responses stored in `fixtures\/`/m.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasStaleSchedulerWorkerPathDocs(root, path) {
  if (path !== "docs/developer/ARCHITECTURE.md") {
    return false;
  }

  return /workers\/(?:scraper|scorer|notifier)\.rs/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasStaleSchedulerScraperPathDocs(root, path) {
  if (path !== "docs/security/KEYRING.md") {
    return false;
  }

  return /scheduler\/scrapers\.rs/.test(readFileSync(join(root, path), "utf8"));
}

function hasStaleRefactoringPriorityTable(root, path) {
  if (path !== "docs/developer/GETTING_STARTED.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /\*\*v1\.5 Refactoring Priority\*\*/.test(text) ||
    /needs modularization|candidate for split|frontend refactoring planned/.test(text)
  );
}

function hasStaleShippedFeatureStatusDoc(root, path) {
  if (path !== "docs/ROADMAP.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /src-tauri\/src\/core\/import\/` module \(planned\)/.test(text) ||
    /\u{1f532} Universal Job Importer with Schema\.org parsing/u.test(text) ||
    /\u{1f532} Deep Link Generator for 15\+ sites/u.test(text) ||
    /\u{1f532} Bookmarklet generator/u.test(text)
  );
}

function hasRoadmapStatusEmoji(root, path) {
  if (path !== "docs/ROADMAP.md") {
    return false;
  }

  return /[\u{2705}\u{1f532}]/u.test(readFileSync(join(root, path), "utf8"));
}

function hasStaleUserDataExportRoadmapClaim(root, path) {
  if (path !== "docs/features/user-data-management.md") {
    return false;
  }

  return /feature coming in v1\.5|\*\*v1\.5 \(Q1 2026\):\*\*|Export anytime.*JSON/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasDeepLinksEmojiOrVersionPromise(root, path) {
  if (path !== "docs/user/DEEP_LINKS.md") {
    return false;
  }

  return /[✅❌⚠️🔐]|coming in v2\.7|planned for v2\.7|^### v\d+\.\d+/m.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasQuickStartEmojiMarkers(root, path) {
  if (path !== "docs/user/QUICK_START.md") {
    return false;
  }

  return /[✅❌⚠️⏳🔐📄📝🟢🟡🔴📊📧📈📉🎯🚀💡🔍⭐]/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

function hasFrontDoorDocEmojiMarkers(root, path) {
  if (path !== "README.md" && path !== "docs/README.md") {
    return false;
  }

  return /[\u{2705}\u{274c}\u{26a0}\u{23f3}\u{26a1}\u{1f517}\u{1f512}\u{1f4c4}\u{1f4dd}\u{1f7e2}\u{1f7e1}\u{1f534}\u{1f4ca}\u{1f4e7}\u{1f4c8}\u{1f4c9}\u{1f3af}\u{1f680}\u{1f4a1}\u{1f50d}\u{2b50}]/u.test(
    readFileSync(join(root, path), "utf8"),
  );
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

    if (hasSpeculativeCloudDeploymentDoc(root, path)) {
      violations.push(`remove speculative cloud deployment doc: ${path}`);
    }

    if (hasStaleInformalMaintainerFooter(root, path)) {
      violations.push(`replace stale informal maintainer footer: ${path}`);
    }

    if (hasStaleHardcodedMigrationCount(root, path)) {
      violations.push(`remove stale hardcoded migration count: ${path}`);
    }

    if (hasStaleIntegrationFixtureDirectoryClaim(root, path)) {
      violations.push(`remove stale integration fixture directory claim: ${path}`);
    }

    if (hasStaleSchedulerWorkerPathDocs(root, path)) {
      violations.push(`remove stale scheduler worker path docs: ${path}`);
    }

    if (hasStaleSchedulerScraperPathDocs(root, path)) {
      violations.push(`remove stale scheduler scraper path docs: ${path}`);
    }

    if (hasStaleRefactoringPriorityTable(root, path)) {
      violations.push(`remove stale refactoring-priority table: ${path}`);
    }

    if (hasStaleShippedFeatureStatusDoc(root, path)) {
      violations.push(`remove stale shipped-feature status doc: ${path}`);
    }

    if (hasRoadmapStatusEmoji(root, path)) {
      violations.push(`replace roadmap status emoji with text: ${path}`);
    }

    if (hasStaleUserDataExportRoadmapClaim(root, path)) {
      violations.push(`remove stale user-data export roadmap claim: ${path}`);
    }

    if (hasDeepLinksEmojiOrVersionPromise(root, path)) {
      violations.push(`replace Deep Links doc emoji/version promises: ${path}`);
    }

    if (hasQuickStartEmojiMarkers(root, path)) {
      violations.push(`replace Quick Start doc emoji markers: ${path}`);
    }

    if (hasFrontDoorDocEmojiMarkers(root, path)) {
      violations.push(`replace front-door doc emoji markers: ${path}`);
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
