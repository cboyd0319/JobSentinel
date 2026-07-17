#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { checkExternalAiGatewayBoundary, checkResumeHtmlSinkBoundary } from "./security/ai-html-boundaries.mjs";
import { checkBrowserAutomationBoundary } from "./security/automation-boundaries.mjs";
import {
  checkBrowserExtensionManifestBoundary,
  checkTauriCapabilityBoundary,
  checkWorkflowInstallBoundary,
} from "./security/permission-boundaries.mjs";
import { checkRendererCspBoundary as checkTauriRendererCsp } from "./security/renderer-csp.mjs";
import { checkWorkflowRunExpressionBoundary } from "./security/workflow-boundaries.mjs";
import {
  agentInstructionFilePatterns,
  allowedAgentInstructionFiles,
  ciDocsChecks,
  ciWorkflowChecks,
  credentialPassiveProbeFiles,
  credentialUiGateFiles,
  dependabotGovernanceChecks,
  forbiddenRendererConnectHosts,
  forbiddenWorkflowTriggers,
  ignoredAgentInstructionPathParts,
  notificationProviderPaths,
  publicReleaseVerifierChecks,
  publishedReleaseWorkflowChecks,
  releaseCacheMarkers,
  releasePreflightChecks,
  releaseWorkflowChecks,
  requiredCodeowner,
  requiredCodeownersEntries,
  requiredMatrixEntries,
  requiredSecurityDocs,
} from "./security-sensors/policy.mjs";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function repoPath(root, path) {
  return join(root, path);
}

function readIfExists(root, path, violations) {
  const fullPath = repoPath(root, path);
  if (!existsSync(fullPath)) {
    violations.push(`missing file required for security sensor check: ${path}`);
    return "";
  }
  return readFileSync(fullPath, "utf8");
}

function hostedCiEnabled(root) {
  const path = repoPath(root, "scripts/harness/contracts/harness.json");
  if (!existsSync(path)) return true;
  try {
    return JSON.parse(readFileSync(path, "utf8"))?.hosted_workflows?.ci_enabled !== false;
  } catch {
    return true;
  }
}

function includesAll(text, phrases) {
  return phrases.every((phrase) => text.includes(phrase));
}

function workflowPaths(root) {
  const dir = repoPath(root, ".github/workflows");
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((file) => [".yml", ".yaml"].includes(extname(file)))
    .map((file) => `.github/workflows/${file}`)
    .sort();
}

function releaseWorkflowPaths(root) {
  return workflowPaths(root).filter(
    (path) =>
      path === ".github/workflows/release.yml" ||
      path.startsWith(".github/workflows/release-"),
  );
}

function countMatches(text, pattern) {
  return text.match(pattern)?.length ?? 0;
}

function checkWorkflowSecurityBaseline(root, violations) {
  for (const path of workflowPaths(root)) {
    const text = readIfExists(root, path, violations);
    checkWorkflowInstallBoundary(path, text, violations);
    checkWorkflowRunExpressionBoundary(path, text, violations);

    if (!/(?:^|\n)permissions:\s*\{\}\s*(?:\n|$)/.test(text)) {
      violations.push(
        `${path} must disable default workflow token permissions with top-level permissions: {}`,
      );
    }
    for (const trigger of forbiddenWorkflowTriggers) {
      if (text.includes(trigger)) {
        violations.push(`${path} must not use privileged or chained trigger: ${trigger}`);
      }
    }

    const checkoutCount = countMatches(text, /\buses:\s*actions\/checkout@/g);
    const guardCount = countMatches(text, /\bpersist-credentials:\s*false\b/g);
    if (checkoutCount > guardCount) {
      violations.push(`${path} checkout steps must set persist-credentials: false`);
    }
  }
}

function checkSetupNodeCacheDisabled(path, text, violations) {
  const setupNodeCount = countMatches(text, /\buses:\s*actions\/setup-node@/g);
  const disabledCount = countMatches(text, /\bpackage-manager-cache:\s*false\b/g);
  if (setupNodeCount > disabledCount) {
    violations.push(`${path} setup-node steps must set package-manager-cache: false`);
  }
}

