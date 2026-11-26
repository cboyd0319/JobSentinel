#!/usr/bin/env node
// Verifies a draft (pre-publication) or published release's exact asset set, checksums, SBOMs and attestations.

import { createHash } from "node:crypto";
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { assertEvidenceCertifies, checkFinalPhaseEvidence } from "./final-phase-evidence.mjs";
import { assertReleaseBody, composeReleaseNotes } from "./release-notes.mjs";
import { parseStrictJson } from "./strict-json.mjs";
import { releasePlatformsAssetName, validateReleasePlatformDeclaration } from "./release-platforms.mjs";
import { downloadDraftAsset, downloadPublicAsset, envToken } from "./public-assets/http.mjs";
import {
  latestAssetUpload,
  releaseAssetDigest,
  resolveRelease,
  validateExactReleaseAssetSet,
  validateReleaseAssetIdentity,
} from "./public-assets/release-set.mjs";
import {
  findAgentSkillsArchiveAssets,
  validateExactAgentSkillsAssetSet,
  validateAgentSkillsArchiveContents,
} from "./public-assets/agent-skills.mjs";
import { parseArgs } from "./public-assets/options.mjs";
import {
  expectedReleaseSbomNames,
  findChecksumAsset,
  findReleaseAssetByName,
  parseSha256Checksum,
  validateReleaseSbomDocument,
  verifyGitHubAttestation,
} from "./verify-latest-macos-release.mjs";
import { isMainModule } from "./args.mjs";

const spdxPredicateType = "https://spdx.dev/Document/v2.3";
const slsaPredicateType = "https://slsa.dev/provenance/v1";
export const publicReleaseAssetSpecs = {
  windows: [{ extension: ".msi" }, { extension: ".exe" }],
  macos: [{ extension: ".dmg" }],
  linux: [{ extension: ".AppImage" }, { extension: ".deb" }],
};

export function platformSignerWorkflow(repo, platform) {
  return `${repo}/.github/workflows/release-build-${platform}.yml`;
}

