import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { npmInvocation } from "./npm-invocation.mjs";
import { npmCompatibleOutdatedException } from "./npm-latest-exceptions.mjs";

export function collectNpmCompatibleUpdateViolations(
  root,
  { spawn = spawnSync, platform = process.platform, env = process.env } = {},
) {
  const invocation = npmInvocation(
    ["update", "--package-lock-only", "--dry-run", "--ignore-scripts"],
    platform,
    env,
  );
  const result = spawn(invocation.command, invocation.args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 10,
  });

  if (result.error) {
    return [`npm update dry-run failed: ${result.error.message}`];
  }

  if (result.status !== 0) {
    return [
      `npm update dry-run exited ${result.status}: ${String(result.stderr || result.stdout).trim()}`,
    ];
  }

  const output = `${result.stdout}\n${result.stderr}`.trim();
  if (!output || output.includes("up to date")) {
    return [];
  }

  if (/\b(?:added|changed|removed|updated)\b/i.test(output)) {
    const firstLine = output.split(/\r?\n/).find(Boolean) ?? output;
    return [`package-lock.json has compatible updates pending: ${firstLine}`];
  }

  return [];
}

export function collectNpmCompatibleOutdatedViolations(
  root,
  { spawn = spawnSync, platform = process.platform, env = process.env } = {},
) {
  const invocation = npmInvocation(["outdated", "--all", "--json"], platform, env);
  const result = spawn(invocation.command, invocation.args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 10,
  });

  if (result.error) {
    return [`npm outdated --all failed: ${result.error.message}`];
  }

  if (result.status !== 0 && result.status !== 1) {
    return [
      `npm outdated --all exited ${result.status}: ${String(result.stderr || result.stdout).trim()}`,
    ];
  }

  const raw = String(result.stdout ?? "").trim();
  if (!raw) return [];

  let outdated;
  try {
    outdated = JSON.parse(raw);
  } catch (error) {
    return [`npm outdated --all returned invalid JSON: ${error.message}`];
  }

  let packageJson = {};
  let packageLock = {};
  try {
    packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    packageLock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
  } catch {
    // Other dependency checks report missing or malformed manifests and lockfiles.
  }

  const violations = [];
  for (const [name, value] of Object.entries(outdated)) {
    const entries = Array.isArray(value) ? value : [value];
    for (const entry of entries) {
      const current = entry?.current;
      const wanted = entry?.wanted;
      if (!current || !wanted || current === wanted) {
        continue;
      }
      if (
        npmCompatibleOutdatedException({ name, current, wanted }, packageJson, packageLock)
      ) {
        continue;
      }

      const dependent = entry.dependent ? ` for ${entry.dependent}` : "";
      violations.push(
        `package-lock.json has compatible npm transitive drift${dependent}: ${name} is ${current}; wanted ${wanted}`,
      );
    }
  }

  return violations;
}
