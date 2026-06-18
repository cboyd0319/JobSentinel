import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { checkSecuritySensors } from "./check-security-sensors.mjs";

function writeBaseRepo(root, csp) {
  mkdirSync(join(root, "docs/security"), { recursive: true });
  mkdirSync(join(root, "docs/harness"), { recursive: true });
  mkdirSync(join(root, "docs/developer"), { recursive: true });
  mkdirSync(join(root, ".github/workflows"), { recursive: true });
  mkdirSync(join(root, "src-tauri"), { recursive: true });
  mkdirSync(join(root, "src/pages"), { recursive: true });

  for (const file of [
    "README.md",
    "KEYRING.md",
    "XSS_PREVENTION.md",
    "URL_VALIDATION.md",
    "COMMAND_EXECUTION.md",
    "WEBHOOK_SECURITY.md",
  ]) {
    writeFileSync(join(root, "docs/security", file), "# Security\n");
  }

  writeFileSync(
    join(root, "docs/harness/verification-matrix.md"),
    [
      "URL, file path, command, or HTML input",
      "Unit tests for malicious input",
      "Credential handling",
      "Keyring behavior check and no plaintext path",
      "External network destination",
      "Privacy docs update and explicit user configuration",
      "Browser automation",
      "Human-in-the-loop submit behavior preserved",
      "Scraper behavior",
      "Rate limit and error handling tests",
    ].join("\n"),
  );
  writeFileSync(
    join(root, ".github/workflows/ci.yml"),
    "jobs:\n  security:\n    steps:\n      - run: npm audit --audit-level=moderate\n      - run: cargo deny check advisories\n",
  );
  writeFileSync(
    join(root, ".github/workflows/release.yml"),
    [
      "jobs:",
      "  create-release:",
      "    environment:",
      "      name: release",
      "    steps:",
      "      - run: |",
      "          if [[ ! \"$version\" =~ ^[0-9]+\\.[0-9]+\\.[0-9]+$ ]]; then",
      "            printf 'Release version must be an exact stable semver (x.y.z), found: %s\\n' \"$version\"",
      "            exit 1",
      "          fi",
      "  build-release:",
      "    environment:",
      "      name: release",
      "    permissions:",
      "      artifact-metadata: write",
      "      attestations: write",
      "      contents: write",
      "      id-token: write",
      "    steps:",
      "      - run: |",
      "          keychain_password=\"$(openssl rand -hex 24)\"",
      "          printf '::add-mask::%s\\n' \"$keychain_password\"",
      "          JOBSENTINEL_MACOS_NO_ACCOUNT=true",
      "          labeled_name=JobSentinel_1.2.3_no-account_universal.dmg",
      "          npm run tauri:verify:macos -- --launch-smoke --install-smoke --require-checksum --require-gatekeeper --expected-bundle-id com.jobsentinel.main --expected-product-name JobSentinel --expected-version 1.2.3 --expected-icon-file icon.icns --expected-minimum-system-version 13.0",
      "          npm run release:sbom -- --require-artifacts --checksums-out release-assets/attestation-subjects.sha256",
      "      - uses: actions/attest@59d89421af93a897026c735860bf21b6eb4f7b26 # v4.1.0",
      "        with:",
      "          subject-path: release-assets/public/*",
      "      - uses: actions/attest@59d89421af93a897026c735860bf21b6eb4f7b26 # v4.1.0",
      "        with:",
      "          subject-checksums: release-assets/attestation-subjects.sha256",
      "          sbom-path: release-assets/public/JobSentinel-1.2.3-macos.sbom.spdx.json",
    ].join("\n"),
  );
  writeFileSync(
    join(root, ".github/workflows/verify-release-artifacts.yml"),
    [
      "on:",
      "  release:",
      "    types:",
      "      - published",
      "  workflow_dispatch:",
      "    inputs:",
      "      tag:",
      "jobs:",
      "  verify-macos-public-artifact:",
      "    runs-on: macos-26",
      "    permissions:",
      "      attestations: read",
      "      contents: read",
      "    steps:",
      "      - run: |",
      "          RELEASE_TAG=\"$RELEASE_TAG\"",
      "          DISPATCH_TAG=\"$DISPATCH_TAG\"",
      "          npm run tauri:verify:macos:latest -- --tag \"$RELEASE_TAG\" --require-supply-chain",
    ].join("\n"),
  );
  writeFileSync(
    join(root, "docs/developer/CI_CD.md"),
    "GitHub `release` environment\nrequired reviewers\nnpm audit --audit-level=moderate\ncargo deny check advisories\n",
  );
  writeFileSync(
    join(root, "src-tauri/tauri.conf.json"),
    JSON.stringify({ app: { security: { csp } } }),
  );
  writeFileSync(
    join(root, "src/pages/SettingsConfig.ts"),
    [
      "export interface CredentialStatusValue {",
      "  exists: boolean;",
      "  available: boolean;",
      "  state: CredentialStatusState;",
      "}",
      "export type CredentialStatusState = 'empty' | 'expected' | 'saved' | 'needs_attention';",
      "credentialExists(credentialStatus, \"telegram_bot_token\");",
      "credentialExists(credentialStatus, \"usajobs_api_key\");",
    ].join("\n"),
  );
  writeFileSync(
    join(root, "src/pages/SettingsNotificationsSection.tsx"),
    "import { credentialExists } from './SettingsConfig';\n",
  );
  writeFileSync(
    join(root, "src/pages/SettingsJobSourcesSection.tsx"),
    "import { credentialExists } from './SettingsConfig';\n",
  );
  writeFileSync(join(root, "src/pages/Settings.tsx"), "export function Settings() {}\n");
  writeFileSync(
    join(root, "src/pages/useSettingsCredentials.ts"),
    "export function useSettingsCredentials() { return {}; }\n",
  );
}

