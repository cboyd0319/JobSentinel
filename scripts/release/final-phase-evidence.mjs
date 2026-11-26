#!/usr/bin/env node
// Validates Stability, Performance and Security evidence that certifies one hosted draft built from tag commit T.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { getArgValue, isMainModule } from "./args.mjs";
import { parseStrictJson } from "./strict-json.mjs";
import { normalizeReleaseVersion } from "./validate-release-version.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "../..");
const phaseOrder = ["stability", "performance", "security"];
const evidenceFields = ["schemaVersion", "version", "sourceRevision", "releaseId", "platforms", "artifacts", "phases"];
const phaseFields = ["phase", "status", "startedAt", "completedAt", "record"];
const recordRequiredFields = [
  "phase", "status", "sourceRevision", "releaseId", "platforms", "testedArtifacts", "scope", "commands", "results", "remainingRisks", "decision",
];
const commandFields = ["command", "exitCode", "proof"];
const proofRefFields = ["path", "sha256"];
const proofFields = ["schemaVersion", "phase", "sourceRevision", "command", "platform", "exitCode", "output", "startedAt", "completedAt", "artifacts"];
const decisionFields = ["owner", "rationale", "acceptedAt"];
const releasePlatforms = ["linux", "macos", "windows"];
const isoUtcPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const shaPattern = /^[0-9a-f]{40}$/;

export function finalPhaseEvidencePath(version) {
  return `docs/releases/v${normalizeReleaseVersion(version)}-final-phases.json`;
}

/** The single directory that may hold phase records for a version. */
function finalPhaseRecordDirectory(version) {
  return `docs/releases/v${normalizeReleaseVersion(version)}-phases/`;
}

function rejectUnexpected(label, value, fields) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be a JSON object.`);
  const unexpected = Object.keys(value).filter((key) => !fields.includes(key));
  if (unexpected.length > 0) throw new Error(`${label} has unexpected fields: ${unexpected.join(", ")}.`);
}

/** Parses a canonical ISO-8601 UTC timestamp (optional milliseconds) to epoch ms, or fails naming `label`. */
function isoTime(value, label) {
  const canonical = typeof value === "string" && isoUtcPattern.test(value) && Number.isFinite(Date.parse(value))
    ? new Date(value).toISOString()
    : undefined;
  if (canonical === undefined || canonical !== (value.includes(".") ? value : value.replace("Z", ".000Z"))) {
    throw new Error(`${label} must be an ISO-8601 UTC timestamp.`);
  }
  return Date.parse(value);
}

function timestamp(phase, field, { now, notBefore, notAfter }) {
  const time = isoTime(phase[field], `Final phase evidence ${phase.phase} ${field}`);
  if (time > now) throw new Error(`Final phase evidence ${phase.phase} ${field} is in the future.`);
  if (notBefore !== undefined && time < notBefore) {
    throw new Error(`Final phase evidence ${phase.phase} ${field} predates the qualified source revision or draft upload.`);
  }
  if (notAfter !== undefined && time > notAfter) {
    throw new Error(`Final phase evidence ${phase.phase} ${field} is later than the evidence commit.`);
  }
  return time;
}

function validateArtifacts(artifacts) {
  if (!Array.isArray(artifacts) || artifacts.length === 0) throw new Error("Final phase evidence artifacts must list every draft asset.");
  artifacts.forEach((artifact, index) => {
    rejectUnexpected(`Final phase evidence artifact ${index + 1}`, artifact, ["name", "sha256"]);
    if (typeof artifact.name !== "string" || artifact.name === "" || !/^[0-9a-f]{64}$/.test(String(artifact.sha256))) {
      throw new Error(`Final phase evidence artifact ${index + 1} needs a name and a SHA-256 digest.`);
    }
    if (index > 0 && artifacts[index - 1].name >= artifact.name) {
      throw new Error("Final phase evidence artifacts must be sorted by name without duplicates.");
    }
  });
}

/**
 * Validates shape, phase order and status, artifact list and timing. Every timestamp must fall in
 * [`notBefore`, min(`notAfter`, `now`)]: after T's commit and the draft upload, before E's commit.
 */
export function validateFinalPhaseEvidence(evidence, { version, now = Date.now(), notBefore, notAfter }) {
  rejectUnexpected("Final phase evidence", evidence, evidenceFields);
  if (evidence.schemaVersion !== 1) throw new Error("Final phase evidence must use schemaVersion 1.");
  const expectedVersion = normalizeReleaseVersion(version);
  if (evidence.version !== expectedVersion) {
    throw new Error(`Final phase evidence version expected ${expectedVersion}, found ${evidence.version}.`);
  }
  if (!shaPattern.test(String(evidence.sourceRevision))) {
    throw new Error("Final phase evidence sourceRevision must be a full 40-character commit SHA.");
  }
  if (!Number.isSafeInteger(evidence.releaseId) || evidence.releaseId <= 0) {
    throw new Error("Final phase evidence releaseId must be the positive draft release id.");
  }
  if (
    !Array.isArray(evidence.platforms) || evidence.platforms.length === 0 ||
    evidence.platforms.some((platform, index) => !releasePlatforms.includes(platform) || (index > 0 && evidence.platforms[index - 1] >= platform))
  ) {
    throw new Error(`Final phase evidence platforms must be the release's declared platforms, sorted, from ${releasePlatforms.join(", ")}.`);
  }
  validateArtifacts(evidence.artifacts);
  if (!Array.isArray(evidence.phases) || evidence.phases.length !== phaseOrder.length) {
    throw new Error(`Final phase evidence must list exactly ${phaseOrder.length} phases.`);
  }
  const recordDirectory = finalPhaseRecordDirectory(version);
  let previous;
  evidence.phases.forEach((phase, index) => {
    rejectUnexpected(`Final phase evidence phase ${index + 1}`, phase, phaseFields);
    if (phase.phase !== phaseOrder[index]) {
      throw new Error(`Final phase evidence phase ${index + 1} expected ${phaseOrder[index]}, found ${phase.phase}.`);
    }
    if (phase.status !== "passed") throw new Error(`Final phase evidence ${phase.phase} status must be passed.`);
    const record = String(phase.record ?? "");
    if (!record.startsWith(recordDirectory) || !record.endsWith(".json") || record.slice(recordDirectory.length).includes("/")) {
      throw new Error(`Final phase evidence ${phase.phase} record must be a JSON file directly in ${recordDirectory}.`);
    }
    const startedAt = timestamp(phase, "startedAt", { now, notBefore, notAfter });
    const completedAt = timestamp(phase, "completedAt", { now, notBefore, notAfter });
    if (completedAt < startedAt) throw new Error(`Final phase evidence ${phase.phase} completed before it started.`);
    if (previous && startedAt < previous.completedAt) {
      throw new Error(`Final phase evidence ${phase.phase} started before ${previous.phase} completed.`);
    }
    previous = { phase: phase.phase, completedAt };
  });
  return evidence;
}

