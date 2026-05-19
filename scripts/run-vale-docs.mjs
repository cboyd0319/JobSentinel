#!/usr/bin/env node

import { readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const files = ["README.md"];

function collectMarkdown(dir) {
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const relPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== "archive") {
        collectMarkdown(relPath);
      }
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(relPath);
    }
  }
}

collectMarkdown("docs");

const result = spawnSync("vale", files.map((file) => relative(root, join(root, file))), {
  cwd: root,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
