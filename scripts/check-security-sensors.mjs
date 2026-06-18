#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  checkBrowserExtensionManifestBoundary,
  checkTauriCapabilityBoundary,
} from "./security/permission-boundaries.mjs";

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
    label: "browser extension manifest",
    phrases: [
      "Browser extension manifest",
      "least-privilege manifest review",
      "no broad host permissions",
    ],
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
    label: "scheduled security drift trigger",
    phrases: ["schedule:", "cron:"],
  },
  {
    label: "scheduled security drift selection",
    phrases: [
      '"$event" = "schedule"',
      "frontend=false",
      "harness=true",
      "rust=false",
      "security=true",
    ],
  },
  {
    label: "security sensors",
    phrases: ["npm run lint:security"],
  },
  {
    label: "npm audit",
    phrases: ["npm audit --audit-level=moderate"],
  },
  {
    label: "cargo deny supply-chain policy",
    phrases: ["cargo deny check advisories bans licenses sources"],
  },
  {
    label: "latest stable drift check",
    phrases: ["npm run release:check-deps"],
  },
];

const forbiddenWorkflowTriggers = [
  "pull_request_target:",
  "workflow_run:",
  "issue_comment:",
];

const releaseCacheMarkers = [
  "actions/cache@",
  "Swatinem/rust-cache@",
  "cache: \"npm\"",
  "cache: npm",
];

const releaseWorkflowChecks = [
  {
    label: "parallel release preflight",
    phrases: [
      "release-inputs:",
      "preflight-harness:",
      "preflight-frontend:",
      "preflight-rust:",
      "preflight-security:",
      "- preflight-harness",
      "- preflight-frontend",
      "- preflight-rust",
      "- preflight-security",
    ],
  },
  {
    label: "release environment gate",
    phrases: ["environment:", "name: release"],
  },
  {
    label: "release version output guard",
    phrases: [
      "[[ ! \"$version\" =~ ^[0-9]+\\.[0-9]+\\.[0-9]+$ ]]",
      "Release version must be an exact stable semver",
    ],
  },
  {
    label: "release tag ref guard",
    phrases: [
      'expected_ref="refs/tags/v${version}"',
      'if [ "${GITHUB_REF:-}" != "$expected_ref" ]; then',
      "Manual release dispatch must run from",
      "Select the existing release tag as the workflow ref",
    ],
  },
  {
    label: "release setup-node cache disabled",
    phrases: ["actions/setup-node@", "package-manager-cache: false"],
  },
  {
    label: "release creation through GitHub CLI",
    phrases: ["gh release create", "gh release edit", "notes-file"],
  },
  {
    label: "macOS keychain password mask",
    phrases: ['keychain_password="$(openssl rand -hex 24)"', "::add-mask::"],
  },
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
  {
    label: "release attestation permissions",
    phrases: ["artifact-metadata: write", "attestations: write", "id-token: write"],
  },
  {
    label: "release SBOM generation",
    phrases: ["npm run release:sbom", "--require-artifacts", "attestation-subjects.sha256"],
  },
  {
    label: "release upload through GitHub CLI",
    phrases: ["gh release upload", "--clobber"],
  },
  {
    label: "release provenance attestation",
    phrases: ["actions/attest@", "subject-path: release-assets/public/*"],
  },
  {
    label: "release SBOM attestation",
    phrases: [
      "subject-checksums: release-assets/attestation-subjects.sha256",
      "sbom-path: release-assets/public/JobSentinel-",
    ],
  },
];

