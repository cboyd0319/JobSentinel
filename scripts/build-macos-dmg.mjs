#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
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
    stdio: options.stdio ?? "inherit",
    encoding: "utf8",
    timeout: options.timeout,
  });
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

function ensureSignedApp(appPath) {
  if (verifyCodesign(appPath)) {
    console.log(`App bundle signature valid: ${appPath}`);
    return;
  }

  const identity = getSigningIdentity();

  run("codesign", ["--force", "--deep", "--sign", identity, appPath]);

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

function removeStaleDmgArtifacts(paths, dmgName) {
  for (const path of paths) {
    if (!existsSync(path)) {
      continue;
    }

    for (const entry of readdirSync(path)) {
      if (entry === dmgName || (entry.startsWith("rw.") && entry.endsWith(".dmg"))) {
        rmSync(join(path, entry), { force: true });
      }
    }
  }
}

function signDmgForDistribution(dmgPath, identity) {
  if (identity === "-") {
    return false;
  }

  run("codesign", ["--force", "--sign", identity, dmgPath]);
  run("codesign", ["--verify", "--verbose=2", dmgPath]);
  return true;
}

function notarizeAndStapleDmg(dmgPath) {
  const submitArgs = buildNotarytoolSubmitArgs(dmgPath);
  const shouldNotarize = process.env.JOBSENTINEL_MACOS_NOTARIZE_DMG === "true" || submitArgs;

  if (hasPartialNotarizationCredentials()) {
    throw new Error(
      "Incomplete macOS notarization credentials. Use APPLE_ID, APPLE_PASSWORD, and APPLE_TEAM_ID; APPLE_API_KEY and APPLE_API_KEY_PATH; or JOBSENTINEL_MACOS_NOTARY_PROFILE.",
    );
  }

  if (!shouldNotarize) {
    return;
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
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
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
  run(tauriBin, buildTauriArgs(args), { cwd: root });

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
