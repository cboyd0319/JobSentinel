#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const upstreamNodeWarningCodes = ["DEP0205"];
const defaultPlaywrightPort = 5173;

export function playwrightCliPath(moduleUrl = import.meta.url) {
  return fileURLToPath(new URL("../../node_modules/playwright/cli.js", moduleUrl));
}

export function mergeNodeOptions(
  existingOptions = "",
  warningCodes = upstreamNodeWarningCodes,
) {
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

function parsePort(value, label) {
  const text = String(value).trim();
  const port = Number.parseInt(text, 10);
  if (!/^\d+$/.test(text) || port < 1 || port > 65535) {
    throw new Error(`${label} must be an integer from 1 through 65535.`);
  }
  return port;
}

function inspectLoopbackPort(port) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", (error) => {
      if (error.code === "EADDRINUSE" || error.code === "EACCES") {
        resolve({ available: false });
        return;
      }
      reject(error);
    });
    server.listen({ host: "127.0.0.1", port, exclusive: true }, () => {
      const address = server.address();
      const selectedPort =
        address && typeof address === "object" ? address.port : port;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ available: true, port: selectedPort });
      });
    });
  });
}

export async function findAvailablePlaywrightPort(
  preferredPort = defaultPlaywrightPort,
) {
  const preferred = parsePort(preferredPort, "Preferred Playwright port");
  const preferredResult = await inspectLoopbackPort(preferred);
  if (preferredResult.available) return preferred;

  const fallback = await inspectLoopbackPort(0);
  if (!fallback.available || !fallback.port) {
    throw new Error("Could not allocate a loopback port for Playwright.");
  }
  return fallback.port;
}

export async function preparePlaywrightEnv(
  baseEnv = process.env,
  { preferredPort = defaultPlaywrightPort } = {},
) {
  const env = createPlaywrightEnv(baseEnv);
  const requestedPort = env.PLAYWRIGHT_PORT?.trim();
  const reuseExistingServer = env.PLAYWRIGHT_REUSE_EXISTING_SERVER === "1";
  env.PLAYWRIGHT_REUSE_EXISTING_SERVER = reuseExistingServer ? "1" : "0";

  if (requestedPort) {
    const port = parsePort(requestedPort, "PLAYWRIGHT_PORT");
    if (!reuseExistingServer && !(await inspectLoopbackPort(port)).available) {
      throw new Error(
        `PLAYWRIGHT_PORT ${port} is already in use. Unset PLAYWRIGHT_PORT to select a free port automatically, or set PLAYWRIGHT_REUSE_EXISTING_SERVER=1 only for a verified JobSentinel server.`,
      );
    }
    env.PLAYWRIGHT_PORT = String(port);
    return env;
  }

  env.PLAYWRIGHT_PORT = String(
    await findAvailablePlaywrightPort(preferredPort),
  );
  return env;
}

export async function runPlaywright(
  argv = process.argv.slice(2),
  baseEnv = process.env,
) {
  const cliPath = playwrightCliPath();
  const env = await preparePlaywrightEnv(baseEnv);
  console.error(
    `JobSentinel E2E server: http://127.0.0.1:${env.PLAYWRIGHT_PORT}`,
  );
  const child = spawn(process.execPath, [cliPath, ...argv], {
    env,
    stdio: "inherit",
  });

  return new Promise((resolveExitCode, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }
      resolveExitCode(code ?? 1);
    });
  });
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (entryPath === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = await runPlaywright();
  } catch (error) {
    console.error(`Unable to start Playwright: ${error.message}`);
    process.exitCode = 1;
  }
}
