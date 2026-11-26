// Builds temporary git repos holding final-phase evidence and records for release gate tests.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { finalPhaseEvidencePath } from "../../release/final-phase-evidence.mjs";

export const version = "3.0.0";
export const evidencePath = finalPhaseEvidencePath(version);
export const now = Date.parse("2026-11-20T00:00:00Z");
export const candidateDate = "2026-10-01T00:00:00Z";
const phaseNames = ["stability", "performance", "security"];
const recordPath = (name) => `docs/releases/v3.0.0-phases/${name}.json`;
export const proofPath = (phase, platform) => `docs/releases/v3.0.0-phases/${phase}-${platform}-proof.json`;
const sha256 = (text) => createHash("sha256").update(text).digest("hex");

export function finalPhaseEvidence(
  sourceRevision,
  { releaseId = 101, platforms = ["linux"], artifacts = [{ name: "a.json", sha256: "0".repeat(64) }], dates } = {},
) {
  const times = dates ?? ["2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14"].map((day) => `${day}T00:00:00Z`);
  return {
    schemaVersion: 1,
    version,
    sourceRevision,
    releaseId,
    platforms,
    artifacts,
    phases: phaseNames.map((phase, index) => ({
      phase,
      status: "passed",
      startedAt: times[index],
      completedAt: times[index + 1],
      record: recordPath(phase),
    })),
  };
}

/** A passing command proof for `phase` on `platform`, captured inside the phase window. */
export function phaseProof(phase, platform, evidence, overrides = {}) {
  const window = evidence.phases.find((entry) => entry.phase === phase);
  return {
    schemaVersion: 1,
    phase,
    sourceRevision: evidence.sourceRevision,
    command: "npm run verify:full",
    platform,
    exitCode: 0,
    output: "verify:full passed",
    startedAt: window.startedAt,
    completedAt: window.completedAt,
    artifacts: evidence.artifacts,
    ...overrides,
  };
}

export const proofText = (proof) => JSON.stringify(proof);

/** A record carrying every Release Contract field, bound to the evidence's T, release id, platforms and artifacts. */
export function phaseRecord(phase, evidence, overrides = {}, proofOverrides = {}) {
  const window = evidence.phases.find((entry) => entry.phase === phase);
  return {
    phase,
    status: "passed",
    sourceRevision: evidence.sourceRevision,
    releaseId: evidence.releaseId,
    platforms: evidence.platforms,
    testedArtifacts: evidence.artifacts,
    scope: `${phase} phase on the hosted draft`,
    commands: evidence.platforms.map((platform) => ({
      command: "npm run verify:full",
      exitCode: 0,
      proof: { path: proofPath(phase, platform), sha256: sha256(proofText(phaseProof(phase, platform, evidence, proofOverrides))) },
    })),
    results: "All required checks passed.",
    remainingRisks: [],
    decision: { owner: "release-owner", rationale: "All checks passed with no open risk.", acceptedAt: window.completedAt },
    ...overrides,
  };
}

/** A Security-record local origin binding `platform`'s build to T, listing `artifacts` (that platform's draft assets). */
export function localOrigin(platform, evidence, artifacts, overrides = {}) {
  return {
    platform,
    sourceRevision: evidence.sourceRevision,
    sourceClean: true,
    buildCommand: "npm run tauri build",
    buildEnvironment: { os: "macOS 26.1", architecture: "arm64", toolchains: { node: "24.18.0", rust: "1.97.1" } },
    artifacts,
    ...overrides,
  };
}

/** Creates a temporary repo with candidate commit T and helpers to commit evidence E. */
export async function withEvidenceRepo(run) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-final-phases-"));
  const env = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", env }).trim();
  const write = (path, text) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  const commit = (message, date = "2026-11-15T00:00:00Z") => {
    git("add", "-A");
    execFileSync("git", ["-c", "user.name=fixture", "-c", "user.email=fixture@example.invalid", "commit", "--allow-empty", "-qm", message], {
      cwd: root,
      env: { ...env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
    });
    return git("rev-parse", "HEAD");
  };
  /**
   * Writes the evidence, each record and one proof per phase and platform; record and proof overrides apply to every
   * phase, `securityOverrides` (such as `localOrigins`) to the Security record only.
   */
  const writeEvidence = (evidence, recordOverrides = {}, proofOverrides = {}, securityOverrides = {}) => {
    write(evidencePath, JSON.stringify(evidence));
    for (const phase of phaseNames) {
      for (const platform of evidence.platforms) write(proofPath(phase, platform), proofText(phaseProof(phase, platform, evidence, proofOverrides)));
      const overrides = phase === "security" ? { ...recordOverrides, ...securityOverrides } : recordOverrides;
      write(recordPath(phase), JSON.stringify(phaseRecord(phase, evidence, overrides, proofOverrides)));
    }
  };
  try {
    git("init", "-q");
    write("src/app.txt", "candidate\n");
    const candidate = commit("candidate", candidateDate);
    await run({ root, git, write, commit, candidate, writeEvidence });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
