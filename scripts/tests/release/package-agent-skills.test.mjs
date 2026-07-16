import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import test from "node:test";

import {
  buildSkillsTarGz,
  buildSkillsZip,
  packageAgentSkills,
  parseArgs,
} from "../../release/package-agent-skills.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

test("parseArgs reads release skills package flags", () => {
  assert.deepEqual(parseArgs(["--version", "v2.9.0", "--out-dir=dist"]), {
    outDir: "dist",
    root: repoRoot,
    version: "v2.9.0",
  });
});

test("packageAgentSkills writes tar.gz and ZIP archives with checksums", () => {
  const outDir = mkdtempRoot("jobsentinel-agent-skills-package-");
  const result = packageAgentSkills({
    root: repoRoot,
    outDir,
    version: "9.9.9",
  });

  const archive = readFileSync(result.archivePath);
  const zipArchive = readFileSync(result.zipArchivePath);
  const checksum = readFileSync(result.checksumPath, "utf8");
  const zipChecksum = readFileSync(result.zipChecksumPath, "utf8");

  assert.equal(result.archiveName, "JobSentinel-9.9.9-agent-skills.tar.gz");
  assert.equal(result.zipArchiveName, "JobSentinel-9.9.9-agent-skills.zip");
  assert.equal(archive[0], 0x1f);
  assert.equal(archive[1], 0x8b);
  assert.equal(zipArchive[0], 0x50);
  assert.equal(zipArchive[1], 0x4b);
  assert.match(checksum, /^[a-f0-9]{64}  JobSentinel-9\.9\.9-agent-skills\.tar\.gz\n$/);
  assert.match(zipChecksum, /^[a-f0-9]{64}  JobSentinel-9\.9\.9-agent-skills\.zip\n$/);
});

test("packageAgentSkills archives contain every downloadable skill surface", () => {
  const outDir = mkdtempRoot("jobsentinel-agent-skills-contents-");
  const result = packageAgentSkills({
    root: repoRoot,
    outDir,
    version: "9.9.9",
  });

  const archivePaths = [
    tarPaths(readFileSync(result.archivePath)),
    zipPaths(readFileSync(result.zipArchivePath)),
  ];
  const prefix = "JobSentinel-9.9.9-agent-skills/skills";
  const skillNames = [
    "application-form-review",
    "application-tracking",
    "interview-prep",
    "job-posting-risk-review",
    "job-search-plan",
    "networking-outreach",
    "offer-pay-review",
    "resume-tailoring",
  ];

  for (const paths of archivePaths) {
    assert.ok(paths.includes(`${prefix}/README.md`));
    for (const skillName of skillNames) {
      assert.ok(paths.includes(`${prefix}/${skillName}/SKILL.md`));
      assert.ok(paths.includes(`${prefix}/${skillName}/agents/openai.yaml`));
      assert.ok(paths.some((path) => path.startsWith(`${prefix}/${skillName}/assets/`)));
      assert.ok(paths.some((path) => path.startsWith(`${prefix}/${skillName}/references/`)));
    }
    assert.equal(paths.some((path) => path.split("/").some((part) => part.startsWith("."))), false);
  }
});

test("buildSkillsTarGz produces deterministic archives", () => {
  assert.deepEqual(
    buildSkillsTarGz(repoRoot, "JobSentinel-test-agent-skills"),
    buildSkillsTarGz(repoRoot, "JobSentinel-test-agent-skills"),
  );
});

test("buildSkillsZip produces deterministic archives", () => {
  assert.deepEqual(
    buildSkillsZip(repoRoot, "JobSentinel-test-agent-skills"),
    buildSkillsZip(repoRoot, "JobSentinel-test-agent-skills"),
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

function tarPaths(archive) {
  const tar = gunzipSync(archive);
  const paths = [];
  let offset = 0;

  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      break;
    }

    const name = header.toString("utf8", 0, 100).replace(/\0.*$/u, "");
    const sizeText = header.toString("utf8", 124, 136).replace(/\0.*$/u, "").trim();
    const size = Number.parseInt(sizeText || "0", 8);
    paths.push(name);
    offset += 512 + Math.ceil(size / 512) * 512;
  }

  return paths;
}

function zipPaths(archive) {
  const paths = [];
  let offset = 0;

  while (offset + 30 <= archive.length) {
    if (archive.readUInt32LE(offset) !== 0x04034b50) {
      break;
    }

    const compressedSize = archive.readUInt32LE(offset + 18);
    const nameLength = archive.readUInt16LE(offset + 26);
    const extraLength = archive.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const nameEnd = nameStart + nameLength;
    paths.push(archive.toString("utf8", nameStart, nameEnd));
    offset = nameEnd + extraLength + compressedSize;
  }

  return paths;
}
