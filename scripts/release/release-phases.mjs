// Validates ordered final-phase records against the exact release source and downloaded bytes.
import { isDeepStrictEqual } from "node:util";

export const phaseEvidenceName = "release-evidence-phases.json";
export function validateReleasePhases(record, { revision, version, platforms, artifacts, evidenceDigests, evidenceRecords }) {
  const fail = message => { throw new Error(`Release phase evidence: ${message}`); };
  const text = value => typeof value === "string" && value.trim().length > 0;
  const digest = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
  if (!/^[a-f0-9]{40}$/.test(revision ?? "") || record?.schemaVersion !== 1 ||
    record.revision !== revision || record.version !== version) fail("candidate identity mismatch");
  if (!Array.isArray(record.platforms) || !isDeepStrictEqual([...record.platforms].sort(), [...platforms].sort())) fail("platform scope mismatch");
  if (!Object.keys(artifacts).length || !isDeepStrictEqual(record.artifacts, artifacts) ||
    !Object.values(artifacts).every(digest)) fail("artifact inventory mismatch");
  if (!Array.isArray(record.phases) || record.phases.length !== 3) fail("three separate phases required");
  let completed = 0;
  for (const [index, name] of ["Stability", "Performance", "Security"].entries()) {
    const phase = record.phases[index];
    const start = Date.parse(phase?.startedAt), end = Date.parse(phase?.completedAt);
    if (phase?.name !== name || phase.status !== "passed" || phase.revision !== revision || !text(phase.scope) || !text(phase.plan)) fail(`${name} must pass for this candidate`);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < completed || end <= start || end > Date.now()) fail(`${name} timing must follow the previous phase`);
    const accepted = Date.parse(phase.decision?.acceptedAt);
    if (!text(phase.decision?.owner) || !text(phase.decision?.rationale) ||
      !Number.isFinite(accepted) || accepted < end || accepted > Date.now()) fail(`${name} requires an owner acceptance decision`);
    if (!Array.isArray(phase.remainingRisks) || !phase.remainingRisks.every(text)) fail(`${name} risks must be recorded`);
    if (!Array.isArray(phase.commands) || !phase.commands.length) fail(`${name} requires executed checks`);
    for (const check of phase.commands) {
      const proof = evidenceRecords?.[check.evidence];
      if (!text(check.command) || !platforms.includes(check.platform) || check.exitCode !== 0 ||
        !digest(check.sha256) || !/^release-evidence-[\w.-]+$/.test(check.evidence ?? "") ||
        check.evidence === phaseEvidenceName || evidenceDigests[check.evidence] !== check.sha256 ||
        proof?.schemaVersion !== 1 || proof.phase !== name || proof.revision !== revision || proof.command !== check.command || proof.platform !== check.platform ||
        proof.exitCode !== 0 || !text(proof.output) ||
        !Number.isFinite(Date.parse(proof.startedAt)) || !Number.isFinite(Date.parse(proof.completedAt)) ||
        Date.parse(proof.startedAt) < start || Date.parse(proof.completedAt) > end ||
        Date.parse(proof.completedAt) < Date.parse(proof.startedAt) || !isDeepStrictEqual(proof.artifacts, artifacts)) fail(`${name} check lacks passing, digest-bound evidence`);
    }
    for (const platform of platforms) {
      if (!phase.commands.some(check => check.platform === platform)) fail(`${name} missing ${platform} checks`);
    }
    completed = accepted;
  }
}
