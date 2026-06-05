#!/usr/bin/env node

import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  assertDeveloperIdSignature,
  parseCodesignDetails,
} from "./macos-signature.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");
const defaultSmokeSeconds = 12;

export function getArgValue(args, name) {
  const exactIndex = args.indexOf(name);
  if (exactIndex >= 0) {
    return args[exactIndex + 1];
  }

  const prefixed = args.find((arg) => arg.startsWith(`${name}=`));
  return prefixed ? prefixed.slice(name.length + 1) : undefined;
}

export function hasArg(args, name) {
  return args.some((arg) => arg === name || arg.startsWith(`${name}=`));
}

function splitList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function defaultArchitectures(arch = process.arch) {
  if (arch === "arm64") return ["arm64"];
  if (arch === "x64") return ["x86_64"];
  return [arch];
}

export function parseArgs(args, arch = process.arch) {
  const positionalDmg = args.find((arg) => !arg.startsWith("-"));
  const dmgPath = getArgValue(args, "--dmg") ?? positionalDmg;
  const expectedArchitectures =
    getArgValue(args, "--expected-architectures") ??
    getArgValue(args, "--expected-archs") ??
    "";
  const smokeValue = getArgValue(args, "--smoke-seconds");

  return {
    appName: getArgValue(args, "--app-name") ?? "JobSentinel.app",
    dmgPath,
    expectedBundleMetadata: {
      bundleIdentifier: getArgValue(args, "--expected-bundle-id"),
      iconFile: getArgValue(args, "--expected-icon-file"),
      minimumSystemVersion: getArgValue(args, "--expected-minimum-system-version"),
      productName: getArgValue(args, "--expected-product-name"),
      version: getArgValue(args, "--expected-version"),
    },
    expectedArchitectures: expectedArchitectures
      ? splitList(expectedArchitectures)
      : defaultArchitectures(arch),
    installSmoke: hasArg(args, "--install-smoke"),
    launchSmoke: hasArg(args, "--launch-smoke") || Boolean(smokeValue),
    requireChecksum: hasArg(args, "--require-checksum"),
    requireGatekeeper: hasArg(args, "--require-gatekeeper"),
    verifyChecksum: !hasArg(args, "--no-checksum"),
    smokeSeconds: smokeValue ? Number(smokeValue) : defaultSmokeSeconds,
  };
}

export function parseLipoArchitectures(output) {
  const fatMatch = output.match(/are:\s*([^\n]+)/);
  if (fatMatch) {
    return fatMatch[1].split(/\s+/).filter(Boolean);
  }

  const thinMatch = output.match(/architecture:\s*([^\s]+)/);
  if (thinMatch) {
    return [thinMatch[1]];
  }

  return [];
}

export function hasExpectedArchitectures(found, expected) {
  const foundSet = new Set(found);
  return expected.every((architecture) => foundSet.has(architecture));
}

export function formatGatekeeperStatus({ subject, accepted, requireGatekeeper }) {
  if (accepted) {
    return `Gatekeeper accepted: ${subject}`;
  }

  if (requireGatekeeper) {
    return `Gatekeeper rejected required public release artifact: ${subject}`;
  }

  return `Gatekeeper rejected optional check: ${subject}. Developer ID signing and notarization are still required for a zero-friction public macOS release.`;
}

export function macosSmokeDataPaths(homePath) {
  const dataDir = join(homePath, "Library", "Application Support", "JobSentinel");
  return {
    dataDir,
    dbPath: join(dataDir, "jobs.db"),
  };
}

