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

function pushResult(results, status, label, detail) {
  results.push({ status, label, detail });
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
  const exec = options.execFileSync ?? execFileSync;

  try {
    const output = exec(executable, args, {
      cwd: options.cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: options.timeout,
    }).trim();

    if (options.minimum && compareVersions(output, options.minimum) < 0) {
      pushResult(results, "fail", label, `${output}; need ${options.minimum} or newer`);
      return { ok: false, output };
    }

    pushResult(
      results,
      "pass",
      label,
      options.minimum ? `${output}; need ${options.minimum}+` : output,
    );
    return { ok: true, output };
  } catch {
    pushResult(
      results,
      options.warnOnly ? "warn" : "fail",
      label,
      `${command} unavailable${options.fix ? `. ${options.fix}` : ""}`,
    );
    return { ok: false, output: "" };
  }
}

function runCommandCheck(results, command, args, label, options = {}) {
  const executable = platformBin(command, options.platform);
  const exec = options.execFileSync ?? execFileSync;

  try {
    exec(executable, args, {
      cwd: options.cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: options.timeout,
    });
    pushResult(results, "pass", label, options.detail ?? "available");
    return true;
  } catch {
    pushResult(
      results,
      options.warnOnly ? "warn" : "fail",
      label,
      `${options.detailOnFailure ?? "unavailable"}${options.fix ? `. ${options.fix}` : ""}`,
    );
    return false;
  }
}

function checkPkgConfigRequirement(results, packageNames, label, options = {}) {
  const exec = options.execFileSync ?? execFileSync;
  const executable = platformBin("pkg-config", options.platform);

  for (const packageName of packageNames) {
    try {
      exec(executable, ["--exists", packageName], {
        cwd: options.cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: options.timeout,
      });
      pushResult(results, "pass", label, packageName);
      return true;
    } catch {
      // Try the next package name because distributions expose different
      // appindicator pkg-config names.
    }
  }

  pushResult(
    results,
    "fail",
    label,
    `missing ${packageNames.join(" or ")}${options.fix ? `. ${options.fix}` : ""}`,
  );
  return false;
}

function checkLinuxTauriDependencies(results, root, options = {}) {
  if (options.platform !== "linux") {
    return;
  }

  const pkgConfig = runVersionCheck(results, "pkg-config", ["--version"], "pkg-config CLI", {
    cwd: root,
    platform: options.platform,
    execFileSync: options.execFileSync,
    fix: "Install pkg-config and the Linux Tauri development packages",
  });

  if (pkgConfig.ok) {
    checkPkgConfigRequirement(results, ["webkit2gtk-4.1"], "Linux WebKitGTK dev package", {
      cwd: root,
      platform: options.platform,
      execFileSync: options.execFileSync,
      fix: "Install libwebkit2gtk-4.1-dev",
    });
    checkPkgConfigRequirement(results, ["gtk+-3.0"], "Linux GTK dev package", {
      cwd: root,
      platform: options.platform,
      execFileSync: options.execFileSync,
      fix: "Install libgtk-3-dev",
    });
    checkPkgConfigRequirement(
      results,
      ["ayatana-appindicator3-0.1", "appindicator3-0.1"],
      "Linux AppIndicator dev package",
      {
        cwd: root,
        platform: options.platform,
        execFileSync: options.execFileSync,
        fix: "Install libayatana-appindicator3-dev or libappindicator3-dev",
      },
    );
    checkPkgConfigRequirement(results, ["librsvg-2.0"], "Linux librsvg dev package", {
      cwd: root,
      platform: options.platform,
      execFileSync: options.execFileSync,
      fix: "Install librsvg2-dev",
    });
  }

  runCommandCheck(results, "patchelf", ["--version"], "Linux patchelf CLI", {
    cwd: root,
    platform: options.platform,
    execFileSync: options.execFileSync,
    fix: "Install patchelf",
  });
}

