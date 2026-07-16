#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { compareStableSemver, parseStableSemver } from "./dependency-pins.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "../..");
const workflowDir = ".github/workflows";

const usesPattern =
  /^\s*(?:-\s*)?uses:\s*([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.\/-]+)?)@([^\s#]+)(?:\s+#\s*([^\s]+))?/;
const pinnedShaPattern = /^[0-9a-f]{40}$/i;

function normalizePath(path) {
  return path.split(/[\\/]/).join("/");
}

function repoPath(root, path) {
  return join(root, path);
}

function workflowFiles(root) {
  const dir = repoPath(root, workflowDir);
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((file) => [".yml", ".yaml"].includes(extname(file)))
    .map((file) => `${workflowDir}/${file}`)
    .sort();
}

function splitActionSpec(spec) {
  const parts = spec.split("/");
  return {
    owner: parts[0],
    repo: parts[1],
    path: parts.slice(2).join("/"),
  };
}

export function parseWorkflowActionUses(text, path = "<workflow>") {
  const actions = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const match = line.match(usesPattern);
    if (!match) {
      return;
    }

    const spec = match[1];
    const action = splitActionSpec(spec);
    actions.push({
      ...action,
      spec,
      ref: match[2],
      comment: match[3] ?? "",
      path,
      line: index + 1,
    });
  });

  return actions;
}

export function collectWorkflowActions(root = defaultRoot) {
  return workflowFiles(root).flatMap((path) =>
    parseWorkflowActionUses(readFileSync(repoPath(root, path), "utf8"), normalizePath(path)),
  );
}

function isStableTagComment(comment) {
  return Boolean(parseStableSemver(comment));
}

function actionLabel(action) {
  return `${action.owner}/${action.repo}`;
}

function actionLocation(action) {
  return `${action.path}:${action.line} ${action.spec}`;
}

export function collectActionPinViolations(root = defaultRoot) {
  const violations = [];
  const actions = collectWorkflowActions(root);
  const seenLabels = new Map();

  for (const action of actions) {
    if (!pinnedShaPattern.test(action.ref)) {
      violations.push(
        `${actionLocation(action)} must pin a full 40-character commit SHA, found ${action.ref}`,
      );
    }

    if (!action.comment) {
      violations.push(
        `${actionLocation(action)} must include a version comment such as # v1.2.3 or # stable`,
      );
      continue;
    }

    if (action.comment !== "stable" && !isStableTagComment(action.comment)) {
      violations.push(
        `${actionLocation(action)} must use a stable version comment, found # ${action.comment}`,
      );
    }

    const key = `${actionLabel(action)}#${action.comment}`;
    const previous = seenLabels.get(key);
    if (previous && previous.ref !== action.ref) {
      violations.push(
        `${actionLocation(action)} must match ${previous.path}:${previous.line} for ${key}; found ${action.ref}, expected ${previous.ref}`,
      );
    } else {
      seenLabels.set(key, action);
    }
  }

  return violations;
}

function runGitLsRemote(args, { spawn = spawnSync } = {}) {
  const result = spawn("git", ["ls-remote", ...args], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 10,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(String(result.stderr || result.stdout).trim());
  }

  return String(result.stdout ?? "");
}

export function parseLsRemoteTags(output) {
  const tags = new Map();

  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const [sha, ref] = line.split(/\s+/);
    const match = ref?.match(/^refs\/tags\/(.+?)(\^\{\})?$/);
    if (!sha || !match) {
      continue;
    }

    const tag = match[1];
    const existing = tags.get(tag);
    if (!existing || match[2]) {
      tags.set(tag, sha);
    }
  }

  return tags;
}

function latestStableTag(tags) {
  return [...tags.keys()]
    .filter((tag) => parseStableSemver(tag))
    .sort((left, right) => compareStableSemver(left, right))
    .at(-1);
}

function githubRepoUrl(action) {
  return `https://github.com/${action.owner}/${action.repo}.git`;
}

async function mapWithLimit(items, limit, callback) {
  const results = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await callback(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );

  return results;
}

export async function collectActionLatestViolations(
  root = defaultRoot,
  { spawn = spawnSync } = {},
) {
  const actions = collectWorkflowActions(root);
  const uniqueLabels = [
    ...new Map(actions.map((action) => [`${actionLabel(action)}#${action.comment}`, action])).values(),
  ];

  const checks = await mapWithLimit(uniqueLabels, 4, async (action) => {
    try {
      if (action.comment === "stable") {
        const output = runGitLsRemote(
          [githubRepoUrl(action), "refs/heads/stable"],
          { spawn },
        );
        const [sha] = output.trim().split(/\s+/);
        if (!pinnedShaPattern.test(sha ?? "")) {
          return `${actionLabel(action)} stable ref could not be resolved`;
        }

        if (action.ref.toLowerCase() !== sha.toLowerCase()) {
          return `${actionLabel(action)} is pinned to ${action.ref}; stable ref is ${sha}`;
        }

        return null;
      }

      const tags = parseLsRemoteTags(runGitLsRemote(["--tags", githubRepoUrl(action)], { spawn }));
      const latest = latestStableTag(tags);
      if (!latest) {
        return `${actionLabel(action)} has no stable semver tags`;
      }

      const latestSha = tags.get(latest);
      if (action.comment !== latest) {
        return `${actionLabel(action)} comment is # ${action.comment}; latest stable tag is ${latest}`;
      }

      if (action.ref.toLowerCase() !== latestSha.toLowerCase()) {
        return `${actionLabel(action)} ${latest} is pinned to ${action.ref}; tag resolves to ${latestSha}`;
      }
    } catch (error) {
      return `${actionLabel(action)} latest lookup failed: ${error.message}`;
    }

    return null;
  });

  return checks.filter(Boolean);
}

export async function collectActionViolations(root = defaultRoot, { latest = false } = {}) {
  const violations = collectActionPinViolations(root);
  if (latest) {
    violations.push(...(await collectActionLatestViolations(root)));
  }
  return violations;
}

export async function main(argv = process.argv.slice(2), root = defaultRoot) {
  const checkLatest = argv.includes("--latest");
  const help = argv.includes("--help") || argv.includes("-h");

  if (help) {
    console.log("Usage: node scripts/checks/action-pins.mjs [--latest]");
    console.log("");
    console.log("Default: offline workflow action SHA pin and version-comment checks.");
    console.log("--latest: also query GitHub refs for latest stable action tags or rolling stable refs.");
    return;
  }

  const violations = await collectActionViolations(root, { latest: checkLatest });

  if (violations.length > 0) {
    console.error("GitHub Actions pin check failed:");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exitCode = 1;
    return;
  }

  if (checkLatest) {
    console.log("GitHub Actions pin check passed: full SHA pins, version comments, and latest stable refs verified.");
  } else {
    console.log("GitHub Actions pin check passed: full SHA pins and version comments verified.");
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
