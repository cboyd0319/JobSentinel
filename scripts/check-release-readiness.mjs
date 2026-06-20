#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  compareReleaseVersions,
  normalizeReleaseVersion,
  readReleaseVersions,
} from "./validate-release-version.mjs";
import {
  evaluateMacosReadiness,
  linuxPackageUploadRequiresVerification,
  noAccountCompletionPercentage,
  windowsInstallerUploadRequiresSignatureOrUnsignedLabel,
} from "./check-macos-readiness.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");

function read(root, path) {
  return readFileSync(join(root, path), "utf8");
}

function readJson(root, path) {
  return JSON.parse(read(root, path));
}

function hasAll(text, snippets) {
  return snippets.every((snippet) => String(text ?? "").includes(snippet));
}

function getArgValue(args, name) {
  const exactIndex = args.indexOf(name);
  if (exactIndex >= 0) return args[exactIndex + 1];

  const prefixed = args.find((arg) => arg.startsWith(`${name}=`));
  return prefixed ? prefixed.slice(name.length + 1) : undefined;
}

function criterion(id, ok, detail) {
  return { detail, id, ok: Boolean(ok) };
}

export function loadReleaseReadinessInputs({
  root = defaultRoot,
  version,
  env = process.env,
} = {}) {
  const packageJson = readJson(root, "package.json");

  return {
    expectedVersion: normalizeReleaseVersion(version ?? packageJson.version),
    ciDocs: read(root, "docs/developer/CI_CD.md"),
    macosReport: evaluateMacosReadiness({ root, env }),
    packageJson,
    readme: read(root, "README.md"),
    releaseDocs: read(root, "docs/developer/RELEASING.md"),
    releaseWorkflow: read(root, ".github/workflows/release.yml"),
    tauriConfig: readJson(root, "src-tauri/tauri.conf.json"),
    verifyPublicScript: read(root, "scripts/verify-public-release-assets.mjs"),
    verifyWorkflow: read(root, ".github/workflows/verify-release-artifacts.yml"),
    versions: readReleaseVersions(root),
  };
}