function assetNameMatchesVersion(name, expectedVersion) {
  const version = String(expectedVersion ?? "").trim().replace(/^v/i, "");
  if (!version) {
    return false;
  }

  const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^0-9a-z.])v?${escapedVersion}($|[^0-9a-z.])`, "i").test(
    String(name ?? ""),
  );
}

function platformSpec(platform) {
  const spec = publicReleaseAssetSpecs[platform];
  if (!spec) {
    throw new Error(`Unsupported release platform: ${platform}`);
  }
  return spec;
}

export function findPlatformInstallerAssets(release, { platform, expectedVersion }) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];

  return platformSpec(platform).map(({ extension }) => {
    const matches = assets.filter((asset) => {
      const name = typeof asset?.name === "string" ? asset.name : "";
      const url =
        typeof asset?.browser_download_url === "string"
          ? asset.browser_download_url
          : "";

      return (
        name.endsWith(extension) &&
        assetNameMatchesVersion(name, expectedVersion) &&
        url.startsWith("https://")
      );
    });

    if (matches.length !== 1) {
      const names = matches.map((asset) => asset.name).join(", ") || "(none)";
      throw new Error(
        `Expected exactly one ${platform} ${extension} asset for ${expectedVersion}; found ${matches.length}: ${names}`,
      );
    }

    return matches[0];
  });
}

export function validateWindowsUnsignedAssetLabel(asset, { requireWindowsUnsignedLabel }) {
  if (!requireWindowsUnsignedLabel) return;

  const name = typeof asset?.name === "string" ? asset.name : "";
  if (!name.toLowerCase().includes("_unsigned")) {
    throw new Error(
      `Unsigned Windows no-account release asset must include "_unsigned" in the file name: ${name}`,
    );
  }
}

async function sha256File(path) {
  const data = await readFile(path);
  return createHash("sha256").update(data).digest("hex");
}

async function downloadAsset(ctx, asset, label) {
  const assetPath = join(ctx.tempRoot, basename(asset.name));
  console.log(`Downloading ${label}: ${asset.name}`);
  await ctx.download(asset, assetPath);
  const assetStat = await stat(assetPath);
  if (!assetStat.isFile() || assetStat.size === 0) throw new Error(`Downloaded ${label} is empty: ${asset.name}`);
  const digest = await sha256File(assetPath);
  if (asset.digest != null && asset.digest !== `sha256:${digest}`) {
    throw new Error(`Release asset ${asset.name} API digest ${asset.digest} does not match downloaded sha256:${digest}.`);
  }
  ctx.assetHashes.set(asset.name, digest);
  return assetPath;
}

async function verifyChecksum(ctx, asset, assetPath) {
  const checksumAsset = findChecksumAsset(ctx.release, asset);
  if (!checksumAsset) {
    if (ctx.options.requireChecksum) {
      throw new Error(`No SHA-256 checksum asset found for ${asset.name}. Expected ${asset.name}.sha256.`);
    }
    console.warn(`No SHA-256 checksum asset found for ${asset.name}; skipping checksum check.`);
    return await sha256File(assetPath);
  }

  const checksumPath = await downloadAsset(ctx, checksumAsset, "checksum asset");
  const expected = parseSha256Checksum(await readFile(checksumPath, "utf8"), basename(assetPath));
  const actual = await sha256File(assetPath);
  if (actual !== expected) {
    throw new Error(`SHA-256 checksum mismatch for ${asset.name}. Expected ${expected}, found ${actual}.`);
  }
  return actual;
}

async function attest(ctx, artifactPath, signerWorkflow, predicateTypes = [slsaPredicateType]) {
  for (const predicateType of predicateTypes) {
    await ctx.verifyAttestation({
      artifactPath,
      repo: ctx.options.repo,
      predicateType,
      signerWorkflow,
      sourceDigest: ctx.tagCommit,
      sourceRef: `refs/tags/${ctx.tag}`,
      deadline: ctx.deadline,
    });
  }
}

export function validatePublicReleaseSupplyChain({
  manifest,
  sbom,
  sbomDigest,
  assetDigests,
  expectedVersion,
  expectedRevision,
  platform,
  releaseAssets,
}) {
  const { manifestName } = validateReleaseSbomDocument({
    manifest,
    sbom,
    sbomDigest,
    expectedVersion,
    platform,
  });

  if (expectedRevision !== undefined && manifest.source?.sha !== expectedRevision) {
    throw new Error(`${manifestName} source revision expected ${expectedRevision}, found ${manifest.source?.sha}.`);
  }

  for (const [fileName, digest] of Object.entries(assetDigests)) {
    const assetEntry = manifest.assets?.find((asset) => asset.fileName === fileName);
    if (!assetEntry) {
      throw new Error(`${manifestName} must include downloaded release asset ${fileName}.`);
    }

    if (assetEntry.kind !== "installer") {
      throw new Error(`${manifestName} must mark ${fileName} as an installer asset.`);
    }

    if (assetEntry.sha256 !== digest) {
      throw new Error(`${manifestName} SHA-256 for ${fileName} does not match downloaded asset.`);
    }
  }

  if (releaseAssets !== undefined) {
    for (const entry of manifest.assets ?? []) {
      const asset = releaseAssets.find((candidate) => candidate.name === entry.fileName);
      if (!asset || asset.size !== entry.size) {
        throw new Error(`${manifestName} lists ${entry.fileName}, which is not a matching release asset.`);
      }
    }
  }
}

async function verifySupplyChain(ctx, { platform, assetDigests, assetPaths }) {
  const { expectedVersion, options, release } = ctx;
  const { manifestName, sbomName } = expectedReleaseSbomNames(expectedVersion, platform);
  const manifestAsset = findReleaseAssetByName(release, manifestName);
  const sbomAsset = findReleaseAssetByName(release, sbomName);
  if (!manifestAsset || !sbomAsset) {
    const message = `Release is missing required supply-chain assets: ${manifestName}, ${sbomName}.`;
    if (options.requireSupplyChain) {
      throw new Error(message);
    }
    console.warn(`${message} Skipping supply-chain verification.`);
    return;
  }

  const manifestPath = await downloadAsset(ctx, manifestAsset, `${platform} SBOM manifest`);
  const sbomPath = await downloadAsset(ctx, sbomAsset, `${platform} SBOM`);
  validatePublicReleaseSupplyChain({
    manifest: parseStrictJson(await readFile(manifestPath, "utf8"), `${platform} SBOM manifest ${manifestName}`),
    sbom: JSON.parse(await readFile(sbomPath, "utf8")),
    sbomDigest: await sha256File(sbomPath),
    assetDigests,
    expectedVersion,
    expectedRevision: ctx.tagCommit,
    platform,
    releaseAssets: release.assets,
  });

  if (!options.requireAttestations || ctx.sources[platform] !== "hosted") {
    return;
  }

  for (const assetPath of assetPaths) {
    await attest(ctx, assetPath, platformSignerWorkflow(options.repo, platform), [slsaPredicateType, spdxPredicateType]);
  }
}

async function verifyPlatform(ctx, platform, assets) {
  const assetDigests = {};
  const assetPaths = [];

  for (const asset of assets) {
    const assetPath = await downloadAsset(ctx, asset, `${platform} release asset`);
    if (platform === "windows") {
      validateWindowsUnsignedAssetLabel(asset, {
        requireWindowsUnsignedLabel: ctx.options.requireWindowsUnsignedLabel,
      });
    }

    assetDigests[asset.name] = await verifyChecksum(ctx, asset, assetPath);
    assetPaths.push(assetPath);
  }

  await verifySupplyChain(ctx, { platform, assetDigests, assetPaths });
  console.log(`Release ${platform} assets verified.`);
}

async function verifyAgentSkillsArchives(ctx) {
  for (const asset of findAgentSkillsArchiveAssets(ctx.release, { expectedVersion: ctx.expectedVersion })) {
    const assetPath = await downloadAsset(ctx, asset, "Agent Skills archive");
    await verifyChecksum(ctx, asset, assetPath);
    validateAgentSkillsArchiveContents({
      archive: await readFile(assetPath),
      assetName: asset.name,
      expectedVersion: ctx.expectedVersion,
    });

    if (ctx.options.requireAttestations && ctx.hostedStaging) {
      await attest(ctx, assetPath, `${ctx.options.repo}/.github/workflows/release-stage.yml`);
    }
  }

  console.log("Public Agent Skills archives verified.");
}

async function loadPlatformDeclaration(ctx) {
  const name = releasePlatformsAssetName(ctx.expectedVersion);
  const asset = findReleaseAssetByName(ctx.release, name);
  if (!asset) throw new Error(`Release is missing required release platform declaration: ${name}`);
  const path = await downloadAsset(ctx, asset, "release platform declaration");
  if (!findChecksumAsset(ctx.release, asset)) throw new Error(`Release platform declaration is missing ${name}.sha256.`);
  await verifyChecksum(ctx, asset, path);

  const declaration = parseStrictJson(await readFile(path, "utf8"), `Release platform declaration ${name}`);
  const result = validateReleasePlatformDeclaration(declaration, {
    version: ctx.expectedVersion,
    tag: ctx.tag,
    sourceRevision: ctx.tagCommit,
    selection: ctx.options.selection,
    requestedPlatforms: ctx.options.platforms,
  });
  // Hosted staging attests the declaration and skills archives. An all-local declaration has nothing to attest, so the
  // operator must name it: a swapped-in local declaration cannot silently drop the attestations a hosted release needs.
  ctx.hostedStaging = Object.values(result.sources).includes("hosted");
  if (!ctx.hostedStaging && ctx.options.selection !== declaration.selection) {
    throw new Error(`Release platform declaration ${name} declares only local builds; verify it with --selection ${declaration.selection}.`);
  }
  if (ctx.options.requireAttestations && ctx.hostedStaging) {
    await attest(ctx, path, `${ctx.options.repo}/.github/workflows/release-stage.yml`);
  }
  return result;
}

/** Each platform's draft assets: installers, their checksums, SBOM and manifest, with downloaded SHA-256 digests. */
function platformAssetDigests(ctx, platforms, installerAssets) {
  return Object.fromEntries(platforms.map((platform) => {
    const { manifestName, sbomName } = expectedReleaseSbomNames(ctx.expectedVersion, platform);
    const names = new Set([...installerAssets.get(platform).flatMap(({ name }) => [name, `${name}.sha256`]), manifestName, sbomName]);
    const assets = ctx.release.assets
      .filter((asset) => names.has(asset.name))
      .map((asset) => ({ name: asset.name, sha256: ctx.assetHashes.get(asset.name) }))
      .sort((left, right) => (left.name < right.name ? -1 : 1));
    return [platform, assets];
  }));
}

/**
 * Draft mode reads the exact-tag draft through the authenticated asset API before publication and requires its body
 * to match the notes generated from the checked-out tag.
 * Public mode reads metadata from the API (token optional, rate limits only) and downloads every
 * asset anonymously from its tag-bound public URL. An optional `deadline` (epoch ms) bounds every
 * download and attestation call by the time that remains.
 */
export async function verifyPublicReleaseAssets(
  options,
  { fetchImpl = fetch, verifyAttestation = verifyGitHubAttestation, token = envToken(), deadline } = {},
) {
  if (options.platforms?.length === 0) throw new Error("--platforms must name at least one platform when given.");
  if (options.draft && !options.expectedRevision) throw new Error("Draft release verification requires --expected-revision.");
  if (options.draft && options.evidenceRevision) throw new Error("--evidence-revision applies to public verification; drafts use the publish gate.");

  const { release, tag, tagCommit, expectedVersion } = await resolveRelease({ options, fetchImpl, token });
  // A draft's body must already be the notes generated from the checked-out tag, so drift fails before the phases.
  if (options.draft) assertReleaseBody(release, composeReleaseNotes({ version: expectedVersion }));
  const assetDigest = releaseAssetDigest(release);
  validateReleaseAssetIdentity(release, { repo: options.repo, tag, draft: options.draft });

  const tempRoot = mkdtempSync(join(tmpdir(), "jobsentinel-release-verify-"));
  const ctx = {
    download: options.draft
      ? (asset, path) => downloadDraftAsset(asset, path, { fetchImpl, token, deadline })
      : (asset, path) => downloadPublicAsset(asset.browser_download_url, path, { fetchImpl, deadline }),
    deadline,
    expectedVersion,
    options,
    release,
    assetHashes: new Map(),
    sources: {},
    hostedStaging: true,
    tag,
    tagCommit,
    tempRoot,
    verifyAttestation,
  };
  try {
    const { platforms, sources } = await loadPlatformDeclaration(ctx);
    ctx.sources = sources;
    const installerAssets = new Map(
      platforms.map((platform) => [platform, findPlatformInstallerAssets(release, { platform, expectedVersion })]),
    );
    validateExactReleaseAssetSet(release, {
      expectedVersion,
      platforms,
      installerAssets,
      requireChecksum: options.requireChecksum,
      requireSupplyChain: options.requireSupplyChain,
    });
    validateExactAgentSkillsAssetSet(release, { expectedVersion });

    await verifyAgentSkillsArchives(ctx);
    for (const platform of platforms) {
      await verifyPlatform(ctx, platform, installerAssets.get(platform));
    }
    const artifacts = release.assets
      .map((asset) => ({ name: asset.name, sha256: ctx.assetHashes.get(asset.name) }))
      .sort((left, right) => (left.name < right.name ? -1 : 1));
    const unhashed = artifacts.filter((artifact) => !artifact.sha256).map((artifact) => artifact.name);
    if (unhashed.length > 0) throw new Error(`Release assets were not downloaded and hashed: ${unhashed.join(", ")}`);
    const platformAssets = platformAssetDigests(ctx, platforms, installerAssets);
    if (options.evidenceRevision) {
      const checked = checkFinalPhaseEvidence({
        root: options.evidenceRoot,
        version: expectedVersion,
        evidenceRevision: options.evidenceRevision,
        sourceRevision: tagCommit,
      });
      assertEvidenceCertifies(checked, { releaseId: release.id, platforms, artifacts, sources, platformAssets });
      console.log(`Public assets match the final-phase evidence at ${options.evidenceRevision}.`);
    }
    if (options.draftManifest) {
      writeFileSync(
        options.draftManifest,
        `${JSON.stringify({ releaseId: release.id, tag, sourceRevision: tagCommit, artifacts }, null, 2)}\n`,
        { flag: "wx" },
      );
    }
    if (options.githubOutput) {
      appendFileSync(options.githubOutput, `tag=${tag}\nmacos_source=${sources.macos ?? "none"}\n`);
    }
    return { tag, tagCommit, platforms, sources, platformAssets, releaseId: release.id, assetDigest, artifacts, uploadedAt: latestAssetUpload(release) };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

export async function main({ args = process.argv.slice(2) } = {}) {
  const options = parseArgs(args);
  if (options.draft && !options.selection) throw new Error("Draft release verification requires --selection.");
  const result = await verifyPublicReleaseAssets(options);
  console.log(`${options.draft ? "Draft" : "Public"} release ${result.tag} verified for ${result.platforms.join(",")} at ${result.tagCommit}.`);
}

if (isMainModule(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
