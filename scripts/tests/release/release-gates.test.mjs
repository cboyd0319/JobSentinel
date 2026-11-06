// Exercises release transport authentication boundaries and candidate phase gates.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { parseArgs } from "../../release/public-assets/options.mjs";
import { parseArgs as parseMacosArgs, verifyGitHubAttestation } from "../../release/verify-latest-macos-release.mjs";
import { createReleaseClient } from "../../release/public-assets/client.mjs";
import { validateReleasePhases } from "../../release/release-phases.mjs";

const repo = "owner/project";
const sha = "a".repeat(40);
const digest = "b".repeat(64);
const artifacts = { "app.dmg": digest };
function evidence() {
  return { schemaVersion: 1, version: "3.0.0", revision: sha, platforms: ["macos"], artifacts,
    phases: ["Stability", "Performance", "Security"].map((name, i) => ({
      name, status: "passed", revision: sha, scope: "Full applicable phase", plan: "Full phase plan",
      startedAt: `2026-11-0${i + 1}T00:00:00Z`, completedAt: `2026-11-0${i + 1}T01:00:00Z`,
      decision: { owner: "release owner", rationale: "Full phase accepted", acceptedAt: `2026-11-0${i + 1}T01:00:00Z` },
      remainingRisks: [], commands: [{ command: "verified command", platform: "macos", exitCode: 0,
        evidence: `release-evidence-${i}.json`, sha256: digest }],
    })),
  };
}
const expected = { revision: sha, version: "3.0.0", platforms: ["macos"], artifacts,
  evidenceDigests: Object.fromEntries([0,1,2].map(i => [`release-evidence-${i}.json`, digest])),
  evidenceRecords: Object.fromEntries([0,1,2].map(i => [`release-evidence-${i}.json`,
    {schemaVersion:1, phase:["Stability", "Performance", "Security"][i],
      startedAt:`2026-11-0${i + 1}T00:00:00Z`, completedAt:`2026-11-0${i + 1}T00:30:00Z`,
      revision:sha, command:"verified command", platform:"macos", exitCode:0, output:"Check results", artifacts}])) };

test("phases bind ordered passing work to source, platforms, artifacts and proof", () => {
  assert.doesNotThrow(() => validateReleasePhases(evidence(), expected));
  for (const mutate of [
    e => { e.revision = "c".repeat(40); },
    e => { e.platforms = ["linux"]; },
    e => { e.artifacts = { "app.dmg": "c".repeat(64) }; },
    e => { e.phases.reverse(); },
    e => { delete e.phases[0].decision; },
    e => { e.phases[1].startedAt = e.phases[0].startedAt; },
    e => { e.phases[0].status = "deferred"; },
    e => { e.phases[0].commands[0].exitCode = 1; },
    e => { e.phases[0].commands[0].sha256 = "c".repeat(64); },
    e => { e.phases[0].commands = []; },
    e => { e.phases[0].revision = "c".repeat(40); },
  ]) {
    const value = evidence(); mutate(value);
    assert.throws(() => validateReleasePhases(value, expected));
  }
});

test("public release requests ignore ambient tokens", async () => {
  const requests = [];
  const client = createReleaseClient({ repo, releaseTag: "v3.0.0", token: "secret",
    fetch: async (url, init) => { requests.push({url, ...init}); return new Response(JSON.stringify({draft:false, tag_name:"v3.0.0", assets:[]})); } });
  await client.release();
  assert.equal(requests[0].headers.Authorization, undefined);
});

test("draft authentication stays on exact GitHub API endpoints and strips on redirects", async () => {
  const requests = [];
  const client = createReleaseClient({ repo, releaseTag: "v3.0.0", draft: true, token: "secret",
    fetch: async (url, init) => { requests.push({url, ...init}); return requests.length === 1
      ? new Response(null, {status:302, headers:{location:"https://release-assets.githubusercontent.com/a"}})
      : new Response("asset"); } });
  const response = await client.asset({id:1, name:"app.dmg", url:`https://api.github.com/repos/${repo}/releases/assets/1`});
  assert.equal(await response.text(), "asset");
  assert.equal(requests[0].headers.Authorization, "Bearer secret");
  assert.equal(requests[1].headers.Authorization, undefined);
  await assert.rejects(client.asset({id:1, url:"https://evil.invalid/1"}));
  assert.equal(requests.length, 2);
});

