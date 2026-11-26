// Builds in-memory GitHub release fixtures and a recording fetch stub for release verifier tests.
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildSkillsTarGz, buildSkillsZip } from "../../release/package-agent-skills.mjs";
import {
  buildReleasePlatformDeclaration,
  releasePlatformsAssetName,
} from "../../release/release-platforms.mjs";
import { composeReleaseNotes } from "../../release/release-notes.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const repo = "example/project";
export const version = "3.0.0";
export const tag = "v3.0.0";
export const revision = "a".repeat(40);
const api = `https://api.github.com/repos/${repo}`;

const installerNames = {
  windows: ["JobSentinel_3.0.0_x64_en-US_unsigned.msi", "JobSentinel_3.0.0_x64-setup_unsigned.exe"],
  macos: ["JobSentinel_3.0.0_no-account_universal.dmg"],
  linux: ["JobSentinel_3.0.0_amd64.AppImage", "JobSentinel_3.0.0_amd64.deb"],
};

let skillsArchives;
function agentSkillsArchives() {
  skillsArchives ??= {
    [`JobSentinel-${version}-agent-skills.tar.gz`]: buildSkillsTarGz(repoRoot, `JobSentinel-${version}-agent-skills`),
    [`JobSentinel-${version}-agent-skills.zip`]: buildSkillsZip(repoRoot, `JobSentinel-${version}-agent-skills`),
  };
  return skillsArchives;
}

/** The sorted names of `platform`'s draft assets: installers, their checksums, SBOM and SBOM manifest. */
export function platformAssetNames(platform) {
  const sbom = [`JobSentinel-${version}-${platform}.sbom-manifest.json`, `JobSentinel-${version}-${platform}.sbom.spdx.json`];
  return [...installerNames[platform].flatMap((name) => [name, `${name}.sha256`]), ...sbom].sort();
}

export function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function checksumFor(name, buffer) {
  return Buffer.from(`${sha256(buffer)}  ${name}\n`);
}

function addWithChecksum(files, name, buffer) {
  files.set(name, buffer);
  files.set(`${name}.sha256`, checksumFor(name, buffer));
}

function platformFiles(files, platform, sourceRevision) {
  const assets = [];
  for (const name of installerNames[platform]) {
    const bytes = Buffer.from(`${platform} installer ${name}`);
    addWithChecksum(files, name, bytes);
    const checksum = files.get(`${name}.sha256`);
    assets.push({ fileName: name, kind: "installer", size: bytes.length, sha256: sha256(bytes) });
    assets.push({ fileName: `${name}.sha256`, kind: "checksum", size: checksum.length, sha256: sha256(checksum) });
  }
  const sbomName = `JobSentinel-${version}-${platform}.sbom.spdx.json`;
  const sbom = Buffer.from(JSON.stringify({ spdxVersion: "SPDX-2.3", SPDXID: "SPDXRef-DOCUMENT", packages: [{ name: "jobsentinel" }] }));
  files.set(sbomName, sbom);
  files.set(
    `JobSentinel-${version}-${platform}.sbom-manifest.json`,
    Buffer.from(JSON.stringify({
      schemaVersion: 1,
      version,
      platform,
      source: { sha: sourceRevision },
      sbom: { fileName: sbomName, sha256: sha256(sbom) },
      assets,
    })),
  );
}

/** Returns release files keyed by asset name for the given platform selection. */
export function releaseFiles({ selection = "linux", sourceRevision = revision } = {}) {
  const files = new Map();
  const declaration = buildReleasePlatformDeclaration({ selection, version, tag, sourceRevision });
  addWithChecksum(files, releasePlatformsAssetName(version), Buffer.from(`${JSON.stringify(declaration, null, 2)}\n`));
  for (const [name, bytes] of Object.entries(agentSkillsArchives())) addWithChecksum(files, name, bytes);
  for (const platform of Object.keys(declaration.platforms)) platformFiles(files, platform, sourceRevision);
  return files;
}

/** Notes generated from this checkout for v3.0.0, as the draft verifier, gate and confirmation regenerate them. */
export const releaseNotes = composeReleaseNotes({ version });

/** `body` defaults to `releaseNotes`, the body staging gives a draft. */
export function releaseFromFiles(
  files,
  { draft = false, downloadTag = tag, id = 101, apiDigests = false, uploadedAt = "2026-11-10T00:00:00Z", body = releaseNotes } = {},
) {
  return {
    id,
    tag_name: tag,
    draft,
    body,
    assets: [...files.entries()].map(([name, bytes], index) => ({
      id: index + 1,
      name,
      size: bytes.length,
      state: "uploaded",
      created_at: "2026-11-09T00:00:00Z",
      updated_at: uploadedAt,
      ...(apiDigests ? { digest: `sha256:${sha256(bytes)}` } : {}),
      url: `${api}/releases/assets/${index + 1}`,
      browser_download_url: `https://github.com/${repo}/releases/download/${draft ? "untagged-1" : downloadTag}/${name}`,
    })),
  };
}

/** Serves a release fixture through a fetch stub that records every request. */
export function fixtureServer({ files, release, releases, tagCommit = revision }) {
  const requests = [];
  const byUrl = new Map();
  for (const asset of release.assets) {
    const bytes = files.get(asset.name) ?? Buffer.alloc(0);
    byUrl.set(asset.url, bytes);
    if (!release.draft) byUrl.set(asset.browser_download_url, bytes);
  }
  const json = (value) => new Response(JSON.stringify(value), { headers: { "content-type": "application/json" } });
  async function fetchImpl(url, init = {}) {
    const headers = { ...(init.headers ?? {}) };
    requests.push({ url, headers });
    if (url === `${api}/releases/tags/${tag}`) return json(release);
    if (url === `${api}/releases/${release.id}`) return json(release);
    if (url === `${api}/releases?per_page=100&page=1`) return json(releases ?? [release]);
    if (url.startsWith(`${api}/releases?per_page=100&page=`)) return json([]);
    if (url === `${api}/commits/${tag}`) return json({ sha: tagCommit });
    if (byUrl.has(url)) {
      if (url.startsWith(api) && headers.Accept !== "application/octet-stream") return json({ url });
      return new Response(byUrl.get(url));
    }
    return new Response("", { status: 404, statusText: "Not Found" });
  }
  return { fetchImpl, requests };
}

export function attestationRecorder() {
  const calls = [];
  return { calls, verifyAttestation: (call) => calls.push(call) };
}
