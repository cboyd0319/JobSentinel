#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, delimiter, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");

export function hasArg(args, name) {
  return args.some((arg) => arg === name || arg.startsWith(`${name}=`));
}

export function getArgValue(args, name) {
  const exactIndex = args.indexOf(name);
  if (exactIndex >= 0) {
    return args[exactIndex + 1];
  }

  const prefixed = args.find((arg) => arg.startsWith(`${name}=`));
  return prefixed ? prefixed.slice(name.length + 1) : undefined;
}

export function buildTauriArgs(args) {
  const tauriArgs = ["build", ...args];

  if (!hasArg(tauriArgs, "--bundles")) {
    tauriArgs.push("--bundles", "app");
  }

  return tauriArgs;
}

export function getReleaseDir(root, args) {
  const target = getArgValue(args, "--target");

  if (target) {
    return join(root, "src-tauri", "target", target, "release");
  }

  return join(root, "src-tauri", "target", "release");
}

export function getArchSuffix(target, arch = process.arch) {
  if (target === "universal-apple-darwin") {
    return "universal";
  }

  if (target?.includes("aarch64")) {
    return "aarch64";
  }

  if (target?.includes("x86_64")) {
    return "x64";
  }

  if (arch === "arm64") {
    return "aarch64";
  }

  if (arch === "x64") {
    return "x64";
  }

  return arch;
}

export function readBuildMetadata(root = defaultRoot) {
  const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const tauriConfig = JSON.parse(readFileSync(join(root, "src-tauri", "tauri.conf.json"), "utf8"));

  return {
    productName: tauriConfig.productName ?? packageJson.name,
    version: tauriConfig.version ?? packageJson.version,
  };
}

function run(command, args, options = {}) {
  const logArgs = options.logArgs ?? args;
  console.log(`$ ${[command, ...logArgs].join(" ")}`);
  execFileSync(command, args, {
    cwd: options.cwd ?? defaultRoot,
    env: options.env ?? process.env,
    stdio: options.stdio ?? "inherit",
    encoding: "utf8",
    timeout: options.timeout,
  });
}

export function prependPathDir(pathValue, dir) {
  const paths = String(pathValue ?? "")
    .split(delimiter)
    .filter(Boolean);

  if (paths.includes(dir)) {
    return paths.join(delimiter);
  }

  return [dir, ...paths].join(delimiter);
}

