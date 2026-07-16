export const requiredSecurityDocs = [
  "docs/security/README.md",
  "docs/security/KEYRING.md",
  "docs/security/XSS_PREVENTION.md",
  "docs/security/URL_VALIDATION.md",
  "docs/security/COMMAND_EXECUTION.md",
  "docs/security/WEBHOOK_SECURITY.md",
];

export const forbiddenRendererConnectHosts = [
  "https://hooks.slack.com",
  "https://discord.com",
  "https://outlook.office.com",
  "https://boards.greenhouse.io",
  "https://boards-api.greenhouse.io",
  "https://jobs.lever.co",
  "https://api.lever.co",
  "https://api.jobswithgpt.com",
];

export const requiredMatrixEntries = [
  ["input validation", "URL, file path, command, or HTML input", "Unit tests for malicious input"],
  ["credential handling", "Credential handling", "Keyring behavior check and no plaintext path"],
  ["external network destination", "External network destination", "Privacy docs update and explicit user configuration"],
  ["browser automation", "Browser automation", "Human-in-the-loop submit behavior preserved"],
  ["browser extension manifest", "Browser extension manifest", "least-privilege manifest review", "no broad host permissions"],
  ["scraper behavior", "Scraper behavior", "Rate limit and error handling tests"],
].map(([label, ...phrases]) => ({ label, phrases }));

export const ciWorkflowChecks = [
  ["split security jobs", "jobs:", "security-node:", "security-rust:"],
  ["scheduled security drift trigger", "schedule:", "cron:"],
  ["scheduled security drift selection", '"$event" = "schedule"', "frontend=false", "harness=true", "rust=false", "security=true"],
  ["security sensors", "npm run lint:security"],
  ["GitHub Actions static analysis", "zizmorcore/zizmor-action@", "advanced-security: false", "inputs: .github/workflows"],
  ["npm audit", "npm audit --audit-level=moderate"],
  ["cargo deny supply-chain policy", "cargo deny check advisories bans licenses sources"],
  ["latest stable drift check", "npm run release:check-deps"],
].map(([label, ...phrases]) => ({ label, phrases }));

export const forbiddenWorkflowTriggers = [
  "pull_request_target:",
  "workflow_run:",
  "issue_comment:",
];
export const releaseCacheMarkers = [
  "actions/cache@",
  "Swatinem/rust-cache@",
  'cache: "npm"',
  "cache: npm",
];
export const notificationProviderPaths = [
  "crates/jobsentinel-notifications/src/slack.rs",
  "crates/jobsentinel-notifications/src/discord.rs",
  "crates/jobsentinel-notifications/src/teams.rs",
  "crates/jobsentinel-notifications/src/telegram.rs",
];

