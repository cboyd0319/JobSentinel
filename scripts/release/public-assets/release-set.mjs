// Resolves the draft or public release by exact tag and enforces its exact, tag-bound asset set.
import { createHash } from "node:crypto";

import { releasePlatformsAssetName } from "../release-platforms.mjs";
import { expectedReleaseSbomNames } from "../verify-latest-macos-release.mjs";
import { expectedAgentSkillsArchiveNames } from "./agent-skills.mjs";
import { fetchGitHubJson, fetchTagCommit, githubReleaseUrl } from "./http.mjs";

const maxReleasePages = 20;

/** Lists every release (draft or published) whose tag_name is exactly `tag`, across all pages. */
export async function listReleasesForTag({ repo, tag, fetchImpl, token }) {
  if (!tag) throw new Error("Release lookup requires a tag.");
  const matches = [];
  for (let page = 1; page <= maxReleasePages; page += 1) {
    const releases = await fetchGitHubJson(`https://api.github.com/repos/${repo}/releases?per_page=100&page=${page}`, { fetchImpl, token });
    if (!Array.isArray(releases)) throw new Error("GitHub release listing did not return an array.");
    matches.push(...releases.filter((release) => release?.tag_name === tag));
    if (releases.length < 100) return matches;
  }
  throw new Error(`GitHub release listing exceeded ${maxReleasePages} pages; refusing to guess the release for ${tag}.`);
}

async function findDraftRelease({ repo, releaseTag, fetchImpl, token }) {
  const matches = await listReleasesForTag({ repo, tag: releaseTag, fetchImpl, token });
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one release for tag ${releaseTag}; found ${matches.length} releases for tag ${releaseTag}.`);
  }
  return matches[0];
}

/** Returns the release for the verification mode, the tag commit, and the expected version. */
export async function resolveRelease({ options, fetchImpl, token }) {
  const { repo, releaseTag, draft } = options;
  if (draft && !token?.trim()) throw new Error("Draft release verification requires a GitHub token.");
  const release = draft
    ? await findDraftRelease({ repo, releaseTag, fetchImpl, token })
    : await fetchGitHubJson(githubReleaseUrl(repo, releaseTag), { fetchImpl, token });
  const tag = release?.tag_name;
  if (typeof tag !== "string" || (releaseTag && tag !== releaseTag)) {
    throw new Error(`Release lookup returned tag ${tag}, expected ${releaseTag ?? "a tag"}.`);
  }
  if (draft && release.draft !== true) throw new Error(`Release ${tag} is not a draft; refusing draft verification.`);
  if (!draft && release.draft !== false) throw new Error(`Release ${tag} is a draft or unpublished; public verification needs a published release.`);

  const expectedVersion = options.expectedVersion?.replace(/^v/, "") ?? tag.replace(/^v/, "");
  if (tag !== `v${expectedVersion}`) throw new Error(`Release tag ${tag} does not match version ${expectedVersion}.`);

  const tagCommit = await fetchTagCommit(repo, tag, { fetchImpl, token });
  if (options.expectedRevision && options.expectedRevision !== tagCommit) {
    throw new Error(`Release tag ${tag} resolves to ${tagCommit}, expected ${options.expectedRevision}.`);
  }
  return { release, tag, tagCommit, expectedVersion };
}

/** Digest over each asset's (id, name, size, updated_at); any replacement, upload or deletion changes it. */
export function releaseAssetDigest(release) {
  const assets = (Array.isArray(release?.assets) ? release.assets : [])
    .map((asset) => [asset?.id, asset?.name, asset?.size, asset?.updated_at])
    .sort((left, right) => String(left[0]).localeCompare(String(right[0]), "en", { numeric: true }) || String(left[1]).localeCompare(String(right[1])));
  return createHash("sha256").update(JSON.stringify(assets)).digest("hex");
}

/** Newest asset upload or update time; phases must start after it. Fails closed on missing timestamps. */
export function latestAssetUpload(release) {
  const times = (release?.assets ?? []).flatMap((asset) => [asset?.created_at, asset?.updated_at].map((value) => Date.parse(value)));
  if (times.length === 0 || times.some((time) => !Number.isFinite(time))) {
    throw new Error("Release assets must report created_at and updated_at times.");
  }
  return Math.max(...times);
}

/** Rejects duplicate, incomplete or foreign assets before anything is downloaded. */
export function validateReleaseAssetIdentity(release, { repo, tag, draft }) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  const names = assets.map((asset) => asset?.name);
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
  if (duplicates.length > 0) throw new Error(`Release ${tag} has duplicate asset names: ${[...new Set(duplicates)].join(", ")}`);
  for (const asset of assets) {
    if (typeof asset?.name !== "string" || asset.name === "" || asset.name.includes("/")) {
      throw new Error(`Release ${tag} has an asset with an invalid name.`);
    }
    if (asset.state !== undefined && asset.state !== "uploaded") {
      throw new Error(`Release asset ${asset.name} is not fully uploaded (state ${asset.state}).`);
    }
    const expectedUrl = draft
      ? asset.url?.startsWith(`https://api.github.com/repos/${repo}/releases/assets/`)
      : asset.browser_download_url === `https://github.com/${repo}/releases/download/${tag}/${encodeURIComponent(asset.name)}`;
    if (!expectedUrl) throw new Error(`Release asset ${asset.name} download URL is not bound to ${tag} in ${repo}.`);
  }
}

/** Enforces that the release holds exactly the declared asset set, with optional entries allowed only by flags. */
export function validateExactReleaseAssetSet(release, { expectedVersion, platforms, installerAssets, requireChecksum, requireSupplyChain }) {
  const required = new Set();
  const optional = new Set();
  const addWithChecksum = (name) => {
    required.add(name);
    (requireChecksum ? required : optional).add(`${name}.sha256`);
  };
  addWithChecksum(releasePlatformsAssetName(expectedVersion));
  expectedAgentSkillsArchiveNames(expectedVersion).forEach(addWithChecksum);
  for (const platform of platforms) {
    installerAssets.get(platform).forEach((asset) => addWithChecksum(asset.name));
    const { manifestName, sbomName } = expectedReleaseSbomNames(expectedVersion, platform);
    for (const name of [manifestName, sbomName]) (requireSupplyChain ? required : optional).add(name);
  }
  const names = new Set((release.assets ?? []).map((asset) => asset.name));
  const missing = [...required].filter((name) => !names.has(name));
  const unexpected = [...names].filter((name) => !required.has(name) && !optional.has(name));
  if (missing.length > 0) throw new Error(`Release is missing required assets: ${missing.join(", ")}`);
  if (unexpected.length > 0) throw new Error(`Release contains stale or unexpected assets: ${unexpected.join(", ")}`);
}