function checkPlaywrightReadiness(results, root, options = {}) {
  if (!existsSync(join(root, "node_modules/@playwright/test"))) {
    pushResult(
      results,
      options.strict ? "fail" : "warn",
      "Playwright package",
      "node_modules/@playwright/test is missing. Run npm ci",
    );
    return;
  }

  const script = `
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ headless: true });
await browser.close();
`;

  runCommandCheck(
    results,
    process.execPath,
    ["--input-type=module", "-e", script],
    "Playwright Chromium launch",
    {
      cwd: root,
      execFileSync: options.execFileSync,
      warnOnly: !options.strict,
      timeout: 30000,
      detail: "Chromium launches headless",
      detailOnFailure: "Chromium cannot launch",
      fix:
        options.platform === "linux"
          ? "Run npx playwright install --with-deps chromium"
          : "Run npx playwright install chromium",
    },
  );
}

export function runDoctor(options = {}) {
  const root = options.root ?? defaultRoot;
  const platform = options.platform ?? process.platform;
  const nodeVersion = options.nodeVersion ?? process.version;
  const results = [];

  if (compareVersions(nodeVersion, "20.0.0") < 0) {
    results.push({
      status: "fail",
      label: "Node.js runtime",
      detail: `${nodeVersion}; need 20.0.0 or newer`,
    });
  } else {
    results.push({
      status: "pass",
      label: "Node.js runtime",
      detail: `${nodeVersion}; need 20.0.0+`,
    });
  }

  const nodeMajor = parseVersion(nodeVersion)?.[0];
  if (nodeMajor && nodeMajor !== 20) {
    results.push({
      status: "warn",
      label: "Node.js CI baseline",
      detail: `${nodeVersion}; CI uses Node 20. Use Node 20 if behavior differs.`,
    });
  }

  checkPath(results, root, ".nvmrc", "Node version file", {
    mustContain: "20",
    fix: "Set .nvmrc to Node 20 to match CI",
  });

  runVersionCheck(results, "npm", ["--version"], "npm CLI", {
    cwd: root,
    platform,
    execFileSync: options.execFileSync,
    fix: "Install Node.js 20+ with npm",
  });

  runVersionCheck(results, "cargo", ["--version"], "Cargo CLI", {
    cwd: join(root, "src-tauri"),
    platform,
    execFileSync: options.execFileSync,
    fix: "Install stable Rust with Cargo",
  });

  const rustc = runVersionCheck(results, "rustc", ["--version"], "Rust compiler", {
    cwd: join(root, "src-tauri"),
    platform,
    execFileSync: options.execFileSync,
    fix: "Install stable Rust",
  });
  if (rustc.ok && /\b(?:nightly|beta)\b/i.test(rustc.output)) {
    results.push({
      status: "warn",
      label: "Rust CI baseline",
      detail: `${rustc.output}; CI uses stable Rust.`,
    });
  }

  checkPath(results, root, "rust-toolchain.toml", "Rust toolchain file", {
    mustContain: 'channel = "stable"',
    fix: "Set rust-toolchain.toml to stable to match CI",
  });

  runVersionCheck(results, "cargo", ["fmt", "--version"], "Rust formatter", {
    cwd: join(root, "src-tauri"),
    platform,
    execFileSync: options.execFileSync,
    fix: "Install rustfmt with rustup component add rustfmt",
  });

  runVersionCheck(results, "cargo", ["clippy", "--version"], "Rust linter", {
    cwd: join(root, "src-tauri"),
    platform,
    execFileSync: options.execFileSync,
    fix: "Install clippy with rustup component add clippy",
  });

  checkLinuxTauriDependencies(results, root, {
    platform,
    execFileSync: options.execFileSync,
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

  checkPlaywrightReadiness(results, root, {
    platform,
    execFileSync: options.execFileSync,
    strict: options.strictPlaywright ?? false,
  });

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
  const results = runDoctor({ strictPlaywright: process.argv.includes("--e2e") });
  console.log(formatDoctorResults(results));
  process.exitCode = summarizeDoctorResults(results).exitCode;
}
