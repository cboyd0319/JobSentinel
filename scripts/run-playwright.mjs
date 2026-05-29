#!/usr/bin/env node

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const upstreamNodeWarningCodes = ["DEP0205"];

export function mergeNodeOptions(existingOptions = "", warningCodes = upstreamNodeWarningCodes) {
  const options = existingOptions.split(/\s+/).filter(Boolean);

  for (const code of warningCodes) {
    const flag = `--disable-warning=${code}`;
    if (!options.includes(flag)) {
      options.push(flag);
    }
  }

  return options.join(" ");
}

export function createPlaywrightEnv(baseEnv = process.env) {
  const env = { ...baseEnv };

  delete env.NO_COLOR;

  env.NODE_OPTIONS = mergeNodeOptions(env.NODE_OPTIONS ?? "");
  return env;
}

function runPlaywright(argv = process.argv.slice(2)) {
  const cliPath = fileURLToPath(new URL("../node_modules/playwright/cli.js", import.meta.url));
  const child = spawn(process.execPath, [cliPath, ...argv], {
    env: createPlaywrightEnv(),
    stdio: "inherit",
  });

  child.on("error", (error) => {
    console.error(`Unable to start Playwright: ${error.message}`);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 1);
  });
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (entryPath === fileURLToPath(import.meta.url)) {
  runPlaywright();
}
