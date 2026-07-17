import assert from "node:assert/strict";
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { checkSecuritySensors } from "../../checks/security-sensors.mjs";
import {
  mkdtempRoot,
  readBaseReleaseWorkflowWithout,
  writeBaseRepo,
  writeSelfOnlyBaseRepo,
} from "./check-security-sensors.fixtures.mjs";
test("checkSecuritySensors accepts self-only renderer connect CSP", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-good-");
  writeSelfOnlyBaseRepo(root);
  assert.deepEqual(checkSecuritySensors(root), []);
});
test("checkSecuritySensors accepts the manifest-owned no-CI mode", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-no-ci-");
  writeSelfOnlyBaseRepo(root);
  unlinkSync(join(root, ".github/workflows/ci.yml"));
  mkdirSync(join(root, "scripts/harness/contracts"), { recursive: true });
  writeFileSync(
    join(root, "scripts/harness/contracts/harness.json"),
    `${JSON.stringify({ hosted_workflows: { ci_enabled: false } }, null, 2)}\n`,
  );
  assert.deepEqual(checkSecuritySensors(root), []);
});
test("checkSecuritySensors rejects renderer external connect hosts", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-csp-");
  writeBaseRepo(
    root,
    "default-src 'self'; connect-src 'self' https://hooks.slack.com; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'",
  );
  assert(
    checkSecuritySensors(root).includes(
      "Tauri renderer CSP must not allow external connect host: https://hooks.slack.com",
    ),
  );
});
test("checkSecuritySensors rejects renderer CSP drift", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-csp-drift-");
  writeBaseRepo(
    root,
    "default-src 'self'; connect-src 'self'; img-src 'self' data: https://cdn.example.test; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-eval'; object-src 'none'; form-action 'none'; frame-src 'self'",
  );
  const violations = checkSecuritySensors(root);
  assert(
    violations.includes(
      "Tauri renderer CSP directive img-src must equal \"img-src 'self' data:\"",
    ),
  );
  assert(
    violations.includes(
      "Tauri renderer CSP directive script-src must equal \"script-src 'self'\"",
    ),
  );
  assert(
    violations.includes(
      "Tauri renderer CSP is missing directive: base-uri 'self'",
    ),
  );
  assert(
    violations.includes(
      "Tauri renderer CSP must not add unreviewed directive: frame-src",
    ),
  );
});
test("checkSecuritySensors rejects external renderer font and style imports", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-renderer-assets-");
  writeSelfOnlyBaseRepo(root);
  writeFileSync(
    join(root, "src/index.css"),
    '@import url(\'https://fonts.googleapis.com/css2?family=Inter:wght@400&display=swap\');\n@import "https://cdn.example.test/app.css";\n@import "tailwindcss";\n',
  );
  const violations = checkSecuritySensors(root);
  assert(
    violations.includes(
      "src/index.css must not load external renderer assets: remote CSS import",
    ),
  );
  assert(
    violations.includes(
      "src/index.css must not load external renderer assets: Google Fonts host",
    ),
  );
});
test("checkSecuritySensors rejects frontend shell capability grants", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-shell-capability-");
  writeSelfOnlyBaseRepo(root);
  writeFileSync(
    join(root, "src-tauri/capabilities/default.json"),
    JSON.stringify({
      identifier: "default",
      windows: ["main"],
      permissions: ["core:default", "shell:allow-open"],
    }),
  );
  assert(
    checkSecuritySensors(root).includes(
      "src-tauri/capabilities/default.json must not grant frontend shell permissions; route browser opens through validated Rust IPC",
    ),
  );
});
test("checkSecuritySensors rejects frontend dialog capability grants", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-dialog-capability-");
  writeSelfOnlyBaseRepo(root);
  writeFileSync(
    join(root, "src-tauri/capabilities/default.json"),
    JSON.stringify({
      identifier: "default",
      windows: ["main"],
      permissions: ["core:default", "dialog:default"],
    }),
  );
  assert(
    checkSecuritySensors(root).includes(
      "src-tauri/capabilities/default.json must not grant frontend dialog permissions; open native file dialogs through validated Rust IPC commands",
    ),
  );
});
test("checkSecuritySensors rejects broad or unused frontend notification grants", () => {
  const root = mkdtempRoot(
    "jobsentinel-security-sensors-notification-capability-",
  );
  writeSelfOnlyBaseRepo(root);
  writeFileSync(
    join(root, "src-tauri/capabilities/default.json"),
    JSON.stringify({
      identifier: "default",
      windows: ["main"],
      permissions: [
        "core:default",
        "notification:default",
        "notification:allow-list-channels",
      ],
    }),
  );
  const violations = checkSecuritySensors(root);
  assert(
    violations.includes(
      "src-tauri/capabilities/default.json must not grant notification:default; allow only the notification commands the renderer uses",
    ),
  );
  assert(
    violations.includes(
      "src-tauri/capabilities/default.json must not grant unused frontend notification permission: notification:allow-list-channels",
    ),
  );
});
test("checkSecuritySensors rejects macOS release gates without launch smoke", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-release-");
  writeSelfOnlyBaseRepo(root);
  writeFileSync(
    join(root, ".github/workflows/release.yml"),
    "jobs:\n  release:\n    steps:\n      - run: npm run tauri:verify:macos -- --require-gatekeeper\n",
  );
  assert(
    checkSecuritySensors(root).includes(
      "release workflow is missing package gate: macOS launch smoke gate",
    ),
  );
});
test("checkSecuritySensors rejects release preflight without frontend unit tests", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-release-preflight-");
  writeSelfOnlyBaseRepo(root);
  writeFileSync(
    join(root, ".github/workflows/release.yml"),
    readBaseReleaseWorkflowWithout("      - run: npm test -- --run\n"),
  );
  assert(
    checkSecuritySensors(root).includes(
      "release workflow preflight is missing gate: frontend unit tests",
    ),
  );
});
test("checkSecuritySensors rejects release workflow without tag ref guard", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-release-tag-ref-");
  writeSelfOnlyBaseRepo(root);
  writeFileSync(
    join(root, ".github/workflows/release.yml"),
    readBaseReleaseWorkflowWithout(
      '          expected_ref="refs/tags/v${version}"\n          if [ "${GITHUB_REF:-}" != "$expected_ref" ]; then\n            printf \'Manual release dispatch must run from %s. Select the existing release tag as the workflow ref. Found: %s\\n\' "$expected_ref" "${GITHUB_REF:-<unset>}"\n            exit 1\n          fi\n',
    ),
  );
  assert(
    checkSecuritySensors(root).includes(
      "release workflow is missing package gate: release tag ref guard",
    ),
  );
});
test("checkSecuritySensors rejects release workflow without release environment", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-release-environment-");
  writeSelfOnlyBaseRepo(root);
  writeFileSync(
    join(root, ".github/workflows/release.yml"),
    'jobs:\n  release:\n    steps:\n      - run: |\n          keychain_password="$(openssl rand -hex 24)"\n          printf \'::add-mask::%s\\n\' "$keychain_password"\n          JOBSENTINEL_MACOS_NO_ACCOUNT=true\n          labeled_name=JobSentinel_1.2.3_no-account_universal.dmg\n          npm run tauri:verify:macos -- --launch-smoke --install-smoke --require-checksum --require-gatekeeper --expected-bundle-id com.jobsentinel.main --expected-product-name JobSentinel --expected-version 1.2.3 --expected-icon-file icon.icns --expected-minimum-system-version 13.0\n',
  );
  assert(
    checkSecuritySensors(root).includes(
      "release workflow is missing package gate: release environment gate",
    ),
  );
});
test("checkSecuritySensors rejects release attestation permissions on the wrong job", () => {
  const root = mkdtempRoot(
    "jobsentinel-security-sensors-release-attestation-job-",
  );
  writeSelfOnlyBaseRepo(root);
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
      '          keychain_password="$(openssl rand -hex 24)"',
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
      "          subject-path: |\n            release-assets/public/*.dmg\n            release-assets/public/*.msi\n            release-assets/public/*.exe\n            release-assets/public/*.AppImage\n            release-assets/public/*.deb",
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
  writeSelfOnlyBaseRepo(root);
  writeFileSync(
    join(root, ".github/workflows/release.yml"),
    'jobs:\n  release:\n    environment:\n      name: release\n    steps:\n      - run: |\n          keychain_password="$(openssl rand -hex 24)"\n          JOBSENTINEL_MACOS_NO_ACCOUNT=true\n          labeled_name=JobSentinel_1.2.3_no-account_universal.dmg\n          npm run tauri:verify:macos -- --launch-smoke --install-smoke --require-checksum --require-gatekeeper --expected-bundle-id com.jobsentinel.main --expected-product-name JobSentinel --expected-version 1.2.3 --expected-icon-file icon.icns --expected-minimum-system-version 13.0\n',
  );
  assert(
    checkSecuritySensors(root).includes(
      "release workflow is missing package gate: macOS keychain password mask",
    ),
  );
});
test("checkSecuritySensors rejects release workflow without Windows signing setup", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-windows-signing-");
  writeSelfOnlyBaseRepo(root);
  writeFileSync(
    join(root, ".github/workflows/release.yml"),
    readBaseReleaseWorkflowWithout("          Import-PfxCertificate\n"),
  );
  assert(
    checkSecuritySensors(root).includes(
      "release workflow is missing package gate: Windows signing setup",
    ),
  );
});
test("checkSecuritySensors rejects release workflow without Windows key cleanup", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-windows-key-cleanup-");
  writeSelfOnlyBaseRepo(root);
  writeFileSync(
    join(root, ".github/workflows/release.yml"),
    readBaseReleaseWorkflowWithout(
      "          Remove-Item -LiteralPath $certificate.PSPath -DeleteKey\n",
    ),
  );
  assert(
    checkSecuritySensors(root).includes(
      "release workflow is missing package gate: Windows signing setup",
    ),
  );
});
test("checkSecuritySensors rejects release workflow without macOS signing material cleanup", () => {
  const root = mkdtempRoot(
    "jobsentinel-security-sensors-macos-signing-cleanup-",
  );
  writeSelfOnlyBaseRepo(root);
  writeFileSync(
    join(root, ".github/workflows/release.yml"),
    readBaseReleaseWorkflowWithout(
      '          security delete-keychain "$RUNNER_TEMP/jobsentinel-signing.keychain-db" >/dev/null 2>&1 || :\n',
    ),
  );
  assert(
    checkSecuritySensors(root).includes(
      "release workflow is missing package gate: macOS signing material cleanup",
    ),
  );
});
test("checkSecuritySensors rejects workflow token defaults that are not disabled", () => {
  const root = mkdtempRoot(
    "jobsentinel-security-sensors-workflow-permissions-",
  );
  writeSelfOnlyBaseRepo(root);
  writeFileSync(
    join(root, ".github/workflows/ci.yml"),
    "jobs:\n  security:\n    steps:\n      - run: npm audit --audit-level=moderate\n      - run: cargo deny check advisories bans licenses sources\n",
  );
  assert(
    checkSecuritySensors(root).includes(
      ".github/workflows/ci.yml must disable default workflow token permissions with top-level permissions: {}",
    ),
  );
});
test("checkSecuritySensors rejects CI Node security job without GitHub Actions static analysis", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-zizmor-");
  writeSelfOnlyBaseRepo(root);
  const ciWorkflowPath = join(root, ".github/workflows/ci.yml");
  writeFileSync(
    ciWorkflowPath,
    readFileSync(ciWorkflowPath, "utf8").replace(
      / {6}- uses: zizmorcore\/zizmor-action@[^\n]+\n {8}with:\n {10}advanced-security: false\n {10}inputs: \.github\/workflows\n/,
      "",
    ),
  );
  assert(
    checkSecuritySensors(root).includes(
      "CI workflow is missing security gate: GitHub Actions static analysis",
    ),
  );
});