const releasePreflightChecks = [
  {
    label: "release metadata validation",
    phrases: ["npm run release:check-version"],
  },
  {
    label: "harness checks",
    phrases: ["npm run harness:check"],
  },
  {
    label: "latest stable dependency pins",
    phrases: ["npm run release:check-deps"],
  },
  {
    label: "harness script tests",
    phrases: ["npm run test:scripts"],
  },
  {
    label: "markdown lint",
    phrases: ["npm run lint:md"],
  },
  {
    label: "frontend lint",
    phrases: ["npm run lint"],
  },
  {
    label: "frontend unit tests",
    phrases: ["npm test -- --run"],
  },
  {
    label: "npm audit",
    phrases: ["npm audit --audit-level=moderate"],
  },
  {
    label: "cargo deny supply-chain policy",
    phrases: [
      "cargo install cargo-deny --version 0.19.9 --locked",
      "cargo deny check advisories bans licenses sources",
    ],
  },
  {
    label: "Rust formatting",
    phrases: ["cargo fmt --all -- --check"],
  },
  {
    label: "Rust clippy",
    phrases: ["cargo clippy -- -D warnings"],
  },
  {
    label: "Rust tests",
    phrases: ["cargo test --lib"],
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
  {
    label: "public supply-chain verifier",
    phrases: ["attestations: read", "--require-supply-chain"],
  },
  {
    label: "public setup-node cache disabled",
    phrases: ["actions/setup-node@", "package-manager-cache: false"],
  },
];

const publicReleaseVerifierChecks = [
  {
    label: "exact public installer asset set",
    phrases: [
      "validateExactPublicInstallerAssetSet",
      "selectedPlatformAssetExtensions",
      "stale or unexpected installer assets",
    ],
  },
];

const requiredCodeownersEntries = [
  "*",
  ".github/CODEOWNERS",
  ".github/dependabot.yml",
  ".github/workflows/",
  "package.json",
  "package-lock.json",
  "scripts/check-action-pins.mjs",
  "scripts/check-dependency-pins.mjs",
  "scripts/check-security-sensors.mjs",
  "scripts/check-security-sensors.test.mjs",
  "scripts/security/",
  "src-tauri/Cargo.toml",
  "src-tauri/Cargo.lock",
  "src-tauri/deny.toml",
  "AGENTS.md",
  "CLAUDE.md",
  "docs/CLAUDE.md",
  "src/services/aiGateway.ts",
  "src/services/aiGateway.test.ts",
  "SECURITY.md",
  "docs/security/",
  "src-tauri/capabilities/",
  "src-tauri/tauri.conf.json",
  "src-tauri/src/core/bookmarklet/",
  "src-tauri/src/core/credentials/",
  "src-tauri/src/core/url_security.rs",
];
const requiredCodeowner = "@cboyd0319";

const ignoredAgentInstructionPathParts = new Set([
  ".git",
  ".husky",
  "dist",
  "node_modules",
  "playwright-report",
  "target",
  "test-results",
]);

const allowedAgentInstructionFiles = new Set([
  ".github/copilot-instructions.md",
  "AGENTS.md",
  "CLAUDE.md",
  "docs/CLAUDE.md",
]);

const agentInstructionFilePatterns = [
  /(?:^|\/)AGENTS\.md$/i,
  /(?:^|\/)CLAUDE\.md$/i,
  /(?:^|\/)CODEX\.md$/i,
  /(?:^|\/)GEMINI\.md$/i,
  /^\.cursorrules$/i,
  /^\.windsurfrules$/i,
  /^\.cursor\/rules\/.+/i,
  /^\.github\/copilot-instructions\.md$/i,
  /^\.github\/instructions\/.+\.instructions\.md$/i,
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
    label: "release environment",
    phrases: ["GitHub `release` environment", "required reviewers"],
  },
  {
    label: "npm audit",
    phrases: ["npm audit --audit-level=moderate"],
  },
  {
    label: "cargo deny supply-chain policy",
    phrases: ["cargo deny check advisories bans licenses sources"],
  },
];