test("checkSecuritySensors accepts self-only renderer connect CSP", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-good-");
  writeBaseRepo(
    root,
    "default-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'",
  );

  assert.deepEqual(checkSecuritySensors(root), []);
});

test("checkSecuritySensors rejects renderer external connect hosts", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-csp-");
  writeBaseRepo(
    root,
    "default-src 'self'; connect-src 'self' https://hooks.slack.com; style-src 'self' 'unsafe-inline'",
  );

  assert(
    checkSecuritySensors(root).includes(
      "Tauri renderer CSP must not allow external connect host: https://hooks.slack.com",
    ),
  );
});

test("checkSecuritySensors rejects macOS release gates without launch smoke", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-release-");
  writeBaseRepo(
    root,
    "default-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'",
  );
  writeFileSync(
    join(root, ".github/workflows/release.yml"),
    "jobs:\n  release:\n    steps:\n      - run: npm run tauri:verify:macos -- --require-gatekeeper\n",
  );

  assert(
    checkSecuritySensors(root).includes(
      "release workflow is missing macOS package gate: macOS launch smoke gate",
    ),
  );
});

test("checkSecuritySensors rejects release workflow without release environment", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-release-environment-");
  writeBaseRepo(
    root,
    "default-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'",
  );
  writeFileSync(
    join(root, ".github/workflows/release.yml"),
    "jobs:\n  release:\n    steps:\n      - run: |\n          keychain_password=\"$(openssl rand -hex 24)\"\n          printf '::add-mask::%s\\n' \"$keychain_password\"\n          JOBSENTINEL_MACOS_NO_ACCOUNT=true\n          labeled_name=JobSentinel_1.2.3_no-account_universal.dmg\n          npm run tauri:verify:macos -- --launch-smoke --install-smoke --require-checksum --require-gatekeeper --expected-bundle-id com.jobsentinel.main --expected-product-name JobSentinel --expected-version 1.2.3 --expected-icon-file icon.icns --expected-minimum-system-version 13.0\n",
  );

  assert(
    checkSecuritySensors(root).includes(
      "release workflow is missing macOS package gate: release environment gate",
    ),
  );
});