test("checkSecuritySensors rejects privileged workflow triggers", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-workflow-triggers-");
  writeSelfOnlyBaseRepo(root);
  writeFileSync(
    join(root, ".github/workflows/ci.yml"),
    [
      "on:",
      "  pull_request_target:",
      "permissions: {}",
      "jobs:",
      "  security:",
      "    steps:",
      "      - run: npm audit --audit-level=moderate",
      "      - run: cargo deny check advisories bans licenses sources",
    ].join("\n"),
  );

  assert(
    checkSecuritySensors(root).includes(
      ".github/workflows/ci.yml must not use privileged or chained trigger: pull_request_target:",
    ),
  );
});

test("checkSecuritySensors rejects persisted checkout credentials", () => {
  const root = mkdtempRoot("jobsentinel-security-sensors-checkout-creds-");
  writeSelfOnlyBaseRepo(root);
  writeFileSync(
    join(root, ".github/workflows/ci.yml"),
    [
      "permissions: {}",
      "jobs:",
      "  security:",
      "    steps:",
      "      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0",
      "      - run: npm audit --audit-level=moderate",
      "      - run: cargo deny check advisories bans licenses sources",
    ].join("\n"),
  );

  assert(
    checkSecuritySensors(root).includes(
      ".github/workflows/ci.yml checkout steps must set persist-credentials: false",
    ),
  );
});
