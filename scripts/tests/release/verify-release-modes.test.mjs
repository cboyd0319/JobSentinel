// Proves draft and public release verification modes against in-memory release fixtures.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { parseArgs } from "../../release/public-assets/options.mjs";
import { verifyPublicReleaseAssets } from "../../release/verify-public-release-assets.mjs";
import {
  attestationRecorder,
  checksumFor,
  fixtureServer,
  releaseFiles,
  releaseFromFiles,
  releaseNotes,
  repo,
  revision,
  sha256,
  tag,
  version,
} from "./release-verification-fixture.mjs";

const token = "fixture-token";
const declarationName = `JobSentinel-${version}-release-platforms.json`;

function options(args) {
  return parseArgs(["--repo", repo, "--tag", tag, ...args]);
}

async function verify({ args = [], files = releaseFiles(), draft = false, release, releases, tagCommit, apiToken = token, deadline }) {
  const releaseValue = release ?? releaseFromFiles(files, { draft });
  const server = fixtureServer({ files, release: releaseValue, releases, tagCommit });
  const attest = attestationRecorder();
  const result = await verifyPublicReleaseAssets(options(args), {
    fetchImpl: server.fetchImpl,
    verifyAttestation: attest.verifyAttestation,
    token: apiToken,
    deadline,
  });
  return { result, requests: server.requests, attestations: attest.calls };
}

function replaceFile(files, name, bytes) {
  files.set(name, bytes);
  if (files.has(`${name}.sha256`)) files.set(`${name}.sha256`, checksumFor(name, bytes));
  return files;
}

test("public mode verifies the declared single platform and downloads without credentials", async () => {
  const { result, requests } = await verify({});

  assert.deepEqual(result.platforms, ["linux"]);
  const downloads = requests.filter((request) => request.url.startsWith("https://github.com/"));
  assert(downloads.length >= 10);
  for (const request of downloads) assert.equal(request.headers.Authorization, undefined, request.url);
  for (const request of requests.filter((item) => item.url.startsWith("https://api.github.com/"))) {
    assert.equal(request.headers.Authorization, `Bearer ${token}`);
  }
  assert(!requests.some((request) => request.url.startsWith("https://api.github.com/") && request.headers.Accept === "application/octet-stream"));
});