export function parseSha256Checksum(content, expectedFileName) {
  const entries = [];

  for (const line of String(content ?? "").split(/\r?\n/)) {
    const match = line.match(/^\s*([a-fA-F0-9]{64})\s+\*?(.+?)\s*$/);
    if (match) {
      entries.push({
        digest: match[1].toLowerCase(),
        fileName: match[2],
      });
    }
  }

  if (entries.length !== 1) {
    throw new Error("SHA-256 checksum file must contain exactly one digest line.");
  }

  if (expectedFileName && basename(entries[0].fileName) !== expectedFileName) {
    throw new Error(
      `SHA-256 checksum filename expected ${expectedFileName}, found ${entries[0].fileName}.`,
    );
  }

  return entries[0].digest;
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

export function verifyLocalDmgChecksum(dmgPath, { requireChecksum = false, verifyChecksum = true } = {}) {
  if (!verifyChecksum) {
    return false;
  }

  const checksumPath = `${dmgPath}.sha256`;
  if (!existsSync(checksumPath)) {
    if (requireChecksum) {
      throw new Error(`SHA-256 checksum sidecar missing: ${checksumPath}`);
    }
    console.warn(`No SHA-256 checksum sidecar found; skipping checksum check: ${checksumPath}`);
    return false;
  }

  const expected = parseSha256Checksum(readFileSync(checksumPath, "utf8"), basename(dmgPath));
  const actual = sha256File(dmgPath);
  if (actual !== expected) {
    throw new Error(`SHA-256 checksum mismatch for ${dmgPath}. Expected ${expected}, found ${actual}.`);
  }

  console.log(`SHA-256 checksum verified: ${actual}`);
  return true;
}

const requiredBundleMetadata = [
  ["bundleIdentifier", "CFBundleIdentifier"],
  ["bundleName", "CFBundleName"],
  ["displayName", "CFBundleDisplayName"],
  ["executable", "CFBundleExecutable"],
  ["iconFile", "CFBundleIconFile"],
  ["minimumSystemVersion", "LSMinimumSystemVersion"],
  ["shortVersion", "CFBundleShortVersionString"],
  ["bundleVersion", "CFBundleVersion"],
];

function bundleIconResourceNames(iconFile) {
  if (!iconFile) {
    return [];
  }

  return iconFile.endsWith(".icns") ? [iconFile] : [iconFile, `${iconFile}.icns`];
}

export function bundleMetadataViolations(metadata, expected = {}) {
  const violations = [];

  for (const [field, plistKey] of requiredBundleMetadata) {
    if (!metadata[field]) {
      violations.push(`${plistKey} is missing or empty`);
    }
  }

  if (expected.bundleIdentifier && metadata.bundleIdentifier !== expected.bundleIdentifier) {
    violations.push(
      `CFBundleIdentifier expected ${expected.bundleIdentifier}, found ${metadata.bundleIdentifier || "(empty)"}`,
    );
  }

  if (expected.productName) {
    if (metadata.bundleName !== expected.productName) {
      violations.push(
        `CFBundleName expected ${expected.productName}, found ${metadata.bundleName || "(empty)"}`,
      );
    }
    if (metadata.displayName !== expected.productName) {
      violations.push(
        `CFBundleDisplayName expected ${expected.productName}, found ${metadata.displayName || "(empty)"}`,
      );
    }
  }

  if (expected.version) {
    if (metadata.shortVersion !== expected.version) {
      violations.push(
        `CFBundleShortVersionString expected ${expected.version}, found ${metadata.shortVersion || "(empty)"}`,
      );
    }
    if (metadata.bundleVersion !== expected.version) {
      violations.push(
        `CFBundleVersion expected ${expected.version}, found ${metadata.bundleVersion || "(empty)"}`,
      );
    }
  }

  if (expected.iconFile && metadata.iconFile !== expected.iconFile) {
    violations.push(`CFBundleIconFile expected ${expected.iconFile}, found ${metadata.iconFile || "(empty)"}`);
  }

  if (expected.minimumSystemVersion && metadata.minimumSystemVersion !== expected.minimumSystemVersion) {
    violations.push(
      `LSMinimumSystemVersion expected ${expected.minimumSystemVersion}, found ${metadata.minimumSystemVersion || "(empty)"}`,
    );
  }

  if (metadata.iconFile && metadata.iconResourceExists === false) {
    violations.push(`CFBundleIconFile resource missing from Contents/Resources: ${metadata.iconFile}`);
  }

  return violations;
}

function runCapture(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd ?? defaultRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: options.timeout,
  });
}

