#!/usr/bin/env node
// Gates publication: valid final-phase evidence must certify the exact re-verified draft, body, assets and local origins.
import { appendFileSync } from "node:fs";

import { getArgValue, getRepoArg, hasArg, isMainModule } from "./args.mjs";
import { assertEvidenceCertifies, checkFinalPhaseEvidence } from "./final-phase-evidence.mjs";
import { parseArgs } from "./public-assets/options.mjs";
import { normalizeReleaseVersion } from "./validate-release-version.mjs";
import { verifyPublicReleaseAssets } from "./verify-public-release-assets.mjs";

export async function runPublishGate(
  { root, version, evidenceRevision, sourceRevision, repo, selection, requireWindowsUnsignedLabel = false, now },
  dependencies = {},
) {
  if (!selection) throw new Error("Publish gate requires the release platform selection.");
  const tag = `v${normalizeReleaseVersion(version)}`;
  const options = parseArgs([
    "--draft",
    "--tag", tag,
    "--repo", repo,
    "--expected-revision", sourceRevision,
    "--selection", selection,
    "--require-supply-chain",
    ...(requireWindowsUnsignedLabel ? ["--require-windows-unsigned-label"] : []),
  ]);
  const result = await verifyPublicReleaseAssets(options, dependencies);
  const checked = checkFinalPhaseEvidence({
    root,
    version,
    evidenceRevision,
    sourceRevision,
    draftUploadedAt: result.uploadedAt,
    now,
  });
  assertEvidenceCertifies(checked, result);
  return { releaseId: result.releaseId, tagCommit: result.tagCommit, assetDigest: result.assetDigest };
}

if (isMainModule(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const input = {
      version: getArgValue(args, "--version"),
      evidenceRevision: getArgValue(args, "--evidence-revision"),
      sourceRevision: getArgValue(args, "--source-revision"),
      repo: getRepoArg(args),
      selection: getArgValue(args, "--selection"),
    };
    if (Object.values(input).some((value) => !value)) {
      throw new Error("Usage: publish-gate.mjs --version vX.Y.Z --evidence-revision <sha> --source-revision <sha> --repo <o/r> --selection <platform>");
    }
    const result = await runPublishGate({ ...input, requireWindowsUnsignedLabel: hasArg(args, "--require-windows-unsigned-label") });
    const output = getArgValue(args, "--github-output");
    if (output) {
      appendFileSync(output, `release_id=${result.releaseId}\nasset_digest=${result.assetDigest}\n`);
    }
    console.log(`Final-phase evidence certifies draft release ${result.releaseId} at ${result.tagCommit}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
