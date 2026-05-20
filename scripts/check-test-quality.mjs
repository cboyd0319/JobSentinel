#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");

const checkedRoots = ["src", "tests", "scripts"];
const checkedExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const ignoredPathParts = new Set([
  "node_modules",
  "dist",
  "coverage",
  "playwright-report",
  "test-results",
]);

const qualityRules = [
  {
    label: "no-op true assertion",
    pattern: /\bexpect\s*\(\s*true\s*\)/,
  },
  {
    label: "always-true fallback",
    pattern: /\|\|\s*true\b/,
  },
  {
    label: "focused test",
    pattern: /\b(?:describe|it|test)\.only\s*\(/,
  },
  {
    label: "skipped unit test",
    pattern: /\b(?:describe|it)\.skip\s*\(/,
  },
];

function collectFiles(root, dir) {
  const files = [];

  if (!existsSync(dir)) {
    return files;
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    const rel = relative(root, fullPath);
    const parts = rel.split(/[\\/]/);

    if (parts.some((part) => ignoredPathParts.has(part))) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...collectFiles(root, fullPath));
      continue;
    }

    if (entry.isFile() && checkedExtensions.has(extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

export function checkTestQuality(root = defaultRoot) {
  const violations = [];
  const files = checkedRoots.flatMap((path) => collectFiles(root, join(root, path)));

  for (const file of files) {
    const rel = relative(root, file);
    const lines = readFileSync(file, "utf8").split(/\r?\n/);

    lines.forEach((line, index) => {
      for (const rule of qualityRules) {
        if (rule.pattern.test(line)) {
          violations.push(`${rel}:${index + 1} contains ${rule.label}`);
        }
      }
    });
  }

  return violations;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.argv[2] ? resolve(process.argv[2]) : defaultRoot;
  const violations = checkTestQuality(root);

  if (violations.length > 0) {
    console.error("Test quality check failed:");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log("Test quality check passed.");
}
