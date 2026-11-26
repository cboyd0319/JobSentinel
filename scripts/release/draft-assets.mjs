#!/usr/bin/env node
// Mutates a staged draft's assets by release id: one process re-checks the draft guard, then deletes or uploads by id.
import { readFileSync } from "node:fs";
import { win32 } from "node:path";

import { getArgValue, getRepoArg, isMainModule } from "./args.mjs";
import { assertStillDraft } from "./confirm-verified-draft.mjs";
import { envToken, fetchGitHubJson, uploadReleaseAsset } from "./public-assets/http.mjs";
import { publicReleaseAssetSpecs } from "./verify-public-release-assets.mjs";

/** A platform's installers and their checksums; Windows ignores case like the PowerShell filter it replaced. */
function stalePattern(platform) {
  const specs = Object.hasOwn(publicReleaseAssetSpecs, platform) ? publicReleaseAssetSpecs[platform] : undefined;
  if (!specs) throw new Error(`Unsupported release platform: ${platform}`);
  const extensions = specs.map(({ extension }) => extension.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return new RegExp(`(?:${extensions})(?:\\.sha256)?$`, platform === "windows" ? "i" : "");
}

/** The asset name GitHub stores for a local path, accepting `/` and `\` separators. */
export function assetName(file) {
  return win32.basename(String(file));
}

export function staleAssetNames(release, platform) {
  const pattern = stalePattern(platform);
  return (release.assets ?? []).map((asset) => asset.name).filter((name) => pattern.test(name));
}

async function deleteAsset(repo, asset, { fetchImpl, token }) {
  if (!Number.isSafeInteger(asset?.id) || asset.id <= 0) throw new Error(`Release asset ${asset?.name} has no valid id.`);
  await fetchGitHubJson(`https://api.github.com/repos/${repo}/releases/assets/${asset.id}`, { fetchImpl, token, method: "DELETE" });
}

/** Deletes this platform's installers and checksums from draft `releaseId` after re-checking the guard. */
export async function deleteStaleAssets({ platform, ...target }, { fetchImpl = fetch, token = envToken() } = {}) {
  const release = await assertStillDraft(target, { fetchImpl, token });
  const names = staleAssetNames(release, platform);
  for (const name of names) {
    console.log(`Deleting stale ${platform} release asset: ${name}`);
    await deleteAsset(target.repo, release.assets.find((asset) => asset.name === name), { fetchImpl, token });
  }
  return names;
}

/** Uploads `files` to draft `releaseId` after re-checking the guard, replacing same-name assets like `--clobber`. */
export async function uploadAssets({ files, ...target }, { fetchImpl = fetch, token = envToken(), readFile = readFileSync } = {}) {
  if (files.length === 0) throw new Error("No release assets were given for upload.");
  const uploads = files.map((file) => ({ file, name: assetName(file), bytes: readFile(file) }));
  const empty = uploads.find((upload) => upload.bytes.length === 0);
  if (empty) throw new Error(`Release asset is empty: ${empty.file}`);
  if (new Set(uploads.map((upload) => upload.name)).size !== uploads.length) throw new Error("Release asset names must be unique.");
  const release = await assertStillDraft(target, { fetchImpl, token });
  for (const { name, bytes } of uploads) {
    const existing = release.assets.find((asset) => asset.name === name);
    if (existing) await deleteAsset(target.repo, existing, { fetchImpl, token });
    await uploadReleaseAsset({ repo: target.repo, releaseId: target.releaseId, name, bytes }, { fetchImpl, token });
    console.log(`Uploaded release asset: ${name}`);
  }
  return uploads.map((upload) => upload.name);
}

/** `upload|delete-stale --repo <o/r> --release-id <id> --tag vX.Y.Z --tag-commit <sha> [--platform <p>] [-- files...]` */
export function parseDraftAssetArgs(args) {
  const separator = args.indexOf("--");
  const flags = separator < 0 ? args : args.slice(0, separator);
  const options = {
    command: flags[0],
    repo: getRepoArg(flags),
    releaseId: getArgValue(flags, "--release-id"),
    tag: getArgValue(flags, "--tag"),
    tagCommit: getArgValue(flags, "--tag-commit"),
    platform: getArgValue(flags, "--platform"),
    files: separator < 0 ? [] : args.slice(separator + 1),
  };
  const required = ["repo", "releaseId", "tag", "tagCommit", ...(options.command === "delete-stale" ? ["platform"] : [])];
  if (!["upload", "delete-stale"].includes(options.command) || required.some((field) => !options[field])) {
    throw new Error("Usage: draft-assets.mjs (upload ... -- <files> | delete-stale --platform <p> ...) --repo <o/r> --release-id <id> --tag vX.Y.Z --tag-commit <sha>");
  }
  return options;
}

if (isMainModule(import.meta.url)) {
  try {
    const { command, ...options } = parseDraftAssetArgs(process.argv.slice(2));
    if (command === "upload") await uploadAssets(options);
    else await deleteStaleAssets(options);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
