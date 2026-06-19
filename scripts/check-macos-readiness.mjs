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

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function hasAll(text, snippets) {
  const normalizedText = normalizeText(text);
  return snippets.every((snippet) => normalizedText.includes(normalizeText(snippet)));
}

function hasAny(text, snippets) {
  const normalizedText = normalizeText(text);
  return snippets.some((snippet) => normalizedText.includes(normalizeText(snippet)));
}

export function hasOrderedSnippets(text, snippets) {
  let offset = 0;

  for (const snippet of snippets) {
    const index = text.indexOf(snippet, offset);
    if (index === -1) return false;
    offset = index + snippet.length;
  }

  return true;
}

export function hasNoAccountMacosReleaseOrder(releaseWorkflow) {
  return (
    hasOrderedSnippets(releaseWorkflow, [
      "- name: Verify macOS app and DMG",
      "- name: Label no-account macOS DMG",
      "- name: Create macOS checksum",
      "- name: Remove old macOS release assets",
      "- name: Stage macOS release assets",
      "- name: Generate release SBOM",
      "- name: Attest release artifact provenance",
      "- name: Attest release artifact SBOM",
      "- name: Upload release assets",
    ]) &&
    hasOrderedSnippets(releaseWorkflow, [
      "npm run tauri:verify:macos",
      "rm -f \"$current_path.sha256\" \"$labeled_path.sha256\"",
      "shasum -a 256",
      "while IFS= read -r asset; do",
      "gh release delete-asset",
      "cp src-tauri/target/${{ matrix.target }}/release/bundle/dmg/*.dmg.sha256 release-assets/public/",
      "npm run release:sbom",
      "--require-artifacts",
      "subject-path: release-assets/public/*",
      "subject-checksums: release-assets/attestation-subjects.sha256",
      'gh release upload "$RELEASE_TAG" "${assets[@]}" --clobber',
    ]) &&
    !releaseWorkflow.includes("mapfile ") &&
    !releaseWorkflow.includes("macos_assets")
  );
}

export function releaseWorkflowBuildsUniversalMacosPackage(releaseWorkflow) {
  return (
    hasAny(releaseWorkflow, ['platform: macos-26', '"platform":"macos-26"']) &&
    hasAny(releaseWorkflow, [
      "target: universal-apple-darwin",
      '"target":"universal-apple-darwin"',
    ]) &&
    hasAll(releaseWorkflow, [
      "aarch64-apple-darwin,x86_64-apple-darwin",
      "npm run tauri:build:macos -- --target",
    ])
  );
}

function getWorkflowStepBlock(workflow, stepName) {
  const marker = `- name: ${stepName}`;
  const start = workflow.indexOf(marker);
  if (start === -1) return "";

  const rest = workflow.slice(start + marker.length);
  const nextStep = rest.search(/\n[ \t]*- name: /);
  return nextStep === -1 ? workflow.slice(start) : workflow.slice(start, start + marker.length + nextStep);
}

function getShellCommandBlock(step, command) {
  const start = step.indexOf(command);
  if (start === -1) return "";

  const rest = step.slice(start);
  const next = rest.slice(command.length).search(/\n\s*(?:gh\s+release|else\b|fi\b)/);
  return next === -1 ? rest : rest.slice(0, command.length + next);
}

export function releaseAssetUploadsStayDraft(releaseWorkflow) {
  const createRelease =
    getWorkflowStepBlock(releaseWorkflow, "Create staged release") ||
    getWorkflowStepBlock(releaseWorkflow, "Create draft release");
  const releaseEdit = getShellCommandBlock(createRelease, 'gh release edit "$RELEASE_TAG"');
  const releaseCreate = getShellCommandBlock(createRelease, 'gh release create "$RELEASE_TAG"');
  const createsDraftRelease =
    (createRelease.includes("GH_TOKEN: ${{ github.token }}") &&
      createRelease.includes("GH_REPO: ${{ github.repository }}") &&
      hasAny(createRelease, [
        "RELEASE_TAG: ${{ steps.get_version.outputs.tag }}",
        "RELEASE_TAG: ${{ steps.release_inputs.outputs.tag }}",
      ]) &&
      hasAll(releaseEdit, [
        'gh release edit "$RELEASE_TAG"',
        "--draft",
        "--prerelease=false",
        "--notes-file",
      ]) &&
      hasAll(releaseCreate, [
        'gh release create "$RELEASE_TAG"',
        "--draft",
        "--notes-file",
      ])) ||
    (() => {
      const legacyCreateRelease = getWorkflowStepBlock(releaseWorkflow, "Create Release");
      return (
        legacyCreateRelease.includes("uses: softprops/action-gh-release@") &&
        /\n\s+draft: true\b/.test(legacyCreateRelease)
      );
    })();

  const commonUpload = getWorkflowStepBlock(releaseWorkflow, "Upload release assets");
  if (commonUpload) {
    return (
      (commonUpload.includes("uses: softprops/action-gh-release@") &&
        /\n\s+draft: true\b/.test(commonUpload) &&
        commonUpload.includes("tag_name: ${{ needs.create-release.outputs.tag }}") &&
        commonUpload.includes("files: release-assets/public/*")) ||
      (createsDraftRelease &&
        hasAll(commonUpload, [
          "GH_TOKEN: ${{ github.token }}",
          "GH_REPO: ${{ github.repository }}",
          "RELEASE_TAG: ${{ needs.create-release.outputs.tag }}",
          "assets=(release-assets/public/*)",
          'gh release upload "$RELEASE_TAG" "${assets[@]}" --clobber',
        ]))
    );
  }

  return ["Upload Windows MSI", "Upload macOS DMG", "Upload Linux AppImage"].every((stepName) => {
    const step = getWorkflowStepBlock(releaseWorkflow, stepName);
    return step.includes("uses: softprops/action-gh-release@") && /\n\s+draft: true\b/.test(step);
  });
}

