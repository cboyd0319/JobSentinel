// Proves publication requires evidence certifying the exact draft and a last-moment unchanged-draft check.
import assert from "node:assert/strict";
import { gunzipSync, gzipSync } from "node:zlib";
import test from "node:test";

import { confirmVerifiedDraft, parseConfirmArgs } from "../../release/confirm-verified-draft.mjs";
import { runPublishGate } from "../../release/publish-gate.mjs";
import { stageTarget } from "../../release/stage-target.mjs";
import { publishVerifiedRelease } from "../../release/publish-release.mjs";
import { fetchGitHubJson } from "../../release/public-assets/http.mjs";
import { releaseAssetDigest } from "../../release/public-assets/release-set.mjs";
import { parseArgs } from "../../release/public-assets/options.mjs";
import { verifyPublicReleaseAssets } from "../../release/verify-public-release-assets.mjs";
import { finalPhaseEvidence, now, version, withEvidenceRepo } from "./final-phase-fixture.mjs";
import { attestationRecorder, fixtureServer, releaseFiles, releaseFromFiles, releaseNotes, repo, sha256, tag } from "./release-verification-fixture.mjs";

const token = "fixture-token";

function artifactsOf(files) {
  return [...files.keys()].sort().map((name) => ({ name, sha256: sha256(files.get(name)) }));
}

/** Commits evidence for `files` on top of T, then runs the gate against the served draft. */
function gate(
  { root, candidate, commit, writeEvidence },
  { files, served = files, evidence = {}, release, tagCommit = candidate, sourceRevision = candidate, selection = "linux" },
) {
  writeEvidence(finalPhaseEvidence(candidate, { artifacts: artifactsOf(files), ...evidence }));
  const evidenceRevision = commit("record phases");
  const draft = release ?? releaseFromFiles(served, { draft: true });
  const server = fixtureServer({ files: served, release: draft, tagCommit });
  return runPublishGate(
    { root, version, evidenceRevision, sourceRevision, repo, selection, now },
    { fetchImpl: server.fetchImpl, verifyAttestation: attestationRecorder().verifyAttestation, token },
  );
}

test("publish gate passes when evidence certifies the exact draft built from T", async () => {
  await withEvidenceRepo(async (repoFixture) => {
    const files = releaseFiles({ sourceRevision: repoFixture.candidate });
    const result = await gate(repoFixture, { files });
    assert.equal(result.releaseId, 101);
    assert.equal(result.tagCommit, repoFixture.candidate);
    assert.equal(result.assetDigest, releaseAssetDigest(releaseFromFiles(files, { draft: true })));
  });
});

test("publish gate rejects an asset replaced after the phases", async () => {
  await withEvidenceRepo(async (repoFixture) => {
    const files = releaseFiles({ sourceRevision: repoFixture.candidate });
    const served = new Map(files);
    const name = `JobSentinel-${version}-agent-skills.zip.sha256`;
    served.set(name, Buffer.from(`${"f".repeat(64)}  JobSentinel-${version}-agent-skills.zip\n`));
    await assert.rejects(gate(repoFixture, { files, served }), /SHA-256 checksum mismatch for JobSentinel-3\.0\.0-agent-skills\.zip/);

    const evidenceFiles = new Map(files);
    evidenceFiles.set("JobSentinel_3.0.0_amd64.deb", Buffer.from("bytes the phases tested"));
    await assert.rejects(gate(repoFixture, { files: evidenceFiles, served: files }), /SHA-256 changed for JobSentinel_3\.0\.0_amd64\.deb/);
  });
});

