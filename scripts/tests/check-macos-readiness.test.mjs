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
  releasePublishesAfterSuccessfulUploads,
  releaseWorkflowBuildsUniversalMacosPackage,
  readMacosDevelopmentReadinessClaims,
  readReadmeMacosReadinessPercent,
  windowsInstallerUploadRequiresSignatureOrUnsignedLabel,
  linuxPackageUploadRequiresVerification,
} from "../check-macos-readiness.mjs";

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
    "- name: Stage macOS release assets",
    "  run: cp target/${{ matrix.target }}/release/bundle/dmg/*.dmg.sha256 release-assets/public/",
    "- name: Generate release SBOM",
    "  run: npm run release:sbom -- --require-artifacts",
    "- name: Attest release artifact provenance",
    "  with:",
    "    subject-path: release-assets/public/*",
    "- name: Attest release artifact SBOM",
    "  with:",
    "    subject-path: |",
    "      release-assets/public/*.dmg",
    "      release-assets/public/*.msi",
    "      release-assets/public/*.exe",
    "      release-assets/public/*.AppImage",
    "      release-assets/public/*.deb",
    "    sbom-path: release-assets/public/JobSentinel-1.2.3-macos.sbom.spdx.json",
    "- name: Upload release assets",
    "  run: |",
    "    assets=(release-assets/public/*)",
    "    gh release upload \"$RELEASE_TAG\" \"${assets[@]}\" --clobber",
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
    "    files: target/${{ matrix.target }}/release/bundle/dmg/*.dmg.sha256",
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

test("macOS readiness checks staged uploads and automatic publication", () => {
  const legacyWorkflow = [
    "- name: Upload release assets",
    "  uses: softprops/action-gh-release@abc",
    "  with:",
    "    draft: true",
    "    tag_name: ${{ needs.create-release.outputs.tag }}",
    "    files: release-assets/public/*",
  ].join("\n");
  const workflow = [
    "- name: Create staged release",
    "  env:",
    "    GH_TOKEN: ${{ github.token }}",
    "    GH_REPO: ${{ github.repository }}",
    "    RELEASE_TAG: ${{ steps.release_inputs.outputs.tag }}",
    "  run: |",
    "    gh release edit \"$RELEASE_TAG\" --draft --prerelease=false --notes-file \"$notes_file\"",
    "    gh release create \"$RELEASE_TAG\" --draft --notes-file \"$notes_file\"",
    "- name: Upload release assets",
    "  env:",
    "    GH_TOKEN: ${{ github.token }}",
    "    GH_REPO: ${{ github.repository }}",
    "    RELEASE_TAG: ${{ needs.create-release.outputs.tag }}",
    "  run: |",
    "    assets=(release-assets/public/*)",
    "    gh release upload \"$RELEASE_TAG\" \"${assets[@]}\" --clobber",
    "publish-release:",
    "  needs:",
    "    - create-release",
    "    - build-release",
    "  steps:",
    "    - name: Publish hosted release",
    "      env:",
    "        GH_TOKEN: ${{ github.token }}",
    "        GH_REPO: ${{ github.repository }}",
    "        RELEASE_TAG: ${{ needs.create-release.outputs.tag }}",
    "      run: |",
    "        gh release edit \"$RELEASE_TAG\" --draft=false --prerelease=false",
  ].join("\n");

  assert.equal(releaseAssetUploadsStayDraft(legacyWorkflow), true);
  assert.equal(releaseAssetUploadsStayDraft(workflow), true);
  assert.equal(releasePublishesAfterSuccessfulUploads(workflow), true);
  assert.equal(
    releaseAssetUploadsStayDraft(
      workflow.replaceAll("    GH_REPO: ${{ github.repository }}\n", ""),
    ),
    false,
  );
  assert.equal(
    releaseAssetUploadsStayDraft(
      workflow.replace("steps.release_inputs.outputs.tag", "steps.get_version.outputs.tag"),
    ),
    true,
  );
  assert.equal(
    releasePublishesAfterSuccessfulUploads(
      workflow.replace("        gh release edit \"$RELEASE_TAG\" --draft=false --prerelease=false", ""),
    ),
    false,
  );
  assert.equal(
    releaseAssetUploadsStayDraft(
      workflow.replace(
        "    gh release create \"$RELEASE_TAG\" --draft --notes-file \"$notes_file\"",
        "    gh release create \"$RELEASE_TAG\" --notes-file \"$notes_file\"",
      ),
    ),
    false,
  );
});

