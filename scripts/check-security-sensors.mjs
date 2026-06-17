#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");

const requiredSecurityDocs = [
  "docs/security/README.md",
  "docs/security/KEYRING.md",
  "docs/security/XSS_PREVENTION.md",
  "docs/security/URL_VALIDATION.md",
  "docs/security/COMMAND_EXECUTION.md",
  "docs/security/WEBHOOK_SECURITY.md",
];

const forbiddenRendererConnectHosts = [
  "https://hooks.slack.com",
  "https://discord.com",
  "https://outlook.office.com",
  "https://boards.greenhouse.io",
  "https://boards-api.greenhouse.io",
  "https://jobs.lever.co",
  "https://api.lever.co",
  "https://api.jobswithgpt.com",
];

const requiredMatrixEntries = [
  {
    label: "input validation",
    phrases: ["URL, file path, command, or HTML input", "Unit tests for malicious input"],
  },
  {
    label: "credential handling",
    phrases: ["Credential handling", "Keyring behavior check and no plaintext path"],
  },
  {
    label: "external network destination",
    phrases: ["External network destination", "Privacy docs update and explicit user configuration"],
  },
  {
    label: "browser automation",
    phrases: ["Browser automation", "Human-in-the-loop submit behavior preserved"],
  },
  {
    label: "scraper behavior",
    phrases: ["Scraper behavior", "Rate limit and error handling tests"],
  },
];

const ciWorkflowChecks = [
  {
    label: "security job",
    phrases: ["jobs:", "security:"],
  },
  {
    label: "npm audit",
    phrases: ["npm audit --audit-level=moderate"],
  },
  {
    label: "cargo deny advisories",
    phrases: ["cargo deny check advisories"],
  },
];

const releaseWorkflowChecks = [
  {
    label: "macOS Gatekeeper gate",
    phrases: ["npm run tauri:verify:macos", "--require-gatekeeper"],
  },
  {
    label: "macOS launch smoke gate",
    phrases: ["npm run tauri:verify:macos", "--launch-smoke"],
  },
  {
    label: "macOS installed app smoke gate",
    phrases: ["npm run tauri:verify:macos", "--install-smoke"],
  },
  {
    label: "macOS checksum sidecar gate",
    phrases: ["npm run tauri:verify:macos", "--require-checksum"],
  },
  {
    label: "macOS bundle metadata gate",
    phrases: [
      "--expected-bundle-id",
      "com.jobsentinel.main",
      "--expected-product-name",
      "JobSentinel",
      "--expected-version",
      "--expected-icon-file",
      "icon.icns",
      "--expected-minimum-system-version",
      "13.0",
    ],
  },
  {
    label: "macOS no-account asset label",
    phrases: ["JOBSENTINEL_MACOS_NO_ACCOUNT", "_no-account_"],
  },
];

const publishedReleaseWorkflowChecks = [
  {
    label: "published release trigger",
    phrases: ["release:", "published"],
  },
  {
    label: "manual release trigger",
    phrases: ["workflow_dispatch:", "tag:"],
  },
  {
    label: "public macOS artifact verifier",
    phrases: ["macos-26", "npm run tauri:verify:macos:latest"],
  },
  {
    label: "scoped release tag",
    phrases: ["RELEASE_TAG", "DISPATCH_TAG", "--tag"],
  },
];

const credentialUiGateFiles = [
  "src/pages/SettingsNotificationsSection.tsx",
  "src/pages/SettingsJobSourcesSection.tsx",
];

const credentialPassiveProbeFiles = [
  "src/pages/Settings.tsx",
  "src/pages/useSettingsCredentials.ts",
  "src/pages/SettingsNotificationsSection.tsx",
  "src/pages/SettingsJobSourcesSection.tsx",
];

const ciDocsChecks = [
  {
    label: "npm audit",
    phrases: ["npm audit --audit-level=moderate"],
  },
  {
    label: "cargo deny advisories",
    phrases: ["cargo deny check advisories"],
  },
];

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