test("publish gate rejects a draft body edited after qualification and evidence for other platforms", async () => {
  await withEvidenceRepo(async (repoFixture) => {
    const files = releaseFiles({ sourceRevision: repoFixture.candidate });
    const tampered = releaseFromFiles(files, { draft: true, body: "Download from https://example.invalid instead." });
    await assert.rejects(gate(repoFixture, { files, release: tampered }), /Release 101 body differs from the release notes generated from the tag commit/);
  });
  // A fresh repo: the linux proofs committed above would be unreferenced files in the record directory.
  await withEvidenceRepo(async (repoFixture) => {
    const files = releaseFiles({ sourceRevision: repoFixture.candidate });
    await assert.rejects(gate(repoFixture, { files, evidence: { platforms: ["macos"] } }), /Release platforms linux do not match evidence platforms macos/);
  });
});

test("publish gate rejects missing or extra artifacts in the evidence", async () => {
  await withEvidenceRepo(async (repoFixture) => {
    const files = releaseFiles({ sourceRevision: repoFixture.candidate });
    const missing = artifactsOf(files).filter((artifact) => !artifact.name.endsWith(".deb"));
    await assert.rejects(gate(repoFixture, { files, evidence: { artifacts: missing } }), /uncertified draft asset JobSentinel_3\.0\.0_amd64\.deb/);

    const extra = [...artifactsOf(files), { name: "zz-extra.bin", sha256: "1".repeat(64) }];
    await assert.rejects(gate(repoFixture, { files, evidence: { artifacts: extra } }), /certified asset missing from draft zz-extra\.bin/);
  });
});

test("publish gate rejects a T mismatch, a moved tag, a non-draft and a release id mismatch", async () => {
  await withEvidenceRepo(async (repoFixture) => {
    const files = releaseFiles({ sourceRevision: repoFixture.candidate });
    await assert.rejects(gate(repoFixture, { files, sourceRevision: "c".repeat(40) }), /resolves to [0-9a-f]{40}, expected c{40}/);
    await assert.rejects(gate(repoFixture, { files, tagCommit: "d".repeat(40) }), /resolves to d{40}, expected/);
    await assert.rejects(gate(repoFixture, { files, release: releaseFromFiles(files) }), /is not a draft/);
    await assert.rejects(gate(repoFixture, { files, evidence: { releaseId: 202 } }), /Release id 101 does not match evidence releaseId 202/);
    await assert.rejects(gate(repoFixture, { files, selection: "all" }), /selection expected all, found linux/);
  });
});

test("confirmation rejects asset drift, a moved tag, a published release and a different release id", async () => {
  const files = releaseFiles();
  const release = releaseFromFiles(files, { draft: true });
  const confirmed = { repo, releaseId: 101, tag, tagCommit: "a".repeat(40), assetDigest: releaseAssetDigest(release), artifacts: artifactsOf(files), notes: releaseNotes };
  const run = (overrides = {}, serverRelease = release, tagCommit = "a".repeat(40)) =>
    confirmVerifiedDraft({ ...confirmed, ...overrides }, { fetchImpl: fixtureServer({ files, release: serverRelease, tagCommit }).fetchImpl, token });

  await run();
  const replaced = structuredClone(release);
  replaced.assets[0].updated_at = "2026-11-12T00:00:00Z";
  await assert.rejects(run({}, replaced), /assets changed after verification/);
  await assert.rejects(run({}, release, "e".repeat(40)), /moved after verification/);
  await assert.rejects(run({}, { ...release, draft: false }), /no longer a draft/);
  await assert.rejects(run({}, { ...release, tag_name: "v2.9.5" }), /no longer belongs to tag v3\.0\.0/);
  await assert.rejects(run({ releaseId: "abc" }), /positive integer/);
  await assert.rejects(run({}, { ...release, body: `${releaseNotes}\nEdited after qualification.` }), /body differs from the release notes generated from the tag commit/);
  await assert.rejects(run({ notes: undefined }), /requires the generated release notes/);
});

