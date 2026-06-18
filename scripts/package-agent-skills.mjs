#!/usr/bin/env node

import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { checkAgentSkills } from "./check-agent-skills.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "..");

function getArgValue(args, name) {
  const exactIndex = args.indexOf(name);
  if (exactIndex >= 0) {
    return args[exactIndex + 1];
  }

  const prefixed = args.find((arg) => arg.startsWith(`${name}=`));
  return prefixed ? prefixed.slice(name.length + 1) : undefined;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function sha256File(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function normalizeReleaseVersion(version) {
  const normalized = String(version ?? "").trim().replace(/^v/i, "");
  if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(normalized)) {
    throw new Error(`Agent Skills package version must be an exact stable semver, found: ${version}`);
  }
  return normalized;
}

export function packageAgentSkills({
  root = defaultRoot,
  outDir,
  version,
} = {}) {
  if (!outDir) {
    throw new Error("Missing outDir");
  }

  const errors = checkAgentSkills(root);
  if (errors.length > 0) {
    throw new Error(`Agent Skills validation failed:\n- ${errors.join("\n- ")}`);
  }

  const packageJson = readJson(join(root, "package.json"));
  const releaseVersion = normalizeReleaseVersion(version ?? packageJson.version);
  const releaseOutDir = resolve(root, outDir);
  mkdirSync(releaseOutDir, { recursive: true });

  const archiveName = `JobSentinel-${releaseVersion}-agent-skills.tar.gz`;
  const archivePath = join(releaseOutDir, archiveName);
  const archivePrefix = `JobSentinel-${releaseVersion}-agent-skills`;
  writeFileSync(archivePath, buildSkillsTarGz(root, archivePrefix));

  if (!existsSync(archivePath) || !statSync(archivePath).isFile() || statSync(archivePath).size === 0) {
    throw new Error(`Agent Skills archive was not created: ${archivePath}`);
  }

  const archiveSha256 = sha256File(archivePath);
  const checksumPath = `${archivePath}.sha256`;
  writeFileSync(checksumPath, `${archiveSha256}  ${basename(archivePath)}\n`);

  return {
    archiveName,
    archivePath,
    checksumPath,
    sha256: archiveSha256,
  };
}

function collectSkillsArchiveEntries(root, archivePrefix) {
  const skillsRoot = join(root, "skills");
  const entries = [{ absolutePath: skillsRoot, archivePath: `${archivePrefix}/skills/`, type: "dir" }];

  function visit(dir) {
    const dirEntries = readdirSync(dir, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    );

    for (const entry of dirEntries) {
      const absolutePath = join(dir, entry.name);
      const relPath = relative(root, absolutePath).split(/[\\/]/).join("/");
      if (entry.isDirectory()) {
        entries.push({ absolutePath, archivePath: `${archivePrefix}/${relPath}/`, type: "dir" });
        visit(absolutePath);
      } else if (entry.isFile()) {
        entries.push({ absolutePath, archivePath: `${archivePrefix}/${relPath}`, type: "file" });
      }
    }
  }

  visit(skillsRoot);
  return entries;
}

function octal(value, length) {
  const text = value.toString(8);
  if (text.length > length - 1) {
    throw new Error(`Tar header value is too large: ${value}`);
  }
  return text.padStart(length - 1, "0") + "\0";
}

function writeTarString(buffer, offset, length, value) {
  const bytes = Buffer.from(value);
  if (bytes.length > length) {
    throw new Error(`Tar field is too long: ${value}`);
  }
  bytes.copy(buffer, offset);
}

function tarHeader({ archivePath, type, size, mode }) {
  const header = Buffer.alloc(512, 0);
  writeTarString(header, 0, 100, archivePath);
  writeTarString(header, 100, 8, octal(mode, 8));
  writeTarString(header, 108, 8, octal(0, 8));
  writeTarString(header, 116, 8, octal(0, 8));
  writeTarString(header, 124, 12, octal(size, 12));
  writeTarString(header, 136, 12, octal(0, 12));
  header.fill(0x20, 148, 156);
  writeTarString(header, 156, 1, type === "dir" ? "5" : "0");
  writeTarString(header, 257, 6, "ustar");
  writeTarString(header, 263, 2, "00");
  writeTarString(header, 265, 32, "jobsentinel");
  writeTarString(header, 297, 32, "jobsentinel");

  let checksum = 0;
  for (const byte of header) {
    checksum += byte;
  }
  writeTarString(header, 148, 8, `${checksum.toString(8).padStart(6, "0")}\0 `);
  return header;
}

function tarPadding(size) {
  const remainder = size % 512;
  return remainder === 0 ? Buffer.alloc(0) : Buffer.alloc(512 - remainder, 0);
}

export function buildSkillsTarGz(root = defaultRoot, archivePrefix = "JobSentinel-agent-skills") {
  const chunks = [];

  for (const entry of collectSkillsArchiveEntries(root, archivePrefix)) {
    const stat = statSync(entry.absolutePath);
    const body = entry.type === "file" ? readFileSync(entry.absolutePath) : Buffer.alloc(0);
    const executable = entry.type === "file" && (stat.mode & 0o111) !== 0;
    chunks.push(
      tarHeader({
        archivePath: entry.archivePath,
        type: entry.type,
        size: body.length,
        mode: entry.type === "dir" ? 0o755 : executable ? 0o755 : 0o644,
      }),
      body,
      tarPadding(body.length),
    );
  }

  chunks.push(Buffer.alloc(1024, 0));
  return gzipSync(Buffer.concat(chunks), { mtime: 0 });
}

export function parseArgs(args) {
  return {
    outDir: getArgValue(args, "--out-dir") ?? "release-assets/public",
    root: getArgValue(args, "--root") ?? defaultRoot,
    version: getArgValue(args, "--version"),
  };
}

export function main({ args = process.argv.slice(2) } = {}) {
  const result = packageAgentSkills(parseArgs(args));
  console.log(`Agent Skills archive written: ${result.archivePath}`);
  console.log(`Agent Skills checksum written: ${result.checksumPath}`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
