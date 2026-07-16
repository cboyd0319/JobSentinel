#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { repositoryToolchainEnvironment } from "./lib/rust-toolchain.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");

export function parseInitArgs(argv) {
  const options = { install: true, offline: false, runStart: process.env.RUN_START_COMMAND === "1" };
  for (const arg of argv) {
    if (arg === "--skip-install") options.install = false;
    else if (arg === "--offline") options.offline = true;
    else if (arg === "--run-start") options.runStart = true;
    else if (arg === "--help") options.help = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  return options;
}

export function npmCommand(platform = process.platform) {
  return platform === "win32" ? "npm.cmd" : "npm";
}

export function initializationSteps(options = {}) {
  const npm = npmCommand(options.platform);
  return [
    { command: npm, args: ["--version"] },
    { command: process.execPath, args: ["scripts/doctor.mjs", "--preflight"] },
    ...(options.install === false
      ? []
      : [{ command: npm, args: ["ci", "--ignore-scripts", options.offline ? "--offline" : "--prefer-offline", "--no-audit", "--no-fund"] }]),
    { command: process.execPath, args: ["scripts/doctor.mjs"] },
    { command: npm, args: ["run", "harness:check"] },
    { command: npm, args: ["run", "test:smoke"] },
  ];
}

function commandEnvironment(root) {
  return repositoryToolchainEnvironment(root);
}

function run(command, args, root, env, options = {}) {
  const log = options.log ?? console.log;
  log(`> ${[command, ...args].join(" ")}`);
  const result = (options.spawnSync ?? spawnSync)(command, args, { cwd: root, env, stdio: options.stdio ?? "inherit", shell: false });
  if (result.error) {
    throw new Error(`${command} is unavailable or could not start: ${result.error.message}. Install the repository-owned prerequisite and rerun initialization.`);
  }
  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${String(result.status)}`);
  }
}

export function runInitialization(root = defaultRoot, options = {}) {
  const manifestPath = join(root, "package.json");
  if (!existsSync(manifestPath)) throw new Error(`package.json not found at repository root: ${root}`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.name !== "jobsentinel") throw new Error(`unexpected package at repository root: ${String(manifest.name)}`);

  const env = options.env ?? commandEnvironment(root);
  const log = options.log ?? console.log;
  log(`Repository: ${root}`);
  if (options.install === false) {
    log("Dependency synchronization skipped by explicit --skip-install.");
  } else {
    log(options.offline
      ? "Synchronizing locked project dependencies from the local npm cache only. No global tools or hooks are installed."
      : "Synchronizing locked project dependencies. No global tools or hooks are installed.");
  }
  for (const step of initializationSteps({ ...options, platform: options.platform ?? process.platform })) {
    run(step.command, step.args, root, env, options);
  }
  log("Start command: npm run tauri:dev");
  log("Runtime smoke command: npm run test:e2e:smoke");
  if (options.runStart) run(npmCommand(options.platform), ["run", "tauri:dev"], root, env, options);
}

if (process.argv[1] === scriptPath) {
  try {
    const options = parseInitArgs(process.argv.slice(2));
    if (options.help) {
      console.log("Usage: ./init.sh [--skip-install] [--offline] [--run-start]");
      console.log("Windows: pwsh -File ./init.ps1 [--skip-install] [--offline] [--run-start]");
    } else {
      runInitialization(defaultRoot, options);
    }
  } catch (error) {
    console.error(`Initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
