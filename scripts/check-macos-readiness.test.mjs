import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  assertMacosReadinessDocsMatch,
  evaluateMacosReadiness,
  formatMacosReadinessReport,
  hasNoAccountMacosReleaseOrder,
  noAccountCompletionPercentage,
  releaseAssetUploadsStayDraft,
  releaseWorkflowBuildsUniversalMacosPackage,
  readMacosDevelopmentReadinessClaims,
  readReadmeMacosReadinessPercent,
  windowsMsiUploadRequiresSignature,
} from "./check-macos-readiness.mjs";

test("macOS readiness report separates public and no-account completion", () => {
  const report = {
    criteria: [],
    externalBlockers: [
      {
        detail: "Needed for public signing.",
        id: "Apple Developer Program account and Developer ID certificate",
        ok: false,
        points: 2,
      },
    ],
    noAccountCeiling: 94,
    noAccountScore: 94,
    percentage: 94,
  };

  assert.equal(noAccountCompletionPercentage(report), 100);
  assert.match(formatMacosReadinessReport(report), /macOS full-public readiness: 94%/);
  assert.match(formatMacosReadinessReport(report), /No-account path completion: 100%/);
  assert.match(formatMacosReadinessReport(report), /No-account score: 94\/94/);
});

test("macOS readiness keeps missing Apple credentials as external blockers", () => {
  const report = evaluateMacosReadiness({ env: {} });

  assert.equal(report.percentage, 94);
  assert.equal(report.noAccountScore, report.noAccountCeiling);
  assert.equal(noAccountCompletionPercentage(report), 100);
  assert.deepEqual(
    report.externalBlockers.map((item) => [item.id, item.ok]),
    [
      ["Apple Developer Program account and Developer ID certificate", false],
      ["Apple notarization credentials", false],
      ["Gatekeeper-required signed public artifact proof", false],
    ],
  );
});

test("macOS readiness reaches public 100 only with Apple release credentials", () => {
  const report = evaluateMacosReadiness({
    env: {
      APPLE_CERTIFICATE: "base64-p12",
      APPLE_CERTIFICATE_PASSWORD: "p12-password",
      APPLE_ID: "developer@example.com",
      APPLE_PASSWORD: "app-specific-password",
      APPLE_SIGNING_IDENTITY: "Developer ID Application: Example LLC (ABCDE12345)",
      APPLE_TEAM_ID: "ABCDE12345",
    },
  });

  assert.equal(report.percentage, 100);
  assert.equal(report.noAccountScore, report.noAccountCeiling);
  assert.equal(noAccountCompletionPercentage(report), 100);
  assert.equal(report.externalBlockers.every((item) => item.ok), true);
});

test("macOS readiness does not count keychain profile-only notarization for CI", () => {
  const report = evaluateMacosReadiness({
    env: {
      APPLE_CERTIFICATE: "base64-p12",
      APPLE_CERTIFICATE_PASSWORD: "p12-password",
      APPLE_SIGNING_IDENTITY: "Developer ID Application: Example LLC (ABCDE12345)",
      JOBSENTINEL_MACOS_NOTARY_PROFILE: "local-notary-profile",
    },
  });

  const notarization = report.externalBlockers.find((item) => item.id === "Apple notarization credentials");
  assert.equal(notarization?.ok, false);
  assert.equal(report.percentage, 96);
});