function checkNotificationEgressBoundary(root, violations) {
  const notifyDir = "crates/jobsentinel-notifications/src";
  if (!existsSync(repoPath(root, notifyDir))) return;

  const notifyMod = readIfExists(root, `${notifyDir}/lib.rs`, violations);
  const network = readIfExists(root, "crates/jobsentinel-network/src/lib.rs", violations);
  if (
    !includesAll(network, [
      "resolve_external_https_url_for_fetch",
      "redirect(reqwest::redirect::Policy::none())",
      "resolve_to_addrs",
      "post_external_https_json",
    ]) ||
    !notifyMod.includes(
      "NOTIFICATION_HTTP_TIMEOUT",
    )
  ) {
    violations.push(
      "notification HTTP egress must resolve HTTPS destinations, pin checked DNS answers, disable redirects, and use a timeout",
    );
  }

  for (const path of notificationProviderPaths) {
    if (!existsSync(repoPath(root, path))) continue;
    const provider = readIfExists(root, path, violations);
    if (
      /\breqwest::Client::(?:builder|new)\s*\(/.test(provider) ||
      !provider.includes("jobsentinel_network::post_external_https_json")
    ) {
      violations.push(
        `${path} must use jobsentinel_network::post_external_https_json instead of raw HTTP clients`,
      );
    }
  }
}

function checkPhrasePolicies(text, policies, message, violations) {
  for (const policy of policies) {
    if (!includesAll(text, policy.phrases)) violations.push(`${message}: ${policy.label}`);
  }
}

function codeownersLastOwnersForPattern(text, pattern) {
  let owners = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const [entryPattern, ...entryOwners] = trimmed.split(/\s+/);
    if (entryPattern === pattern) owners = entryOwners;
  }
  return owners;
}

function checkCodeownersBoundary(root, violations) {
  const text = readIfExists(root, ".github/CODEOWNERS", violations);
  for (const pattern of requiredCodeownersEntries) {
    if (!codeownersLastOwnersForPattern(text, pattern).includes(requiredCodeowner)) {
      violations.push(
        `CODEOWNERS is missing owner review boundary for ${pattern}: ${requiredCodeowner}`,
      );
    }
  }
}

function workflowJobBlock(text, jobName) {
  const match = String(text ?? "").match(
    new RegExp(`(?:^|\\n)  ${jobName}:\\n([\\s\\S]*?)(?=\\n  [A-Za-z0-9_-]+:\\n|\\s*$)`),
  );
  return match?.[1] ?? "";
}

function normalizePath(path) {
  return path.split(/[\\/]/).join("/");
}

function shouldSkipAgentInstructionPath(path) {
  return normalizePath(path)
    .split("/")
    .some((part) => ignoredAgentInstructionPathParts.has(part));
}

function collectAgentInstructionCandidates(root, dir = root, prefix = "") {
  const files = [];
  if (!existsSync(dir)) return files;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (shouldSkipAgentInstructionPath(rel)) continue;

    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectAgentInstructionCandidates(root, fullPath, rel));
    } else if (
      entry.isFile() &&
      agentInstructionFilePatterns.some((pattern) => pattern.test(rel))
    ) {
      files.push(rel);
    }
  }
  return files.sort();
}

function checkAgentInstructionFileBoundary(root, violations) {
  for (const path of collectAgentInstructionCandidates(root)) {
    if (!allowedAgentInstructionFiles.has(path)) {
      violations.push(
        `unexpected persistent agent instruction file must be reviewed and added to the harness allowlist: ${path}`,
      );
    }
  }
}

