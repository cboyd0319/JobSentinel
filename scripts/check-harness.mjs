#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkFrontendBoundaries } from "./check-frontend-boundaries.mjs";
import {
  checkSecuritySensors,
  formatSecuritySensorSummary,
} from "./check-security-sensors.mjs";
import { checkTauriInvokes } from "./check-tauri-invokes.mjs";
import { checkTestQuality } from "./check-test-quality.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const ignoredPathParts = new Set([
  ".git",
  ".vale",
  "node_modules",
  "dist",
  "target",
  ".claude",
  "browser-extension",
  "playwright-report",
  "test-results",
]);

const requiredFiles = [
  "AGENTS.md",
  "docs/harness/README.md",
  "docs/harness/sources.md",
  "docs/harness/agent-operating-model.md",
  "docs/harness/change-contract.md",
  "docs/harness/verification-matrix.md",
  "docs/harness/entropy-control.md",
  "docs/exec-plans.md",
  "docs/plans/README.md",
  "docs/plans/templates/exec-plan-template.md",
  "docs/plans/templates/change-contract-template.md",
  "docs/plans/tech-debt-tracker.md",
];

const errors = [];

function repoPath(path) {
  return join(root, path);
}

function read(path) {
  return readFileSync(repoPath(path), "utf8");
}

function collectMarkdownFiles(dir = root) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const rel = relative(root, fullPath);
    const parts = rel.split(/[\\/]/);

    if (parts.some((part) => ignoredPathParts.has(part))) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(rel);
    }
  }

  return files.sort();
}

for (const path of requiredFiles) {
  if (!existsSync(repoPath(path))) {
    errors.push(`missing required harness file: ${path}`);
  }
}

if (existsSync(repoPath("AGENTS.md"))) {
  const lineCount = read("AGENTS.md").split(/\r?\n/).length;
  if (lineCount > 160) {
    errors.push(`AGENTS.md has ${lineCount} lines; keep it at or below 160 lines`);
  }
}

const localLinkPattern = /!?\[[^\]]*]\(([^)]+)\)/g;

for (const path of collectMarkdownFiles()) {
  if (!existsSync(repoPath(path))) {
    continue;
  }

  const text = read(path);
  let match;

  while ((match = localLinkPattern.exec(text)) !== null) {
    const rawTarget = match[1].trim();
    const target = rawTarget.replace(/^<|>$/g, "").split("#")[0];

    if (
      target === "" ||
      target.startsWith("http://") ||
      target.startsWith("https://") ||
      target.startsWith("mailto:") ||
      target.startsWith("#")
    ) {
      continue;
    }

    const resolved = normalize(resolve(root, dirname(path), target));
    if (!resolved.startsWith(root)) {
      errors.push(`${path} links outside repo: ${rawTarget}`);
      continue;
    }

    if (!existsSync(resolved)) {
      const displayPath = relative(root, resolved);
      errors.push(`${path} has broken local link: ${rawTarget} -> ${displayPath}`);
      continue;
    }

    if (statSync(resolved).isDirectory()) {
      const indexPath = join(resolved, "README.md");
      if (!existsSync(indexPath)) {
        errors.push(`${path} links to directory without README.md: ${rawTarget}`);
      }
    }
  }
}

const packageJson = JSON.parse(read("package.json"));
const packageLockJson = JSON.parse(read("package-lock.json"));
const tauriConfig = JSON.parse(read("src-tauri/tauri.conf.json"));
const cargoToml = read("src-tauri/Cargo.toml");
const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1];

if (packageJson.version !== tauriConfig.version) {
  errors.push(
    `version mismatch: package.json=${packageJson.version}, src-tauri/tauri.conf.json=${tauriConfig.version}`,
  );
}

if (packageLockJson.version !== packageJson.version) {
  errors.push(
    `version mismatch: package.json=${packageJson.version}, package-lock.json=${packageLockJson.version}`,
  );
}

if (packageLockJson.packages?.[""]?.version !== packageJson.version) {
  errors.push(
    `version mismatch: package.json=${packageJson.version}, package-lock.json root package=${packageLockJson.packages?.[""]?.version}`,
  );
}