function git(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 1024 * 1024 * 10 });
  if (result.error) throw result.error;
  return { ok: result.status === 0, stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

function resolveCommit(root, revision, label) {
  const resolved = git(root, ["rev-parse", "--verify", "--end-of-options", `${revision}^{commit}`]);
  if (!resolved.ok) throw new Error(`${label} ${revision} does not resolve to a commit.`);
  return resolved.stdout;
}

function readBytesAt(root, revision, path, label) {
  const shown = spawnSync("git", ["show", `${revision}:${path}`], { cwd: root, maxBuffer: 1024 * 1024 * 10 });
  if (shown.error) throw shown.error;
  if (shown.status !== 0) throw new Error(`${label} is missing at ${revision}:${path}.`);
  return shown.stdout;
}

function readJsonAt(root, revision, path, label) {
  return parseStrictJson(readBytesAt(root, revision, path, label).toString("utf8"), `${label} at ${path}`);
}

function commitTime(root, revision) {
  return Date.parse(git(root, ["show", "-s", "--format=%cI", revision]).stdout);
}

/** JSON with object keys sorted at every level, so equal data compares equal regardless of key order. */
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

const text = (value) => typeof value === "string" && value.trim() !== "";
const textList = (value) => Array.isArray(value) && value.every(text);

/**
 * Validates one command proof read at E: it is a JSON file directly in the record directory whose SHA-256 matches,
 * names this phase, T, the command, a declared platform, exit code 0, non-empty output and the evidence artifacts,
 * and was captured inside the phase window. Returns the proof's platform.
 */
function validateProof(check, { label, phase, evidence, recordDirectory, recordPaths, readProof }) {
  rejectUnexpected(`${label} command proof`, check.proof, proofRefFields);
  const { path, sha256 } = check.proof;
  const name = typeof path === "string" && path.startsWith(recordDirectory) ? path.slice(recordDirectory.length) : "";
  if (!/^[\w-][\w.-]*\.json$/.test(name) || recordPaths.has(path)) {
    throw new Error(`${label} command proof ${path} must be a JSON file directly in ${recordDirectory}, separate from the phase records.`);
  }
  if (!/^[0-9a-f]{64}$/.test(String(sha256))) throw new Error(`${label} command proof ${path} needs a SHA-256 digest.`);
  const bytes = readProof(path);
  if (createHash("sha256").update(bytes).digest("hex") !== sha256) {
    throw new Error(`${label} command proof ${path} SHA-256 does not match the file at the evidence revision.`);
  }
  const proof = parseStrictJson(bytes.toString("utf8"), `${label} command proof at ${path}`);
  rejectUnexpected(`${label} command proof ${path}`, proof, proofFields);
  if (
    proof.schemaVersion !== 1 || proof.phase !== phase.phase || proof.sourceRevision !== evidence.sourceRevision ||
    proof.command !== check.command || proof.exitCode !== 0 || !text(proof.output) ||
    canonicalJson(proof.artifacts) !== canonicalJson(evidence.artifacts)
  ) {
    throw new Error(`${label} command proof ${path} must use schemaVersion 1 and name phase ${phase.phase}, T, its command, exit code 0, output and the evidence artifacts.`);
  }
  if (!evidence.platforms.includes(proof.platform)) {
    throw new Error(`${label} command proof ${path} platform ${proof.platform} is not a release platform.`);
  }
  const started = isoTime(proof.startedAt, `${label} command proof ${path} startedAt`);
  const completed = isoTime(proof.completedAt, `${label} command proof ${path} completedAt`);
  if (started < Date.parse(phase.startedAt) || completed > Date.parse(phase.completedAt) || completed < started) {
    throw new Error(`${label} command proof ${path} was not captured inside the ${phase.phase} phase window.`);
  }
  return proof.platform;
}

/**
 * Validates one record: contract fields, T, release id, platforms and artifacts, then every command's exit code and
 * proof, platform coverage, and an owner decision accepted after the phase and before the next phase (or E) starts.
 */
function validateRecord(record, phase, { evidence, acceptedBy, now, ...proofContext }) {
  const label = `Final phase ${phase.phase} record`;
  rejectUnexpected(label, record, recordRequiredFields);
  const missing = recordRequiredFields.filter((field) => !Object.hasOwn(record, field));
  if (missing.length > 0) throw new Error(`${label} is missing fields: ${missing.join(", ")}.`);
  if (record.phase !== phase.phase || record.status !== "passed" || record.sourceRevision !== evidence.sourceRevision) {
    throw new Error(`${label} must name phase ${phase.phase}, status passed and source revision ${evidence.sourceRevision}.`);
  }
  if (record.releaseId !== evidence.releaseId || canonicalJson(record.testedArtifacts) !== canonicalJson(evidence.artifacts)) {
    throw new Error(`${label} must name releaseId ${evidence.releaseId} and the evidence artifacts as testedArtifacts.`);
  }
  if (canonicalJson(record.platforms) !== canonicalJson(evidence.platforms)) {
    throw new Error(`${label} platforms must equal the release platforms ${evidence.platforms.join(", ")}.`);
  }
  if (!text(record.scope) || !Array.isArray(record.commands) || record.commands.length === 0 || !(text(record.results) || (textList(record.results) && record.results.length > 0)) || !textList(record.remainingRisks)) {
    throw new Error(`${label} needs non-empty scope, commands and results, and a remainingRisks list.`);
  }
  const covered = new Set();
  record.commands.forEach((check, index) => {
    rejectUnexpected(`${label} command ${index + 1}`, check, commandFields);
    if (!text(check.command)) throw new Error(`${label} command ${index + 1} needs a command.`);
    if (check.exitCode !== 0) throw new Error(`${label} command ${index + 1} exit code must be 0, found ${check.exitCode}.`);
    covered.add(validateProof(check, { label, phase, evidence, ...proofContext }));
  });
  const uncovered = evidence.platforms.filter((platform) => !covered.has(platform));
  if (uncovered.length > 0) throw new Error(`${label} has no command proof for platforms: ${uncovered.join(", ")}.`);

  rejectUnexpected(`${label} decision`, record.decision, decisionFields);
  if (!text(record.decision.owner) || !text(record.decision.rationale)) {
    throw new Error(`${label} decision needs an owner and a rationale.`);
  }
  const accepted = isoTime(record.decision.acceptedAt, `${label} decision acceptedAt`);
  if (accepted < Date.parse(phase.completedAt) || accepted > Math.min(acceptedBy, now)) {
    throw new Error(`${label} decision must be accepted after ${phase.phase} completed and before the next phase or evidence commit.`);
  }
}

/** Fails unless the evidence certifies exactly the verified release id, declared platforms and asset digests. */
export function assertEvidenceCertifies(evidence, { releaseId, platforms, artifacts }) {
  if (releaseId !== evidence.releaseId) {
    throw new Error(`Release id ${releaseId} does not match evidence releaseId ${evidence.releaseId}.`);
  }
  if (canonicalJson([...platforms].sort()) !== canonicalJson(evidence.platforms)) {
    throw new Error(`Release platforms ${[...platforms].sort().join(", ")} do not match evidence platforms ${evidence.platforms.join(", ")}.`);
  }
  const expected = new Map(evidence.artifacts.map((artifact) => [artifact.name, artifact.sha256]));
  const actual = new Map(artifacts.map((artifact) => [artifact.name, artifact.sha256]));
  const problems = [
    ...[...actual.keys()].filter((name) => !expected.has(name)).map((name) => `uncertified draft asset ${name}`),
    ...[...expected.keys()].filter((name) => !actual.has(name)).map((name) => `certified asset missing from draft ${name}`),
    ...[...actual].filter(([name, sha]) => expected.has(name) && expected.get(name) !== sha).map(([name]) => `SHA-256 changed for ${name}`),
  ];
  if (problems.length > 0) throw new Error(`Release assets do not match final-phase evidence: ${problems.join("; ")}.`);
}

/**
 * Enforces the revision rule. Evidence is read from evidence commit E. Its sourceRevision is the tag commit T
 * the draft was built from (it must equal `sourceRevision` when given), T is an ancestor of E, and T..E changes only
 * the evidence file, its records and their command proofs in the version's record directory. Each record names T,
 * its passed phase, the release platforms, passing proof-bound commands and an owner decision.
 */
export function checkFinalPhaseEvidence({ root = defaultRoot, version, evidenceRevision = "HEAD", sourceRevision, draftUploadedAt, now = Date.now() }) {
  const path = finalPhaseEvidencePath(version);
  const evidenceCommit = resolveCommit(root, evidenceRevision, "Evidence revision");
  const evidence = readJsonAt(root, evidenceCommit, path, "Final phase evidence");
  if (!evidence || typeof evidence !== "object") throw new Error("Final phase evidence must be a JSON object.");

  const qualified = String(evidence.sourceRevision);
  if (sourceRevision !== undefined && qualified !== sourceRevision) {
    throw new Error(`Final phase evidence sourceRevision expected ${sourceRevision}, found ${qualified}.`);
  }
  if (!shaPattern.test(qualified) || !git(root, ["cat-file", "-e", `${qualified}^{commit}`]).ok) {
    throw new Error(`Final phase evidence sourceRevision ${qualified} is not a known commit.`);
  }
  const evidenceTime = commitTime(root, evidenceCommit);
  validateFinalPhaseEvidence(evidence, {
    version,
    now,
    notBefore: Math.max(commitTime(root, qualified), draftUploadedAt ?? -Infinity),
    notAfter: evidenceTime,
  });

  if (!git(root, ["merge-base", "--is-ancestor", qualified, evidenceCommit]).ok) {
    throw new Error(`Evidence revision ${evidenceCommit} does not descend from source revision ${qualified}.`);
  }
  const recordPaths = new Set(evidence.phases.map((phase) => phase.record));
  const allowed = new Set([path, ...recordPaths]);
  const proofContext = {
    evidence,
    now,
    recordDirectory: finalPhaseRecordDirectory(version),
    recordPaths,
    readProof: (proofPath) => {
      allowed.add(proofPath);
      return readBytesAt(root, evidenceCommit, proofPath, "Final phase command proof");
    },
  };
  evidence.phases.forEach((phase, index) => {
    const next = evidence.phases[index + 1];
    const record = readJsonAt(root, evidenceCommit, phase.record, `Final phase ${phase.phase} record`);
    validateRecord(record, phase, { ...proofContext, acceptedBy: next ? Date.parse(next.startedAt) : evidenceTime });
  });
  const diff = git(root, ["diff", "--name-only", "--no-renames", qualified, evidenceCommit]);
  if (!diff.ok) throw new Error(`Could not compare ${qualified} with ${evidenceCommit}: ${diff.stderr}`);
  const changed = diff.stdout.split("\n").filter(Boolean).filter((changedPath) => !allowed.has(changedPath));
  if (changed.length > 0) {
    throw new Error(`Evidence revision ${evidenceCommit} changes more than evidence after ${qualified}: ${changed.join(", ")}.`);
  }
  return { evidence, evidenceRevision: evidenceCommit, sourceRevision: qualified };
}

if (isMainModule(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const version = getArgValue(args, "--version");
    if (!version) throw new Error("Usage: final-phase-evidence.mjs --version vX.Y.Z [--evidence-revision <commit>] [--source-revision <sha>]");
    const result = checkFinalPhaseEvidence({
      version,
      evidenceRevision: getArgValue(args, "--evidence-revision") ?? "HEAD",
      sourceRevision: getArgValue(args, "--source-revision"),
    });
    console.log(`Final release phases passed for source ${result.sourceRevision} at evidence ${result.evidenceRevision}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
