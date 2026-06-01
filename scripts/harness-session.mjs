#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { summarizeHarnessScore } from "./harness-score.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");

function safeGit(root, args, exec = execFileSync) {
  try {
    return exec("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "unavailable";
  }
}

function readIfExists(root, path) {
  const fullPath = join(root, path);
  if (!existsSync(fullPath)) {
    return "";
  }

  return readFileSync(fullPath, "utf8");
}

function readJsonIfExists(root, path) {
  const text = readIfExists(root, path);
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function countFileLines(root, path) {
  const text = readIfExists(root, path);
  if (!text) {
    return 0;
  }

  return text.replace(/\r?\n$/, "").split(/\r?\n/).length;
}

function countMatchingFiles(root, dirPath, pattern) {
  const fullPath = join(root, dirPath);
  if (!existsSync(fullPath)) {
    return 0;
  }

  return readdirSync(fullPath).filter((entry) => pattern.test(entry)).length;
}

export function extractNextBestWork(statusText) {
  const section = statusText.split(/^## Next Best Work$/m)[1]?.split(/^## /m)[0] ?? "";
  const items = [];

  for (const rawLine of section.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "") {
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      items.push(line.replace(/^\d+\.\s+/, ""));
      continue;
    }

    if (items.length > 0 && !/^[-*]\s+/.test(line)) {
      items[items.length - 1] = `${items.at(-1)} ${line}`;
    }
  }

  return items;
}

export function summarizeHarnessSession(root = defaultRoot, options = {}) {
  const exec = options.execFileSync ?? execFileSync;
  const scoreSummary = options.harnessScoreSummary ?? summarizeHarnessScore(root);
  const statusText = readIfExists(root, "docs/plans/active/status.md");
  const planIndex = readJsonIfExists(root, "docs/plans/index.json");
  const indexedWorkstreamCount = Array.isArray(planIndex?.activeWorkstreams)
    ? planIndex.activeWorkstreams.length
    : 0;
  const activePlansPath = join(root, "docs/plans/active");
  const activePlanCount = existsSync(activePlansPath)
    ? readdirSync(activePlansPath).filter((entry) => entry.endsWith(".md")).length
    : 0;

  return {
    branch: safeGit(root, ["status", "--short", "--branch"], exec).split(/\r?\n/)[0],
    latestCommit: safeGit(root, ["log", "-1", "--oneline"], exec),
    activePlanCount,
    indexedWorkstreamCount,
    checkModuleCount: countMatchingFiles(root, "scripts/harness/checks", /\.mjs$/),
    scriptTestCount: countMatchingFiles(root, "scripts", /\.test\.mjs$/),
    bloatRunnerLines: countFileLines(root, "scripts/check-repo-bloat.mjs"),
    harnessScore: {
      overall: scoreSummary.overall,
      status: scoreSummary.allPerfect ? "all subsystems 5/5" : "incomplete",
    },
    fiveTupleAudit: existsSync(join(root, "docs/harness/five-tuple-audit-2026-06-01.md"))
      ? "docs/harness/five-tuple-audit-2026-06-01.md"
      : "missing",
    nextBestWork: extractNextBestWork(statusText),
  };
}

export function formatHarnessSessionSummary(summary) {
  const nextBestWork =
    summary.nextBestWork.length === 0
      ? ["No next-best-work items found."]
      : summary.nextBestWork;

  return [
    "Harness Session Snapshot",
    `Branch: ${summary.branch}`,
    `Latest commit: ${summary.latestCommit}`,
    `Active plan docs: ${summary.activePlanCount}`,
    `Indexed active workstreams: ${summary.indexedWorkstreamCount}`,
    `Harness check modules: ${summary.checkModuleCount}`,
    `Script test files: ${summary.scriptTestCount}`,
    `Bloat runner lines: ${summary.bloatRunnerLines}`,
    `Five-tuple score: ${summary.harnessScore.overall}/100 (${summary.harnessScore.status})`,
    `Five-tuple audit: ${summary.fiveTupleAudit}`,
    "Next best work:",
    ...nextBestWork.map((item, index) => `${index + 1}. ${item}`),
  ].join("\n");
}

export function parseHarnessSessionArgs(argv, fallbackRoot = defaultRoot) {
  let root = fallbackRoot;
  let json = false;

  for (const arg of argv) {
    if (arg === "--json") {
      json = true;
      continue;
    }

    root = resolve(arg);
  }

  return { root, json };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { root, json } = parseHarnessSessionArgs(process.argv.slice(2));
  const summary = summarizeHarnessSession(root);
  console.log(json ? JSON.stringify(summary, null, 2) : formatHarnessSessionSummary(summary));
}