if (cargoVersion !== packageJson.version) {
  errors.push(
    `version mismatch: package.json=${packageJson.version}, src-tauri/Cargo.toml=${cargoVersion ?? "missing"}`,
  );
}

const currentVersion = packageJson.version;
const versionClaims = {
  "README.md": [`Version-${currentVersion}`, `alt="Version ${currentVersion}"`],
  "docs/README.md": [`Current Version: ${currentVersion}`, `Release version:** ${currentVersion}`],
  "docs/ROADMAP.md": [`Current Version: ${currentVersion}`],
};

for (const [path, claims] of Object.entries(versionClaims)) {
  const text = read(path);
  for (const claim of claims) {
    if (!text.includes(claim)) {
      errors.push(`${path} must include current version claim: ${claim}`);
    }
  }
}

const mainRs = read("src-tauri/src/main.rs");
const generateHandlerMatch = mainRs.match(/tauri::generate_handler!\[\s*([\s\S]*?)\s*\]\)/);
if (!generateHandlerMatch) {
  errors.push("could not find tauri::generate_handler! block in src-tauri/src/main.rs");
}

const registeredCommandCount = (generateHandlerMatch?.[1].match(/commands::/g) ?? []).length;
const measuredCommandClaim = `${registeredCommandCount} registered Tauri commands`;

for (const path of ["README.md", "docs/README.md", "docs/ROADMAP.md"]) {
  if (!read(path).includes(measuredCommandClaim)) {
    errors.push(`${path} must include current command claim: ${measuredCommandClaim}`);
  }
}

const currentTestCountDocs = [
  "README.md",
  "docs/README.md",
  "docs/ROADMAP.md",
  "docs/developer/TESTING.md",
  "docs/developer/FRONTEND_TESTING.md",
  "docs/developer/INTEGRATION_TESTING.md",
];

const hardcodedTestCountPattern =
  /\b(?:\d+\+?\s+(?:unit|integration|component|frontend|e2e|rust|js)?\s*tests?\b|(?:unit|integration|component|frontend|e2e|rust|js)\s+tests?:\s*\d+\+?)/i;

for (const path of currentTestCountDocs) {
  const lines = read(path).split(/\r?\n/);

  lines.forEach((line, index) => {
    const normalizedLine = line.trim();

    if (!hardcodedTestCountPattern.test(normalizedLine)) {
      return;
    }

    if (/\bnew\s+(?:component\s+)?tests?\b/i.test(normalizedLine)) {
      return;
    }

    errors.push(
      `${path}:${index + 1} has hardcoded current test-count claim; reference fresh command output instead`,
    );
  });
}

const rustLintPolicyDocs = [
  "AGENTS.md",
  "README.md",
  "docs/harness/agent-operating-model.md",
  "docs/harness/verification-matrix.md",
  "docs/developer/CONTRIBUTING.md",
  "docs/developer/CI_CD.md",
  "docs/developer/TESTING.md",
];

const allTargetClippyHardGatePattern =
  /cargo\s+clippy(?=[^\n`]*--all-targets)(?=[^\n`]*-D\s+warnings)/;

for (const path of rustLintPolicyDocs) {
  const lines = read(path).split(/\r?\n/);

  lines.forEach((line, index) => {
    if (!allTargetClippyHardGatePattern.test(line)) {
      return;
    }

    errors.push(
      `${path}:${index + 1} uses all-target clippy as a hard gate; use production clippy policy instead`,
    );
  });
}

for (const violation of checkFrontendBoundaries(root)) {
  errors.push(violation);
}

for (const violation of checkSecuritySensors(root)) {
  errors.push(violation);
}

for (const violation of checkTauriInvokes(root)) {
  errors.push(violation);
}

for (const violation of checkTestQuality(root)) {
  errors.push(violation);
}

if (errors.length > 0) {
  console.error("Harness check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(formatSecuritySensorSummary());
console.log("Harness check passed.");