test("macOS readiness checks Windows installers are signed or unsigned-labeled", () => {
  const workflow = [
    "- name: Configure Windows signing",
    "  run: |",
    "    JOBSENTINEL_WINDOWS_REQUIRE_SIGNATURE=false",
    "    JOBSENTINEL_WINDOWS_UNSIGNED=true",
    "    Partial Windows signing secrets are configured",
    "    JOBSENTINEL_WINDOWS_REQUIRE_SIGNATURE=true",
    "- name: Label unsigned Windows installers",
    "  run: |",
    "    Kind = \"Windows MSI\"",
    "    Kind = \"Windows NSIS setup\"",
    "    Rename-Item input.msi output_unsigned.msi",
    "    *_unsigned.msi",
    "    *_unsigned.exe",
    "    Labeled unsigned Windows MSI",
    "    Labeled unsigned Windows NSIS setup",
    "- name: Verify Windows installer signatures and checksums",
    "  run: |",
    "    $signature = Get-AuthenticodeSignature $msi.FullName",
    "    WINDOWS_REQUIRE_SIGNATURE",
    '    if ($signature.Status -ne "Valid") { throw "unsigned" }',
    "    *_unsigned.msi",
    "    *_unsigned.exe",
    "    Windows SmartScreen warnings are expected",
    "    $hash = Get-FileHash -Algorithm SHA256 $msi.FullName",
    "    Set-Content output.msi.sha256",
    "- name: Stage Windows release assets",
    "  run: |",
    "    Copy-Item *.msi release-assets/public/",
    "    Copy-Item *.msi.sha256 release-assets/public/",
    "    Copy-Item *.exe release-assets/public/",
    "    Copy-Item *.exe.sha256 release-assets/public/",
    "- name: Upload release assets",
    "  uses: softprops/action-gh-release@abc",
    "  with:",
    "    draft: true",
    "    tag_name: ${{ needs.create-release.outputs.tag }}",
    "    files: release-assets/public/*",
  ].join("\n");

  assert.equal(windowsInstallerUploadRequiresSignatureOrUnsignedLabel(workflow), true);
  assert.equal(
    windowsInstallerUploadRequiresSignatureOrUnsignedLabel(
      workflow.replace("JOBSENTINEL_WINDOWS_UNSIGNED=true", ""),
    ),
    false,
  );
});

test("macOS readiness checks Linux package verification gate", () => {
  const workflow = [
    "- name: Create staged release",
    "  env:",
    "    GH_TOKEN: ${{ github.token }}",
    "    GH_REPO: ${{ github.repository }}",
    "    RELEASE_TAG: ${{ steps.release_inputs.outputs.tag }}",
    "  run: |",
    "    gh release edit \"$RELEASE_TAG\" --draft --prerelease=false --notes-file \"$notes_file\"",
    "    gh release create \"$RELEASE_TAG\" --draft --notes-file \"$notes_file\"",
    "- name: Verify Linux packages and checksums",
    "  env:",
    "    EXPECTED_VERSION: ${{ needs.create-release.outputs.version }}",
    "  run: |",
    "    appimages=(target/x86_64-unknown-linux-gnu/release/bundle/appimage/*.AppImage)",
    "    debs=(target/x86_64-unknown-linux-gnu/release/bundle/deb/*.deb)",
    "    printf 'Expected exactly one Linux AppImage before release upload'",
    "    printf 'Expected exactly one Linux deb before release upload'",
    "    printf 'Linux asset filename does not include release version %s' \"$EXPECTED_VERSION\"",
    "    sha256sum \"$asset\" > \"$asset.sha256\"",
    "    dpkg-deb --info \"${debs[0]}\" >/dev/null",
    "    dpkg-deb --contents \"${debs[0]}\" >/dev/null",
    "- name: Stage Linux release assets",
    "  run: |",
    "    mkdir -p release-assets/public",
    "    cp target/x86_64-unknown-linux-gnu/release/bundle/appimage/*.AppImage release-assets/public/",
    "    cp target/x86_64-unknown-linux-gnu/release/bundle/appimage/*.AppImage.sha256 release-assets/public/",
    "    cp target/x86_64-unknown-linux-gnu/release/bundle/deb/*.deb release-assets/public/",
    "    cp target/x86_64-unknown-linux-gnu/release/bundle/deb/*.deb.sha256 release-assets/public/",
    "- name: Upload release assets",
    "  env:",
    "    GH_TOKEN: ${{ github.token }}",
    "    GH_REPO: ${{ github.repository }}",
    "    RELEASE_TAG: ${{ needs.create-release.outputs.tag }}",
    "  run: |",
    "    assets=(release-assets/public/*)",
    "    gh release upload \"$RELEASE_TAG\" \"${assets[@]}\" --clobber",
  ].join("\n");

  assert.equal(linuxPackageUploadRequiresVerification(workflow), true);
  assert.equal(
    linuxPackageUploadRequiresVerification(workflow.replace("dpkg-deb --contents", "true #")),
    false,
  );
});