export function releasePublishesAfterSuccessfulUploads(releaseWorkflow) {
  const publishStep = getWorkflowStepBlock(releaseWorkflow, "Publish hosted release");
  return (
    hasAll(releaseWorkflow, ["publish-release:", "- build-release"]) &&
    hasAll(publishStep, [
      "GH_TOKEN: ${{ github.token }}",
      "GH_REPO: ${{ github.repository }}",
      "RELEASE_TAG: ${{ needs.create-release.outputs.tag }}",
      'gh release edit "$RELEASE_TAG"',
      "--draft=false",
      "--prerelease=false",
    ])
  );
}

export function windowsInstallerUploadRequiresSignatureOrUnsignedLabel(releaseWorkflow) {
  return (
    hasOrderedSnippets(releaseWorkflow, [
      "- name: Verify Windows installer signatures and checksums",
      "- name: Stage Windows release assets",
      "- name: Upload release assets",
    ]) &&
    hasAll(getWorkflowStepBlock(releaseWorkflow, "Configure Windows signing"), [
      "JOBSENTINEL_WINDOWS_REQUIRE_SIGNATURE=false",
      "JOBSENTINEL_WINDOWS_UNSIGNED=true",
      "Partial Windows signing secrets are configured",
      "JOBSENTINEL_WINDOWS_REQUIRE_SIGNATURE=true",
    ]) &&
    hasAll(getWorkflowStepBlock(releaseWorkflow, "Label unsigned Windows installers"), [
      'Kind = "Windows MSI"',
      'Kind = "Windows NSIS setup"',
      "*_unsigned.msi",
      "*_unsigned.exe",
      "Rename-Item",
      "Labeled unsigned",
    ]) &&
    hasAll(getWorkflowStepBlock(releaseWorkflow, "Verify Windows installer signatures and checksums"), [
      "Get-AuthenticodeSignature",
      "WINDOWS_REQUIRE_SIGNATURE",
      'Status -ne "Valid"',
      "*_unsigned.msi",
      "*_unsigned.exe",
      "Windows SmartScreen warnings are expected",
      "Get-FileHash",
      ".sha256",
    ]) &&
    hasAll(getWorkflowStepBlock(releaseWorkflow, "Stage Windows release assets"), [
      "Copy-Item",
      "*.msi",
      "*.msi.sha256",
      "*.exe",
      "*.exe.sha256",
      "release-assets/public/",
    ]) &&
    releaseAssetUploadsStayDraft(releaseWorkflow)
  );
}

export const windowsMsiUploadRequiresSignatureOrUnsignedLabel =
  windowsInstallerUploadRequiresSignatureOrUnsignedLabel;

export const windowsMsiUploadRequiresSignature =
  windowsInstallerUploadRequiresSignatureOrUnsignedLabel;

export function linuxPackageUploadRequiresVerification(releaseWorkflow) {
  return (
    hasOrderedSnippets(releaseWorkflow, [
      "- name: Verify Linux packages and checksums",
      "- name: Stage Linux release assets",
      "- name: Upload release assets",
    ]) &&
    hasAll(getWorkflowStepBlock(releaseWorkflow, "Verify Linux packages and checksums"), [
      "appimages=(",
      "debs=(",
      "Expected exactly one Linux AppImage",
      "Expected exactly one Linux deb",
      "EXPECTED_VERSION",
      "Linux asset filename does not include release version",
      "sha256sum",
      "dpkg-deb --info",
      "dpkg-deb --contents",
    ]) &&
    hasAll(getWorkflowStepBlock(releaseWorkflow, "Stage Linux release assets"), [
      "release-assets/public",
      "*.AppImage",
      "*.AppImage.sha256",
      "*.deb",
      "*.deb.sha256",
    ]) &&
    releaseAssetUploadsStayDraft(releaseWorkflow)
  );
}

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
  const buildScript = read(root, "scripts/build-macos-dmg.mjs");
  const packageVerifier = read(root, "scripts/verify-macos-package.mjs");
  const latestVerifier = read(root, "scripts/verify-latest-macos-release.mjs");
  const releaseDocs = read(root, "docs/developer/RELEASING.md");
  const macDocs = read(root, "docs/developer/MACOS_DEVELOPMENT.md");
  const buildTests = read(root, "scripts/build-macos-dmg.test.mjs");
  const latestVerifierTests = read(root, "scripts/verify-latest-macos-release.test.mjs");
  const packageVerifierTests = read(root, "scripts/verify-macos-package.test.mjs");

  const scripts = packageJson.scripts ?? {};
  const criteria = [
    criterion(
      "package scripts expose macOS build and verification",
      6,
      scripts["tauri:build:macos"] === "node scripts/build-macos-dmg.mjs" &&
        scripts["tauri:verify:macos"] === "node scripts/verify-macos-package.mjs" &&
        scripts["tauri:verify:macos:latest"] === "node scripts/verify-latest-macos-release.mjs" &&
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
      "Release CI must build one universal Intel plus Apple silicon DMG.",
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
      "When Apple credentials exist, CI must require signing, notarization, and Gatekeeper.",
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