function checkRendererAssetBoundary(root, violations) {
  const css = readIfExists(root, "src/index.css", violations);
  const patterns = [
    ["remote CSS import", /@import\s+(?:url\s*\(\s*)?["']?(?:https?:)?\/\//i],
    ["Google Fonts host", /fonts\.(?:googleapis|gstatic)\.com/i],
  ];
  for (const [label, pattern] of patterns) {
    if (pattern.test(css)) {
      violations.push(`src/index.css must not load external renderer assets: ${label}`);
    }
  }
}

export function formatSecuritySensorSummary({ ciEnabled = true } = {}) {
  return [
    "Security sensors:",
    `docs=${requiredSecurityDocs.length}`,
    `matrix=${requiredMatrixEntries.length}`,
    "workflow=5",
    `release-workflow=${releaseWorkflowChecks.length}`,
    `release-preflight=${releasePreflightChecks.length}`,
    `published-release-workflow=${publishedReleaseWorkflowChecks.length}`,
    `public-release-verifier=${publicReleaseVerifierChecks.length}`,
    ciEnabled ? `ci=${ciWorkflowChecks.length}` : "ci=disabled-by-pre-alpha-private-no-ci",
    `ci-docs=${ciDocsChecks.length}`,
    `dependabot=${dependabotGovernanceChecks.length}`,
    `codeowners=${requiredCodeownersEntries.length}`,
    "agent-instructions=1 browser-automation=1 browser-extension=1",
    "tauri-capabilities=1 notification-egress=1 renderer-csp=1 renderer-assets=1",
    "credential-ui=2 external-ai=1 resume-html-sinks=1",
  ].join(" ");
}

export function checkSecuritySensors(root = defaultRoot) {
  const violations = [];
  const ciEnabled = hostedCiEnabled(root);

  for (const path of requiredSecurityDocs) {
    if (!existsSync(repoPath(root, path))) {
      violations.push(`missing required security doc: ${path}`);
    }
  }

  const verificationMatrix = readIfExists(
    root,
    "docs/harness/verification-matrix.md",
    violations,
  );
  checkPhrasePolicies(
    verificationMatrix,
    requiredMatrixEntries,
    "verification matrix is missing security sensor entry",
    violations,
  );

  checkWorkflowSecurityBaseline(root, violations);
  const dependabotConfig = readIfExists(root, ".github/dependabot.yml", violations);
  checkPhrasePolicies(
    dependabotConfig,
    dependabotGovernanceChecks,
    "Dependabot config is missing supply-chain update governance",
    violations,
  );
  checkCodeownersBoundary(root, violations);
  checkAgentInstructionFileBoundary(root, violations);
  checkBrowserAutomationBoundary(root, violations);
  checkBrowserExtensionManifestBoundary(root, violations);
  checkTauriCapabilityBoundary(root, violations);
  checkRendererAssetBoundary(root, violations);
  checkExternalAiGatewayBoundary(root, violations);
  checkResumeHtmlSinkBoundary(root, violations);
  checkNotificationEgressBoundary(root, violations);

  if (ciEnabled) {
    const ciWorkflow = readIfExists(root, ".github/workflows/ci.yml", violations);
    checkPhrasePolicies(
      ciWorkflow,
      ciWorkflowChecks,
      "CI workflow is missing security gate",
      violations,
    );
  }

  const releaseWorkflowPath = ".github/workflows/release.yml";
  const releaseWorkflow = readIfExists(root, releaseWorkflowPath, violations);
  const releasePaths = [...new Set([releaseWorkflowPath, ...releaseWorkflowPaths(root)])];
  const releaseWorkflowSurface = releasePaths
    .map((path) =>
      path === releaseWorkflowPath
        ? releaseWorkflow
        : readIfExists(root, path, violations),
    )
    .join("\n");
  if (releaseCacheMarkers.some((marker) => releaseWorkflowSurface.includes(marker))) {
    violations.push(
      "release workflow must not restore dependency caches before publishing artifacts",
    );
  }
  for (const path of releasePaths) {
    checkSetupNodeCacheDisabled(
      path,
      path === releaseWorkflowPath
        ? releaseWorkflow
        : readIfExists(root, path, violations),
      violations,
    );
  }
  checkPhrasePolicies(
    releaseWorkflowSurface,
    releaseWorkflowChecks,
    "release workflow is missing package gate",
    violations,
  );

  const preflightJob = [
    "release-inputs",
    "preflight-harness",
    "preflight-frontend",
    "preflight-rust",
    "preflight-security-node",
    "preflight-security-rust",
  ]
    .map((jobName) => workflowJobBlock(releaseWorkflow, jobName))
    .join("\n");
  checkPhrasePolicies(
    preflightJob,
    releasePreflightChecks,
    "release workflow preflight is missing gate",
    violations,
  );

  const buildReleaseJob = workflowJobBlock(releaseWorkflow, "build-release");
  if (
    !includesAll(buildReleaseJob, [
      "artifact-metadata: write",
      "attestations: write",
      "contents: write",
      "id-token: write",
    ])
  ) {
    violations.push("release workflow build-release job is missing attestation permissions");
  }

  const publicWorkflowPath = ".github/workflows/verify-release-artifacts.yml";
  const publicWorkflow = readIfExists(root, publicWorkflowPath, violations);
  checkSetupNodeCacheDisabled(publicWorkflowPath, publicWorkflow, violations);
  checkPhrasePolicies(
    publicWorkflow,
    publishedReleaseWorkflowChecks,
    "published release workflow is missing public artifact gate",
    violations,
  );

  const publicVerifier = readIfExists(
    root,
    "scripts/release/verify-public-release-assets.mjs",
    violations,
  );
  checkPhrasePolicies(
    publicVerifier,
    publicReleaseVerifierChecks,
    "public release verifier is missing artifact gate",
    violations,
  );

  const ciDocs = readIfExists(root, "docs/developer/CI_CD.md", violations);
  checkPhrasePolicies(
    ciDocs,
    ciDocsChecks,
    "CI/CD docs are missing security gate",
    violations,
  );

  const tauriConfigText = readIfExists(root, "src-tauri/tauri.conf.json", violations);
  try {
    const csp = JSON.parse(tauriConfigText)?.app?.security?.csp;
    checkTauriRendererCsp(csp, violations);
    for (const host of forbiddenRendererConnectHosts) {
      if (typeof csp === "string" && csp.includes(host)) {
        violations.push(`Tauri renderer CSP must not allow external connect host: ${host}`);
      }
    }
  } catch {
    violations.push("src-tauri/tauri.conf.json must be valid JSON for security sensor check");
  }

  const settingsCredentialsPath = join(
    root,
    "src/features/settings/credentials/SettingsCredentials.ts",
  );
  const settingsCredentialValidation = `${readIfExists(root, "src/features/settings/config/SettingsConfig.ts", violations)}\n${existsSync(settingsCredentialsPath) ? readFileSync(settingsCredentialsPath, "utf8") : ""}`;
  if (
    !settingsCredentialValidation.includes("state: CredentialStatusState") ||
    !settingsCredentialValidation.includes(
      'credentialExists(credentialStatus, "telegram_bot_token")',
    ) ||
    !settingsCredentialValidation.includes(
      'credentialExists(credentialStatus, "usajobs_api_key")',
    )
  ) {
    violations.push(
      "settings credential validation must use explicit credential states and confirmed saved-secret checks",
    );
  }

  for (const path of credentialUiGateFiles) {
    if (/\bcredentialMayExist\b/.test(readIfExists(root, path, violations))) {
      violations.push(
        `${path} must not use passive expected credential state for save, test, or enable gating`,
      );
    }
  }
  for (const path of credentialPassiveProbeFiles) {
    if (/\b(?:get_credential_status|has_credential)\b/.test(readIfExists(root, path, violations))) {
      violations.push(
        `${path} must not call secure-storage probe commands during passive Settings load`,
      );
    }
  }
  return violations;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.argv[2] ? resolve(process.argv[2]) : defaultRoot;
  const violations = checkSecuritySensors(root);
  if (violations.length > 0) {
    console.error("Security sensor check failed:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exit(1);
  }
  console.log("Security sensor check passed.");
  console.log(formatSecuritySensorSummary({ ciEnabled: hostedCiEnabled(root) }));
}
