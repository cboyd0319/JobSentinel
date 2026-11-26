// Proves final-phase evidence binds passed Stability, Performance and Security records to tag commit T.
import assert from "node:assert/strict";
import test from "node:test";

import { checkFinalPhaseEvidence, validateFinalPhaseEvidence } from "../../release/final-phase-evidence.mjs";
import { candidateDate, evidencePath, finalPhaseEvidence, now, phaseRecord, version, withEvidenceRepo } from "./final-phase-fixture.mjs";

test("evidence passes when E adds only the evidence file and its phase records", async () => {
  await withEvidenceRepo(({ root, commit, candidate, writeEvidence }) => {
    writeEvidence(finalPhaseEvidence(candidate));
    const evidenceCommit = commit("record phases");
    const result = checkFinalPhaseEvidence({ root, version, evidenceRevision: evidenceCommit, sourceRevision: candidate, now });
    assert.equal(result.sourceRevision, candidate);
    assert.equal(result.evidenceRevision, evidenceCommit);
    assert.equal(result.evidence.releaseId, 101);
  });
});

test("evidence rejects E changing a non-evidence file", async () => {
  await withEvidenceRepo(({ root, write, commit, candidate, writeEvidence }) => {
    writeEvidence(finalPhaseEvidence(candidate));
    write("src/app.txt", "changed after qualification\n");
    const evidenceCommit = commit("evidence plus code");
    assert.throws(
      () => checkFinalPhaseEvidence({ root, version, evidenceRevision: evidenceCommit, now }),
      /changes more than evidence after .*: src\/app\.txt/,
    );
  });
});

test("evidence rejects E that does not descend from T and a T mismatch", async () => {
  await withEvidenceRepo(({ root, git, write, commit, candidate, writeEvidence }) => {
    git("checkout", "-qb", "side");
    write("src/app.txt", "side\n");
    const side = commit("side", candidateDate);
    git("checkout", "-q", candidate);
    writeEvidence(finalPhaseEvidence(side));
    const evidenceCommit = commit("evidence on main for side");
    assert.throws(
      () => checkFinalPhaseEvidence({ root, version, evidenceRevision: evidenceCommit, now }),
      /does not descend from source revision/,
    );
    assert.throws(
      () => checkFinalPhaseEvidence({ root, version, evidenceRevision: evidenceCommit, sourceRevision: candidate, now }),
      /sourceRevision expected/,
    );
  });
});

test("evidence rejects missing evidence and records that do not name T as passed", async () => {
  await withEvidenceRepo(({ root, commit, candidate, writeEvidence }) => {
    assert.throws(() => checkFinalPhaseEvidence({ root, version, evidenceRevision: candidate, now }), /missing at/);

    writeEvidence(finalPhaseEvidence(candidate), { sourceRevision: "b".repeat(40) });
    const wrongSource = commit("records name another revision");
    assert.throws(
      () => checkFinalPhaseEvidence({ root, version, evidenceRevision: wrongSource, now }),
      /stability record must name phase stability, status passed and source revision/,
    );

    writeEvidence(finalPhaseEvidence(candidate), { status: "failed" });
    const failed = commit("records failed");
    assert.throws(() => checkFinalPhaseEvidence({ root, version, evidenceRevision: failed, now }), /status passed/);
  });
});

test("evidence rejects future timestamps and timestamps before T was committed", async () => {
  await withEvidenceRepo(({ root, commit, candidate, writeEvidence }) => {
    const future = ["2099-01-01", "2099-01-02", "2099-01-03", "2099-01-04"].map((day) => `${day}T00:00:00Z`);
    writeEvidence(finalPhaseEvidence(candidate, { dates: future }));
    const futureCommit = commit("future evidence");
    assert.throws(() => checkFinalPhaseEvidence({ root, version, evidenceRevision: futureCommit, now }), /stability startedAt is in the future/);

    const early = ["2026-09-01", "2026-11-12", "2026-11-13", "2026-11-14"].map((day) => `${day}T00:00:00Z`);
    writeEvidence(finalPhaseEvidence(candidate, { dates: early }));
    const earlyCommit = commit("early evidence");
    assert.throws(
      () => checkFinalPhaseEvidence({ root, version, evidenceRevision: earlyCommit, now }),
      /stability startedAt predates the qualified source revision or draft upload/,
    );

    writeEvidence(finalPhaseEvidence(candidate));
    const tooEarlyCommit = commit("evidence committed before the phases finished", "2026-11-13T12:00:00Z");
    assert.throws(
      () => checkFinalPhaseEvidence({ root, version, evidenceRevision: tooEarlyCommit, now }),
      /security completedAt is later than the evidence commit/,
    );

    writeEvidence(finalPhaseEvidence(candidate));
    const afterUpload = commit("evidence after draft upload");
    assert.throws(
      () => checkFinalPhaseEvidence({ root, version, evidenceRevision: afterUpload, draftUploadedAt: Date.parse("2026-11-11T06:00:00Z"), now }),
      /stability startedAt predates the qualified source revision or draft upload/,
    );
  });
});