function runChecked(command, args, options = {}) {
  console.log(`$ ${[command, ...args].join(" ")}`);
  return runCapture(command, args, options);
}

function runResult(command, args) {
  try {
    const output = runCapture(command, args);
    return {
      accepted: true,
      output,
      status: 0,
    };
  } catch (error) {
    return {
      accepted: false,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
      status: error.status ?? 1,
    };
  }
}

export function buildGatekeeperAssessArgs(subject, type) {
  return ["--assess", "--type", type, "--verbose=4", subject];
}

export function buildStaplerValidateArgs(subject) {
  return ["stapler", "validate", "-v", subject];
}

function requireMacos() {
  if (process.platform !== "darwin") {
    throw new Error("macOS package verification must run on macOS.");
  }
}

function assertPathExists(path, label) {
  if (!path || !existsSync(path)) {
    throw new Error(`${label} missing: ${path ?? "(not provided)"}`);
  }
}

function readBundleString(infoPlistPath, key) {
  try {
    return runCapture("plutil", ["-extract", key, "raw", "-o", "-", infoPlistPath]).trim();
  } catch {
    return "";
  }
}

function readBundleMetadata(appPath) {
  const infoPlistPath = join(appPath, "Contents", "Info.plist");
  assertPathExists(infoPlistPath, "Info.plist");
  const iconFile = readBundleString(infoPlistPath, "CFBundleIconFile");
  const resourcesPath = join(appPath, "Contents", "Resources");

  return {
    bundleIdentifier: readBundleString(infoPlistPath, "CFBundleIdentifier"),
    bundleName: readBundleString(infoPlistPath, "CFBundleName"),
    bundleVersion: readBundleString(infoPlistPath, "CFBundleVersion"),
    displayName: readBundleString(infoPlistPath, "CFBundleDisplayName"),
    executable: readBundleString(infoPlistPath, "CFBundleExecutable"),
    iconFile,
    iconResourceExists: bundleIconResourceNames(iconFile).some((name) => existsSync(join(resourcesPath, name))),
    minimumSystemVersion: readBundleString(infoPlistPath, "LSMinimumSystemVersion"),
    shortVersion: readBundleString(infoPlistPath, "CFBundleShortVersionString"),
  };
}

function verifyBundleMetadata(appPath, expectedBundleMetadata) {
  const metadata = readBundleMetadata(appPath);
  const violations = bundleMetadataViolations(metadata, expectedBundleMetadata);
  if (violations.length > 0) {
    throw new Error(`App bundle metadata check failed:\n- ${violations.join("\n- ")}`);
  }

  console.log(
    `App bundle metadata verified: ${metadata.bundleName} ${metadata.shortVersion} (${metadata.bundleIdentifier}), icon ${metadata.iconFile}, macOS ${metadata.minimumSystemVersion}+`,
  );
  return metadata;
}

function getBundleExecutable(appPath) {
  const infoPlistPath = join(appPath, "Contents", "Info.plist");
  assertPathExists(infoPlistPath, "Info.plist");
  return runCapture("plutil", ["-extract", "CFBundleExecutable", "raw", "-o", "-", infoPlistPath]).trim();
}

function gatekeeperAssess(subject, type, requireGatekeeper) {
  const result = runResult("spctl", buildGatekeeperAssessArgs(subject, type));
  const status = formatGatekeeperStatus({
    accepted: result.accepted,
    requireGatekeeper,
    subject,
  });

  if (result.accepted) {
    console.log(status);
    return result;
  }

  if (requireGatekeeper) {
    throw new Error(`${status}\n${result.output.trim()}`);
  }

  console.log(status);
  if (result.output.trim()) {
    console.log(result.output.trim());
  }

  return result;
}

function readCodesignDetails(subject) {
  console.log(`$ codesign -dv --verbose=4 ${subject}`);
  const result = spawnSync("codesign", ["-dv", "--verbose=4", subject], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`codesign details failed for ${subject}:\n${result.stderr || result.stdout}`);
  }
  return parseCodesignDetails(`${result.stdout ?? ""}${result.stderr ?? ""}`);
}