test("release transport rejects unsafe repository paths and redirect destinations", async () => {
  assert.throws(() => createReleaseClient({repo:"owner/../evil"}));
  const client = createReleaseClient({repo, releaseTag:"v3.0.0", fetch: async () =>
    new Response(null, {status:302, headers:{location:"http://localhost/secret"}})});
  await assert.rejects(client.asset({name:"app.dmg", browser_download_url:`https://github.com/${repo}/releases/download/v3.0.0/app.dmg`}));
});

test("phase gate rejects fabricated pass records without structured matching output", () => {
  for (const proof of ["log", {}, {...expected.evidenceRecords["release-evidence-0.json"], exitCode:1},
    {...expected.evidenceRecords["release-evidence-0.json"], revision:"c".repeat(40)},
    {...expected.evidenceRecords["release-evidence-0.json"], output:""},
    {...expected.evidenceRecords["release-evidence-0.json"], phase:"Security"},
    {...expected.evidenceRecords["release-evidence-0.json"], completedAt:"2026-11-05T00:00:00Z"}]) {
    assert.throws(() => validateReleasePhases(evidence(), {...expected,
      evidenceRecords:{...expected.evidenceRecords, "release-evidence-0.json":proof}}));
  }
});

test("phase command line cannot downgrade integrity or use public mode", () => {
  const args = ["--draft", "--require-phases", "--expected-revision", sha];
  assert.equal(parseArgs(args).requirePhases, true);
  for (const flag of ["--unauthenticated", "--no-require-checksum", "--no-require-supply-chain", "--no-require-attestations"]) {
    assert.throws(() => parseArgs([...args, flag]));
  }
  assert.throws(() => parseArgs(["--require-phases"]));
  for (const parse of [parseArgs, parseMacosArgs]) {
    assert.throws(() => parse(["--local-macos"]));
    assert.throws(() => parse(["--local-macos", "--expected-revision", sha, "--no-require-supply-chain"]));
    assert.throws(() => parse(["--local-macos", "--expected-revision", sha, "--no-require-checksum"]));
    assert.equal(parse(["--local-macos", "--expected-revision", sha]).localMacos, true);
  }
  assert.throws(() => parseArgs(["--local-macos", "--expected-revision", sha, "--platforms", "linux"]));
  assert.throws(() => parseArgs(["--platforms", "macos,macos"]));
});

test("attestation verification binds the expected source revision", () => {
  verifyGitHubAttestation({artifactPath:"app.dmg", repo, predicateType:"test", expectedRevision:sha,
    spawn: (_, args) => { assert.deepEqual(args.slice(-2), ["--source-digest", sha]); return {status:0}; }});
});

test("publication waits on draft gates and directly invokes platform-scoped public verification", () => {
  const workflow = parse(readFileSync(new URL("../../../.github/workflows/release.yml", import.meta.url), "utf8"));
  const publish = workflow.jobs["publish-release"];
  assert(publish.needs.includes("verify-draft-release"));
  const draft = workflow.jobs["verify-draft-release"];
  assert.equal(draft.outputs.snapshot, "${{ steps.verify.outputs.snapshot }}");
  const publishRun = publish.steps.find(step => step.name === "Publish hosted release");
  assert.equal(publishRun.env.APPROVED_SNAPSHOT, "${{ needs.verify-draft-release.outputs.snapshot }}");
  assert.match(publishRun.run, /--expected-snapshot "\$APPROVED_SNAPSHOT"/);
  assert(draft.needs.includes("build-release"));
  for (const job of [draft, publish]) {
    const run = job.steps.map(s => s.run || "").join("\n");
    assert.match(run, /--require-phases --expected-revision "\$GITHUB_SHA"/);
    assert.match(run, /--platforms "\$RELEASE_PLATFORMS"/);
  }
  const post = workflow.jobs["verify-public-release"];
  assert(post.needs.includes("publish-release"));
  assert.equal(post.with.require_windows_unsigned_label, "${{ vars.JOBSENTINEL_WINDOWS_REQUIRE_UNSIGNED_LABEL != 'false' }}");
  assert.equal(post.with.local_macos, "${{ inputs.platform == 'windows-linux' }}");
  assert.equal(post.uses, "./.github/workflows/verify-release-artifacts.yml");
  assert.equal(post.with.platforms, "${{ needs.release-inputs.outputs.platforms }}");
  const publicWorkflow = parse(readFileSync(new URL("../../../.github/workflows/verify-release-artifacts.yml", import.meta.url), "utf8"));
  assert(publicWorkflow.on.workflow_call);
  assert.match(publicWorkflow.jobs["verify-macos-public-artifact"].if, /inputs.platforms/);
  for (const job of Object.values(publicWorkflow.jobs)) {
    assert.match(job.steps.map(s => s.run || "").join("\n"), /--unauthenticated/);
  }
});