function includesAll(text, phrases) {
  return phrases.every((phrase) => text.includes(phrase));
}

export function formatSecuritySensorSummary() {
  return [
    "Security sensors:",
    `docs=${requiredSecurityDocs.length}`,
    `matrix=${requiredMatrixEntries.length}`,
    "workflow=1",
    `release-workflow=${releaseWorkflowChecks.length}`,
    `published-release-workflow=${publishedReleaseWorkflowChecks.length}`,
    "ci=2",
    `ci-docs=${ciDocsChecks.length}`,
    "renderer-csp=1",
    "credential-ui=2",
  ].join(" ");
}

export function checkSecuritySensors(root = defaultRoot) {
  const violations = [];

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

  for (const entry of requiredMatrixEntries) {
    if (!includesAll(verificationMatrix, entry.phrases)) {
      violations.push(`verification matrix is missing security sensor entry: ${entry.label}`);
    }
  }

  const ciWorkflow = readIfExists(root, ".github/workflows/ci.yml", violations);

  for (const check of ciWorkflowChecks) {
    if (!includesAll(ciWorkflow, check.phrases)) {
      violations.push(`CI workflow is missing security gate: ${check.label}`);
    }
  }

  const releaseWorkflow = readIfExists(root, ".github/workflows/release.yml", violations);

  for (const check of releaseWorkflowChecks) {
    if (!includesAll(releaseWorkflow, check.phrases)) {
      violations.push(`release workflow is missing macOS package gate: ${check.label}`);
    }
  }

  const publishedReleaseWorkflow = readIfExists(
    root,
    ".github/workflows/verify-release-artifacts.yml",
    violations,
  );

  for (const check of publishedReleaseWorkflowChecks) {
    if (!includesAll(publishedReleaseWorkflow, check.phrases)) {
      violations.push(
        `published release workflow is missing public artifact gate: ${check.label}`,
      );
    }
  }

  const ciDocs = readIfExists(root, "docs/developer/CI_CD.md", violations);

  for (const check of ciDocsChecks) {
    if (!includesAll(ciDocs, check.phrases)) {
      violations.push(`CI/CD docs are missing security gate: ${check.label}`);
    }
  }

  const tauriConfigText = readIfExists(root, "src-tauri/tauri.conf.json", violations);
  try {
    const tauriConfig = JSON.parse(tauriConfigText);
    const csp = tauriConfig?.app?.security?.csp;
    if (typeof csp !== "string" || !csp.includes("connect-src 'self'")) {
      violations.push("Tauri renderer CSP must keep connect-src restricted to self");
    }

    for (const host of forbiddenRendererConnectHosts) {
      if (typeof csp === "string" && csp.includes(host)) {
        violations.push(`Tauri renderer CSP must not allow external connect host: ${host}`);
      }
    }
  } catch {
    violations.push("src-tauri/tauri.conf.json must be valid JSON for security sensor check");
  }

  const settingsConfig = readIfExists(root, "src/pages/SettingsConfig.ts", violations);
  if (
    !settingsConfig.includes('state: CredentialStatusState') ||
    !settingsConfig.includes('credentialExists(credentialStatus, "telegram_bot_token")') ||
    !settingsConfig.includes('credentialExists(credentialStatus, "usajobs_api_key")')
  ) {
    violations.push(
      "settings credential validation must use explicit credential states and confirmed saved-secret checks",
    );
  }

  for (const path of credentialUiGateFiles) {
    const text = readIfExists(root, path, violations);
    if (/\bcredentialMayExist\b/.test(text)) {
      violations.push(
        `${path} must not use passive expected credential state for save, test, or enable gating`,
      );
    }
  }

  for (const path of credentialPassiveProbeFiles) {
    const text = readIfExists(root, path, violations);
    if (/\b(?:get_credential_status|has_credential)\b/.test(text)) {
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
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log("Security sensor check passed.");
  console.log(formatSecuritySensorSummary());
}