export function evaluateReleaseReadinessFromInputs(inputs) {
  const versionCheck = compareReleaseVersions(inputs.expectedVersion, inputs.versions);
  const macosNoAccountComplete =
    inputs.macosReport.noAccountScore === inputs.macosReport.noAccountCeiling &&
    noAccountCompletionPercentage(inputs.macosReport) === 100;

  const criteria = [
    criterion(
      "release metadata matches expected version",
      versionCheck.failures.length === 0,
      versionCheck.failures.join("; ") || "package, Tauri, and Cargo metadata match.",
    ),
    criterion(
      "release scripts expose environment, readiness, and public verification",
      inputs.packageJson.scripts?.["release:readiness"] ===
        "node scripts/check-release-readiness.mjs" &&
        inputs.packageJson.scripts?.["release:check-env"] ===
          "node scripts/check-release-environment.mjs" &&
        inputs.packageJson.scripts?.["release:verify:public"] ===
          "node scripts/verify-public-release-assets.mjs" &&
        inputs.packageJson.scripts?.["macos:readiness"] ===
          "node scripts/check-macos-readiness.mjs",
      "Release environment, readiness, public asset, and macOS readiness scripts must stay discoverable.",
    ),
    criterion(
      "release workflow targets all supported platforms",
      hasAll(inputs.releaseWorkflow, [
        '"platform":"windows-2025"',
        '"target":"x86_64-pc-windows-msvc"',
        '"platform":"macos-26"',
        '"target":"universal-apple-darwin"',
        '"platform":"ubuntu-24.04"',
        '"target":"x86_64-unknown-linux-gnu"',
      ]),
      "Release matrix must include Windows 2025, macOS 26, and Ubuntu 24.04 targets.",
    ),
    criterion(
      "release preflight gates run before staged creation",
      hasAll(inputs.releaseWorkflow, [
        "npm run release:readiness",
        "preflight-harness:",
        "preflight-frontend:",
        "preflight-rust:",
        "preflight-security-node:",
        "preflight-security-rust:",
        "- preflight-harness",
        "- preflight-frontend",
        "- preflight-rust",
        "- preflight-security-node",
        "- preflight-security-rust",
      ]),
      "Staged release creation must wait for harness, frontend, Rust, and split security preflights.",
    ),
    criterion(
      "release preflight blocks security scanners",
      hasAll(inputs.releaseWorkflow, [
        "npm run lint:security",
        "zizmorcore/zizmor-action@",
        "npm audit --audit-level=moderate",
        "cargo install cargo-deny --version 0.19.9 --locked",
        "cargo deny check advisories bans licenses sources",
      ]),
      "Release preflight must block on security sensors, workflow static analysis, npm audit, and cargo-deny.",
    ),
    criterion(
      "Windows public upload is signed or unsigned-labeled and checksum gated",
      Array.isArray(inputs.tauriConfig.bundle?.targets) &&
        inputs.tauriConfig.bundle.targets.includes("msi") &&
        inputs.tauriConfig.bundle.targets.includes("nsis") &&
        windowsInstallerUploadRequiresSignatureOrUnsignedLabel(inputs.releaseWorkflow),
      "Windows MSI and NSIS setup artifacts must be signed or explicitly unsigned-labeled, versioned, and checksummed before upload.",
    ),
    criterion(
      "Linux public upload is package and checksum gated",
      linuxPackageUploadRequiresVerification(inputs.releaseWorkflow),
      "AppImage and deb artifacts must be exact-version, non-empty, structurally verified, and checksummed.",
    ),
    criterion(
      "macOS no-account release path remains complete",
      macosNoAccountComplete,
      "No-account macOS package path must stay complete while Apple credentials remain external blockers.",
    ),
    criterion(
      "public release verifier covers installers and supply chain",
      hasAll(inputs.verifyWorkflow, [
        "npm run release:verify:public",
        "--require-windows-unsigned-label",
        "--require-supply-chain",
        "npm run tauri:verify:macos:latest",
        "attestations: read",
      ]) &&
      hasAll(inputs.verifyPublicScript, [
        "validateWindowsUnsignedAssetLabel",
        "findAgentSkillsArchiveAssets",
        "validateAgentSkillsArchiveContents",
        "validateExactAgentSkillsAssetSet",
        'windows: [{ extension: ".msi" }, { extension: ".exe" }]',
        "Public Agent Skills archives verified.",
      ]),
      "Published releases must verify platform assets, skills archive contents, checksums, SBOMs, and attestations.",
    ),
    criterion(
      "release workflow generates SBOMs and attestations",
      hasAll(inputs.releaseWorkflow, [
        "npm run release:sbom",
        "--require-artifacts",
        "actions/attest@",
        "subject-path: release-assets/public/*",
        "release-assets/public/*.exe",
        "release-assets/public/*.deb",
        "sbom-path: release-assets/public/JobSentinel-",
      ]),
      "Release assets must have SPDX SBOMs plus provenance and SBOM attestations.",
    ),
    criterion(
      "release workflow publishes downloadable Agent Skills",
      hasAll(inputs.releaseWorkflow, [
        "package-agent-skills:",
        "npm run release:skills",
        "Agent Skills archives",
        "subject-path: release-assets/public/JobSentinel-${{ needs.create-release.outputs.version }}-agent-skills.tar.gz",
        "subject-path: release-assets/public/JobSentinel-${{ needs.create-release.outputs.version }}-agent-skills.zip",
        "JobSentinel-$RELEASE_VERSION-agent-skills.tar.gz.sha256",
        "JobSentinel-$RELEASE_VERSION-agent-skills.zip.sha256",
        "gh release upload \"$RELEASE_TAG\" \"${assets[@]}\" --clobber",
      ]),
      "Release workflow must upload validated, attested Agent Skills tar.gz and ZIP archives.",
    ),
    criterion(
      "Agent Skills download docs stay Windows-portable",
      hasAll(inputs.readme, [
        "Agent Skills downloads are separate from the desktop installer.",
        "JobSentinel-X.Y.Z-agent-skills.tar.gz",
        "JobSentinel-X.Y.Z-agent-skills.zip",
        "Use the ZIP archive on Windows",
        "matching `.sha256` checksums",
      ]) &&
        hasAll(inputs.releaseDocs, [
          "Upload `JobSentinel-X.Y.Z-agent-skills.tar.gz`,",
          "`JobSentinel-X.Y.Z-agent-skills.zip`, and both `.sha256` sidecars.",
        ]) &&
        hasAll(inputs.ciDocs, [
          "both downloadable Agent Skills archives",
          "JobSentinel-X.Y.Z-agent-skills.tar.gz",
          "JobSentinel-X.Y.Z-agent-skills.zip",
          "Windows-friendly extraction",
          "Agent Skills tar.gz/ZIP archives",
        ]),
      "Docs must name both Agent Skills archive formats and prefer ZIP for Windows extraction.",
    ),
    criterion(
      "front-door docs cover public release asset limits",
      hasAll(inputs.readme, [
        "Use the [latest GitHub release]",
        "verify the matching `.sha256` checksum",
        "Windows 11+ | Use the `.msi` or setup `.exe`.",
        "_unsigned",
        "Use the `_no-account_universal.dmg`",
        "not Developer ID signed and not notarized",
        "first-open Privacy & Security approval",
        "Use the `.AppImage` or `.deb`",
        "Agent Skills downloads are separate from the desktop installer.",
        "Current macOS full-public-readiness: 94%",
      ]) &&
        hasAll(inputs.releaseDocs, [
          "Do not publish a macOS package as zero-friction or Gatekeeper-ready",
          "Public Windows MSI and NSIS setup upload is signed",
          "Windows signing secrets",
          "Public Linux upload is blocked unless",
        ]),
      "Docs must distinguish source readiness from pending public assets and external signing blockers.",
    ),
  ];

  return {
    criteria,
    expectedVersion: versionCheck.expected,
    externalBlockers: inputs.macosReport.externalBlockers.filter((item) => !item.ok),
    platforms: [
      {
        name: "Windows",
        status: "public asset pending; MSI and NSIS setup uploads are signed or explicitly unsigned-labeled and checksum gated",
      },
      {
        name: "macOS",
        status: "no-account package path complete; Developer ID/Gatekeeper path externally blocked",
      },
      {
        name: "Linux",
        status: "public assets pending; AppImage/deb upload is package and checksum gated",
      },
    ],
  };
}

export function evaluateReleaseReadiness(options = {}) {
  return evaluateReleaseReadinessFromInputs(loadReleaseReadinessInputs(options));
}

export function formatReleaseReadinessReport(report) {
  const failed = report.criteria.filter((item) => !item.ok);
  const lines = [
    `JobSentinel release readiness: ${failed.length === 0 ? "PASS" : "FAIL"}`,
    `Expected version: ${report.expectedVersion}`,
  ];

  for (const item of report.criteria) {
    lines.push(`${item.ok ? "PASS" : "FAIL"} ${item.id}: ${item.detail}`);
  }

  for (const platform of report.platforms) {
    lines.push(`INFO ${platform.name}: ${platform.status}`);
  }

  for (const blocker of report.externalBlockers) {
    lines.push(`INFO external blocker: ${blocker.id} - ${blocker.detail}`);
  }

  return lines.join("\n");
}

export function parseArgs(args) {
  return {
    version: getArgValue(args, "--version") ?? getArgValue(args, "--tag"),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) {
  const options = parseArgs(process.argv.slice(2));
  const report = evaluateReleaseReadiness(options);
  console.log(formatReleaseReadinessReport(report));

  if (report.criteria.some((item) => !item.ok)) {
    process.exitCode = 1;
  }
}
