#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runPinnedCargo } from "./lib/rust-toolchain.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (process.argv.length < 3) {
  console.error("Usage: node scripts/run-cargo.mjs <cargo arguments>");
  process.exitCode = 2;
} else {
  process.exitCode = runPinnedCargo(root, process.argv.slice(2));
}
