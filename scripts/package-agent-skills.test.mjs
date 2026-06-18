import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { buildSkillsTarGz, packageAgentSkills, parseArgs } from "./package-agent-skills.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("parseArgs reads release skills package flags", () => {
  assert.deepEqual(parseArgs(["--version", "v2.9.0", "--out-dir=dist"]), {
    outDir: "dist",
    root: repoRoot,
    version: "v2.9.0",
  });
});

test("packageAgentSkills writes a tar.gz archive and checksum", () => {
  const outDir = mkdtempRoot("jobsentinel-agent-skills-package-");
  const result = packageAgentSkills({
    root: repoRoot,
    outDir,
    version: "9.9.9",
  });

  const archive = readFileSync(result.archivePath);
  const checksum = readFileSync(result.checksumPath, "utf8");

  assert.equal(result.archiveName, "JobSentinel-9.9.9-agent-skills.tar.gz");
  assert.equal(archive[0], 0x1f);
  assert.equal(archive[1], 0x8b);
  assert.match(checksum, /^[a-f0-9]{64}  JobSentinel-9\.9\.9-agent-skills\.tar\.gz\n$/);
});

test("buildSkillsTarGz produces deterministic archives", () => {
  assert.deepEqual(
    buildSkillsTarGz(repoRoot, "JobSentinel-test-agent-skills"),
    buildSkillsTarGz(repoRoot, "JobSentinel-test-agent-skills"),
  );
});

test("packageAgentSkills validates skills before archiving", () => {
  const root = mkdtempRoot("jobsentinel-agent-skills-package-missing-");
  mkdirSync(join(root, "release-assets"), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify({ version: "9.9.9" }));

  assert.throws(
    () => packageAgentSkills({ root, outDir: "release-assets", version: "9.9.9" }),
    /skills\/ directory is required for downloadable Agent Skills/,
  );
});

function mkdtempRoot(prefix) {
  const root = join(tmpdir(), `${prefix}${process.pid}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(root, { recursive: true });
  return root;
}
