import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const selfOnlyCsp =
  "default-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'";
export function writeBaseRepo(root, csp) {
  mkdirSync(join(root, "docs/security"), { recursive: true });
  mkdirSync(join(root, "docs/architecture"), { recursive: true });
  mkdirSync(join(root, "docs/harness"), { recursive: true });
  mkdirSync(join(root, "docs/developer"), { recursive: true });
  mkdirSync(join(root, ".github/workflows"), { recursive: true });
  mkdirSync(join(root, ".github"), { recursive: true });
  mkdirSync(join(root, "scripts/release"), { recursive: true });
  mkdirSync(join(root, "src-tauri"), { recursive: true });
  mkdirSync(join(root, "src-tauri/capabilities"), { recursive: true });
  mkdirSync(join(root, "crates/jobsentinel-core/src/core/automation/browser"), {
    recursive: true,
  });
  mkdirSync(join(root, "src/features/resumes/builder"), { recursive: true });
  for (const path of ["config", "credentials", "notifications", "sources"]) {
    mkdirSync(join(root, "src/features/settings", path), { recursive: true });
  }
  mkdirSync(join(root, "src/shared/externalAi/internal"), { recursive: true });

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
    join(root, "docs/security/XSS_PREVENTION.md"),
    [
      "# Security",
      "temporary print iframe",
      'iframe.setAttribute("sandbox", "allow-modals")',
      "iframe.srcdoc = sanitizeResumeHtmlDocument(html)",
    ].join("\n"),
  );
  writeFileSync(
    join(root, "docs/architecture/privacy-first-ai-gateway.md"),
    [
      "# AI Gateway",
      "Reviewed outgoing text with obvious prompt-like instructions",
      "Prompt-like, hidden, encoded, and typo-obfuscated reviewed outgoing text",
    ].join("\n"),
  );

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
      "Browser extension manifest",
      "least-privilege manifest review",
      "no broad host permissions",
      "Scraper behavior",
      "Rate limit and error handling tests",
    ].join("\n"),
  );
  writeFileSync(
    join(root, ".github/workflows/ci.yml"),
    [
      "on:",
      "  schedule:",
      '    - cron: "17 11 * * 1"',
      "permissions: {}",
      "jobs:",
      "  changes:",
      "    steps:",
      "      - run: |",
      '          if [ "$event" = "schedule" ]; then',
      "            frontend=false",
      "            harness=true",
      "            rust=false",
      "            security=true",
      "          fi",
      "  security-node:",
      "    permissions:",
      "      actions: read",
      "      contents: read",
      "    steps:",
      "      - run: npm run lint:security",
      "      - uses: zizmorcore/zizmor-action@5f14fd08f7cf1cb1609c1e344975f152c7ee938d # v0.5.6",
      "        with:",
      "          advanced-security: false",
      "          inputs: .github/workflows",
      "      - run: npm audit --audit-level=moderate",
      "      - run: npm run release:check-deps",
      "  security-rust:",
      "    permissions:",
      "      contents: read",
      "    steps:",
      "      - run: cargo deny check advisories bans licenses sources",
    ].join("\n"),
  );
  writeFileSync(
    join(root, ".github/workflows/release.yml"),
    readBaseReleaseWorkflowWithout(""),
  );
  writeFileSync(
    join(root, ".github/workflows/verify-release-artifacts.yml"),
    [
      "permissions: {}",
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
      "      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0",
      "        with:",
      '          node-version: "24.17.0"',
      "          package-manager-cache: false",
      "      - run: |",
      '          RELEASE_TAG="$RELEASE_TAG"',
      '          DISPATCH_TAG="$DISPATCH_TAG"',
      '          npm run tauri:verify:macos:latest -- --tag "$RELEASE_TAG" --require-supply-chain',
    ].join("\n"),
  );
  writeFileSync(
    join(root, "scripts/release/verify-public-release-assets.mjs"),
    [
      "function selectedPlatformAssetExtensions() {}",
      "export function validateExactPublicInstallerAssetSet() {",
      "  throw new Error('stale or unexpected installer assets');",
      "}",
    ].join("\n"),
  );
  writeFileSync(
    join(root, "docs/developer/CI_CD.md"),
    "GitHub `release` environment\nrequired reviewers\nnpm audit --audit-level=moderate\ncargo deny check advisories bans licenses sources\n",
  );
  writeFileSync(
    join(root, ".github/dependabot.yml"),
    [
      "version: 2",
      "updates:",
      '  - package-ecosystem: "npm"',
      '    directory: "/"',
      "    open-pull-requests-limit: 5",
      "    cooldown:",
      "      semver-major-days: 7",
      "      semver-minor-days: 3",
      "      semver-patch-days: 1",
      "    groups:",
      "      npm-production:",
      '        dependency-type: "production"',
      "        patterns:",
      '          - "*"',
      "        update-types:",
      '          - "minor"',
      '          - "patch"',
      "      npm-development:",
      '        dependency-type: "development"',
      "        patterns:",
      '          - "*"',
      "        update-types:",
      '          - "minor"',
      '          - "patch"',
      '  - package-ecosystem: "cargo"',
      '    directory: "/src-tauri"',
      "    open-pull-requests-limit: 5",
      "    cooldown:",
      "      semver-major-days: 7",
      "      semver-minor-days: 3",
      "      semver-patch-days: 1",
      "    groups:",
      "      cargo-minor-patch:",
      "        patterns:",
      '          - "*"',
      "        update-types:",
      '          - "minor"',
      '          - "patch"',
      '  - package-ecosystem: "github-actions"',
      '    directory: "/"',
      "    open-pull-requests-limit: 3",
      "    cooldown:",
      "      semver-major-days: 7",
      "      semver-minor-days: 3",
      "      semver-patch-days: 1",
      "    groups:",
      "      actions-minor-patch:",
      "        patterns:",
      '          - "*"',
      "        update-types:",
      '          - "minor"',
      '          - "patch"',
    ].join("\n"),
  );
  writeFileSync(
    join(root, ".github/CODEOWNERS"),
    [
      "* @cboyd0319",
      ".github/CODEOWNERS @cboyd0319",
      ".github/dependabot.yml @cboyd0319",
      ".github/workflows/ @cboyd0319",
      "package.json @cboyd0319",
      "package-lock.json @cboyd0319",
      "scripts/check-action-pins.mjs @cboyd0319",
      "scripts/check-dependency-pins.mjs @cboyd0319",
      "scripts/check-security-sensors.mjs @cboyd0319",
      "scripts/tests/check-security-sensors.test.mjs @cboyd0319",
      "scripts/security/ @cboyd0319",
      "Cargo.toml @cboyd0319",
      "Cargo.lock @cboyd0319",
      ".cargo/ @cboyd0319",
      "clippy.toml @cboyd0319",
      "deny.toml @cboyd0319",
      "crates/ @cboyd0319",
      "scripts/check-repository-architecture.mjs @cboyd0319",
      "src-tauri/Cargo.toml @cboyd0319",
      "AGENTS.md @cboyd0319",
      "CLAUDE.md @cboyd0319",
      "docs/CLAUDE.md @cboyd0319",
      "src/shared/externalAi/ @cboyd0319",
      "SECURITY.md @cboyd0319",
      "docs/security/ @cboyd0319",
      "src-tauri/capabilities/ @cboyd0319",
      "src-tauri/tauri.conf.json @cboyd0319",
      "crates/jobsentinel-core/src/core/bookmarklet/ @cboyd0319",
      "crates/jobsentinel-core/src/core/credentials/ @cboyd0319",
      "crates/jobsentinel-core/src/core/url_security.rs @cboyd0319",
    ].join("\n"),
  );
  writeFileSync(
    join(root, "src-tauri/tauri.conf.json"),
    JSON.stringify({ app: { security: { csp } } }),
  );
  writeFileSync(
    join(root, "src-tauri/capabilities/default.json"),
    JSON.stringify({
      identifier: "default",
      windows: ["main"],
      permissions: [
        "core:default",
        "notification:allow-is-permission-granted",
        "notification:allow-request-permission",
        "notification:allow-notify",
      ],
    }),
  );
  writeFileSync(
    join(root, "crates/jobsentinel-core/src/core/automation/browser/page.rs"),
    "fn javascript_string_literal(value: &str) { serde_json::to_string(value); }\nfn dropdown_select_script(selector: &str, value: &str) {\n  document.querySelector({selector});\n  select.value = {value};\n}\n",
  );
  writeFileSync(
    join(root, "src/features/settings/config/SettingsConfig.ts"),
    [
      "export interface CredentialStatusValue {",
      "  exists: boolean;",
      "  available: boolean;",
      "  state: CredentialStatusState;",
      "}",
      "export type CredentialStatusState = 'empty' | 'expected' | 'saved' | 'needs_attention';",
      'credentialExists(credentialStatus, "telegram_bot_token");',
      'credentialExists(credentialStatus, "usajobs_api_key");',
    ].join("\n"),
  );
  const aiGatewayBoundarySource = [
    "export type ExternalAiGatewayErrorCode = 'external_ai_prompt_injection_blocked';",
    "function hasPromptLikeExternalAiContent() { return false; }",
    "function validateRequest(outgoingPayload) {",
    "  if (hasPromptLikeExternalAiContent(outgoingPayload)) {",
    "    throw new Error('Details selected for outside AI include instructions aimed at AI tools');",
    "  }",
    "}",
  ].join("\n");
  for (const path of [
    "src/shared/externalAi/internal/aiGateway.ts",
    "src/shared/externalAi/externalAiPayloadPolicy.ts",
    "src/shared/externalAi/internal/promptInspection.ts",
    "src/shared/externalAi/externalAiTypes.ts",
    "src/shared/externalAi/internal/requestValidation.ts",
  ]) {
    writeFileSync(join(root, path), aiGatewayBoundarySource);
  }
  writeFileSync(
    join(root, "src/features/resumes/builder/ResumeBuilderPreviewStep.tsx"),
    [
      "<iframe",
      '  sandbox=""',
      '  referrerPolicy="no-referrer"',
      "  srcDoc={sanitizeResumeHtmlDocument(previewHtml)}",
      "/>",
    ].join("\n"),
  );
  writeFileSync(
    join(root, "src/features/resumes/builder/resumeBuilderExportDom.ts"),
    [
      "function openResumePrintDialog(html) {",
      "  const iframe = document.createElement('iframe');",
      '  iframe.setAttribute("sandbox", "allow-modals");',
      '  iframe.setAttribute("referrerpolicy", "no-referrer");',
      "  const safeHtml = sanitizeResumeHtmlDocument(html);",
      "  iframe.srcdoc = safeHtml;",
      "}",
    ].join("\n"),
  );
  writeFileSync(
    join(
      root,
      "src/features/settings/notifications/SettingsNotificationsSection.tsx",
    ),
    "import { credentialExists } from './SettingsConfig';\n",
  );
  writeFileSync(
    join(root, "src/features/settings/sources/SettingsJobSourcesSection.tsx"),
    "import { credentialExists } from './SettingsConfig';\n",
  );
  writeFileSync(
    join(root, "src/features/settings/SettingsPage.tsx"),
    "export function Settings() {}\n",
  );
  writeFileSync(
    join(root, "src/features/settings/credentials/useSettingsCredentials.ts"),
    "export function useSettingsCredentials() { return {}; }\n",
  );
  writeFileSync(
    join(root, "src/index.css"),
    '@import "tailwindcss";\n@config "../tailwind.config.js";\n',
  );
}

