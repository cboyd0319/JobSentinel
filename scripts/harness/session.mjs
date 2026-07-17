#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { readHarnessState } from "./state.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "../..");

function git(root, args, exec = execFileSync) {
  try {
    return exec("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (error) {
    throw new Error(`git ${args.join(" ")} failed: ${String(error?.stderr ?? error?.message ?? error).trim()}`);
  }
}

export function summarizeHarnessSession(root = defaultRoot, options = {}) {
  const exec = options.execFileSync ?? execFileSync;
  const state = readHarnessState(root);
  const active = state.featureList.features.find((feature) => feature.status === state.featureList.active_status);
  const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(resolve(root, "scripts/harness/contracts/harness.json"), "utf8"));
  return {
    root,
    projectPurpose: packageJson.description,
    canonicalInstructionOwner: manifest.owners?.instructions?.canonical,
    branch: git(root, ["status", "--short", "--branch"], exec).split(/\r?\n/)[0],
    recentCommits: git(root, ["log", "-5", "--oneline"], exec).split(/\r?\n/),
    lastUpdated: state.markers.lastUpdated,
    activeFeature: {
      id: active.id,
      priority: active.priority,
      title: active.title,
      behavior: active.behavior,
      verification: active.verification,
      nextTrigger: active.next_trigger,
    },
    blockedFeatures: state.featureList.features.filter((feature) => feature.status === "blocked").map((feature) => ({ id: feature.id, blocker: feature.blocker, nextTrigger: feature.next_trigger })),
    startCommand: "npm run tauri:dev",
    initCommand: process.platform === "win32" ? "pwsh -File ./init.ps1" : "./init.sh",
  };
}

export function formatHarnessSessionSummary(summary) {
  return [
    "Harness Session Snapshot",
    `Root: ${summary.root}`,
    `Purpose: ${summary.projectPurpose}`,
    `Canonical instructions: ${summary.canonicalInstructionOwner}`,
    `Branch: ${summary.branch}`,
    `State updated: ${summary.lastUpdated}`,
    `Active feature: ${summary.activeFeature.id} (priority ${summary.activeFeature.priority})`,
    `Outcome: ${summary.activeFeature.title}`,
    `Behavior: ${summary.activeFeature.behavior}`,
    `Next trigger: ${summary.activeFeature.nextTrigger}`,
    `Initialize: ${summary.initCommand}`,
    `Start: ${summary.startCommand}`,
    "Verification:",
    ...summary.activeFeature.verification.map((command) => `- ${command}`),
    "Blocked work:",
    ...(summary.blockedFeatures.length
      ? summary.blockedFeatures.flatMap((feature) => [
          `- ${feature.id}: ${feature.blocker}`,
          `  Next trigger: ${feature.nextTrigger}`,
        ])
      : ["- none"]),
    "Recent commits:",
    ...summary.recentCommits.map((commit) => `- ${commit}`),
  ].join("\n");
}

export function parseHarnessSessionArgs(argv, fallbackRoot = defaultRoot) {
  const options = { root: fallbackRoot, json: false };
  for (const arg of argv) {
    if (arg === "--json") options.json = true;
    else if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    else options.root = resolve(arg);
  }
  return options;
}

if (process.argv[1] === scriptPath) {
  try {
    const options = parseHarnessSessionArgs(process.argv.slice(2));
    const summary = summarizeHarnessSession(options.root);
    console.log(options.json ? JSON.stringify(summary, null, 2) : formatHarnessSessionSummary(summary));
  } catch (error) {
    console.error(`Harness session failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
