#!/usr/bin/env node
// Decides whether build-draft may stage a tag: no release yet, or exactly one draft; never a published release.
import { appendFileSync } from "node:fs";

import { getArgValue, getRepoArg, hasArg, isMainModule } from "./args.mjs";
import { envToken } from "./public-assets/http.mjs";
import { listReleasesForTag } from "./public-assets/release-set.mjs";

/** Returns { state: "none" } or { state: "draft", releaseId }; throws on a published release or several releases. */
export async function stageTarget({ repo, tag }, { fetchImpl = fetch, token = envToken() } = {}) {
  if (!token.trim()) throw new Error("Staging check requires a GitHub token to see drafts.");
  const releases = await listReleasesForTag({ repo, tag, fetchImpl, token });
  if (releases.length > 1) throw new Error(`Tag ${tag} has ${releases.length} releases; resolve them before staging.`);
  if (releases.length === 0) return { state: "none" };
  if (releases[0].draft !== true) throw new Error(`Tag ${tag} already has a published release; build-draft will not re-draft or overwrite it.`);
  return { state: "draft", releaseId: releases[0].id };
}

if (isMainModule(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const repo = getRepoArg(args);
    const tag = getArgValue(args, "--tag");
    if (!repo || !tag) throw new Error("Usage: stage-target.mjs --repo <o/r> --tag vX.Y.Z [--require-draft] [--github-output <path>]");
    const { state, releaseId } = await stageTarget({ repo, tag });
    if (hasArg(args, "--require-draft") && state !== "draft") throw new Error(`Tag ${tag} has no staged draft release.`);
    const output = getArgValue(args, "--github-output");
    if (output) appendFileSync(output, hasArg(args, "--require-draft") ? `release_id=${releaseId}\n` : `state=${state}\n`);
    console.log(`Release staging target for ${tag}: ${state}${releaseId ? ` (release ${releaseId})` : ""}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
