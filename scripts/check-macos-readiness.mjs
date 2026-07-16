#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const noAccountReadinessCeiling = 94;

function read(root, path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(root, path) {
  return JSON.parse(read(root, path));
}

function readAll(root, paths) {
  return paths.map((path) => read(root, path)).join("\n");
}

import { hasAll, hasAny } from "./release/macos-readiness-text.mjs";
import {
  hasNoAccountMacosReleaseOrder,
  linuxPackageUploadRequiresVerification,
  releaseAssetUploadsStayDraft,
  releasePublishesAfterSuccessfulUploads,
  releaseWorkflowBuildsUniversalMacosPackage,
  windowsInstallerUploadRequiresSignatureOrUnsignedLabel,
} from "./release/macos-readiness-workflow.mjs";

export {
  hasNoAccountMacosReleaseOrder,
  hasOrderedSnippets,
  linuxPackageUploadRequiresVerification,
  releaseAssetUploadsStayDraft,
  releasePublishesAfterSuccessfulUploads,
  releaseWorkflowBuildsUniversalMacosPackage,
  windowsInstallerUploadRequiresSignatureOrUnsignedLabel,
} from "./release/macos-readiness-workflow.mjs";

function criterion(id, points, ok, detail) {
  return {
    detail,
    id,
    ok: Boolean(ok),
    points,
  };
}

export function hasDeveloperIdInputs(env = process.env) {
  return (
    Boolean(env.APPLE_CERTIFICATE?.trim()) &&
    Boolean(env.APPLE_CERTIFICATE_PASSWORD?.trim()) &&
    Boolean(env.APPLE_SIGNING_IDENTITY?.trim())
  );
}

export function hasNotarizationInputs(env = process.env) {
  const hasAppleIdAuth =
    Boolean(env.APPLE_ID?.trim()) &&
    Boolean(env.APPLE_PASSWORD?.trim()) &&
    Boolean(env.APPLE_TEAM_ID?.trim());
  const hasApiKeyAuth =
    Boolean(env.APPLE_API_KEY?.trim()) &&
    Boolean(env.APPLE_API_KEY_PATH?.trim()) &&
    Boolean(env.APPLE_API_ISSUER?.trim());

  return hasAppleIdAuth || hasApiKeyAuth;
}

export function evaluateMacosReadiness({ root = defaultRoot, env = process.env } = {}) {
  const packageJson = readJson(root, "package.json");
  const tauriConfig = readJson(root, "src-tauri/tauri.conf.json");
  const readme = read(root, "README.md");
  const releaseWorkflow = read(root, ".github/workflows/release.yml");
  const verifyWorkflow = read(root, ".github/workflows/verify-release-artifacts.yml");
  const buildScript = readAll(root, [
    "scripts/platform/build-macos-dmg.mjs",
    "scripts/platform/macos-signing.mjs",
  ]);
  const packageVerifier = readAll(root, [
    "scripts/release/verify-macos-package.mjs",
    "scripts/release/macos-package-contract.mjs",
  ]);
  const latestVerifier = read(root, "scripts/release/verify-latest-macos-release.mjs");
  const releaseDocs = read(root, "docs/developer/RELEASING.md");
  const macDocs = read(root, "docs/developer/MACOS_DEVELOPMENT.md");
  const buildTests = read(root, "scripts/tests/build-macos-dmg.test.mjs");
  const latestVerifierTests = read(root, "scripts/tests/verify-latest-macos-release.test.mjs");
  const packageVerifierTests = read(root, "scripts/tests/verify-macos-package.test.mjs");

  const scripts = packageJson.scripts ?? {};
  const criteria = [
    criterion(
      "package scripts expose macOS build and verification",
      6,
      scripts["tauri:build:macos"] === "node scripts/platform/build-macos-dmg.mjs" &&
        scripts["tauri:verify:macos"] === "node scripts/release/verify-macos-package.mjs" &&
        scripts["tauri:verify:macos:latest"] === "node scripts/release/verify-latest-macos-release.mjs" &&
        scripts["macos:readiness"] === "node scripts/check-macos-readiness.mjs",
      "Repo must expose maintained local, public, and readiness checks.",
    ),
    criterion(
      "Tauri macOS bundle metadata is release-ready",
      7,
      tauriConfig.productName === "JobSentinel" &&
        tauriConfig.identifier === "com.jobsentinel.main" &&
        tauriConfig.version === packageJson.version &&
        tauriConfig.bundle?.macOS?.hardenedRuntime === true &&
        tauriConfig.bundle?.macOS?.minimumSystemVersion === "13.0" &&
        (tauriConfig.bundle?.targets ?? []).includes("dmg") &&
        (tauriConfig.bundle?.targets ?? []).includes("app"),
      "Bundle id, version, hardened runtime, minimum OS, app, and DMG targets must stay aligned.",
    ),
    criterion(
      "release workflow builds universal macOS package",
      8,
      releaseWorkflowBuildsUniversalMacosPackage(releaseWorkflow),
      "Hosted release automation must build one universal Intel plus Apple silicon DMG.",
    ),
    criterion(
      "release workflow enforces no-account artifact identity",
      10,
      hasAll(releaseWorkflow, [
        "JOBSENTINEL_MACOS_NO_ACCOUNT=true",
        "JOBSENTINEL_MACOS_REQUIRE_GATEKEEPER=false",
        "JOBSENTINEL_MACOS_NOTARIZE_DMG=false",
        "_no-account_",
        "Create macOS checksum",
        ".dmg.sha256",
      ]) &&
        hasNoAccountMacosReleaseOrder(releaseWorkflow) &&
        releaseAssetUploadsStayDraft(releaseWorkflow) &&
        releasePublishesAfterSuccessfulUploads(releaseWorkflow),
      "No-account releases must be verified, labeled, re-checksummed, uploaded while staged, and published only after all platform uploads succeed.",
    ),
    criterion(
      "release workflow keeps Developer ID path strict",
      7,
      hasAll(releaseWorkflow, [
        "APPLE_CERTIFICATE",
        "APPLE_CERTIFICATE_PASSWORD",
        "APPLE_SIGNING_IDENTITY",
        "APPLE_ID",
        "APPLE_PASSWORD",
        "APPLE_TEAM_ID",
        "APPLE_API_KEY",
        "APPLE_API_KEY_PATH",
        "APPLE_API_ISSUER",
        "materialized_api_key_path",
        "GitHub macOS release runners cannot use a pre-existing notarytool keychain profile",
        "JOBSENTINEL_MACOS_REQUIRE_GATEKEEPER=true",
        "--require-gatekeeper",
      ]),
      "When Apple credentials exist, hosted release automation must require signing, notarization, and Gatekeeper.",
    ),
    criterion(
      "local DMG builder signs, notarizes, staples, and checksums",
      10,
      hasAll(buildScript, [
        "buildAppCodesignArgs",
        "--options",
        "runtime",
        "--timestamp",
        "buildDmgCodesignArgs",
        "notarytool",
        "stapler",
        "validate",
        "formatDmgChecksum",
        "assertDeveloperIdSignature",
        "parseNotarytoolSubmitResult",
        "buildNotarytoolLogArgs",
        "noAccountDmgArtifactName",
        "JOBSENTINEL_MACOS_NO_ACCOUNT",
        "stripMacosTauriBuildSecrets",
      ]),
      "Builder must support both no-account ad-hoc output and future Developer ID release output.",
    ),
    criterion(
      "local package verifier covers install, launch, data, checksum, metadata, and Gatekeeper",
      12,
      hasAll(packageVerifier, [
        "buildCgWindowSmokeScript",
        "CGWindowListCopyWindowInfo",
        "verifyLocalDmgChecksum",
        "verifyBundleMetadata",
        "parseLipoArchitectures",
        "codesign",
        "gatekeeperAssess",
        "parseCodesignDetails",
        "buildStaplerValidateArgs",
        "smokeLaunch",
        "verifyInstalledApp",
        "macosSmokeDataPaths",
        "smokeDataPermissionTargets",
        "smokeDataPermissionViolations",
        "Visible window smoke passed",
        "Local data permissions smoke passed",
        "app data tree is private",
      ]),
      "Verifier must prove package behavior beyond file existence.",
    ),
    criterion(
      "public macOS verifier checks downloaded GitHub artifact",
      9,
      hasAll(latestVerifier, [
        "findMacosDmgAsset",
        "findChecksumAsset",
        "validateMacosAssetLabel",
        "requireNoAccountLabel",
        "verifyMacosPackage",
        "expectedArchitectures",
        "expectedVersion",
        "Multiple macOS DMG assets",
      ]),
      "Published artifact must be verified after upload, not only local build output.",
    ),
    criterion(
      "published release workflow verifies public macOS artifact",
      7,
      hasAll(verifyWorkflow, [
        "Verify public macOS DMG",
        "runs-on: macos-26",
        "require_gatekeeper",
        "npm run tauri:verify:macos:latest",
      ]),
      "Public release verification must run from a clean macOS runner.",
    ),
    criterion(
      "tests cover macOS signing and verifier gates",
      8,
      hasAll(buildTests, ["uses hardened runtime", "timestamps Developer ID disk image", "requires accepted notarization JSON"]) &&
        hasAll(latestVerifierTests, ["defaults to no-account public checks", "checks no-account asset labels"]) &&
        hasAll(packageVerifierTests, [
          "optional and required Gatekeeper rejection",
          "validates required bundle metadata",
          "rejects non-Developer-ID signatures",
          "visible window evidence",
        ]),
      "Script tests must cover no-account and future signed-release paths.",
    ),
    criterion(
      "README and release docs avoid macOS overclaiming",
      10,
      hasAll(readme, [
        "no-account",
        "not Developer ID signed",
        "not notarized",
        "first-open Privacy & Security approval",
      ]) &&
        hasAll(releaseDocs, [
          "zero-friction public macOS DMG cannot",
          "Do not publish a Mac package without its checksum",
          "--require-gatekeeper",
        ]) &&
        hasAll(macDocs, [
          "Gatekeeper rejection remains expected",
          "Apple Developer Account",
          "npm run tauri:verify:macos:latest",
        ]),
      "Front-door docs must tell nontechnical users where friction remains.",
    ),
    criterion(
      "Windows installer public upload is signed or unsigned-labeled",
      0,
      windowsInstallerUploadRequiresSignatureOrUnsignedLabel(releaseWorkflow),
      "Windows MSI and NSIS setup artifacts must be signed or explicitly unsigned-labeled, versioned, and checksummed before public upload.",
    ),
    criterion(
      "Linux public upload is package-verified and checksummed",
      0,
      linuxPackageUploadRequiresVerification(releaseWorkflow),
      "Linux AppImage and deb artifacts must be exact-version, non-empty, structurally verified, and checksummed before public upload.",
    ),
  ];

  const externalBlockers = [
    criterion(
      "Apple Developer Program account and Developer ID certificate",
      2,
      hasDeveloperIdInputs(env),
      "Needed for public Developer ID signing.",
    ),
    criterion(
      "Apple notarization credentials",
      2,
      hasNotarizationInputs(env),
      "Needed to submit the public DMG to Apple's notary service.",
    ),
    criterion(
      "Gatekeeper-required signed public artifact proof",
      2,
      hasDeveloperIdInputs(env) && hasNotarizationInputs(env) && hasAny(readme, ["Gatekeeper acceptance"]),
      "Needed before claiming zero-friction public macOS distribution.",
    ),
  ];

  const noAccountScore = criteria.reduce((total, item) => total + (item.ok ? item.points : 0), 0);
  const externalScore = externalBlockers.reduce(
    (total, item) => total + (item.ok ? item.points : 0),
    0,
  );
  const percentage = Math.min(100, noAccountScore + externalScore);

  return {
    criteria,
    externalBlockers,
    noAccountCeiling: noAccountReadinessCeiling,
    noAccountScore,
    percentage,
  };
}

export function readReadmeMacosReadinessPercent(root = defaultRoot) {
  const text = read(root, "README.md");
  const match =
    text.match(/Current macOS full-public-readiness:\s*(\d+)%/) ??
    text.match(/Current macOS no-account release-readiness:\s*(\d+)%/);
  return match ? Number(match[1]) : null;
}

export function readMacosDevelopmentReadinessClaims(root = defaultRoot) {
  const text = read(root, "docs/developer/MACOS_DEVELOPMENT.md");
  const fullPublicMatch = text.match(/Current macOS full-public-readiness is\s*(\d+)%/);
  const noAccountCompletionMatch = text.match(/no-account path completion is\s*(\d+)%/);
  const staleNoAccountMatch = text.match(/Current no-account release-readiness is\s*(\d+)%/);

  return {
    fullPublicPercent: fullPublicMatch ? Number(fullPublicMatch[1]) : null,
    noAccountCompletionPercent: noAccountCompletionMatch
      ? Number(noAccountCompletionMatch[1])
      : null,
    staleNoAccountReleaseReadinessPercent: staleNoAccountMatch
      ? Number(staleNoAccountMatch[1])
      : null,
  };
}

export function noAccountCompletionPercentage(report) {
  if (!report.noAccountCeiling) {
    return 0;
  }

  return Math.round((report.noAccountScore / report.noAccountCeiling) * 100);
}

export function formatMacosReadinessReport(report) {
  const failed = report.criteria.filter((item) => !item.ok);
  const blocked = report.externalBlockers.filter((item) => !item.ok);
  const lines = [
    `macOS full-public readiness: ${report.percentage}%`,
    `No-account path completion: ${noAccountCompletionPercentage(report)}%`,
    `No-account ceiling: ${report.noAccountCeiling}%`,
    `No-account score: ${report.noAccountScore}/${report.noAccountCeiling}`,
  ];

  if (failed.length > 0) {
    lines.push("Failed no-account checks:");
    for (const item of failed) {
      lines.push(`- ${item.id} (${item.points}): ${item.detail}`);
    }
  }

  if (blocked.length > 0) {
    lines.push("External blockers:");
    for (const item of blocked) {
      lines.push(`- ${item.id} (${item.points}): ${item.detail}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

export function assertMacosReadinessDocsMatch(report, root = defaultRoot) {
  const readmePercent = readReadmeMacosReadinessPercent(root);

  if (readmePercent !== report.percentage) {
    throw new Error(
      `README macOS readiness percentage is ${readmePercent ?? "missing"}, expected ${report.percentage}.`,
    );
  }

  const macDocsClaims = readMacosDevelopmentReadinessClaims(root);
  const expectedNoAccountCompletion = noAccountCompletionPercentage(report);

  if (macDocsClaims.staleNoAccountReleaseReadinessPercent !== null) {
    throw new Error(
      "docs/developer/MACOS_DEVELOPMENT.md still uses stale no-account release-readiness wording.",
    );
  }

  if (macDocsClaims.fullPublicPercent !== report.percentage) {
    throw new Error(
      `docs/developer/MACOS_DEVELOPMENT.md full-public readiness is ${macDocsClaims.fullPublicPercent ?? "missing"}, expected ${report.percentage}.`,
    );
  }

  if (macDocsClaims.noAccountCompletionPercent !== expectedNoAccountCompletion) {
    throw new Error(
      `docs/developer/MACOS_DEVELOPMENT.md no-account completion is ${macDocsClaims.noAccountCompletionPercent ?? "missing"}, expected ${expectedNoAccountCompletion}.`,
    );
  }
}

export function main({ root = defaultRoot } = {}) {
  const report = evaluateMacosReadiness({ root });

  process.stdout.write(formatMacosReadinessReport(report));

  assertMacosReadinessDocsMatch(report, root);

  const failed = report.criteria.filter((item) => !item.ok);
  if (failed.length > 0) {
    throw new Error("macOS no-account readiness checks failed.");
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