test("confirmation requires every API content digest to equal the evidence SHA-256", async () => {
  const files = releaseFiles();
  const confirm = (release, artifacts = artifactsOf(files)) =>
    confirmVerifiedDraft(
      { repo, releaseId: 101, tag, tagCommit: "a".repeat(40), assetDigest: releaseAssetDigest(release), artifacts, notes: releaseNotes },
      { fetchImpl: fixtureServer({ files, release, tagCommit: "a".repeat(40) }).fetchImpl, token },
    );

  const withDigests = releaseFromFiles(files, { draft: true, apiDigests: true });
  assert.deepEqual(await confirm(withDigests), { withoutDigest: [] });

  const absent = releaseFromFiles(files, { draft: true });
  assert.deepEqual((await confirm(absent)).withoutDigest, [...files.keys()]);

  const name = "JobSentinel_3.0.0_amd64.deb";
  const mismatched = artifactsOf(files).map((artifact) => (artifact.name === name ? { ...artifact, sha256: "0".repeat(64) } : artifact));
  await assert.rejects(confirm(withDigests, mismatched), /asset JobSentinel_3\.0\.0_amd64\.deb content digest sha256:[0-9a-f]{64} does not match the evidence/);
  const uncertified = artifactsOf(files).filter((artifact) => artifact.name !== name);
  await assert.rejects(confirm(withDigests, uncertified), /asset JobSentinel_3\.0\.0_amd64\.deb content digest/);
});

test("publish gate rejects a build-draft rerun at the same T and release id after the phases started", async () => {
  await withEvidenceRepo(async (repoFixture) => {
    const files = releaseFiles({ sourceRevision: repoFixture.candidate });
    const rerun = releaseFromFiles(files, { draft: true, uploadedAt: "2026-11-12T00:00:00Z" });
    await assert.rejects(gate(repoFixture, { files, release: rerun }), /stability startedAt predates the qualified source revision or draft upload/);
  });
});

test("public verification compares anonymous downloads with the certified digests", async () => {
  await withEvidenceRepo(async ({ root, commit, candidate, writeEvidence }) => {
    const files = releaseFiles({ sourceRevision: candidate });
    writeEvidence(finalPhaseEvidence(candidate, { artifacts: artifactsOf(files) }));
    const evidenceRevision = commit("record phases");
    const verifyPublic = (served, release = releaseFromFiles(served)) =>
      verifyPublicReleaseAssets(
        { ...parseArgs(["--repo", repo, "--tag", tag, "--evidence-revision", evidenceRevision]), evidenceRoot: root },
        { fetchImpl: fixtureServer({ files: served, release, tagCommit: candidate }).fetchImpl, verifyAttestation: () => {}, token: "" },
      );

    await verifyPublic(files);
    const swapped = new Map(files);
    swapped.set("JobSentinel_3.0.0_amd64.deb", Buffer.from("swapped after publication"));
    swapped.set("JobSentinel_3.0.0_amd64.deb.sha256", Buffer.from(`${sha256(swapped.get("JobSentinel_3.0.0_amd64.deb"))}  JobSentinel_3.0.0_amd64.deb\n`));
    await assert.rejects(verifyPublic(swapped), /linux\.sbom-manifest\.json SHA-256 for JobSentinel_3\.0\.0_amd64\.deb does not match downloaded asset/);
    await assert.rejects(verifyPublic(files, { ...releaseFromFiles(files), id: 303 }), /Release id 303 does not match evidence releaseId 101/);

    // A valid, re-compressed Agent Skills tarball with a matching sidecar passes every check except the evidence digests.
    const tarName = `JobSentinel-${version}-agent-skills.tar.gz`;
    const recompressed = gzipSync(gunzipSync(files.get(tarName)), { level: 1 });
    assert.notEqual(sha256(recompressed), sha256(files.get(tarName)));
    const repacked = new Map(files);
    repacked.set(tarName, recompressed);
    repacked.set(`${tarName}.sha256`, Buffer.from(`${sha256(recompressed)}  ${tarName}\n`));
    await assert.rejects(verifyPublic(repacked), /Release assets do not match final-phase evidence: SHA-256 changed for JobSentinel-3\.0\.0-agent-skills\.tar\.gz/);
  });
});

