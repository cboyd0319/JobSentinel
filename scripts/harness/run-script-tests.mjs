#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function discoverScriptTests(root = scriptsRoot) {
  const tests = [];

  function visit(directory) {
    const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    );

    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && entry.name.endsWith(".test.mjs")) tests.push(path);
    }
  }

  visit(resolve(root));
  return tests;
}

export function runScriptTests(root = scriptsRoot) {
  const tests = discoverScriptTests(root);
  if (tests.length === 0) throw new Error(`No script tests found under ${root}`);

  const result = spawnSync(process.execPath, ["--test", ...tests], { stdio: "inherit" });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  process.exit(runScriptTests());
}
