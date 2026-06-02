import assert from "node:assert/strict";
import test from "node:test";
import {
  bundleMetadataViolations,
  defaultArchitectures,
  formatGatekeeperStatus,
  hasExpectedArchitectures,
  macosSmokeDataPaths,
  parseArgs,
  parseLipoArchitectures,
} from "./verify-macos-package.mjs";

test("macOS verifier parses positional and flagged DMG arguments", () => {
  assert.deepEqual(parseArgs(["build.dmg"], "arm64"), {
    appName: "JobSentinel.app",
    dmgPath: "build.dmg",
    expectedBundleMetadata: {
      bundleIdentifier: undefined,
      iconFile: undefined,
      minimumSystemVersion: undefined,
      productName: undefined,
      version: undefined,
    },
    expectedArchitectures: ["arm64"],
    installSmoke: false,
    launchSmoke: false,
    requireGatekeeper: false,
    smokeSeconds: 12,
  });

  assert.deepEqual(
    parseArgs([
      "--dmg",
      "universal.dmg",
      "--expected-architectures",
      "x86_64,arm64",
      "--expected-bundle-id",
      "com.jobsentinel.main",
      "--expected-product-name",
      "JobSentinel",
      "--expected-version",
      "2.6.4",
      "--expected-icon-file",
      "icon.icns",
      "--expected-minimum-system-version",
      "13.0",
      "--launch-smoke",
      "--smoke-seconds",
      "3",
      "--install-smoke",
      "--require-gatekeeper",
    ], "x64"),
    {
      appName: "JobSentinel.app",
      dmgPath: "universal.dmg",
      expectedBundleMetadata: {
        bundleIdentifier: "com.jobsentinel.main",
        iconFile: "icon.icns",
        minimumSystemVersion: "13.0",
        productName: "JobSentinel",
        version: "2.6.4",
      },
      expectedArchitectures: ["x86_64", "arm64"],
      installSmoke: true,
      launchSmoke: true,
      requireGatekeeper: true,
      smokeSeconds: 3,
    },
  );
});

test("macOS verifier maps local Node architectures to Mach-O architectures", () => {
  assert.deepEqual(defaultArchitectures("arm64"), ["arm64"]);
  assert.deepEqual(defaultArchitectures("x64"), ["x86_64"]);
});

test("macOS verifier parses lipo output for universal and thin binaries", () => {
  assert.deepEqual(
    parseLipoArchitectures("Architectures in the fat file: JobSentinel are: x86_64 arm64\n"),
    ["x86_64", "arm64"],
  );
  assert.deepEqual(
    parseLipoArchitectures("Non-fat file: JobSentinel is architecture: arm64\n"),
    ["arm64"],
  );
});

test("macOS verifier checks required architectures as a subset", () => {
  assert.equal(hasExpectedArchitectures(["x86_64", "arm64"], ["arm64"]), true);
  assert.equal(hasExpectedArchitectures(["arm64"], ["x86_64", "arm64"]), false);
});

test("macOS verifier distinguishes optional and required Gatekeeper rejection", () => {
  assert.equal(
    formatGatekeeperStatus({
      accepted: true,
      requireGatekeeper: true,
      subject: "JobSentinel.app",
    }),
    "Gatekeeper accepted: JobSentinel.app",
  );
  assert.match(
    formatGatekeeperStatus({
      accepted: false,
      requireGatekeeper: false,
      subject: "JobSentinel.app",
    }),
    /Developer ID signing and notarization/,
  );
  assert.equal(
    formatGatekeeperStatus({
      accepted: false,
      requireGatekeeper: true,
      subject: "JobSentinel.app",
    }),
    "Gatekeeper rejected required public release artifact: JobSentinel.app",
  );
});

test("macOS verifier resolves launch smoke data paths under isolated home", () => {
  assert.deepEqual(macosSmokeDataPaths("/tmp/jobsentinel-smoke-home"), {
    dataDir: "/tmp/jobsentinel-smoke-home/Library/Application Support/JobSentinel",
    dbPath: "/tmp/jobsentinel-smoke-home/Library/Application Support/JobSentinel/jobs.db",
  });
});

test("macOS verifier validates required bundle metadata and expected identity", () => {
  const metadata = {
    bundleIdentifier: "com.jobsentinel.main",
    bundleName: "JobSentinel",
    bundleVersion: "2.6.4",
    displayName: "JobSentinel",
    executable: "jobsentinel",
    iconFile: "icon.icns",
    iconResourceExists: true,
    minimumSystemVersion: "13.0",
    shortVersion: "2.6.4",
  };

  assert.deepEqual(
    bundleMetadataViolations(metadata, {
      bundleIdentifier: "com.jobsentinel.main",
      iconFile: "icon.icns",
      minimumSystemVersion: "13.0",
      productName: "JobSentinel",
      version: "2.6.4",
    }),
    [],
  );

  assert.deepEqual(
    bundleMetadataViolations(
      { ...metadata, bundleIdentifier: "", displayName: "Other", shortVersion: "2.6.3" },
      {
        bundleIdentifier: "com.jobsentinel.main",
        iconFile: "icon.icns",
        minimumSystemVersion: "13.0",
        productName: "JobSentinel",
        version: "2.6.4",
      },
    ),
    [
      "CFBundleIdentifier is missing or empty",
      "CFBundleIdentifier expected com.jobsentinel.main, found (empty)",
      "CFBundleDisplayName expected JobSentinel, found Other",
      "CFBundleShortVersionString expected 2.6.4, found 2.6.3",
    ],
  );

  assert.deepEqual(
    bundleMetadataViolations(
      { ...metadata, minimumSystemVersion: "10.13" },
      { minimumSystemVersion: "13.0" },
    ),
    ["LSMinimumSystemVersion expected 13.0, found 10.13"],
  );

  assert.deepEqual(bundleMetadataViolations({ ...metadata, iconResourceExists: false }), [
    "CFBundleIconFile resource missing from Contents/Resources: icon.icns",
  ]);
});