test("staging refuses a tag that already has a published release or several releases", async () => {
  const files = releaseFiles();
  const draft = releaseFromFiles(files, { draft: true });
  const target = (releases, apiToken = token) =>
    stageTarget({ repo, tag }, { fetchImpl: fixtureServer({ files, release: draft, releases }).fetchImpl, token: apiToken });

  assert.deepEqual(await target([]), { state: "none" });
  assert.deepEqual(await target([{ tag_name: "v2.7.6", draft: true }]), { state: "none" });
  assert.deepEqual(await target([draft]), { state: "draft", releaseId: 101 });
  await assert.rejects(target([{ ...draft, draft: false }]), /already has a published release/);
  await assert.rejects(target([draft, { ...draft, id: 202 }]), /has 2 releases/);
  await assert.rejects(target([], ""), /requires a GitHub token/);
});

test("publication re-drafts by id after any failure once the publish PATCH is attempted", async () => {
  const options = parseArgs(["--repo", repo, "--tag", tag, "--evidence-revision", "e".repeat(40)]);
  const releaseUrl = `https://api.github.com/repos/${repo}/releases/101`;
  const notes = releaseNotes;
  const run = ({ verify, publishStatus = 200, redraftStatus = 200, budgetMs, publishedBody = notes }) => {
    const redraftStatuses = [redraftStatus].flat();
    const requests = [];
    const fetchImpl = async (url, init = {}) => {
      if (init.signal?.aborted) throw init.signal.reason;
      requests.push({ url, method: init.method, body: init.body, authorization: init.headers?.Authorization });
      if (JSON.parse(init.body ?? "{}").draft === true && redraftStatuses[0] === "network") {
        redraftStatuses.shift();
        throw new TypeError("fetch failed");
      }
      const { draft } = JSON.parse(init.body ?? "{}");
      const status = draft === true ? (redraftStatuses.length > 1 ? redraftStatuses.shift() : redraftStatuses[0]) : publishStatus;
      // "public" answers the re-draft with 200 but a release that is still published.
      return status === "public" ? Response.json({ draft: false }) : new Response(JSON.stringify({ draft, body: draft === false ? publishedBody : undefined }), { status });
    };
    const result = publishVerifiedRelease({ options, releaseId: 101, name: "JobSentinel 3.0.0", body: notes }, { verify, fetchImpl, token, budgetMs, redraftDelays: [1, 1, 1] });
    return { requests, result };
  };
  const publish = { url: releaseUrl, method: "PATCH", body: JSON.stringify({ name: "JobSentinel 3.0.0", body: notes, draft: false, prerelease: false }), authorization: `Bearer ${token}` };
  const redraft = { url: releaseUrl, method: "PATCH", body: '{"draft":true}', authorization: `Bearer ${token}` };

  const passing = run({ verify: async () => ({ releaseId: 101 }) });
  await passing.result;
  assert.deepEqual(passing.requests, [publish]);

  const failing = run({ verify: async () => { throw new Error("SHA-256 changed for x"); } });
  await assert.rejects(failing.result, /returned to draft: SHA-256 changed for x/);
  assert.deepEqual(failing.requests, [publish, redraft]);

  const patchError = run({ verify: async () => assert.fail("must not verify"), publishStatus: 502 });
  await assert.rejects(patchError.result, /returned to draft: GitHub API request failed .*: 502/);
  assert.deepEqual(patchError.requests, [publish, redraft]);

  const bodyDrift = run({ verify: async () => assert.fail("must not verify"), publishedBody: "other notes" });
  await assert.rejects(bodyDrift.result, /returned to draft: Release 101 body differs from the release notes/);
  assert.deepEqual(bodyDrift.requests, [publish, redraft]);
  await assert.rejects(publishVerifiedRelease({ options, releaseId: 101, name: "JobSentinel 3.0.0" }, { fetchImpl: () => assert.fail("must not send"), token }), /requires the generated release notes/);

  const otherRelease = run({ verify: async () => ({ releaseId: 202 }) });
  await assert.rejects(otherRelease.result, /returned to draft: Verified release 202 is not published release 101/);

  const uncontained = run({ verify: async () => { throw new Error("download failed"); }, redraftStatus: 403 });
  await assert.rejects(uncontained.result, /\(download failed\) and could not be returned to draft: .*: 403/);
  assert.deepEqual(uncontained.requests, [publish, redraft, redraft, redraft, redraft], "a persistent failure is retried, then reported");

  const transient = run({ verify: async () => { throw new Error("download failed"); }, redraftStatus: ["network", 502, 429, 200] });
  await assert.rejects(transient.result, /returned to draft: download failed/);
  assert.deepEqual(transient.requests, [publish, redraft, redraft, redraft, redraft], "network errors, 5xx and 429 are retried");

  const stillPublic = run({ verify: async () => { throw new Error("download failed"); }, redraftStatus: ["public", 200] });
  await assert.rejects(stillPublic.result, /returned to draft: download failed/);
  assert.deepEqual(stillPublic.requests, [publish, redraft, redraft], "a re-draft response that is not a draft is retried");
  const neverDraft = run({ verify: async () => { throw new Error("download failed"); }, redraftStatus: "public" });
  await assert.rejects(neverDraft.result, /could not be returned to draft: Re-draft response for .* has draft false/);

  const notFound = run({ verify: async () => { throw new Error("download failed"); }, redraftStatus: 404 });
  await assert.rejects(notFound.result, /could not be returned to draft: .*: 404/);
  assert.deepEqual(notFound.requests, [publish, redraft], "other client errors are not retried");
});