export const releaseWorkflowChecks = [
  ["parallel release preflight", "release-inputs:", "preflight-harness:", "preflight-frontend:", "preflight-rust:", "preflight-security-node:", "preflight-security-rust:", "- preflight-harness", "- preflight-frontend", "- preflight-rust", "- preflight-security-node", "- preflight-security-rust"],
  ["release environment gate", "environment:", "name: release"],
  ["release version output guard", '[[ ! "$version" =~ ^[0-9]+\\.[0-9]+\\.[0-9]+$ ]]', "Release version must be an exact stable semver"],
  ["release tag ref guard", 'expected_ref="refs/tags/v${version}"', 'if [ "${GITHUB_REF:-}" != "$expected_ref" ]; then', "Manual release dispatch must run from", "Select the existing release tag as the workflow ref"],
  ["release setup-node cache disabled", "actions/setup-node@", "package-manager-cache: false"],
  ["release creation through GitHub CLI", "gh release create", "gh release edit", "notes-file"],
  ["macOS keychain password mask", 'keychain_password="$(openssl rand -hex 24)"', "::add-mask::"],
  ["macOS Gatekeeper gate", "npm run tauri:verify:macos", "--require-gatekeeper"],
  ["macOS launch smoke gate", "npm run tauri:verify:macos", "--launch-smoke"],
  ["macOS installed app smoke gate", "npm run tauri:verify:macos", "--install-smoke"],
  ["macOS checksum sidecar gate", "npm run tauri:verify:macos", "--require-checksum"],
  ["macOS bundle metadata gate", "--expected-bundle-id", "com.jobsentinel.main", "--expected-product-name", "JobSentinel", "--expected-version", "--expected-icon-file", "icon.icns", "--expected-minimum-system-version", "13.0"],
  ["macOS no-account asset label", "JOBSENTINEL_MACOS_NO_ACCOUNT", "_no-account_"],
  ["macOS signing material cleanup", "Clean up macOS signing material", 'security delete-keychain "$RUNNER_TEMP/jobsentinel-signing.keychain-db"', 'rm -f "$RUNNER_TEMP/jobsentinel-certificate.p12"', 'rm -f "$RUNNER_TEMP"/AuthKey_*.p8'],
  ["Windows signing setup", "Configure Windows signing", "WINDOWS_CERTIFICATE", "WINDOWS_CERTIFICATE_PASSWORD", "WINDOWS_CERTIFICATE_THUMBPRINT", "WINDOWS_TIMESTAMP_URL", "Import-PfxCertificate", "Remove-Item -LiteralPath $certificatePath", "Clean Windows signing material", "Remove-Item -LiteralPath $certificate.PSPath -DeleteKey", 'Remove-Item -LiteralPath "src-tauri/tauri.windows.conf.json"', "tauri.windows.conf.json"],
  ["Linux AppImage build compatibility", "file=1:5.45-3build1", "libfuse2t64=2.9.9-8.1build1", "squashfs-tools=1:4.6.1-1build1", "Build Linux Tauri app", 'APPIMAGE_EXTRACT_AND_RUN: "1"', "scripts/platform/build-linux-appimage.mjs"],
  ["release attestation permissions", "artifact-metadata: write", "attestations: write", "id-token: write"],
  ["release SBOM generation", "npm run release:sbom", "--require-artifacts", "attestation-subjects.sha256"],
  ["release upload through GitHub CLI", "gh release upload", "--clobber"],
  ["release provenance attestation", "actions/attest@", "subject-path: release-assets/public/*"],
  ["release SBOM attestation", "release-assets/public/*.dmg", "release-assets/public/*.msi", "release-assets/public/*.exe", "release-assets/public/*.AppImage", "release-assets/public/*.deb", "sbom-path: release-assets/public/JobSentinel-"],
].map(([label, ...phrases]) => ({ label, phrases }));

export const releasePreflightChecks = [
  ["release metadata and readiness validation", "npm run release:check-version", "npm run release:readiness"],
  ["harness checks", "npm run harness:check"],
  ["latest stable dependency pins", "npm run release:check-deps"],
  ["harness script tests", "npm run test:scripts"],
  ["markdown lint", "npm run lint:md"],
  ["frontend lint", "npm run lint"],
  ["frontend unit tests", "npm test -- --run"],
  ["Node security preflight", "npm run lint:security", "zizmorcore/zizmor-action@", "npm audit --audit-level=moderate"],
  ["cargo deny supply-chain policy", "cargo install cargo-deny --version 0.20.2 --locked", "cargo deny check advisories bans licenses sources"],
  ["Rust formatting", "cargo fmt --all -- --check"],
  ["Rust clippy", "cargo clippy --workspace -- -D warnings"],
  ["Rust tests", "cargo test --workspace"],
].map(([label, ...phrases]) => ({ label, phrases }));

export const publishedReleaseWorkflowChecks = [
  ["published release trigger", "release:", "published"],
  ["manual release trigger", "workflow_dispatch:", "tag:"],
  ["public macOS artifact verifier", "macos-26", "npm run tauri:verify:macos:latest"],
  ["scoped release tag", "RELEASE_TAG", "DISPATCH_TAG", "--tag"],
  ["public supply-chain verifier", "attestations: read", "--require-supply-chain"],
  ["public setup-node cache disabled", "actions/setup-node@", "package-manager-cache: false"],
].map(([label, ...phrases]) => ({ label, phrases }));

