#!/usr/bin/env node
// Re-checks by release id that the release is still this tag's unchanged draft, body and asset by asset, before publication.
import { getArgValue, getRepoArg, isMainModule } from "./args.mjs";
import { checkFinalPhaseEvidence } from "./final-phase-evidence.mjs";
import { envToken, fetchGitHubJson, fetchTagCommit } from "./public-assets/http.mjs";
import { releaseAssetDigest } from "./public-assets/release-set.mjs";
import { assertReleaseBody, composeReleaseNotes } from "./release-notes.mjs";

/** Fails unless release `releaseId` is still the draft for `tag` and the tag still resolves to `tagCommit`. */
export async function assertStillDraft({ repo, releaseId, tag, tagCommit }, { fetchImpl = fetch, token = envToken() } = {}) {
  if (!/^[1-9][0-9]*$/.test(String(releaseId))) throw new Error(`Verified release id must be a positive integer, found ${releaseId}.`);
  if (!/^[0-9a-f]{40}$/.test(String(tagCommit))) throw new Error("Verified tag commit must be a full commit SHA.");
  const release = await fetchGitHubJson(`https://api.github.com/repos/${repo}/releases/${releaseId}`, { fetchImpl, token });
  if (String(release?.id) !== String(releaseId) || release.tag_name !== tag) {
    throw new Error(`Release ${releaseId} no longer belongs to tag ${tag}.`);
  }
  if (release.draft !== true) throw new Error(`Release ${releaseId} is no longer a draft.`);
  const currentCommit = await fetchTagCommit(repo, tag, { fetchImpl, token });
  if (currentCommit !== tagCommit) throw new Error(`Tag ${tag} moved after verification: expected ${tagCommit}, found ${currentCommit}.`);
  return release;
}

/**
 * Requires the body to equal `notes`, the notes regenerated from the checked-out tag commit.
 * Adds the asset-list digest check (no asset was added, removed or replaced since verification) and, for every
 * asset whose API metadata carries a `sha256:` content digest, requires it to equal the evidence SHA-256.
 * Returns the names of assets without an API digest; those rely on the metadata digest alone.
 */
export async function confirmVerifiedDraft({ repo, releaseId, tag, tagCommit, assetDigest, artifacts, notes }, dependencies = {}) {
  if (!/^[0-9a-f]{64}$/.test(String(assetDigest))) throw new Error("Verified asset digest must be a SHA-256 hex digest.");
  if (!Array.isArray(artifacts)) throw new Error("Confirmation requires the evidence artifacts.");
  if (typeof notes !== "string" || notes === "") throw new Error("Confirmation requires the generated release notes.");
  const release = await assertStillDraft({ repo, releaseId, tag, tagCommit }, dependencies);
  assertReleaseBody(release, notes);
  const currentDigest = releaseAssetDigest(release);
  if (currentDigest !== assetDigest) {
    throw new Error(`Release ${releaseId} assets changed after verification: expected ${assetDigest}, found ${currentDigest}.`);
  }
  const certified = new Map(artifacts.map((artifact) => [artifact.name, artifact.sha256]));
  const withoutDigest = [];
  for (const asset of release.assets) {
    if (asset.digest == null) {
      withoutDigest.push(asset.name);
    } else if (asset.digest !== `sha256:${certified.get(asset.name)}`) {
      throw new Error(`Release ${releaseId} asset ${asset.name} content digest ${asset.digest} does not match the evidence.`);
    }
  }
  return { withoutDigest };
}

export function parseConfirmArgs(args) {
  const options = {
    repo: getRepoArg(args),
    releaseId: getArgValue(args, "--release-id"),
    tag: getArgValue(args, "--tag"),
    tagCommit: getArgValue(args, "--tag-commit"),
    assetDigest: getArgValue(args, "--asset-digest"),
    evidenceRevision: getArgValue(args, "--evidence-revision"),
  };
  if (Object.values(options).some((value) => !value)) {
    throw new Error(
      "Usage: confirm-verified-draft.mjs --repo <o/r> --release-id <id> --tag vX.Y.Z --tag-commit <sha> --asset-digest <sha256> --evidence-revision <E>",
    );
  }
  return options;
}

if (isMainModule(import.meta.url)) {
  try {
    const options = parseConfirmArgs(process.argv.slice(2));
    const { evidence } = checkFinalPhaseEvidence({ version: options.tag, evidenceRevision: options.evidenceRevision, sourceRevision: options.tagCommit });
    const { withoutDigest } = await confirmVerifiedDraft({ ...options, artifacts: evidence.artifacts, notes: composeReleaseNotes({ version: options.tag }) });
    if (withoutDigest.length > 0) {
      console.log(`No API content digest for ${withoutDigest.join(", ")}; the asset metadata digest covers them.`);
    }
    console.log(`Release ${options.releaseId} is still the unchanged draft for ${options.tag}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