// The stub honors abort signals like fetch, so a re-draft sent with the expired budget signal would fail here.
test("a fetch hung past the publication budget aborts and still re-drafts the release", { timeout: 5_000 }, async () => {
  const options = parseArgs(["--repo", repo, "--tag", tag, "--evidence-revision", "e".repeat(40)]);
  const requests = [];
  let deadline;
  const fetchImpl = (url, init = {}) => {
    if (init.signal?.aborted) return Promise.reject(init.signal.reason);
    requests.push(JSON.parse(init.body ?? "{}"));
    if (JSON.parse(init.body ?? "{}").draft !== undefined) return Promise.resolve(Response.json(JSON.parse(init.body)));
    return new Promise((_, reject) => init.signal.addEventListener("abort", () => reject(init.signal.reason)));
  };
  // A real verifier request carries its own 30-second per-request signal; only the budget may end it here.
  const hung = async (_options, dependencies) => {
    deadline = dependencies.deadline;
    return fetchGitHubJson("https://api.github.com/repos/o/r/releases/tags/v3.0.0", { fetchImpl: dependencies.fetchImpl, token });
  };
  const started = Date.now();
  await assert.rejects(
    publishVerifiedRelease({ options, releaseId: 101, name: "JobSentinel 3.0.0", body: releaseNotes }, { verify: hung, fetchImpl, token, budgetMs: 50 }),
    /returned to draft: publication and verification exceeded 50 ms/,
  );
  assert.deepEqual(requests, [{ name: "JobSentinel 3.0.0", body: releaseNotes, draft: false, prerelease: false }, {}, { draft: true }]);
  assert(deadline >= started + 50 && deadline <= Date.now(), "verification receives the budget deadline");
});

test("confirmation flags require the asset digest and the evidence revision", () => {
  const base = ["--repo", repo, "--release-id", "101", "--tag", tag, "--tag-commit", "a".repeat(40)];
  const full = [...base, "--asset-digest", "b".repeat(64), "--evidence-revision", "e".repeat(40)];
  assert.equal(parseConfirmArgs(full).evidenceRevision, "e".repeat(40));
  assert.throws(() => parseConfirmArgs([...base, "--asset-digest", "b".repeat(64)]), /Usage:/);
  assert.throws(() => parseConfirmArgs([...base, "--guard"]), /Usage:/);
});