export const publicReleaseVerifierChecks = [
  {
    label: "exact public installer asset set",
    phrases: [
      "validateExactPublicInstallerAssetSet",
      "selectedPlatformAssetExtensions",
      "stale or unexpected installer assets",
    ],
  },
];

export const requiredCodeownersEntries = [
  "*", ".github/CODEOWNERS", ".github/dependabot.yml", ".github/workflows/",
  "package.json", "package-lock.json", "scripts/check-action-pins.mjs",
  "scripts/checks/dependency-pins.mjs", "scripts/checks/security-sensors.mjs",
  "scripts/tests/check-security-sensors.test.mjs", "scripts/checks/security/", "Cargo.toml",
  "Cargo.lock", ".cargo/", "clippy.toml", "deny.toml", "crates/",
  "scripts/checks/", "scripts/platform/", "scripts/release/",
  "scripts/check-repository-architecture.mjs", "src-tauri/Cargo.toml", "AGENTS.md",
  "CLAUDE.md", "docs/CLAUDE.md", "src/shared/externalAi/", "SECURITY.md",
  "docs/security/", "src-tauri/capabilities/", "src-tauri/tauri.conf.json",
  "crates/jobsentinel-assistance/src/bookmarklet/",
  "crates/jobsentinel-credentials/src/",
  "crates/jobsentinel-security/src/url.rs",
];
export const requiredCodeowner = "@cboyd0319";

export const ignoredAgentInstructionPathParts = new Set([
  ".git", ".husky", "dist", "node_modules", "playwright-report", "target", "test-results",
]);
export const allowedAgentInstructionFiles = new Set([
  ".github/copilot-instructions.md", "AGENTS.md", "CLAUDE.md", "docs/CLAUDE.md",
]);
export const agentInstructionFilePatterns = [
  /(?:^|\/)AGENTS\.md$/i, /(?:^|\/)CLAUDE\.md$/i, /(?:^|\/)CODEX\.md$/i,
  /(?:^|\/)GEMINI\.md$/i, /^\.cursorrules$/i, /^\.windsurfrules$/i,
  /^\.cursor\/rules\/.+/i, /^\.github\/copilot-instructions\.md$/i,
  /^\.github\/instructions\/.+\.instructions\.md$/i,
];
export const credentialUiGateFiles = [
  "src/features/settings/notifications/SettingsNotificationsSection.tsx",
  "src/features/settings/sources/SettingsJobSourcesSection.tsx",
];
export const credentialPassiveProbeFiles = [
  "src/features/settings/SettingsPage.tsx",
  "src/features/settings/credentials/useSettingsCredentials.ts",
  "src/features/settings/notifications/SettingsNotificationsSection.tsx",
  "src/features/settings/sources/SettingsJobSourcesSection.tsx",
];
export const ciDocsChecks = [
  ["release environment", "GitHub `release` environment", "required reviewers"],
  ["npm audit", "npm audit --audit-level=moderate"],
  ["cargo deny supply-chain policy", "cargo deny check advisories bans licenses sources"],
].map(([label, ...phrases]) => ({ label, phrases }));
export const dependabotGovernanceChecks = [
  ["version update cooldown", "cooldown:", "semver-major-days:", "semver-minor-days:", "semver-patch-days:"],
  ["npm grouped version updates", 'package-ecosystem: "npm"', "npm-production:", "npm-development:", 'dependency-type: "production"', 'dependency-type: "development"'],
  ["cargo grouped version updates", 'package-ecosystem: "cargo"', "cargo-minor-patch:"],
  ["GitHub Actions grouped version updates", 'package-ecosystem: "github-actions"', "actions-minor-patch:"],
].map(([label, ...phrases]) => ({ label, phrases }));