test("macOS readiness parser reads the README full-public percentage", () => {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-macos-readiness-"));

  try {
    writeFileSync(
      join(root, "README.md"),
      "**Current macOS full-public-readiness: 94%; no-account path completion: 100%.**\n",
    );

    assert.equal(readReadmeMacosReadinessPercent(root), 94);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("macOS development docs separate public and no-account readiness", () => {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-macos-readiness-"));

  try {
    mkdirSync(join(root, "docs/developer"), { recursive: true });
    writeFileSync(
      join(root, "docs/developer/MACOS_DEVELOPMENT.md"),
      "Current macOS full-public-readiness is 94%; no-account path completion is 100%.\n",
    );

    assert.deepEqual(readMacosDevelopmentReadinessClaims(root), {
      fullPublicPercent: 94,
      noAccountCompletionPercent: 100,
      staleNoAccountReleaseReadinessPercent: null,
    });
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("macOS readiness docs guard rejects stale no-account percentage wording", () => {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-macos-readiness-"));
  const report = {
    criteria: [],
    externalBlockers: [],
    noAccountCeiling: 94,
    noAccountScore: 94,
    percentage: 94,
  };

  try {
    mkdirSync(join(root, "docs/developer"), { recursive: true });
    writeFileSync(
      join(root, "README.md"),
      "**Current macOS full-public-readiness: 94%; no-account path completion: 100%.**\n",
    );
    writeFileSync(
      join(root, "docs/developer/MACOS_DEVELOPMENT.md"),
      "Current no-account release-readiness is 94%.\n",
    );

    assert.throws(
      () => assertMacosReadinessDocsMatch(report, root),
      /stale no-account release-readiness wording/,
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("macOS readiness checks no-account release workflow order", () => {
  const orderedWorkflow = [
    "- name: Verify macOS app and DMG",
    "  run: npm run tauri:verify:macos",
    "- name: Label no-account macOS DMG",
    "  run: rm -f \"$current_path.sha256\" \"$labeled_path.sha256\"",
    "- name: Create macOS checksum",
    "  run: shasum -a 256 \"${dmg_paths[0]}\" > \"${dmg_paths[0]}.sha256\"",
    "- name: Remove old macOS release assets",
    "  run: while IFS= read -r asset; do",
    "  run: gh release delete-asset \"$RELEASE_TAG\" \"$asset\" -y",
    "- name: Upload macOS DMG",
    "  with:",
    "    files: src-tauri/target/${{ matrix.target }}/release/bundle/dmg/*.dmg.sha256",
  ].join("\n");

  const staleWorkflow = [
    "- name: Verify macOS app and DMG",
    "  run: npm run tauri:verify:macos",
    "- name: Create macOS checksum",
    "  run: shasum -a 256 \"${dmg_paths[0]}\" > \"${dmg_paths[0]}.sha256\"",
    "- name: Label no-account macOS DMG",
    "  run: rm -f \"$current_path.sha256\" \"$labeled_path.sha256\"",
    "- name: Remove old macOS release assets",
    "  run: while IFS= read -r asset; do",
    "  run: gh release delete-asset \"$RELEASE_TAG\" \"$asset\" -y",
    "- name: Upload macOS DMG",
    "  with:",
    "    files: src-tauri/target/${{ matrix.target }}/release/bundle/dmg/*.dmg.sha256",
  ].join("\n");

  assert.equal(hasNoAccountMacosReleaseOrder(orderedWorkflow), true);
  assert.equal(hasNoAccountMacosReleaseOrder(staleWorkflow), false);
  assert.equal(
    hasNoAccountMacosReleaseOrder(
      orderedWorkflow.replace(
        "while IFS= read -r asset; do",
        "mapfile -t macos_assets < <(",
      ),
    ),
    false,
  );
  assert.equal(
    hasNoAccountMacosReleaseOrder(
      orderedWorkflow.replace(
        "while IFS= read -r asset; do",
        "macos_assets=()\nfor asset in \"${macos_assets[@]}\"; do",
      ),
    ),
    false,
  );
});

test("macOS readiness recognizes universal macOS release matrices", () => {
  const yamlMatrixWorkflow = [
    "platform: macos-26",
    "target: universal-apple-darwin",
    "targets: ${{ matrix.target == 'universal-apple-darwin' && 'aarch64-apple-darwin,x86_64-apple-darwin' || matrix.target }}",
    "run: npm run tauri:build:macos -- --target ${{ matrix.target }}",
  ].join("\n");
  const jsonMatrixWorkflow = [
    'matrix=\'[{"platform_key":"macos","platform":"macos-26","target":"universal-apple-darwin"}]\'',
    "targets: ${{ matrix.target == 'universal-apple-darwin' && 'aarch64-apple-darwin,x86_64-apple-darwin' || matrix.target }}",
    "run: npm run tauri:build:macos -- --target ${{ matrix.target }}",
  ].join("\n");

  assert.equal(releaseWorkflowBuildsUniversalMacosPackage(yamlMatrixWorkflow), true);
  assert.equal(releaseWorkflowBuildsUniversalMacosPackage(jsonMatrixWorkflow), true);
  assert.equal(
    releaseWorkflowBuildsUniversalMacosPackage(
      jsonMatrixWorkflow.replace('"target":"universal-apple-darwin"', '"target":"x86_64-apple-darwin"'),
    ),
    false,
  );
});

test("macOS readiness checks release asset uploads stay draft", () => {
  const workflow = [
    "- name: Upload Windows MSI",
    "  uses: softprops/action-gh-release@abc",
    "  with:",
    "    draft: true",
    "    files: windows.msi",
    "- name: Upload macOS DMG",
    "  uses: softprops/action-gh-release@abc",
    "  with:",
    "    draft: true",
    "    files: macos.dmg",
    "- name: Upload Linux AppImage",
    "  uses: softprops/action-gh-release@abc",
    "  with:",
    "    draft: true",
    "    files: linux.AppImage",
  ].join("\n");

  assert.equal(releaseAssetUploadsStayDraft(workflow), true);
  assert.equal(
    releaseAssetUploadsStayDraft(
      workflow.replace(
        "    draft: true\n    files: macos.dmg",
        "    files: macos.dmg",
      ),
    ),
    false,
  );
});

test("macOS readiness checks Windows MSI signature gate", () => {
  const workflow = [
    "- name: Verify Windows MSI signature and checksum",
    "  run: |",
    "    $signature = Get-AuthenticodeSignature $msi.FullName",
    '    if ($signature.Status -ne "Valid") { throw "unsigned" }',
    "    $hash = Get-FileHash -Algorithm SHA256 $msi.FullName",
    "    Set-Content output.msi.sha256",
    "- name: Upload Windows MSI",
    "  uses: softprops/action-gh-release@abc",
  ].join("\n");

  assert.equal(windowsMsiUploadRequiresSignature(workflow), true);
  assert.equal(
    windowsMsiUploadRequiresSignature(
      workflow.replace("Get-AuthenticodeSignature", "Get-FileHash"),
    ),
    false,
  );
});
