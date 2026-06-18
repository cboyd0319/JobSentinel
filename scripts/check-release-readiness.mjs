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
  windowsMsiUploadRequiresSignature,
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
    macosReport: evaluateMacosReadiness({ root, env }),
    packageJson,
    readme: read(root, "README.md"),
    releaseDocs: read(root, "docs/developer/RELEASING.md"),
    releaseWorkflow: read(root, ".github/workflows/release.yml"),
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
      "release scripts expose readiness and public verification",
      inputs.packageJson.scripts?.["release:readiness"] ===
        "node scripts/check-release-readiness.mjs" &&
        inputs.packageJson.scripts?.["release:verify:public"] ===
          "node scripts/verify-public-release-assets.mjs" &&
        inputs.packageJson.scripts?.["macos:readiness"] ===
          "node scripts/check-macos-readiness.mjs",
      "Release readiness, public asset, and macOS readiness scripts must stay discoverable.",
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
      "release preflight gates run before draft creation",
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
      "Draft release creation must wait for harness, frontend, Rust, and split security preflights.",
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
      "Windows public upload is signature and checksum gated",
      windowsMsiUploadRequiresSignature(inputs.releaseWorkflow),
      "Unsigned or unchecksummed MSI artifacts must fail before upload.",
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
        "--require-supply-chain",
        "npm run tauri:verify:macos:latest",
        "attestations: read",
      ]) &&
        hasAll(inputs.verifyPublicScript, [
          "findAgentSkillsArchiveAssets",
          "validateExactAgentSkillsAssetSet",
          "Public Agent Skills archives verified.",
        ]),
      "Published releases must verify platform assets, skills archives, checksums, SBOMs, and attestations.",
    ),
    criterion(
      "release workflow generates SBOMs and attestations",
      hasAll(inputs.releaseWorkflow, [
        "npm run release:sbom",
        "--require-artifacts",
        "actions/attest@",
        "subject-path: release-assets/public/*",
        "subject-checksums: release-assets/attestation-subjects.sha256",
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
      "front-door docs do not overclaim public 2.9.0 assets",
      hasAll(inputs.readme, [
        "fresh public Windows and Linux `2.9.0` assets are still pending",
        "not Developer ID signed",
        "not notarized",
        "first-open Privacy & Security approval",
      ]) &&
        hasAll(inputs.releaseDocs, [
          "Do not publish a macOS package as zero-friction or Gatekeeper-ready",
          "Public Windows MSI upload is blocked unless",
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
        status: "public asset pending; MSI upload is Authenticode and checksum gated",
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
