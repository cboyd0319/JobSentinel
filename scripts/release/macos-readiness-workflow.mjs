// Inspects release workflow text for draft staging, upload and publication ordering contracts.
import { hasAll, hasAny } from "./macos-readiness-text.mjs";

export function hasOrderedSnippets(text, snippets) {
  let offset = 0;

  for (const snippet of snippets) {
    const index = text.indexOf(snippet, offset);
    if (index === -1) return false;
    offset = index + snippet.length;
  }

  return true;
}

export function hasNoAccountMacosReleaseOrder(releaseWorkflow) {
  return (
    hasOrderedSnippets(releaseWorkflow, [
      "- name: Verify macOS app and DMG",
      "- name: Label no-account macOS DMG",
      "- name: Create macOS checksum",
      "- name: Remove old macOS release assets",
      "- name: Stage macOS release assets",
      "- name: Generate release SBOM",
      "- name: Attest release artifact provenance",
      "- name: Attest release artifact SBOM",
      "- name: Upload release assets",
    ]) &&
    hasOrderedSnippets(releaseWorkflow, [
      "npm run tauri:verify:macos",
      "rm -f \"$current_path.sha256\" \"$labeled_path.sha256\"",
      "shasum -a 256",
      "node scripts/release/draft-assets.mjs delete-stale --platform macos",
      "release/bundle/dmg/*.dmg.sha256 release-assets/public/",
      "npm run release:sbom",
      "--require-artifacts",
      "subject-path: release-assets/public/*",
      "release-assets/public/*.dmg",
      "release-assets/public/*.exe",
      "sbom-path: release-assets/public/JobSentinel-",
      "node scripts/release/draft-assets.mjs upload",
    ]) &&
    !releaseWorkflow.includes("mapfile ") &&
    !releaseWorkflow.includes("macos_assets")
  );
}

export function releaseWorkflowBuildsUniversalMacosPackage(releaseWorkflow) {
  return (
    hasAny(releaseWorkflow, ['platform: macos-26', '"platform":"macos-26"']) &&
    hasAny(releaseWorkflow, [
      "target: universal-apple-darwin",
      '"target":"universal-apple-darwin"',
    ]) &&
    hasAll(releaseWorkflow, [
      "aarch64-apple-darwin,x86_64-apple-darwin",
      "npm run tauri:build:macos -- --target",
    ])
  );
}

function getWorkflowStepBlock(workflow, stepName) {
  const marker = `- name: ${stepName}`;
  const start = workflow.indexOf(marker);
  if (start === -1) return "";

  const rest = workflow.slice(start + marker.length);
  const nextStep = rest.search(/\n[ \t]*- name: /);
  return nextStep === -1 ? workflow.slice(start) : workflow.slice(start, start + marker.length + nextStep);
}

function getShellCommandBlock(step, command) {
  const start = step.indexOf(command);
  if (start === -1) return "";

  const rest = step.slice(start);
  const next = rest.slice(command.length).search(/\n\s*(?:gh\s+release|else\b|fi\b)/);
  return next === -1 ? rest : rest.slice(0, command.length + next);
}

export function releaseAssetUploadsStayDraft(releaseWorkflow) {
  const createRelease =
    getWorkflowStepBlock(releaseWorkflow, "Create staged release") ||
    getWorkflowStepBlock(releaseWorkflow, "Create draft release");
  const releaseCreate = getShellCommandBlock(createRelease, 'gh release create "$RELEASE_TAG"');
  const createsDraftRelease =
    (createRelease.includes("GH_TOKEN: ${{ github.token }}") &&
      createRelease.includes("GH_REPO: ${{ github.repository }}") &&
      hasAny(createRelease, [
        "RELEASE_TAG: ${{ steps.get_version.outputs.tag }}",
        "RELEASE_TAG: ${{ steps.release_inputs.outputs.tag }}",
      ]) &&
      !createRelease.includes("gh release edit") &&
      hasAll(releaseCreate, [
        'gh release create "$RELEASE_TAG"',
        "--draft",
        "--notes-file",
      ])) ||
    (() => {
      const legacyCreateRelease = getWorkflowStepBlock(releaseWorkflow, "Create Release");
      return (
        legacyCreateRelease.includes("uses: softprops/action-gh-release@") &&
        /\n\s+draft: true\b/.test(legacyCreateRelease)
      );
    })();

  const commonUpload = getWorkflowStepBlock(releaseWorkflow, "Upload release assets");
  if (commonUpload) {
    return (
      (commonUpload.includes("uses: softprops/action-gh-release@") &&
        /\n\s+draft: true\b/.test(commonUpload) &&
        commonUpload.includes("tag_name: ${{ needs.create-release.outputs.tag }}") &&
        commonUpload.includes("files: release-assets/public/*")) ||
      (createsDraftRelease &&
        hasAll(commonUpload, [
          "GH_TOKEN: ${{ github.token }}",
          "RELEASE_ID: ${{ inputs.release_id }}",
          "assets=(release-assets/public/*)",
          "node scripts/release/draft-assets.mjs upload",
          '-- "${assets[@]}"',
        ]) &&
        hasAny(commonUpload, [
          "RELEASE_TAG: ${{ needs.create-release.outputs.tag }}",
          "RELEASE_TAG: ${{ inputs.tag }}",
        ]))
    );
  }

  return ["Upload Windows MSI", "Upload macOS DMG", "Upload Linux AppImage"].every((stepName) => {
    const step = getWorkflowStepBlock(releaseWorkflow, stepName);
    return step.includes("uses: softprops/action-gh-release@") && /\n\s+draft: true\b/.test(step);
  });
}

