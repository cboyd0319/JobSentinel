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
    "jobs:\n  release:\n    steps:\n      - run: npm run tauri:verify:macos -- --launch-smoke --install-smoke --require-gatekeeper\n",
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
      "    runs-on: macos-latest",
      "    steps:",
      "      - run: |",
      "          RELEASE_TAG=\"$RELEASE_TAG\"",
      "          DISPATCH_TAG=\"$DISPATCH_TAG\"",
      "          npm run tauri:verify:macos:latest -- --tag \"$RELEASE_TAG\"",
    ].join("\n"),
  );
  writeFileSync(
    join(root, "docs/developer/CI_CD.md"),
    "npm audit --audit-level=moderate\ncargo deny check advisories\n",
  );
  writeFileSync(
    join(root, "src-tauri/tauri.conf.json"),
    JSON.stringify({ app: { security: { csp } } }),
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

test("checkSecuritySensors rejects missing public macOS artifact verifier", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-public-release-");
  writeBaseRepo(
    root,
    "default-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'",
  );
  writeFileSync(
    join(root, ".github/workflows/verify-release-artifacts.yml"),
    "on:\n  release:\n    types:\n      - published\njobs:\n  verify:\n    runs-on: ubuntu-latest\n",
  );

  assert(
    checkSecuritySensors(root).includes(
      "published release workflow is missing public artifact gate: public macOS artifact verifier",
    ),
  );
});

function mkdtempRoot(prefix) {
  const root = join(tmpdir(), `${prefix}${process.pid}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(root, { recursive: true });
  return root;
}