test("public mode downloads stay anonymous when the environment carries a token", async () => {
  const previous = process.env.GITHUB_TOKEN;
  process.env.GITHUB_TOKEN = "ambient-token";
  try {
    const { requests } = await verify({ apiToken: "" });
    for (const request of requests) assert.equal(request.headers.Authorization, undefined, request.url);
  } finally {
    if (previous === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = previous;
  }
});

test("public mode rejects requested platforms that differ from the declaration", async () => {
  await assert.rejects(verify({ args: ["--platforms", "windows,macos,linux"] }), /does not match declared platforms linux/);
  await assert.rejects(
    verify({ args: ["--platforms", "windows"], files: releaseFiles({ selection: "all" }) }),
    /does not match declared platforms windows,macos,linux/,
  );
});

test("public mode fails closed on a missing, malformed or other-revision declaration", async () => {
  const missing = releaseFiles();
  missing.delete(declarationName);
  missing.delete(`${declarationName}.sha256`);
  await assert.rejects(verify({ files: missing }), /missing required release platform declaration/);

  await assert.rejects(verify({ files: replaceFile(releaseFiles(), declarationName, Buffer.from("{not json")) }), /malformed/);
  await assert.rejects(verify({ tagCommit: "b".repeat(40) }), /sourceRevision expected b{40}/);
});

test("public mode rejects stale, undeclared, duplicate and unknown assets", async () => {
  const stale = releaseFiles();
  stale.set("JobSentinel_2.9.0_amd64.deb", Buffer.from("old"));
  await assert.rejects(verify({ files: stale }), /unexpected assets: JobSentinel_2\.9\.0_amd64\.deb/);

  const undeclared = releaseFiles();
  undeclared.set("JobSentinel_3.0.0_x64_en-US_unsigned.msi", Buffer.from("msi"));
  await assert.rejects(verify({ files: undeclared }), /unexpected assets: JobSentinel_3\.0\.0_x64_en-US_unsigned\.msi/);

  const unknown = releaseFiles();
  unknown.set("notes.txt", Buffer.from("notes"));
  await assert.rejects(verify({ files: unknown }), /unexpected assets: notes\.txt/);

  const files = releaseFiles();
  const release = releaseFromFiles(files);
  release.assets.push({ ...release.assets[0] });
  await assert.rejects(verify({ files, release }), /duplicate asset names/);
});

test("public mode rejects checksum, SBOM revision and manifest drift", async () => {
  const badChecksum = releaseFiles();
  badChecksum.set("JobSentinel_3.0.0_amd64.deb", Buffer.from("tampered"));
  await assert.rejects(verify({ files: badChecksum }), /SHA-256 checksum mismatch for JobSentinel_3\.0\.0_amd64\.deb/);

  const otherRevision = releaseFiles();
  for (const [name, bytes] of releaseFiles({ sourceRevision: "c".repeat(40) })) {
    if (name.endsWith(".sbom-manifest.json")) otherRevision.set(name, bytes);
  }
  await assert.rejects(verify({ files: otherRevision }), /source revision expected a{40}, found c{40}/);

  const incomplete = releaseFiles();
  const manifestName = `JobSentinel-${version}-linux.sbom-manifest.json`;
  const manifest = JSON.parse(incomplete.get(manifestName));
  manifest.assets.push({ fileName: "JobSentinel_3.0.0_amd64.rpm", kind: "installer", size: 1, sha256: "0".repeat(64) });
  incomplete.set(manifestName, Buffer.from(JSON.stringify(manifest)));
  await assert.rejects(verify({ files: incomplete }), /lists JobSentinel_3\.0\.0_amd64\.rpm, which is not a matching release asset/);
});

test("public mode rejects drafts and download URLs bound to another tag", async () => {
  const files = releaseFiles();
  await assert.rejects(verify({ files, release: { ...releaseFromFiles(files), draft: true } }), /is a draft/);
  await assert.rejects(
    verify({ files, release: releaseFromFiles(files, { downloadTag: "v2.9.5" }) }),
    /download URL is not bound to v3\.0\.0/,
  );
});

test("draft mode verifies the selection with authenticated asset API downloads", async () => {
  const files = releaseFiles({ selection: "windows-linux" });
  const { result, requests, attestations } = await verify({
    args: ["--draft", "--selection", "windows-linux", "--expected-revision", revision],
    files,
    draft: true,
  });

  assert.deepEqual(result.platforms, ["windows", "macos", "linux"]);
  assert.deepEqual(result.sources, { windows: "hosted", macos: "local", linux: "hosted" });
  assert(!requests.some((request) => request.url.startsWith("https://github.com/")));
  for (const request of requests) assert.equal(request.headers.Authorization, `Bearer ${token}`);
  const attested = attestations.map((call) => call.artifactPath.split("/").pop());
  assert(attested.includes("JobSentinel_3.0.0_amd64.deb"));
  assert(attested.includes(declarationName));
  assert(!attested.includes("JobSentinel_3.0.0_no-account_universal.dmg"));
});

test("draft mode fails closed on selection, token, revision and release ambiguity", async () => {
  const draftArgs = (selection) => ["--draft", "--selection", selection, "--expected-revision", revision];
  const all = releaseFiles({ selection: "all" });
  await assert.rejects(verify({ args: draftArgs("linux"), files: all, draft: true }), /selection expected linux, found all/);
  await assert.rejects(verify({ args: draftArgs("linux"), draft: true, apiToken: "" }), /requires a GitHub token/);
  await assert.rejects(
    verify({ args: ["--draft", "--selection", "linux", "--expected-revision", "d".repeat(40)], draft: true }),
    /tag v3\.0\.0 resolves to a{40}, expected d{40}/,
  );
  await assert.rejects(verify({ args: ["--draft", "--selection", "linux"], draft: true }), /requires --expected-revision/);
  await assert.rejects(verify({ args: draftArgs("linux") }), /v3\.0\.0 is not a draft/);

  const files = releaseFiles();
  const release = releaseFromFiles(files, { draft: true });
  await assert.rejects(
    verify({ args: draftArgs("linux"), files, release, releases: [release, { ...release, id: 2 }] }),
    /found 2 releases for tag v3\.0\.0/,
  );
  await assert.rejects(
    verify({ args: draftArgs("linux"), files, release, releases: [{ tag_name: "v2.7.6", draft: true, assets: [] }] }),
    /found 0 releases for tag v3\.0\.0/,
  );
});

test("verified platform set is written to the requested GitHub output file", async () => {
  const dir = mkdtempSync(join(tmpdir(), "jobsentinel-release-output-"));
  try {
    const outputPath = join(dir, "output");
    await verify({ args: ["--github-output", outputPath], files: releaseFiles({ selection: "windows-linux" }) });
    assert.equal(readFileSync(outputPath, "utf8"), "tag=v3.0.0\nmacos_source=local\n");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

const draftArgs = ["--draft", "--selection", "linux", "--expected-revision", revision];

test("draft mode requires the body generated from the checked-out tag, up to line endings", async () => {
  const files = releaseFiles();
  const draftWith = (body) => verify({ args: draftArgs, files, release: releaseFromFiles(files, { draft: true, body }) });
  await draftWith(releaseNotes.replace(/\n/g, "\r\n").trimEnd());
  const withoutStatus = releaseNotes.slice(0, releaseNotes.indexOf("\n## Package Status"));
  for (const body of [withoutStatus, `${releaseNotes}\nDownload from https://example.invalid instead.`, null]) {
    await assert.rejects(draftWith(body), /Release 101 body differs from the release notes generated from the tag commit/, JSON.stringify(body));
  }
  // Public mode does not check the body: published bodies may be edited after release.
  await verify({ files, release: releaseFromFiles(files, { body: "Edited after publication." }) });
});

test("draft mode finds the exact tag on a later release page", async () => {
  const files = releaseFiles();
  const release = releaseFromFiles(files, { draft: true });
  const filler = Array.from({ length: 100 }, (_, index) => ({ id: 1000 + index, tag_name: `v2.7.${index}`, draft: true, assets: [] }));
  const server = fixtureServer({ files, release, releases: filler });
  const pageTwo = server.fetchImpl;
  const fetchImpl = (url, init) =>
    url.endsWith("/releases?per_page=100&page=2") ? Promise.resolve(new Response(JSON.stringify([release]))) : pageTwo(url, init);
  const result = await verifyPublicReleaseAssets(options(draftArgs), { fetchImpl, verifyAttestation: () => {}, token });
  assert.equal(result.releaseId, 101);
});

test("draft mode enforces the Windows unsigned label", async () => {
  const files = releaseFiles({ selection: "windows" });
  const args = ["--draft", "--selection", "windows", "--expected-revision", revision, "--require-windows-unsigned-label"];
  await verify({ args, files, draft: true });

  const unlabeled = new Map();
  for (const [name, bytes] of files) unlabeled.set(name.replace("_x64_en-US_unsigned.msi", "_x64_en-US.msi"), bytes);
  await assert.rejects(verify({ args, files: unlabeled, draft: true }), /must include "_unsigned" in the file name: JobSentinel_3\.0\.0_x64_en-US\.msi/);
});

test("draft mode rejects an API digest that disagrees with the downloaded bytes", async () => {
  const files = releaseFiles();
  await verify({ args: draftArgs, files, release: releaseFromFiles(files, { draft: true, apiDigests: true }) });
  const release = releaseFromFiles(files, { draft: true, apiDigests: true });
  release.assets.find((asset) => asset.name.endsWith(".deb")).digest = `sha256:${"0".repeat(64)}`;
  await assert.rejects(verify({ args: draftArgs, files, release }), /JobSentinel_3\.0\.0_amd64\.deb API digest sha256:0{64} does not match/);
});

test("draft mode writes a manifest hashing every draft asset and pins attestations to the tag", async () => {
  const dir = mkdtempSync(join(tmpdir(), "jobsentinel-draft-manifest-"));
  try {
    const files = releaseFiles();
    const manifestPath = join(dir, "draft.json");
    const deadline = Date.now() + 60_000;
    const { attestations } = await verify({ args: [...draftArgs, "--draft-manifest", manifestPath], files, draft: true, deadline });
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    assert.equal(manifest.releaseId, 101);
    assert.equal(manifest.sourceRevision, revision);
    assert.deepEqual(
      manifest.artifacts,
      [...files.keys()].sort().map((name) => ({ name, sha256: sha256(files.get(name)) })),
    );
    assert(attestations.some((call) => call.artifactPath.endsWith("agent-skills.zip")));
    for (const call of attestations) {
      assert.equal(call.sourceDigest, revision);
      assert.equal(call.sourceRef, "refs/tags/v3.0.0");
      assert.equal(call.deadline, deadline);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("declaration and SBOM manifest reject duplicate JSON keys", async () => {
  const declaration = releaseFiles();
  const declarationName = `JobSentinel-${version}-release-platforms.json`;
  const declarationText = declaration.get(declarationName).toString("utf8").replace('"selection": "linux"', '"selection": "linux",\n  "selection": "linux"');
  declaration.set(declarationName, Buffer.from(declarationText));
  declaration.set(`${declarationName}.sha256`, checksumFor(declarationName, declaration.get(declarationName)));
  await assert.rejects(verify({ files: declaration }), /Release platform declaration .* has duplicate key selection/);

  const manifest = releaseFiles();
  const manifestName = `JobSentinel-${version}-linux.sbom-manifest.json`;
  manifest.set(manifestName, Buffer.from(manifest.get(manifestName).toString("utf8").replace('"platform":"linux"', '"platform":"linux","platform":"linux"')));
  await assert.rejects(verify({ files: manifest }), /linux SBOM manifest .* has duplicate key platform/);
});
