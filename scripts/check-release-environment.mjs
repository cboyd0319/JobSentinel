#!/usr/bin/env node

const windowsRequired = [
  "WINDOWS_CERTIFICATE",
  "WINDOWS_CERTIFICATE_PASSWORD",
  "WINDOWS_CERTIFICATE_THUMBPRINT",
  "WINDOWS_TIMESTAMP_URL",
];
const windowsOptional = ["WINDOWS_TSP"];

const macosSigningRequired = [
  "APPLE_CERTIFICATE",
  "APPLE_CERTIFICATE_PASSWORD",
  "APPLE_SIGNING_IDENTITY",
];
const macosAppleIdNotary = ["APPLE_ID", "APPLE_PASSWORD", "APPLE_TEAM_ID"];
const macosApiKeyNotary = ["APPLE_API_KEY", "APPLE_API_KEY_PATH", "APPLE_API_ISSUER"];
const macosNotaryFields = [...macosAppleIdNotary, ...macosApiKeyNotary];
const macosHostedProfileFields = [
  "JOBSENTINEL_MACOS_NOTARY_PROFILE",
  "NOTARYTOOL_KEYCHAIN_PROFILE",
];

function getArgValue(args, name) {
  const exactIndex = args.indexOf(name);
  if (exactIndex >= 0) return args[exactIndex + 1];

  const prefixed = args.find((arg) => arg.startsWith(`${name}=`));
  return prefixed ? prefixed.slice(name.length + 1) : undefined;
}

function hasArg(args, name) {
  return args.some((arg) => arg === name || arg.startsWith(`${name}=`));
}

function splitList(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasEnvValue(env, name) {
  return typeof env[name] === "string" && env[name].trim() !== "";
}

function presentNames(env, names) {
  return names.filter((name) => hasEnvValue(env, name));
}

function missingNames(env, names) {
  return names.filter((name) => !hasEnvValue(env, name));
}

function item(id, ok, detail, extra = {}) {
  return { detail, id, ok: Boolean(ok), ...extra };
}

export function evaluateWindowsSigning(env = process.env) {
  const present = presentNames(env, [...windowsRequired, ...windowsOptional]);
  const configured = present.length > 0;
  const missing = missingNames(env, windowsRequired);
  const invalid = [];

  if (!configured) {
    return item(
      "Windows signing",
      true,
      "no Windows signing secrets configured; unsigned MSI path is available but Windows SmartScreen warnings are expected",
      {
        configured,
        missing,
        mode: "unsigned-msi",
        smartScreenReady: false,
      },
    );
  }

  if (missing.length > 0) {
    return item(
      "Windows signing",
      false,
      `partial Windows signing configuration; missing: ${missing.join(", ")}`,
      { configured, missing, mode: "partial" },
    );
  }

  const thumbprint = env.WINDOWS_CERTIFICATE_THUMBPRINT.replace(/\s/g, "").toUpperCase();
  if (!/^[A-F0-9]{40}$/.test(thumbprint)) {
    invalid.push("WINDOWS_CERTIFICATE_THUMBPRINT must be a 40-character SHA-1 thumbprint");
  }

  if (!/^https?:\/\//i.test(env.WINDOWS_TIMESTAMP_URL.trim())) {
    invalid.push("WINDOWS_TIMESTAMP_URL must be an HTTP(S) timestamp service URL");
  }

  if (
    hasEnvValue(env, "WINDOWS_TSP") &&
    !/^(?:true|false)$/i.test(env.WINDOWS_TSP.trim())
  ) {
    invalid.push("WINDOWS_TSP must be true or false when set");
  }

  return item(
    "Windows signing",
    invalid.length === 0,
    invalid.length > 0
      ? invalid.join("; ")
      : "configured for Authenticode-signed MSI upload; value shapes are valid",
      {
        configured,
        invalid,
        missing: [],
        mode: invalid.length === 0 ? "signed-msi" : "invalid",
        smartScreenReady: invalid.length === 0,
      },
  );
}

export function evaluateMacosSigning(env = process.env) {
  const profileFields = presentNames(env, macosHostedProfileFields);
  const signingPresent = presentNames(env, macosSigningRequired);
  const signingMissing = missingNames(env, macosSigningRequired);
  const notaryPresent = presentNames(env, macosNotaryFields);
  const appleIdMissing = missingNames(env, macosAppleIdNotary);
  const apiKeyMissing = missingNames(env, macosApiKeyNotary);
  const appleIdReady = appleIdMissing.length === 0;
  const apiKeyReady = apiKeyMissing.length === 0;
  const invalid = [];

  if (profileFields.length > 0) {
    return item(
      "macOS signing",
      false,
      `hosted release runners cannot use local notarytool profile fields: ${profileFields.join(", ")}`,
      { gatekeeperReady: false, mode: "invalid-profile", profileFields },
    );
  }

  if (signingPresent.length === 0 && notaryPresent.length === 0) {
    return item(
      "macOS signing",
      true,
      "no Apple Developer secrets configured; no-account DMG path is available but not Gatekeeper-ready",
      { gatekeeperReady: false, mode: "no-account" },
    );
  }

  if (signingMissing.length > 0) {
    return item(
      "macOS signing",
      false,
      `partial macOS signing configuration; missing: ${signingMissing.join(", ")}`,
      { gatekeeperReady: false, missing: signingMissing, mode: "partial-signing" },
    );
  }

  if (!appleIdReady && !apiKeyReady) {
    const detail =
      notaryPresent.length > 0
        ? `partial notarization configuration; missing Apple ID set: ${appleIdMissing.join(", ")}; missing API key set: ${apiKeyMissing.join(", ")}`
        : "Developer ID signing is configured, but no complete notarization auth set is available";
    return item("macOS signing", false, detail, {
      gatekeeperReady: false,
      missing: [...new Set([...appleIdMissing, ...apiKeyMissing])],
      mode: "partial-notarization",
    });
  }

  if (appleIdReady && !/^[A-Z0-9]{10}$/.test(env.APPLE_TEAM_ID.trim())) {
    invalid.push("APPLE_TEAM_ID must be a 10-character Apple team id");
  }

  if (
    apiKeyReady &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      env.APPLE_API_ISSUER.trim(),
    )
  ) {
    invalid.push("APPLE_API_ISSUER must be a UUID");
  }

  const notaryMode = appleIdReady ? "Apple ID notarization" : "App Store Connect API key notarization";
  return item(
    "macOS signing",
    invalid.length === 0,
    invalid.length > 0
      ? invalid.join("; ")
      : `configured for Developer ID signing and ${notaryMode}`,
    {
      gatekeeperReady: invalid.length === 0,
      invalid,
      mode: invalid.length === 0 ? "gatekeeper" : "invalid",
      notaryMode,
    },
  );
}