export function releasePublishesAfterSuccessfulUploads(releaseWorkflow) {
  const publishStep = getWorkflowStepBlock(releaseWorkflow, "Publish hosted release");
  return (
    releaseWorkflow.includes("publish-release:") &&
    hasAll(publishStep, [
      "GITHUB_TOKEN: ${{ github.token }}",
      "RELEASE_ID: ${{ steps.publish_gate.outputs.release_id }}",
      "node scripts/release/publish-release.mjs",
    ]) &&
    hasOrderedSnippets(releaseWorkflow, ["node scripts/release/confirm-verified-draft.mjs", "- name: Publish hosted release"]) &&
    !/gh release edit|gh api/.test(publishStep)
  );
}

export function windowsInstallerUploadRequiresSignatureOrUnsignedLabel(releaseWorkflow) {
  return (
    hasOrderedSnippets(releaseWorkflow, [
      "- name: Verify Windows installer signatures and checksums",
      "- name: Stage Windows release assets",
      "- name: Upload release assets",
    ]) &&
    hasAll(getWorkflowStepBlock(releaseWorkflow, "Configure Windows signing"), [
      "JOBSENTINEL_WINDOWS_REQUIRE_SIGNATURE=false",
      "JOBSENTINEL_WINDOWS_UNSIGNED=true",
      "Partial Windows signing secrets are configured",
      "JOBSENTINEL_WINDOWS_REQUIRE_SIGNATURE=true",
    ]) &&
    hasAll(getWorkflowStepBlock(releaseWorkflow, "Label unsigned Windows installers"), [
      'Kind = "Windows MSI"',
      'Kind = "Windows NSIS setup"',
      "*_unsigned.msi",
      "*_unsigned.exe",
      "Rename-Item",
      "Labeled unsigned",
    ]) &&
    hasAll(getWorkflowStepBlock(releaseWorkflow, "Verify Windows installer signatures and checksums"), [
      "Get-AuthenticodeSignature",
      "WINDOWS_REQUIRE_SIGNATURE",
      'Status -ne "Valid"',
      "*_unsigned.msi",
      "*_unsigned.exe",
      "Windows SmartScreen warnings are expected",
      "Get-FileHash",
      ".sha256",
    ]) &&
    hasAll(getWorkflowStepBlock(releaseWorkflow, "Stage Windows release assets"), [
      "Copy-Item",
      "*.msi",
      "*.msi.sha256",
      "*.exe",
      "*.exe.sha256",
      "release-assets/public/",
    ]) &&
    releaseAssetUploadsStayDraft(releaseWorkflow)
  );
}

export const windowsMsiUploadRequiresSignatureOrUnsignedLabel =
  windowsInstallerUploadRequiresSignatureOrUnsignedLabel;

export const windowsMsiUploadRequiresSignature =
  windowsInstallerUploadRequiresSignatureOrUnsignedLabel;

export function linuxPackageUploadRequiresVerification(releaseWorkflow) {
  return (
    hasOrderedSnippets(releaseWorkflow, [
      "- name: Verify Linux packages and checksums",
      "- name: Stage Linux release assets",
      "- name: Upload release assets",
    ]) &&
    hasAll(getWorkflowStepBlock(releaseWorkflow, "Verify Linux packages and checksums"), [
      "appimages=(",
      "debs=(",
      "Expected exactly one Linux AppImage",
      "Expected exactly one Linux deb",
      "EXPECTED_VERSION",
      "Linux asset filename does not include release version",
      "sha256sum",
      "dpkg-deb --info",
      "dpkg-deb --contents",
    ]) &&
    hasAll(getWorkflowStepBlock(releaseWorkflow, "Stage Linux release assets"), [
      "release-assets/public",
      "*.AppImage",
      "*.AppImage.sha256",
      "*.deb",
      "*.deb.sha256",
    ]) &&
    releaseAssetUploadsStayDraft(releaseWorkflow)
  );
}
