import { execFileSync, spawnSync } from "node:child_process";
import { delimiter, dirname } from "node:path";

import {
  assertDeveloperIdSignature,
  extractTeamIdFromSigningIdentity,
  parseCodesignDetails,
} from "./macos-signature.mjs";

function run(command, args) {
  execFileSync(command, args, { stdio: "inherit" });
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

const sensitiveMacosTauriEnvKeys = [
  "APPLE_API_ISSUER",
  "APPLE_API_KEY",
  "APPLE_API_KEY_PATH",
  "APPLE_CERTIFICATE",
  "APPLE_CERTIFICATE_PASSWORD",
  "APPLE_ID",
  "APPLE_PASSWORD",
  "APPLE_SIGNING_IDENTITY",
  "APPLE_TEAM_ID",
  "JOBSENTINEL_MACOS_NOTARY_PROFILE",
  "JOBSENTINEL_MACOS_SIGNING_IDENTITY",
  "MACOS_SIGNING_IDENTITY",
  "NOTARYTOOL_KEYCHAIN_PROFILE",
];

export function stripMacosTauriBuildSecrets(env = process.env) {
  const sanitized = { ...env };
  for (const key of sensitiveMacosTauriEnvKeys) {
    delete sanitized[key];
  }
  return sanitized;
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
  const sanitizedEnv = stripMacosTauriBuildSecrets(env);
  if (!rustupToolchainBinDir) {
    return sanitizedEnv;
  }

  return {
    ...sanitizedEnv,
    PATH: prependPathDir(sanitizedEnv.PATH, rustupToolchainBinDir),
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

function readCodesignDetails(path) {
  const result = spawnSync("codesign", ["-dv", "--verbose=4", path], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`codesign details failed for ${path}:\n${result.stderr || result.stdout}`);
  }
  return parseCodesignDetails(`${result.stdout ?? ""}${result.stderr ?? ""}`);
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

export function ensureSignedApp(appPath) {
  const identity = getSigningIdentity();

  if (verifyCodesign(appPath)) {
    if (identity !== "-") {
      assertDeveloperIdSignature(readCodesignDetails(appPath), {
        expectedTeamId: extractTeamIdFromSigningIdentity(identity),
        requireHardenedRuntime: true,
      });
    }
    console.log(`App bundle signature valid: ${appPath}`);
    return;
  }

  run("codesign", buildAppCodesignArgs(identity, appPath));

  if (!verifyCodesign(appPath, { stdio: "inherit" })) {
    throw new Error(`codesign verification failed for ${appPath}`);
  }

  if (identity !== "-") {
    assertDeveloperIdSignature(readCodesignDetails(appPath), {
      expectedTeamId: extractTeamIdFromSigningIdentity(identity),
      requireHardenedRuntime: true,
    });
  }
}

export function buildNotarytoolSubmitArgs(dmgPath, env = process.env) {
  const profile = env.JOBSENTINEL_MACOS_NOTARY_PROFILE ?? env.NOTARYTOOL_KEYCHAIN_PROFILE;
  if (hasValue(profile)) {
    return [
      "notarytool",
      "submit",
      dmgPath,
      "--keychain-profile",
      profile,
      "--output-format",
      "json",
      "--wait",
    ];
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
      "--output-format",
      "json",
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
      "--output-format",
      "json",
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

export function parseNotarytoolSubmitResult(output) {
  let result;
  try {
    result = JSON.parse(output);
  } catch {
    throw new Error("notarytool submit did not return JSON output.");
  }

  if (result.status !== "Accepted") {
    const id = result.id ? ` (${result.id})` : "";
    throw new Error(`macOS notarization was not accepted${id}: ${result.status ?? "unknown"}`);
  }

  return {
    id: result.id,
    status: result.status,
  };
}

export function buildNotarytoolLogArgs(submissionId, env = process.env) {
  const profile = env.JOBSENTINEL_MACOS_NOTARY_PROFILE ?? env.NOTARYTOOL_KEYCHAIN_PROFILE;
  if (hasValue(profile)) {
    return ["notarytool", "log", submissionId, "--keychain-profile", profile];
  }

  if (hasValue(env.APPLE_API_KEY) && hasValue(env.APPLE_API_KEY_PATH)) {
    const args = [
      "notarytool",
      "log",
      submissionId,
      "--key-id",
      env.APPLE_API_KEY,
      "--key",
      env.APPLE_API_KEY_PATH,
    ];
    if (hasValue(env.APPLE_API_ISSUER)) {
      args.push("--issuer", env.APPLE_API_ISSUER);
    }
    return args;
  }

  if (hasValue(env.APPLE_ID) && hasValue(env.APPLE_PASSWORD) && hasValue(env.APPLE_TEAM_ID)) {
    return [
      "notarytool",
      "log",
      submissionId,
      "--apple-id",
      env.APPLE_ID,
      "--password",
      "@env:APPLE_PASSWORD",
      "--team-id",
      env.APPLE_TEAM_ID,
    ];
  }

  return null;
}