function dedupeFailures(failures) {
  const seen = new Set();
  return failures.filter((failure) => {
    const key = `${failure.id}\0${failure.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function evaluateReleaseEnvironment({
  env = process.env,
  platforms = ["windows", "macos", "linux"],
  requireMacosGatekeeper = false,
  requireWindowsSigning = false,
} = {}) {
  const platformSet = new Set(platforms);
  const checks = [];
  const failures = [];

  if (platformSet.has("windows")) {
    const windows = evaluateWindowsSigning(env);
    checks.push(windows);
    if (windows.configured && !windows.ok) failures.push(windows);
    if (requireWindowsSigning && windows.mode !== "signed-msi") {
      failures.push(
        item(
          "Windows signing required",
          false,
          "complete Authenticode signing inputs are required for a signed Windows MSI release",
        ),
      );
    }
  }

  if (platformSet.has("macos")) {
    const macos = evaluateMacosSigning(env);
    checks.push(macos);
    if (!macos.ok) failures.push(macos);
    if (requireMacosGatekeeper && !macos.gatekeeperReady) {
      failures.push(
        item(
          "macOS Gatekeeper required",
          false,
          "Developer ID signing plus complete notarization credentials are required for a Gatekeeper-ready public macOS asset",
        ),
      );
    }
  }

  if (platformSet.has("linux")) {
    checks.push(
      item(
        "Linux packaging",
        true,
        "no signing secrets required; AppImage, deb, checksums, SBOMs, and attestations are still release-gated",
        { mode: "package-verification" },
      ),
    );
  }

  return {
    checks,
    failures: dedupeFailures(failures),
    platforms: [...platformSet],
  };
}

export function formatReleaseEnvironmentReport(report) {
  const lines = [
    `JobSentinel release environment: ${report.failures.length === 0 ? "PASS" : "FAIL"}`,
  ];

  for (const check of report.checks) {
    lines.push(`${check.ok ? "PASS" : "INFO"} ${check.id}: ${check.detail}`);
  }

  for (const failure of report.failures) {
    lines.push(`FAIL ${failure.id}: ${failure.detail}`);
  }

  return lines.join("\n");
}

export function parseArgs(args) {
  return {
    platforms: splitList(getArgValue(args, "--platforms") ?? "windows,macos,linux"),
    requireMacosGatekeeper: hasArg(args, "--require-macos-gatekeeper"),
    requireWindowsSigning:
      hasArg(args, "--require-windows-signing") || hasArg(args, "--require-windows"),
  };
}

if (process.argv[1] && process.argv[1].endsWith("check-release-environment.mjs")) {
  const report = evaluateReleaseEnvironment(parseArgs(process.argv.slice(2)));
  console.log(formatReleaseEnvironmentReport(report));
  if (report.failures.length > 0) {
    process.exitCode = 1;
  }
}