export function getRustupToolchainBinDir(env = process.env) {
  try {
    const cargoPath = execFileSync("rustup", ["which", "cargo"], {
      env,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
    return cargoPath ? dirname(cargoPath) : null;
  } catch {
    return null;
  }
}

export function buildMacosTauriEnv(env = process.env, rustupToolchainBinDir = getRustupToolchainBinDir(env)) {
  if (!rustupToolchainBinDir) {
    return env;
  }

  return {
    ...env,
    PATH: prependPathDir(env.PATH, rustupToolchainBinDir),
  };
}

function hasValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function verifyCodesign(appPath, options = {}) {
  try {
    execFileSync("codesign", ["--verify", "--deep", "--strict", "--verbose=2", appPath], {
      stdio: options.stdio ?? "pipe",
      encoding: "utf8",
    });
    return true;
  } catch {
    return false;
  }
}

export function getSigningIdentity(env = process.env) {
  return (
    env.JOBSENTINEL_MACOS_SIGNING_IDENTITY ??
    env.APPLE_SIGNING_IDENTITY ??
    env.MACOS_SIGNING_IDENTITY ??
    "-"
  );
}

export function buildAppCodesignArgs(identity, appPath) {
  const args = ["--force", "--deep", "--sign", identity];

  if (identity !== "-") {
    args.push("--options", "runtime", "--timestamp");
  }

  args.push(appPath);
  return args;
}

export function buildDmgCodesignArgs(identity, dmgPath) {
  const args = ["--force", "--sign", identity];

  if (identity !== "-") {
    args.push("--timestamp");
  }

  args.push(dmgPath);
  return args;
}

function ensureSignedApp(appPath) {
  if (verifyCodesign(appPath)) {
    console.log(`App bundle signature valid: ${appPath}`);
    return;
  }

  const identity = getSigningIdentity();

  run("codesign", buildAppCodesignArgs(identity, appPath));

  if (!verifyCodesign(appPath, { stdio: "inherit" })) {
    throw new Error(`codesign verification failed for ${appPath}`);
  }
}

export function buildNotarytoolSubmitArgs(dmgPath, env = process.env) {
  const profile = env.JOBSENTINEL_MACOS_NOTARY_PROFILE ?? env.NOTARYTOOL_KEYCHAIN_PROFILE;
  if (hasValue(profile)) {
    return ["notarytool", "submit", dmgPath, "--keychain-profile", profile, "--wait"];
  }

  if (hasValue(env.APPLE_API_KEY) && hasValue(env.APPLE_API_KEY_PATH)) {
    const args = [
      "notarytool",
      "submit",
      dmgPath,
      "--key-id",
      env.APPLE_API_KEY,
      "--key",
      env.APPLE_API_KEY_PATH,
      "--wait",
    ];
    if (hasValue(env.APPLE_API_ISSUER)) {
      args.push("--issuer", env.APPLE_API_ISSUER);
    }
    return args;
  }

  if (hasValue(env.APPLE_ID) && hasValue(env.APPLE_PASSWORD) && hasValue(env.APPLE_TEAM_ID)) {
    return [
      "notarytool",
      "submit",
      dmgPath,
      "--apple-id",
      env.APPLE_ID,
      "--password",
      "@env:APPLE_PASSWORD",
      "--team-id",
      env.APPLE_TEAM_ID,
      "--wait",
    ];
  }

  return null;
}

export function hasPartialNotarizationCredentials(env = process.env) {
  const fields = [
    env.APPLE_ID,
    env.APPLE_PASSWORD,
    env.APPLE_TEAM_ID,
    env.APPLE_API_KEY,
    env.APPLE_API_KEY_PATH,
    env.APPLE_API_ISSUER,
    env.JOBSENTINEL_MACOS_NOTARY_PROFILE,
    env.NOTARYTOOL_KEYCHAIN_PROFILE,
  ];
  return fields.some(hasValue) && !buildNotarytoolSubmitArgs("artifact.dmg", env);
}

export function shouldNotarizeDmg(env = process.env, dmgPath = "artifact.dmg") {
  const notarizeMode = env.JOBSENTINEL_MACOS_NOTARIZE_DMG;
  return notarizeMode === "true" || (notarizeMode !== "false" && Boolean(buildNotarytoolSubmitArgs(dmgPath, env)));
}

export function redactNotarytoolArgs(args) {
  const sensitiveOptionNames = new Set([
    "--apple-id",
    "--issuer",
    "--key",
    "--key-id",
    "--keychain-profile",
    "--password",
    "--team-id",
  ]);

  return args.map((arg, index) => {
    const previous = args[index - 1];
    if (sensitiveOptionNames.has(previous)) {
      return "<redacted>";
    }
    return arg;
  });
}

export function staleDmgArtifactNames(dmgName) {
  const names = new Set([dmgName, `${dmgName}.sha256`]);

  if (!dmgName.includes("_no-account_")) {
    const noAccountName = dmgName.endsWith("_universal.dmg")
      ? dmgName.replace("_universal.dmg", "_no-account_universal.dmg")
      : `${dmgName.replace(/\.dmg$/, "")}_no-account_macos.dmg`;
    names.add(noAccountName);
    names.add(`${noAccountName}.sha256`);
  }

  return names;
}

export function removeStaleDmgArtifacts(paths, dmgName) {
  const staleNames = staleDmgArtifactNames(dmgName);

  for (const path of paths) {
    if (!existsSync(path)) {
      continue;
    }

    for (const entry of readdirSync(path)) {
      if (staleNames.has(entry) || (entry.startsWith("rw.") && entry.endsWith(".dmg"))) {
        rmSync(join(path, entry), { force: true });
      }
    }
  }
}

function signDmgForDistribution(dmgPath, identity) {
  if (identity === "-") {
    return false;
  }

  run("codesign", buildDmgCodesignArgs(identity, dmgPath));
  run("codesign", ["--verify", "--verbose=2", dmgPath]);
  return true;
}

function notarizeAndStapleDmg(dmgPath) {
  const submitArgs = buildNotarytoolSubmitArgs(dmgPath);
  const shouldNotarize = shouldNotarizeDmg(process.env, dmgPath);

  if (!shouldNotarize) {
    return;
  }

  if (hasPartialNotarizationCredentials()) {
    throw new Error(
      "Incomplete macOS notarization credentials. Use APPLE_ID, APPLE_PASSWORD, and APPLE_TEAM_ID; APPLE_API_KEY and APPLE_API_KEY_PATH; or JOBSENTINEL_MACOS_NOTARY_PROFILE.",
    );
  }

  if (!submitArgs) {
    throw new Error("macOS DMG notarization was requested but notarization credentials are missing.");
  }

  const identity = getSigningIdentity();
  if (identity === "-") {
    throw new Error("macOS DMG notarization requires APPLE_SIGNING_IDENTITY or JOBSENTINEL_MACOS_SIGNING_IDENTITY.");
  }

  signDmgForDistribution(dmgPath, identity);
  run("xcrun", submitArgs, { logArgs: redactNotarytoolArgs(submitArgs) });
  run("xcrun", ["stapler", "staple", dmgPath]);
  run("xcrun", ["stapler", "validate", dmgPath]);
}

function createDmg({ appPath, dmgPath, productName }) {
  const staging = mkdtempSync(join(tmpdir(), "jobsentinel-dmg-"));

  try {
    cpSync(appPath, join(staging, basename(appPath)), { recursive: true });
    symlinkSync("/Applications", join(staging, "Applications"));

    mkdirSync(dirname(dmgPath), { recursive: true });
    run("hdiutil", [
      "create",
      "-volname",
      productName,
      "-srcfolder",
      staging,
      "-ov",
      "-format",
      "UDZO",
      "-imagekey",
      "zlib-level=9",
      dmgPath,
    ]);
    run("hdiutil", ["verify", dmgPath]);
    notarizeAndStapleDmg(dmgPath);
    writeDmgChecksum(dmgPath);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

export function formatDmgChecksum(dmgPath, digest) {
  return `${digest}  ${basename(dmgPath)}\n`;
}

function writeDmgChecksum(dmgPath) {
  const digest = createHash("sha256").update(readFileSync(dmgPath)).digest("hex");
  const checksumPath = `${dmgPath}.sha256`;
  writeFileSync(checksumPath, formatDmgChecksum(dmgPath, digest));
  console.log(`macOS DMG SHA-256: ${checksumPath}`);
}

export function getMacBuildPaths(root, args, metadata = readBuildMetadata(root)) {
  const target = getArgValue(args, "--target");
  const releaseDir = getReleaseDir(root, args);
  const appPath = join(releaseDir, "bundle", "macos", `${metadata.productName}.app`);
  const dmgName = `${metadata.productName}_${metadata.version}_${getArchSuffix(target)}.dmg`;
  const dmgDir = join(releaseDir, "bundle", "dmg");
  const dmgPath = join(dmgDir, dmgName);

  return {
    appPath,
    dmgDir,
    dmgName,
    dmgPath,
    macosDir: join(releaseDir, "bundle", "macos"),
    releaseDir,
    target,
  };
}

export function main({ root = defaultRoot, args = process.argv.slice(2) } = {}) {
  if (process.platform !== "darwin") {
    throw new Error("macOS DMG build must run on macOS.");
  }

  const metadata = readBuildMetadata(root);
  const paths = getMacBuildPaths(root, args, metadata);
  const tauriBin = join(root, "node_modules", ".bin", "tauri");

  removeStaleDmgArtifacts([paths.dmgDir, paths.macosDir], paths.dmgName);
  run(tauriBin, buildTauriArgs(args), { cwd: root, env: buildMacosTauriEnv() });

  if (!existsSync(paths.appPath)) {
    throw new Error(`Tauri app bundle missing: ${paths.appPath}`);
  }

  ensureSignedApp(paths.appPath);
  createDmg({
    appPath: paths.appPath,
    dmgPath: paths.dmgPath,
    productName: metadata.productName,
  });

  console.log(`macOS app: ${paths.appPath}`);
  console.log(`macOS DMG: ${paths.dmgPath}`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