const dependabotGovernanceChecks = [
  {
    label: "version update cooldown",
    phrases: ["cooldown:", "semver-major-days:", "semver-minor-days:", "semver-patch-days:"],
  },
  {
    label: "npm grouped version updates",
    phrases: [
      'package-ecosystem: "npm"',
      "npm-production:",
      "npm-development:",
      'dependency-type: "production"',
      'dependency-type: "development"',
    ],
  },
  {
    label: "cargo grouped version updates",
    phrases: ['package-ecosystem: "cargo"', "cargo-minor-patch:"],
  },
  {
    label: "GitHub Actions grouped version updates",
    phrases: ['package-ecosystem: "github-actions"', "actions-minor-patch:"],
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

function workflowPaths(root) {
  const dir = repoPath(root, ".github/workflows");
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir)
    .filter((file) => [".yml", ".yaml"].includes(extname(file)))
    .map((file) => `.github/workflows/${file}`)
    .sort();
}

function hasTopLevelDisabledPermissions(text) {
  return /(?:^|\n)permissions:\s*\{\}\s*(?:\n|$)/.test(text);
}

function countMatches(text, pattern) {
  return text.match(pattern)?.length ?? 0;
}

function checkWorkflowSecurityBaseline(root, violations) {
  for (const path of workflowPaths(root)) {
    const text = readIfExists(root, path, violations);
    if (!hasTopLevelDisabledPermissions(text)) {
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
    const persistedCredentialGuards = countMatches(
      text,
      /\bpersist-credentials:\s*false\b/g,
    );
    if (checkoutCount > persistedCredentialGuards) {
      violations.push(`${path} checkout steps must set persist-credentials: false`);
    }
  }
}

function checkReleaseCacheIsolation(releaseWorkflow, violations) {
  if (releaseCacheMarkers.some((marker) => releaseWorkflow.includes(marker))) {
    violations.push(
      "release workflow must not restore dependency caches before publishing artifacts",
    );
  }
}

function checkSetupNodeCacheDisabled(path, text, violations) {
  const setupNodeCount = countMatches(text, /\buses:\s*actions\/setup-node@/g);
  const disabledCount = countMatches(text, /\bpackage-manager-cache:\s*false\b/g);

  if (setupNodeCount > disabledCount) {
    violations.push(
      `${path} setup-node steps must set package-manager-cache: false`,
    );
  }
}

function checkDependabotGovernance(root, violations) {
  const dependabotConfig = readIfExists(root, ".github/dependabot.yml", violations);

  for (const check of dependabotGovernanceChecks) {
    if (!includesAll(dependabotConfig, check.phrases)) {
      violations.push(
        `Dependabot config is missing supply-chain update governance: ${check.label}`,
      );
    }
  }
}

function codeownersLastOwnersForPattern(text, pattern) {
  let owners = [];

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const [entryPattern, ...entryOwners] = trimmed.split(/\s+/);
    if (entryPattern === pattern) {
      owners = entryOwners;
    }
  }

  return owners;
}

function checkCodeownersBoundary(root, violations) {
  const text = readIfExists(root, ".github/CODEOWNERS", violations);

  for (const pattern of requiredCodeownersEntries) {
    const owners = codeownersLastOwnersForPattern(text, pattern);
    if (!owners.includes(requiredCodeowner)) {
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

  if (!existsSync(dir)) {
    return files;
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (shouldSkipAgentInstructionPath(rel)) {
      continue;
    }

    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectAgentInstructionCandidates(root, fullPath, rel));
      continue;
    }

    if (entry.isFile() && agentInstructionFilePatterns.some((pattern) => pattern.test(rel))) {
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
  const forbiddenRendererAssetPatterns = [
    {
      label: "remote CSS import",
      pattern: /@import\s+(?:url\s*\(\s*)?["']?(?:https?:)?\/\//i,
    },
    {
      label: "Google Fonts host",
      pattern: /fonts\.(?:googleapis|gstatic)\.com/i,
    },
  ];

  for (const { label, pattern } of forbiddenRendererAssetPatterns) {
    if (pattern.test(css)) {
      violations.push(
        `src/index.css must not load external renderer assets: ${label}`,
      );
    }
  }
}

export function formatSecuritySensorSummary() {
  return [
    "Security sensors:",
    `docs=${requiredSecurityDocs.length}`,
    `matrix=${requiredMatrixEntries.length}`,
    "workflow=5",
    `release-workflow=${releaseWorkflowChecks.length}`,
    `release-preflight=${releasePreflightChecks.length}`,
    `published-release-workflow=${publishedReleaseWorkflowChecks.length}`,
    `public-release-verifier=${publicReleaseVerifierChecks.length}`,
    `ci=${ciWorkflowChecks.length}`,
    `ci-docs=${ciDocsChecks.length}`,
    `dependabot=${dependabotGovernanceChecks.length}`,
    `codeowners=${requiredCodeownersEntries.length}`,
    "agent-instructions=1",
    "browser-extension=1",
    "tauri-capabilities=1",
    "renderer-csp=1",
    "renderer-assets=1",
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

  checkWorkflowSecurityBaseline(root, violations);
  checkDependabotGovernance(root, violations);
  checkCodeownersBoundary(root, violations);
  checkAgentInstructionFileBoundary(root, violations);
  checkBrowserExtensionManifestBoundary(root, violations);
  checkTauriCapabilityBoundary(root, violations);
  checkRendererAssetBoundary(root, violations);

  const ciWorkflow = readIfExists(root, ".github/workflows/ci.yml", violations);

  for (const check of ciWorkflowChecks) {
    if (!includesAll(ciWorkflow, check.phrases)) {
      violations.push(`CI workflow is missing security gate: ${check.label}`);
    }
  }

  const releaseWorkflow = readIfExists(root, ".github/workflows/release.yml", violations);
  checkReleaseCacheIsolation(releaseWorkflow, violations);
  checkSetupNodeCacheDisabled(".github/workflows/release.yml", releaseWorkflow, violations);

  for (const check of releaseWorkflowChecks) {
    if (!includesAll(releaseWorkflow, check.phrases)) {
      violations.push(`release workflow is missing macOS package gate: ${check.label}`);
    }
  }

  const preflightJob = [
    "release-inputs",
    "preflight-harness",
    "preflight-frontend",
    "preflight-rust",
    "preflight-security",
  ]
    .map((jobName) => workflowJobBlock(releaseWorkflow, jobName))
    .join("\n");
  for (const check of releasePreflightChecks) {
    if (!includesAll(preflightJob, check.phrases)) {
      violations.push(`release workflow preflight is missing gate: ${check.label}`);
    }
  }

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

  const publishedReleaseWorkflow = readIfExists(
    root,
    ".github/workflows/verify-release-artifacts.yml",
    violations,
  );
  checkSetupNodeCacheDisabled(
    ".github/workflows/verify-release-artifacts.yml",
    publishedReleaseWorkflow,
    violations,
  );

  for (const check of publishedReleaseWorkflowChecks) {
    if (!includesAll(publishedReleaseWorkflow, check.phrases)) {
      violations.push(
        `published release workflow is missing public artifact gate: ${check.label}`,
      );
    }
  }

  const publicReleaseVerifier = readIfExists(
    root,
    "scripts/verify-public-release-assets.mjs",
    violations,
  );
  for (const check of publicReleaseVerifierChecks) {
    if (!includesAll(publicReleaseVerifier, check.phrases)) {
      violations.push(`public release verifier is missing artifact gate: ${check.label}`);
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
