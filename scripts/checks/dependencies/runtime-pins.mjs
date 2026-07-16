import { existsSync } from "node:fs";

import { collectNpmCommandGuardViolations } from "../../lib/dependency/npm-command-guards.mjs";
import { collectTauriLinuxDebDependencyViolations } from "../../lib/dependency/tauri-linux-deb.mjs";
import { collectWorkflowEnvironmentPinViolations } from "../../lib/dependency/workflow-environment-pins.mjs";
import { collectWorkflowPinnedNpmViolations } from "../../lib/dependency/workflow-npm-pins.mjs";
import {
  defaultRoot,
  exactStableVersion,
  listFiles,
  readJson,
  readText,
  repoPath,
} from "./shared.mjs";

const workflowDirectory = ".github/workflows";
const cargoInstallScanRoots = [".github/workflows", "docs", "README.md"];

function workflowFiles(root) {
  return listFiles(root, workflowDirectory, (path) => /\.(?:ya?ml)$/.test(path));
}

function markdownPolicyFiles(root) {
  return cargoInstallScanRoots.flatMap((path) =>
    listFiles(
      root,
      path,
      (candidate) => candidate.endsWith(".md") || /\.ya?ml$/.test(candidate),
    ),
  );
}

export function parseNodeRuntimePin(root) {
  const path = ".nvmrc";
  if (!existsSync(repoPath(root, path))) {
    return { path, version: null, error: `${path} is missing` };
  }

  const version = readText(root, path).trim();
  const stable = exactStableVersion(version);
  if (!stable) {
    return {
      path,
      version,
      error: `${path} must pin an exact stable Node.js version, found ${version || "empty"}`,
    };
  }
  return { path, version: stable };
}

export function parseRustToolchainPin(root) {
  const path = "rust-toolchain.toml";
  if (!existsSync(repoPath(root, path))) {
    return { path, version: null, error: `${path} is missing` };
  }

  const channel = readText(root, path).match(/^\s*channel\s*=\s*"([^"]+)"/m)?.[1];
  const stable = exactStableVersion(channel ?? "");
  if (!stable) {
    return {
      path,
      version: channel ?? "",
      error: `${path} channel must pin an exact stable Rust version, found ${channel ?? "missing"}`,
    };
  }
  return { path, version: stable };
}

function parseCargoInstallVersion(rest) {
  const optionVersion = rest.match(
    /(?:^|\s)--version(?:=|\s+)(=?v?\d+\.\d+\.\d+(?:\+[0-9A-Za-z.-]+)?)(?=\s|$)/,
  );
  if (optionVersion) return exactStableVersion(optionVersion[1].replace(/^=/, ""));

  const crateAtVersion = rest.match(
    /^@?(?:[A-Za-z0-9_-]+)?@(?<version>v?\d+\.\d+\.\d+(?:\+[0-9A-Za-z.-]+)?)(?=\s|$)/,
  );
  return crateAtVersion?.groups?.version
    ? exactStableVersion(crateAtVersion.groups.version)
    : null;
}

function parseCargoInstallCommands(text, path) {
  const commands = [];
  const pattern = /\bcargo\s+install\s+([A-Za-z0-9_-]+)((?:\s+[^\n`#;&|]+)*)/g;
  text.split(/\r?\n/).forEach((line, index) => {
    for (const match of line.matchAll(pattern)) {
      const rest = match[2] ?? "";
      commands.push({
        name: match[1],
        version: parseCargoInstallVersion(rest),
        locked: /(?:^|\s)--locked(?=\s|$)/.test(rest),
        path,
        line: index + 1,
      });
    }
  });
  return commands;
}

export function collectCargoInstallPins(root) {
  return markdownPolicyFiles(root).flatMap((path) =>
    parseCargoInstallCommands(readText(root, path), path),
  );
}

function workflowToolPinViolations(root, nodeVersion, rustVersion) {
  const violations = [];
  for (const path of workflowFiles(root)) {
    readText(root, path)
      .split(/\r?\n/)
      .forEach((line, index) => {
        const nodeMatch = line.match(/\bnode-version:\s*["']?([^"'\s]+)["']?/);
        if (nodeMatch) {
          const pinned = exactStableVersion(nodeMatch[1]);
          if (!pinned) {
            violations.push(
              `${path}:${index + 1} node-version must pin an exact stable version, found ${nodeMatch[1]}`,
            );
          } else if (nodeVersion && pinned !== nodeVersion) {
            violations.push(
              `${path}:${index + 1} node-version must match .nvmrc ${nodeVersion}, found ${pinned}`,
            );
          }
        }

        const rustMatch = line.match(/\btoolchain:\s*["']?([^"'\s]+)["']?/);
        if (rustMatch) {
          const pinned = exactStableVersion(rustMatch[1]);
          if (!pinned) {
            violations.push(
              `${path}:${index + 1} Rust toolchain must pin an exact stable version, found ${rustMatch[1]}`,
            );
          } else if (rustVersion && pinned !== rustVersion) {
            violations.push(
              `${path}:${index + 1} Rust toolchain must match rust-toolchain.toml ${rustVersion}, found ${pinned}`,
            );
          }
        }
      });
  }
  return violations;
}

function npmPackageManagerVersion(root) {
  if (!existsSync(repoPath(root, "package.json"))) return null;
  const raw = String(readJson(root, "package.json").packageManager ?? "").trim();
  const match = raw.match(/^npm@([^+\s]+)(?:\+[0-9A-Za-z.-]+)?$/);
  return match ? exactStableVersion(match[1]) : null;
}

export function collectRuntimePinViolations(root = defaultRoot) {
  const violations = [];
  const nodePin = parseNodeRuntimePin(root);
  const rustPin = parseRustToolchainPin(root);

  if (nodePin.error) violations.push(nodePin.error);
  if (rustPin.error) violations.push(rustPin.error);
  violations.push(...workflowToolPinViolations(root, nodePin.version, rustPin.version));

  const seenCargoInstalls = new Map();
  for (const command of collectCargoInstallPins(root)) {
    const location = `${command.path}:${command.line} cargo install ${command.name}`;
    if (!command.version) {
      violations.push(`${location} must include an exact stable --version pin`);
    }
    if (!command.locked) violations.push(`${location} must include --locked`);

    const previous = seenCargoInstalls.get(command.name);
    if (previous && previous.version !== command.version) {
      violations.push(
        `${location} must match ${previous.path}:${previous.line}; found ${command.version ?? "missing"}, expected ${previous.version ?? "missing"}`,
      );
    } else {
      seenCargoInstalls.set(command.name, command);
    }
  }

  violations.push(...collectWorkflowEnvironmentPinViolations(root));
  violations.push(...collectWorkflowPinnedNpmViolations(root, npmPackageManagerVersion(root)));
  violations.push(...collectNpmCommandGuardViolations(root));
  violations.push(...collectTauriLinuxDebDependencyViolations(root));
  return violations;
}