export function writeSelfOnlyBaseRepo(root) {
  writeBaseRepo(root, selfOnlyCsp);
}

export function mkdtempRoot(prefix) {
  const root = join(
    tmpdir(),
    `${prefix}${process.pid}-${Math.random().toString(16).slice(2)}`,
  );
  mkdirSync(root, { recursive: true });
  return root;
}

export function readBaseReleaseWorkflowWithout(removedLine) {
  return [
    "permissions: {}",
    "jobs:",
    "  release-inputs:",
    "    steps:",
    "      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0",
    "        with:",
    '          node-version: "24.17.0"',
    "          package-manager-cache: false",
    "      - run: |",
    '          if [[ ! "$version" =~ ^[0-9]+\\.[0-9]+\\.[0-9]+$ ]]; then',
    "            printf 'Release version must be an exact stable semver (x.y.z), found: %s\\n' \"$version\"",
    "            exit 1",
    "          fi",
    '          expected_ref="refs/tags/v${version}"',
    '          if [ "${GITHUB_REF:-}" != "$expected_ref" ]; then',
    '            printf \'Manual release dispatch must run from %s. Select the existing release tag as the workflow ref. Found: %s\\n\' "$expected_ref" "${GITHUB_REF:-<unset>}"',
    "            exit 1",
    "          fi",
    '      - run: npm run release:check-version -- "$RELEASE_VERSION"',
    "  preflight-harness:",
    "    needs: release-inputs",
    "    steps:",
    "      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0",
    "        with:",
    '          node-version: "24.17.0"',
    "          package-manager-cache: false",
    '      - run: npm run release:readiness -- --version "$RELEASE_VERSION"',
    "      - run: npm run harness:check",
    "      - run: npm run release:check-deps",
    "      - run: npm run test:scripts",
    "      - run: npm run lint:md",
    "  preflight-frontend:",
    "    needs: release-inputs",
    "    steps:",
    "      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0",
    "        with:",
    '          node-version: "24.17.0"',
    "          package-manager-cache: false",
    "      - run: npm run lint",
    "      - run: npm test -- --run",
    "      - run: npm run build",
    "  preflight-rust:",
    "    needs: release-inputs",
    "    steps:",
    "      - run: cargo fmt --all -- --check",
    "      - run: cargo clippy --workspace -- -D warnings",
    "      - run: cargo test --workspace",
    "  preflight-security-node:",
    "    needs: release-inputs",
    "    steps:",
    "      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0",
    "        with:",
    '          node-version: "24.17.0"',
    "          package-manager-cache: false",
    "      - run: npm run lint:security\n      - uses: zizmorcore/zizmor-action@5f14fd08f7cf1cb1609c1e344975f152c7ee938d # v0.5.6\n        with:\n          advanced-security: false\n          inputs: .github/workflows\n      - run: npm audit --audit-level=moderate",
    "  preflight-security-rust:",
    "    needs: release-inputs",
    "    steps:",
    "      - run: cargo install cargo-deny --version 0.19.9 --locked",
    "      - run: cargo deny check advisories bans licenses sources",
    "  create-release:",
    "    needs:",
    "      - release-inputs",
    "      - preflight-harness",
    "      - preflight-frontend",
    "      - preflight-rust",
    "      - preflight-security-node",
    "      - preflight-security-rust",
    "    environment:",
    "      name: release",
    "    steps:",
    "      - run: |",
    '          gh release edit "$RELEASE_TAG" --notes-file "$notes_file"',
    '          gh release create "$RELEASE_TAG" --notes-file "$notes_file"',
    "  build-release:",
    "    environment:",
    "      name: release",
    "    permissions:",
    "      artifact-metadata: write",
    "      attestations: write",
    "      contents: write",
    "      id-token: write",
    "    steps:",
    "      - run: file=1:5.45-3build1 libfuse2t64=2.9.9-8.1build1 squashfs-tools=1:4.6.1-1build1",
    "      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0",
    "        with:",
    '          node-version: "24.17.0"',
    "          package-manager-cache: false",
    "      - name: Build Linux Tauri app",
    '          APPIMAGE_EXTRACT_AND_RUN: "1"',
    "        run: node scripts/platform/build-linux-appimage.mjs --target x86_64-unknown-linux-gnu",
    "      - name: Configure Windows signing",
    "        run: |",
    "          WINDOWS_CERTIFICATE",
    "          WINDOWS_CERTIFICATE_PASSWORD",
    "          WINDOWS_CERTIFICATE_THUMBPRINT",
    "          WINDOWS_TIMESTAMP_URL",
    "          Import-PfxCertificate",
    "          Remove-Item -LiteralPath $certificatePath",
    "          tauri.windows.conf.json",
    "      - name: Clean Windows signing material",
    "        run: |",
    "          Remove-Item -LiteralPath $certificate.PSPath -DeleteKey",
    '          Remove-Item -LiteralPath "src-tauri/tauri.windows.conf.json" -Force -ErrorAction SilentlyContinue',
    "      - run: |",
    '          keychain_password="$(openssl rand -hex 24)"',
    "          printf '::add-mask::%s\\n' \"$keychain_password\"",
    "          JOBSENTINEL_MACOS_NO_ACCOUNT=true",
    "          labeled_name=JobSentinel_1.2.3_no-account_universal.dmg",
    "          npm run tauri:verify:macos -- --launch-smoke --install-smoke --require-checksum --require-gatekeeper --expected-bundle-id com.jobsentinel.main --expected-product-name JobSentinel --expected-version 1.2.3 --expected-icon-file icon.icns --expected-minimum-system-version 13.0",
    "      - name: Clean up macOS signing material",
    "        run: |",
    '          security delete-keychain "$RUNNER_TEMP/jobsentinel-signing.keychain-db" >/dev/null 2>&1 || :',
    '          rm -f "$RUNNER_TEMP/jobsentinel-certificate.p12"',
    '          rm -f "$RUNNER_TEMP"/AuthKey_*.p8',
    "      - run: |",
    "          npm run release:sbom -- --require-artifacts --checksums-out release-assets/attestation-subjects.sha256",
    "      - uses: actions/attest@59d89421af93a897026c735860bf21b6eb4f7b26 # v4.1.0",
    "        with:",
    "          subject-path: release-assets/public/*",
    "      - uses: actions/attest@59d89421af93a897026c735860bf21b6eb4f7b26 # v4.1.0",
    "        with:",
    "          subject-path: |\n            release-assets/public/*.dmg\n            release-assets/public/*.msi\n            release-assets/public/*.exe\n            release-assets/public/*.AppImage\n            release-assets/public/*.deb",
    "          sbom-path: release-assets/public/JobSentinel-1.2.3-macos.sbom.spdx.json",
    '      - run: gh release upload "$RELEASE_TAG" release-assets/public/* --clobber',
  ]
    .join("\n")
    .replace(removedLine, "");
}