function verifyDeveloperIdSignature(subject, { requireHardenedRuntime }) {
  const details = readCodesignDetails(subject);
  assertDeveloperIdSignature(details, { requireHardenedRuntime });
  console.log(`Developer ID signature verified: ${subject}`);
}

function validateStapledTicket(subject) {
  runChecked("xcrun", buildStaplerValidateArgs(subject));
  console.log(`Stapled notarization ticket verified: ${subject}`);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function smokeLaunch({ appPath, seconds }) {
  const executable = join(appPath, "Contents", "MacOS", getBundleExecutable(appPath));
  assertPathExists(executable, "App executable");

  const smokeRoot = mkdtempSync(join(tmpdir(), "jobsentinel-macos-smoke-"));
  const stdoutPath = join(smokeRoot, "stdout.log");
  const stderrPath = join(smokeRoot, "stderr.log");
  const stdoutFd = openSync(stdoutPath, "w");
  const stderrFd = openSync(stderrPath, "w");

  try {
    const homePath = join(smokeRoot, "home");
    mkdirSync(homePath);
    mkdirSync(join(smokeRoot, "xdg"));

    const child = spawn(executable, [], {
      env: {
        ...process.env,
        HOME: homePath,
        XDG_CONFIG_HOME: join(smokeRoot, "xdg"),
      },
      stdio: ["ignore", stdoutFd, stderrFd],
    });

    await sleep(seconds * 1000);

    if (child.exitCode !== null) {
      throw new Error(`Launch smoke exited before ${seconds} seconds with status ${child.exitCode}.`);
    }

    const exitPromise = new Promise((resolve) => child.once("exit", resolve));
    child.kill("SIGTERM");
    await exitPromise;

    const stderr = readFileSync(stderrPath, "utf8");
    if (stderr.trim()) {
      throw new Error(`Launch smoke wrote stderr:\n${stderr}`);
    }

    const dataPaths = macosSmokeDataPaths(homePath);
    assertPathExists(dataPaths.dataDir, "Smoke data directory");
    assertPathExists(dataPaths.dbPath, "Smoke database");
    console.log("Local data smoke passed: app created isolated macOS data directory and jobs.db.");
    console.log(`Launch smoke passed: app stayed running for ${seconds} seconds with empty stderr.`);
  } finally {
    closeSync(stdoutFd);
    closeSync(stderrFd);
    rmSync(smokeRoot, { recursive: true, force: true });
  }
}

function assertApplicationsSymlink(mountPath) {
  const applicationsPath = join(mountPath, "Applications");
  assertPathExists(applicationsPath, "Applications symlink");
  if (!lstatSync(applicationsPath).isSymbolicLink()) {
    throw new Error(`Applications entry is not a symlink: ${applicationsPath}`);
  }
}

async function verifyAppBundle({
  appPath,
  expectedBundleMetadata,
  expectedArchitectures,
  launchSmoke,
  requireGatekeeper,
  smokeSeconds,
  bundleLabel = "App bundle",
}) {
  assertPathExists(appPath, bundleLabel);
  verifyBundleMetadata(appPath, expectedBundleMetadata);

  const executable = join(appPath, "Contents", "MacOS", getBundleExecutable(appPath));
  assertPathExists(executable, "App executable");

  const lipoOutput = runChecked("lipo", ["-info", executable]);
  const architectures = parseLipoArchitectures(lipoOutput);
  if (!hasExpectedArchitectures(architectures, expectedArchitectures)) {
    throw new Error(
      `App binary architectures mismatch. Expected ${expectedArchitectures.join(", ")}, found ${architectures.join(", ") || "(none)"}.`,
    );
  }
  console.log(`App binary architectures verified: ${architectures.join(" ")}`);

  runChecked("codesign", ["--verify", "--deep", "--strict", "--verbose=2", appPath]);
  console.log(`App bundle signature verified: ${appPath}`);

  gatekeeperAssess(appPath, "execute", requireGatekeeper);
  if (requireGatekeeper) {
    verifyDeveloperIdSignature(appPath, { requireHardenedRuntime: true });
  }

  if (launchSmoke) {
    await smokeLaunch({ appPath, seconds: smokeSeconds });
  }
}

async function verifyInstalledApp({
  sourceAppPath,
  appName,
  expectedBundleMetadata,
  expectedArchitectures,
  requireGatekeeper,
  smokeSeconds,
}) {
  const installRoot = mkdtempSync(join(tmpdir(), "jobsentinel-macos-install-"));
  const installedAppPath = join(installRoot, appName);

  try {
    runChecked("ditto", [sourceAppPath, installedAppPath]);
    await verifyAppBundle({
      appPath: installedAppPath,
      bundleLabel: "Installed app bundle",
      expectedBundleMetadata,
      expectedArchitectures,
      launchSmoke: true,
      requireGatekeeper,
      smokeSeconds,
    });
    console.log(`Install smoke passed: copied app launched from ${installedAppPath}.`);
  } finally {
    rmSync(installRoot, { recursive: true, force: true });
  }
}

export async function verifyMacosPackage(options) {
  requireMacos();
  assertPathExists(options.dmgPath, "DMG");
  verifyLocalDmgChecksum(options.dmgPath, {
    requireChecksum: options.requireChecksum,
    verifyChecksum: options.verifyChecksum,
  });

  runChecked("hdiutil", ["verify", options.dmgPath]);
  gatekeeperAssess(options.dmgPath, "open", options.requireGatekeeper);
  if (options.requireGatekeeper) {
    verifyDeveloperIdSignature(options.dmgPath, { requireHardenedRuntime: false });
    validateStapledTicket(options.dmgPath);
  }

  const tempRoot = mkdtempSync(join(tmpdir(), "jobsentinel-macos-verify-"));
  const mountPath = join(tempRoot, "mount");
  let mounted = false;

  try {
    mkdirSync(mountPath);
    runChecked("hdiutil", [
      "attach",
      "-nobrowse",
      "-readonly",
      "-mountpoint",
      mountPath,
      options.dmgPath,
    ]);
    mounted = true;

    assertApplicationsSymlink(mountPath);
    const mountedAppPath = join(mountPath, options.appName);
    await verifyAppBundle({
      appPath: mountedAppPath,
      bundleLabel: "Mounted app bundle",
      expectedBundleMetadata: options.expectedBundleMetadata,
      expectedArchitectures: options.expectedArchitectures,
      launchSmoke: options.launchSmoke,
      requireGatekeeper: options.requireGatekeeper,
      smokeSeconds: options.smokeSeconds,
    });

    if (options.installSmoke) {
      await verifyInstalledApp({
        sourceAppPath: mountedAppPath,
        appName: options.appName,
        expectedBundleMetadata: options.expectedBundleMetadata,
        expectedArchitectures: options.expectedArchitectures,
        requireGatekeeper: options.requireGatekeeper,
        smokeSeconds: options.smokeSeconds,
      });
    }
  } finally {
    if (mounted) {
      try {
        runChecked("hdiutil", ["detach", mountPath]);
      } catch (error) {
        console.warn(error instanceof Error ? error.message : String(error));
      }
    }
    rmSync(tempRoot, { recursive: true, force: true });
  }

  console.log(`macOS package verification passed: ${options.dmgPath}`);
}

export async function main({ args = process.argv.slice(2) } = {}) {
  const options = parseArgs(args);
  if (!options.dmgPath) {
    throw new Error("Usage: verify-macos-package.mjs --dmg <path-to-dmg> [--expected-architectures x86_64,arm64] [--expected-bundle-id com.example.app] [--expected-product-name AppName] [--expected-version X.Y.Z] [--expected-icon-file icon.icns] [--expected-minimum-system-version 13.0] [--launch-smoke] [--install-smoke] [--require-checksum] [--require-gatekeeper]");
  }
  if (!Number.isFinite(options.smokeSeconds) || options.smokeSeconds < 1) {
    throw new Error(`Invalid --smoke-seconds value: ${options.smokeSeconds}`);
  }

  await verifyMacosPackage(options);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
