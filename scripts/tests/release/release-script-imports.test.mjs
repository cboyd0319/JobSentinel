// Proves scripts run by install-free release jobs (contents: write) import only Node built-ins and repo files.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const releaseDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../release");
const installFreeEntrypoints = [
  "confirm-verified-draft.mjs",
  "publish-gate.mjs",
  "publish-release.mjs",
  "release-platforms.mjs",
  "stage-target.mjs",
  "verify-public-release-assets.mjs",
];
const specifierPattern = /(?:^|\n)\s*(?:import|export)\s[^;]*?from\s+["']([^"']+)["']|(?:^|\n)\s*import\s+["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)/g;

function importGraph(entry) {
  const seen = new Map();
  const visit = (path) => {
    if (seen.has(path)) return;
    const specifiers = [...readFileSync(path, "utf8").matchAll(specifierPattern)].map((match) => match[1] ?? match[2] ?? match[3]);
    seen.set(path, specifiers);
    for (const specifier of specifiers) {
      if (specifier.startsWith(".")) visit(resolve(dirname(path), specifier));
    }
  };
  visit(resolve(releaseDir, entry));
  return seen;
}

test("install-free release jobs import only node: built-ins and relative repository modules", () => {
  for (const entry of installFreeEntrypoints) {
    const graph = importGraph(entry);
    assert(graph.size > 1, entry);
    for (const [path, specifiers] of graph) {
      for (const specifier of specifiers) {
        assert(specifier.startsWith("node:") || specifier.startsWith("."), `${path} imports third-party ${specifier}`);
      }
    }
  }
});
