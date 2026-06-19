import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateMacosSigning,
  evaluateReleaseEnvironment,
  evaluateWindowsSigning,
  formatReleaseEnvironmentReport,
  parseArgs,
} from "./check-release-environment.mjs";

const validWindowsEnv = {
  WINDOWS_CERTIFICATE: "base64",
  WINDOWS_CERTIFICATE_PASSWORD: "password",
  WINDOWS_CERTIFICATE_THUMBPRINT: "A".repeat(40),
  WINDOWS_TIMESTAMP_URL: "https://timestamp.example.invalid",
};

const validMacosAppleIdEnv = {
  APPLE_CERTIFICATE: "base64",
  APPLE_CERTIFICATE_PASSWORD: "password",
  APPLE_SIGNING_IDENTITY: "Developer ID Application: Example (TEAMID12345)",
  APPLE_ID: "developer@example.invalid",
  APPLE_PASSWORD: "app-specific-password",
  APPLE_TEAM_ID: "TEAMID1234",
};

const validMacosApiKeyEnv = {
  APPLE_CERTIFICATE: "base64",
  APPLE_CERTIFICATE_PASSWORD: "password",
  APPLE_SIGNING_IDENTITY: "Developer ID Application: Example (TEAMID12345)",
  APPLE_API_KEY: "ABC123DEFG",
  APPLE_API_KEY_PATH: "raw-p8-key-contents-placeholder",
  APPLE_API_ISSUER: "12345678-1234-1234-1234-123456789abc",
};

test("release environment accepts no-secret local no-account posture by default", () => {
  const report = evaluateReleaseEnvironment({ env: {} });

  assert.equal(report.failures.length, 0);
  assert.match(formatReleaseEnvironmentReport(report), /release environment: PASS/);
  assert.match(formatReleaseEnvironmentReport(report), /no-account DMG path is available/);
});

test("release environment can require Windows signing", () => {
  const report = evaluateReleaseEnvironment({ env: {}, requireWindows: true });

  assert.deepEqual(
    report.failures.map((failure) => failure.id),
    ["Windows MSI required"],
  );
});

test("Windows signing accepts complete value shapes", () => {
  const check = evaluateWindowsSigning({ ...validWindowsEnv, WINDOWS_TSP: "true" });

  assert.equal(check.ok, true);
  assert.equal(check.mode, "signed-msi");
});

test("Windows signing rejects partial or malformed configuration", () => {
  assert.match(evaluateWindowsSigning({ WINDOWS_CERTIFICATE: "base64" }).detail, /partial/);
  assert.match(
    evaluateWindowsSigning({
      ...validWindowsEnv,
      WINDOWS_CERTIFICATE_THUMBPRINT: "not-a-thumbprint",
    }).detail,
    /40-character SHA-1/,
  );
  assert.match(
    evaluateWindowsSigning({
      ...validWindowsEnv,
      WINDOWS_TIMESTAMP_URL: "ftp://timestamp.example.invalid",
    }).detail,
    /HTTP\(S\)/,
  );
});

test("macOS signing accepts no-account and complete notarization modes", () => {
  const noAccount = evaluateMacosSigning({});
  const appleId = evaluateMacosSigning(validMacosAppleIdEnv);
  const apiKey = evaluateMacosSigning(validMacosApiKeyEnv);

  assert.equal(noAccount.ok, true);
  assert.equal(noAccount.gatekeeperReady, false);
  assert.equal(appleId.gatekeeperReady, true);
  assert.equal(apiKey.gatekeeperReady, true);
});

test("macOS signing rejects partial hosted release secrets", () => {
  assert.match(
    evaluateMacosSigning({
      APPLE_CERTIFICATE: "base64",
      APPLE_CERTIFICATE_PASSWORD: "password",
    }).detail,
    /partial macOS signing/,
  );
  assert.match(
    evaluateMacosSigning({
      ...validMacosAppleIdEnv,
      APPLE_TEAM_ID: "bad",
    }).detail,
    /APPLE_TEAM_ID/,
  );
  assert.match(
    evaluateMacosSigning({
      JOBSENTINEL_MACOS_NOTARY_PROFILE: "local-profile",
    }).detail,
    /cannot use local notarytool profile/,
  );
});

test("release environment can require Gatekeeper-ready macOS credentials", () => {
  const blocked = evaluateReleaseEnvironment({ env: {}, requireMacosGatekeeper: true });
  const ready = evaluateReleaseEnvironment({
    env: validMacosApiKeyEnv,
    requireMacosGatekeeper: true,
  });

  assert.deepEqual(
    blocked.failures.map((failure) => failure.id),
    ["macOS Gatekeeper required"],
  );
  assert.equal(ready.failures.length, 0);
});

test("release environment parses scoped release checks", () => {
  assert.deepEqual(parseArgs(["--platforms", "macos,linux", "--require-macos-gatekeeper"]), {
    platforms: ["macos", "linux"],
    requireMacosGatekeeper: true,
    requireWindows: false,
  });
  assert.deepEqual(parseArgs(["--platforms=windows", "--require-windows"]), {
    platforms: ["windows"],
    requireMacosGatekeeper: false,
    requireWindows: true,
  });
});
