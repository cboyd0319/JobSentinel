#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

function collectFiles(dir, predicate) {
  if (!existsSync(dir)) {
    return [];
  }

  const files = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(path, predicate));
      continue;
    }

    if (entry.isFile() && predicate(path)) {
      files.push(path);
    }
  }

  return files.sort();
}

export function collectProductionExternalAiRequestFeatureIds(root = process.cwd()) {
  const featureIds = new Set();
  const featurePattern = /\bfeature:\s*["']([a-z0-9-]+)["']/g;

  for (const path of collectFiles(join(root, "src"), (filePath) => {
    if (!/\.(?:ts|tsx)$/.test(filePath)) return false;
    return !/\.(?:test|spec)\.(?:ts|tsx)$/.test(filePath);
  })) {
    const text = readFileSync(path, "utf8");
    if (!text.includes("ExternalAiRequest")) continue;

    let match;
    featurePattern.lastIndex = 0;
    while ((match = featurePattern.exec(text)) !== null) {
      featureIds.add(match[1]);
    }
  }

  return [...featureIds].sort();
}