test("checkSecuritySensors rejects release attestation permissions on the wrong job", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-release-attestation-job-");
  writeBaseRepo(
    root,
    "default-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'",
  );
  writeFileSync(
    join(root, ".github/workflows/release.yml"),
    [
      "jobs:",
      "  create-release:",
      "    environment:",
      "      name: release",
      "    permissions:",
      "      artifact-metadata: write",
      "      attestations: write",
      "      contents: write",
      "      id-token: write",
      "    steps:",
      "      - run: true",
      "  build-release:",
      "    environment:",
      "      name: release",
      "    permissions:",
      "      contents: write",
      "    steps:",
      "      - run: |",
      "          keychain_password=\"$(openssl rand -hex 24)\"",
      "          printf '::add-mask::%s\\n' \"$keychain_password\"",
      "          JOBSENTINEL_MACOS_NO_ACCOUNT=true",
      "          labeled_name=JobSentinel_1.2.3_no-account_universal.dmg",
      "          npm run tauri:verify:macos -- --launch-smoke --install-smoke --require-checksum --require-gatekeeper --expected-bundle-id com.jobsentinel.main --expected-product-name JobSentinel --expected-version 1.2.3 --expected-icon-file icon.icns --expected-minimum-system-version 13.0",
      "          npm run release:sbom -- --require-artifacts --checksums-out release-assets/attestation-subjects.sha256",
      "      - uses: actions/attest@59d89421af93a897026c735860bf21b6eb4f7b26 # v4.1.0",
      "        with:",
      "          subject-path: release-assets/public/*",
      "      - uses: actions/attest@59d89421af93a897026c735860bf21b6eb4f7b26 # v4.1.0",
      "        with:",
      "          subject-checksums: release-assets/attestation-subjects.sha256",
      "          sbom-path: release-assets/public/JobSentinel-1.2.3-macos.sbom.spdx.json",
    ].join("\n"),
  );

  assert(
    checkSecuritySensors(root).includes(
      "release workflow build-release job is missing attestation permissions",
    ),
  );
});

test("checkSecuritySensors rejects release workflow without keychain password mask", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-keychain-mask-");
  writeBaseRepo(
    root,
    "default-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'",
  );
  writeFileSync(
    join(root, ".github/workflows/release.yml"),
    "jobs:\n  release:\n    environment:\n      name: release\n    steps:\n      - run: |\n          keychain_password=\"$(openssl rand -hex 24)\"\n          JOBSENTINEL_MACOS_NO_ACCOUNT=true\n          labeled_name=JobSentinel_1.2.3_no-account_universal.dmg\n          npm run tauri:verify:macos -- --launch-smoke --install-smoke --require-checksum --require-gatekeeper --expected-bundle-id com.jobsentinel.main --expected-product-name JobSentinel --expected-version 1.2.3 --expected-icon-file icon.icns --expected-minimum-system-version 13.0\n",
  );

  assert(
    checkSecuritySensors(root).includes(
      "release workflow is missing macOS package gate: macOS keychain password mask",
    ),
  );
});

test("checkSecuritySensors rejects macOS release gates without install smoke", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-install-smoke-");
  writeBaseRepo(
    root,
    "default-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'",
  );
  writeFileSync(
    join(root, ".github/workflows/release.yml"),
    "jobs:\n  release:\n    steps:\n      - run: npm run tauri:verify:macos -- --launch-smoke --require-gatekeeper\n",
  );

  assert(
    checkSecuritySensors(root).includes(
      "release workflow is missing macOS package gate: macOS installed app smoke gate",
    ),
  );
});

test("checkSecuritySensors rejects macOS release gates without bundle metadata checks", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-bundle-metadata-");
  writeBaseRepo(
    root,
    "default-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'",
  );
  writeFileSync(
    join(root, ".github/workflows/release.yml"),
    "jobs:\n  release:\n    steps:\n      - run: npm run tauri:verify:macos -- --launch-smoke --install-smoke --require-gatekeeper\n",
  );

  assert(
    checkSecuritySensors(root).includes(
      "release workflow is missing macOS package gate: macOS bundle metadata gate",
    ),
  );
});

