#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");

export function parseVersion(value) {
  const match = String(value).match(/(\d+)(?:\.(\d+))?(?:\.(\d+))?/);

  if (!match) {
    return null;
  }

  return [
    Number.parseInt(match[1], 10),
    Number.parseInt(match[2] ?? "0", 10),
    Number.parseInt(match[3] ?? "0", 10),
  ];
}

export function compareVersions(actual, minimum) {
  const actualParts = parseVersion(actual);
  const minimumParts = parseVersion(minimum);

  if (!actualParts || !minimumParts) {
    return Number.NaN;
  }

  for (let index = 0; index < minimumParts.length; index += 1) {
    if (actualParts[index] > minimumParts[index]) {
      return 1;
    }

    if (actualParts[index] < minimumParts[index]) {
      return -1;
    }
  }

  return 0;
}

export function platformBin(command, platform = process.platform) {
  if (platform === "win32" && command === "npm") {
    return "npm.cmd";
  }

  return command;
}

function checkPath(results, root, relativePath, label, options = {}) {
  const fullPath = join(root, relativePath);

  if (existsSync(fullPath)) {
    if (options.mustContain) {
      const content = readFileSync(fullPath, "utf8");

      if (!content.includes(options.mustContain)) {
        results.push({
          status: "fail",
          label,
          detail: `${relativePath} is present but missing ${options.mustContain}`,
        });
        return;
      }
    }

    if (options.mustHaveEntries) {
      const entries = readdirSync(fullPath);

      if (entries.length === 0) {
        results.push({
          status: "fail",
          label,
          detail: `${relativePath} exists but is empty`,
        });
        return;
      }
    }

    results.push({ status: "pass", label, detail: relativePath });
    return;
  }

  results.push({
    status: options.warnOnly ? "warn" : "fail",
    label,
    detail: `${relativePath} is missing${options.fix ? `. ${options.fix}` : ""}`,
  });
}

function runVersionCheck(results, command, args, label, options = {}) {
  const executable = platformBin(command, options.platform);

  try {
    const output = execFileSync(executable, args, {
      cwd: options.cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    if (options.minimum && compareVersions(output, options.minimum) < 0) {
      results.push({
        status: "fail",
        label,
        detail: `${output}; need ${options.minimum} or newer`,
      });
      return;
    }

    results.push({
      status: "pass",
      label,
      detail: options.minimum ? `${output}; need ${options.minimum}+` : output,
    });
  } catch {
    results.push({
      status: "fail",
      label,
      detail: `${command} unavailable${options.fix ? `. ${options.fix}` : ""}`,
    });
  }
}

export function runDoctor(options = {}) {
  const root = options.root ?? defaultRoot;
  const platform = options.platform ?? process.platform;
  const results = [];

  if (compareVersions(process.version, "20.0.0") < 0) {
    results.push({
      status: "fail",
      label: "Node.js runtime",
      detail: `${process.version}; need 20.0.0 or newer`,
    });
  } else {
    results.push({
      status: "pass",
      label: "Node.js runtime",
      detail: `${process.version}; need 20.0.0+`,
    });
  }

  runVersionCheck(results, "npm", ["--version"], "npm CLI", {
    cwd: root,
    platform,
    fix: "Install Node.js 20+ with npm",
  });

  runVersionCheck(results, "cargo", ["--version"], "Cargo CLI", {
    cwd: join(root, "src-tauri"),
    platform,
    fix: "Install stable Rust with Cargo",
  });

  runVersionCheck(results, "rustc", ["--version"], "Rust compiler", {
    cwd: join(root, "src-tauri"),
    platform,
    fix: "Install stable Rust",
  });

  runVersionCheck(results, "cargo", ["fmt", "--version"], "Rust formatter", {
    cwd: join(root, "src-tauri"),
    platform,
    fix: "Install rustfmt with rustup component add rustfmt",
  });

  runVersionCheck(results, "cargo", ["clippy", "--version"], "Rust linter", {
    cwd: join(root, "src-tauri"),
    platform,
    fix: "Install clippy with rustup component add clippy",
  });

  checkPath(results, root, "package-lock.json", "npm lockfile");
  checkPath(results, root, "node_modules", "npm dependencies", {
    fix: "Run npm ci",
  });
  checkPath(
    results,
    root,
    platform === "win32" ? "node_modules/.bin/tauri.cmd" : "node_modules/.bin/tauri",
    "Tauri CLI bin",
    { fix: "Run npm ci" },
  );
  checkPath(results, root, "src-tauri/Cargo.lock", "Cargo lockfile");
  checkPath(results, root, "src-tauri/.sqlx", "SQLx offline cache", {
    mustHaveEntries: true,
    fix: "Run cargo sqlx prepare from src-tauri after schema changes",
  });
  checkPath(
    results,
    root,
    "src-tauri/.cargo/config.toml",
    "SQLx offline env config",
    { mustContain: 'SQLX_OFFLINE = "true"' },
  );

  return results;
}

export function summarizeDoctorResults(results) {
  const failures = results.filter((result) => result.status === "fail");
  const warnings = results.filter((result) => result.status === "warn");

  return {
    failureCount: failures.length,
    warningCount: warnings.length,
    exitCode: failures.length > 0 ? 1 : 0,
  };
}

export function formatDoctorResults(results) {
  const lines = ["JobSentinel environment doctor"];

  for (const result of results) {
    const prefix =
      result.status === "pass" ? "PASS" : result.status === "warn" ? "WARN" : "FAIL";
    lines.push(`${prefix} ${result.label}: ${result.detail}`);
  }

  const summary = summarizeDoctorResults(results);

  if (summary.failureCount > 0) {
    lines.push(
      `Environment not ready: ${summary.failureCount} failure(s), ${summary.warningCount} warning(s).`,
    );
  } else {
    lines.push(`Environment ready: ${summary.warningCount} warning(s).`);
  }

  return lines.join("\n");
}

if (process.argv[1] === scriptPath) {
  const results = runDoctor();
  console.log(formatDoctorResults(results));
  process.exitCode = summarizeDoctorResults(results).exitCode;
}