test("evidence validation rejects failed, out-of-order and malformed phases and artifacts", () => {
  const valid = finalPhaseEvidence("a".repeat(40));
  const phases = valid.phases;
  const cases = [
    [{ ...valid, phases: [phases[1], phases[0], phases[2]] }, /phase 1 expected stability, found performance/],
    [{ ...valid, phases: phases.slice(0, 2) }, /exactly 3 phases/],
    [{ ...valid, phases: [phases[0], { ...phases[1], status: "failed" }, phases[2]] }, /performance status must be passed/],
    [{ ...valid, phases: [phases[0], phases[1], { ...phases[2], startedAt: "2026-11-02T12:00:00Z" }] }, /security started before performance completed/],
    [{ ...valid, phases: [{ ...phases[0], completedAt: "2026-10-01T00:00:00Z" }, phases[1], phases[2]] }, /stability completed before it started/],
    [{ ...valid, phases: [{ ...phases[0], startedAt: "yesterday" }, phases[1], phases[2]] }, /stability startedAt must be an ISO-8601 UTC timestamp/],
    [{ ...valid, phases: [{ ...phases[0], startedAt: "2026-02-30T00:00:00Z" }, phases[1], phases[2]] }, /stability startedAt must be an ISO-8601 UTC timestamp/],
    [{ ...valid, phases: [{ ...phases[0], startedAt: "2026-11-11T24:00:00Z" }, phases[1], phases[2]] }, /stability startedAt must be an ISO-8601 UTC timestamp/],
    [{ ...valid, phases: [{ ...phases[0], startedAt: "2026-11-11T00:00:00.5Z" }, phases[1], phases[2]] }, /stability startedAt must be an ISO-8601 UTC timestamp/],
    [{ ...valid, phases: [{ ...phases[0], record: "package.json" }, phases[1], phases[2]] }, /record must be a JSON file directly in docs\/releases\/v3\.0\.0-phases\//],
    [{ ...valid, phases: [{ ...phases[0], record: "docs/releases/v3.0.0-phases/../../package.json" }, phases[1], phases[2]] }, /record must be a JSON file directly/],
    [{ ...valid, version: "2.9.5" }, /version expected 3\.0\.0/],
    [{ ...valid, sourceRevision: "HEAD" }, /sourceRevision must be a full 40-character commit SHA/],
    [{ ...valid, releaseId: "101" }, /releaseId must be the positive draft release id/],
    [{ ...valid, artifacts: [] }, /artifacts must list every draft asset/],
    [{ ...valid, artifacts: [{ name: "b", sha256: "0".repeat(64) }, { name: "a", sha256: "0".repeat(64) }] }, /sorted by name without duplicates/],
    [{ ...valid, artifacts: [{ name: "a", sha256: "abc" }] }, /needs a name and a SHA-256 digest/],
    [{ ...valid, schemaVersion: 2 }, /schemaVersion 1/],
    [{ ...valid, platforms: [] }, /platforms must be the release's declared platforms/],
    [{ ...valid, platforms: undefined }, /platforms must be the release's declared platforms/],
    [{ ...valid, platforms: ["macos", "linux"] }, /platforms must be the release's declared platforms, sorted/],
    [{ ...valid, platforms: ["linux", "linux"] }, /platforms must be the release's declared platforms, sorted/],
    [{ ...valid, platforms: ["beos"] }, /platforms must be the release's declared platforms/],
    [{ ...valid, waiver: "skip" }, /unexpected fields: waiver/],
  ];
  assert.doesNotThrow(() => validateFinalPhaseEvidence(valid, { version, now }));
  const withMillis = { ...valid, phases: [{ ...phases[0], startedAt: "2026-11-11T00:00:00.250Z" }, phases[1], phases[2]] };
  assert.doesNotThrow(() => validateFinalPhaseEvidence(withMillis, { version, now }));
  for (const [document, message] of cases) {
    assert.throws(() => validateFinalPhaseEvidence(document, { version, now }), message);
  }
});

test("records must carry the contract fields and bind the release id and tested artifacts", async () => {
  await withEvidenceRepo(async ({ root, commit, candidate, writeEvidence }) => {
    const cases = [
      [{ results: undefined }, /stability record is missing fields: results/],
      [{ reviewer: "someone" }, /stability record has unexpected fields: reviewer/],
      [{ releaseId: 202 }, /must name releaseId 101 and the evidence artifacts as testedArtifacts/],
      [{ testedArtifacts: [{ name: "other.bin", sha256: "1".repeat(64) }] }, /evidence artifacts as testedArtifacts/],
      [{ commands: [] }, /needs non-empty scope, commands and results/],
    ];
    for (const [overrides, message] of cases) {
      writeEvidence(finalPhaseEvidence(candidate), overrides);
      const evidenceCommit = commit(`record ${message}`);
      assert.throws(() => checkFinalPhaseEvidence({ root, version, evidenceRevision: evidenceCommit, now }), message);
    }

    const evidence = finalPhaseEvidence(candidate);
    const reordered = evidence.artifacts.map(({ name, sha256 }) => ({ sha256, name }));
    writeEvidence(evidence, { testedArtifacts: reordered });
    const reorderedCommit = commit("records list artifacts with keys in another order");
    assert.doesNotThrow(() => checkFinalPhaseEvidence({ root, version, evidenceRevision: reorderedCommit, now }));
  });
});

test("evidence and records reject duplicate JSON keys", async () => {
  await withEvidenceRepo(async ({ root, write, commit, candidate, writeEvidence }) => {
    writeEvidence(finalPhaseEvidence(candidate));
    const evidenceText = JSON.stringify(finalPhaseEvidence(candidate));
    write(evidencePath, evidenceText.replace('"releaseId":101', '"releaseId":101,"releaseId":102'));
    const duplicateEvidence = commit("duplicate evidence key");
    assert.throws(() => checkFinalPhaseEvidence({ root, version, evidenceRevision: duplicateEvidence, now }), /duplicate key releaseId/);

    writeEvidence(finalPhaseEvidence(candidate));
    write("docs/releases/v3.0.0-phases/security.json", '{"phase":"security","status":"failed","status":"passed"}');
    const duplicateRecord = commit("duplicate record key");
    assert.throws(() => checkFinalPhaseEvidence({ root, version, evidenceRevision: duplicateRecord, now }), /security record at .* has duplicate key status/);
  });
});

/** Commits evidence with `recordOverrides` and `proofOverrides` applied to every phase and expects `message`. */
async function rejectsEvidence({ root, commit, candidate, writeEvidence }, cases, evidenceOptions = {}) {
  for (const [recordOverrides, proofOverrides, message] of cases) {
    writeEvidence(finalPhaseEvidence(candidate, evidenceOptions), recordOverrides, proofOverrides);
    const evidenceCommit = commit(`case ${message}`);
    assert.throws(() => checkFinalPhaseEvidence({ root, version, evidenceRevision: evidenceCommit, now }), message);
  }
}

test("records must cover exactly the release platforms with a proof per platform", async () => {
  await withEvidenceRepo(async (fixture) => {
    const evidence = finalPhaseEvidence(fixture.candidate, { platforms: ["linux", "macos"] });
    fixture.writeEvidence(evidence);
    assert.doesNotThrow(() => checkFinalPhaseEvidence({ root: fixture.root, version, evidenceRevision: fixture.commit("two platforms"), now }));
    const linuxOnly = phaseRecord("stability", evidence).commands.filter((check) => check.proof.path.includes("-linux-"));
    await rejectsEvidence(fixture, [
      [{ platforms: ["macos"] }, {}, /stability record platforms must equal the release platforms linux, macos/],
      [{ platforms: undefined }, {}, /stability record is missing fields: platforms/],
      [{ commands: linuxOnly }, {}, /stability record has no command proof for platforms: macos/],
      [{}, { platform: "windows" }, /platform windows is not a release platform/],
    ], { platforms: ["linux", "macos"] });
  });
});

test("record commands need exit code 0 and a hash-bound proof inside the record directory", async () => {
  await withEvidenceRepo(async (fixture) => {
    const evidence = finalPhaseEvidence(fixture.candidate);
    const [check] = phaseRecord("stability", evidence).commands;
    const withProof = (proof) => ({ commands: [{ ...check, proof: { ...check.proof, ...proof } }] });
    await rejectsEvidence(fixture, [
      [{ commands: [{ ...check, exitCode: 1 }] }, {}, /stability record command 1 exit code must be 0, found 1/],
      [{ commands: [{ ...check, exitCode: undefined }] }, {}, /exit code must be 0, found undefined/],
      [{}, { exitCode: 2 }, /stability record command proof .* must use schemaVersion 1 and name phase stability, T, its command, exit code 0/],
      [withProof({ sha256: "f".repeat(64) }), {}, /stability record command proof .*stability-linux-proof\.json SHA-256 does not match the file at the evidence revision/],
      [withProof({ path: "docs/releases/proof.json" }), {}, /must be a JSON file directly in docs\/releases\/v3\.0\.0-phases\//],
      [withProof({ path: "docs/releases/v3.0.0-phases/sub/proof.json" }), {}, /must be a JSON file directly in/],
      [withProof({ path: "docs/releases/v3.0.0-phases/../v3.0.0-final-phases.json" }), {}, /must be a JSON file directly in/],
      [withProof({ path: "docs/releases/v3.0.0-phases/stability.json" }), {}, /separate from the phase records/],
      [withProof({ path: "docs/releases/v3.0.0-phases/absent.json" }), {}, /command proof is missing at/],
      [{ commands: ["npm run verify:full"] }, {}, /stability record command 1 must be a JSON object/],
      [{ commands: [{ ...check, platform: "linux" }] }, {}, /stability record command 1 has unexpected fields: platform/],
      [{}, { command: "npm test" }, /its command, exit code 0/],
      [{}, { sourceRevision: "b".repeat(40) }, /its command, exit code 0/],
      [{}, { output: "" }, /its command, exit code 0, output/],
      [{}, { artifacts: [] }, /the evidence artifacts/],
      [{}, { waived: true }, /has unexpected fields: waived/],
    ]);
  });
});

test("command proofs must be captured inside their phase window", async () => {
  await withEvidenceRepo(async (fixture) => {
    await rejectsEvidence(fixture, [
      [{}, { startedAt: "2026-11-10T23:59:59Z" }, /stability record command proof .* was not captured inside the stability phase window/],
      [{}, { completedAt: "2026-11-12T00:00:01Z" }, /was not captured inside the stability phase window/],
      [{}, { startedAt: "2026-11-11T12:00:00Z", completedAt: "2026-11-11T06:00:00Z" }, /was not captured inside the stability phase window/],
      [{}, { startedAt: "yesterday" }, /startedAt must be an ISO-8601 UTC timestamp/],
    ]);
  });
});

test("records need an owner decision accepted between phase completion and the next phase or E", async () => {
  await withEvidenceRepo(async (fixture) => {
    const decision = { owner: "release-owner", rationale: "Accepted.", acceptedAt: "2026-11-12T00:00:00Z" };
    await rejectsEvidence(fixture, [
      [{ decision: undefined }, {}, /stability record is missing fields: decision/],
      [{ decision: { ...decision, owner: " " } }, {}, /stability record decision needs an owner and a rationale/],
      [{ decision: { ...decision, waiver: "yes" } }, {}, /stability record decision has unexpected fields: waiver/],
      [{ decision: { ...decision, acceptedAt: "2026-11-11T23:59:59Z" } }, {}, /stability record decision must be accepted after stability completed/],
      [{ decision: { ...decision, acceptedAt: "2026-11-12T00:00:01Z" } }, {}, /stability record decision must be accepted after stability completed and before the next phase/],
    ]);

    const evidence = finalPhaseEvidence(fixture.candidate);
    fixture.writeEvidence(evidence);
    const late = phaseRecord("security", evidence, { decision: { ...decision, acceptedAt: "2026-11-14T12:00:00Z" } });
    fixture.write("docs/releases/v3.0.0-phases/security.json", JSON.stringify(late));
    const beforeDecision = fixture.commit("security accepted after E", "2026-11-14T06:00:00Z");
    assert.throws(
      () => checkFinalPhaseEvidence({ root: fixture.root, version, evidenceRevision: beforeDecision, now }),
      /security record decision must be accepted after security completed and before the next phase or evidence commit/,
    );
    const afterDecision = fixture.commit("E after the security decision", "2026-11-14T12:00:00Z");
    assert.doesNotThrow(() => checkFinalPhaseEvidence({ root: fixture.root, version, evidenceRevision: afterDecision, now }));
  });
});

test("evidence rejects E changing an unreferenced file in the record directory", async () => {
  await withEvidenceRepo(({ root, write, commit, candidate, writeEvidence }) => {
    writeEvidence(finalPhaseEvidence(candidate));
    write("docs/releases/v3.0.0-phases/stray-proof.json", "{}");
    const evidenceCommit = commit("evidence plus a stray proof");
    assert.throws(() => checkFinalPhaseEvidence({ root, version, evidenceRevision: evidenceCommit, now }), /changes more than evidence after .*: docs\/releases\/v3\.0\.0-phases\/stray-proof\.json/);
  });
});
