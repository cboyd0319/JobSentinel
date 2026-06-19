#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");

export function parsePinnedNpmVersion(packageJsonText) {
  const packageJson = JSON.parse(packageJsonText);
  const packageManager = String(packageJson.packageManager ?? "").trim();
  const match = packageManager.match(/^npm@(\d+\.\d+\.\d+)$/);
  return match?.[1] ?? null;
}

export function npmExecutable(platform = process.platform) {
  return platform === "win32" ? "npm.cmd" : "npm";
}

export function npmInvocation(args, platform = process.platform, env = process.env) {
  const npm = npmExecutable(platform);
  if (platform !== "win32") {
    return { command: npm, args };
  }

  return {
    command: env.ComSpec || "cmd.exe",
    args: ["/d", "/s", "/c", npm, ...args],
  };
}

export function installPinnedNpm(options = {}) {
  const root = options.root ?? defaultRoot;
  const platform = options.platform ?? process.platform;
  const exec = options.execFileSync ?? execFileSync;
  const env = options.env ?? process.env;
  const pinnedVersion = parsePinnedNpmVersion(readFileSync(resolve(root, "package.json"), "utf8"));

  if (!pinnedVersion) {
    throw new Error("package.json packageManager must be an exact npm@x.y.z pin");
  }

  const current = npmInvocation(["--version"], platform, env);
  const currentVersion = String(exec(current.command, current.args, { encoding: "utf8" })).trim();
  if (currentVersion === pinnedVersion) {
    return { changed: false, currentVersion, pinnedVersion };
  }

  const install = npmInvocation(
    ["install", "--global", `npm@${pinnedVersion}`, "--no-audit", "--no-fund"],
    platform,
    env,
  );
  exec(install.command, install.args, {
    cwd: root,
    stdio: "inherit",
  });

  return { changed: true, currentVersion, pinnedVersion };
}

if (process.argv[1] === scriptPath) {
  const result = installPinnedNpm();
  if (result.changed) {
    console.log(`Installed pinned npm ${result.pinnedVersion}; previous npm was ${result.currentVersion}.`);
  } else {
    console.log(`Pinned npm ${result.pinnedVersion} already active.`);
  }
}