test("checkSecuritySensors rejects macOS release gates without checksum sidecar checks", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-checksum-");
  writeBaseRepo(
    root,
    "default-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'",
  );
  writeFileSync(
    join(root, ".github/workflows/release.yml"),
    "jobs:\n  release:\n    steps:\n      - run: |\n          JOBSENTINEL_MACOS_NO_ACCOUNT=true\n          labeled_name=JobSentinel_1.2.3_no-account_universal.dmg\n          npm run tauri:verify:macos -- --launch-smoke --install-smoke --require-gatekeeper --expected-bundle-id com.jobsentinel.main --expected-product-name JobSentinel --expected-version 1.2.3 --expected-icon-file icon.icns --expected-minimum-system-version 13.0\n",
  );

  assert(
    checkSecuritySensors(root).includes(
      "release workflow is missing macOS package gate: macOS checksum sidecar gate",
    ),
  );
});

test("checkSecuritySensors rejects macOS release gates without minimum system version", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-macos-minimum-");
  writeBaseRepo(
    root,
    "default-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'",
  );
  writeFileSync(
    join(root, ".github/workflows/release.yml"),
    "jobs:\n  release:\n    steps:\n      - run: npm run tauri:verify:macos -- --launch-smoke --install-smoke --require-gatekeeper --expected-bundle-id com.jobsentinel.main --expected-product-name JobSentinel --expected-version 1.2.3 --expected-icon-file icon.icns\n",
  );

  assert(
    checkSecuritySensors(root).includes(
      "release workflow is missing macOS package gate: macOS bundle metadata gate",
    ),
  );
});

test("checkSecuritySensors rejects macOS release workflow without no-account asset label", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-no-account-label-");
  writeBaseRepo(
    root,
    "default-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'",
  );
  writeFileSync(
    join(root, ".github/workflows/release.yml"),
    "jobs:\n  release:\n    steps:\n      - run: npm run tauri:verify:macos -- --launch-smoke --install-smoke --require-gatekeeper --expected-bundle-id com.jobsentinel.main --expected-product-name JobSentinel --expected-version 1.2.3 --expected-icon-file icon.icns --expected-minimum-system-version 13.0\n",
  );

  assert(
    checkSecuritySensors(root).includes(
      "release workflow is missing macOS package gate: macOS no-account asset label",
    ),
  );
});

test("checkSecuritySensors rejects missing public macOS artifact verifier", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-public-release-");
  writeBaseRepo(
    root,
    "default-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'",
  );
  writeFileSync(
    join(root, ".github/workflows/verify-release-artifacts.yml"),
    "on:\n  release:\n    types:\n      - published\njobs:\n  verify:\n    runs-on: ubuntu-24.04\n",
  );

  assert(
    checkSecuritySensors(root).includes(
      "published release workflow is missing public artifact gate: public macOS artifact verifier",
    ),
  );
});

test("checkSecuritySensors rejects passive credential state in Settings gating", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-credential-ui-");
  writeBaseRepo(
    root,
    "default-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'",
  );
  writeFileSync(
    join(root, "src/pages/SettingsNotificationsSection.tsx"),
    "import { credentialMayExist } from './SettingsConfig';\ncredentialMayExist(status, 'slack_webhook');\n",
  );

  assert(
    checkSecuritySensors(root).includes(
      "src/pages/SettingsNotificationsSection.tsx must not use passive expected credential state for save, test, or enable gating",
    ),
  );
});

test("checkSecuritySensors rejects passive secure-storage probes in Settings hooks", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-passive-probe-");
  writeBaseRepo(
    root,
    "default-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'",
  );
  writeFileSync(
    join(root, "src/pages/useSettingsCredentials.ts"),
    "import { invoke } from '@tauri-apps/api/core';\ninvoke('has_credential', { key: 'smtp_password' });\n",
  );

  assert(
    checkSecuritySensors(root).includes(
      "src/pages/useSettingsCredentials.ts must not call secure-storage probe commands during passive Settings load",
    ),
  );
});

function mkdtempRoot(prefix) {
  const root = join(tmpdir(), `${prefix}${process.pid}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(root, { recursive: true });
  return root;
}
