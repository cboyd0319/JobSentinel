#!/usr/bin/env node

import { createHash } from "node:crypto";
import { deflateRawSync, gzipSync } from "node:zlib";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { checkAgentSkills } from "../checks/agent-skills.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const defaultRoot = resolve(dirname(scriptPath), "../..");

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

const crc32Table = new Uint32Array(256);
for (let index = 0; index < crc32Table.length; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crc32Table[index] = value >>> 0;
}

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = crc32Table[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
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
  const zipArchiveName = `JobSentinel-${releaseVersion}-agent-skills.zip`;
  const zipArchivePath = join(releaseOutDir, zipArchiveName);
  const archivePrefix = `JobSentinel-${releaseVersion}-agent-skills`;
  writeFileSync(archivePath, buildSkillsTarGz(root, archivePrefix));
  writeFileSync(zipArchivePath, buildSkillsZip(root, archivePrefix));

  if (!existsSync(archivePath) || !statSync(archivePath).isFile() || statSync(archivePath).size === 0) {
    throw new Error(`Agent Skills archive was not created: ${archivePath}`);
  }

  if (
    !existsSync(zipArchivePath) ||
    !statSync(zipArchivePath).isFile() ||
    statSync(zipArchivePath).size === 0
  ) {
    throw new Error(`Agent Skills ZIP archive was not created: ${zipArchivePath}`);
  }

  const archiveSha256 = sha256File(archivePath);
  const checksumPath = `${archivePath}.sha256`;
  writeFileSync(checksumPath, `${archiveSha256}  ${basename(archivePath)}\n`);
  const zipSha256 = sha256File(zipArchivePath);
  const zipChecksumPath = `${zipArchivePath}.sha256`;
  writeFileSync(zipChecksumPath, `${zipSha256}  ${basename(zipArchivePath)}\n`);

  return {
    archiveName,
    archivePath,
    checksumPath,
    sha256: archiveSha256,
    zipArchiveName,
    zipArchivePath,
    zipChecksumPath,
    zipSha256,
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

function zipDateTime() {
  return { date: (1 << 5) | 1, time: 0 };
}

function zipDosAttrs(entry) {
  const mode = entry.type === "dir" ? 0o755 : 0o644;
  return ((entry.type === "dir" ? mode | 0o040000 : mode | 0o100000) << 16) |
    (entry.type === "dir" ? 0x10 : 0);
}

function zipLocalFileHeader({ archivePath, crc, compressedSize, uncompressedSize, method }) {
  const fileName = Buffer.from(archivePath);
  const { date, time } = zipDateTime();
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(method === 0 ? 10 : 20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(method, 8);
  header.writeUInt16LE(time, 10);
  header.writeUInt16LE(date, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(compressedSize, 18);
  header.writeUInt32LE(uncompressedSize, 22);
  header.writeUInt16LE(fileName.length, 26);
  header.writeUInt16LE(0, 28);
  return Buffer.concat([header, fileName]);
}

function zipCentralDirectoryHeader({
  archivePath,
  crc,
  compressedSize,
  uncompressedSize,
  method,
  offset,
  externalAttrs,
}) {
  const fileName = Buffer.from(archivePath);
  const { date, time } = zipDateTime();
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(0x031e, 4);
  header.writeUInt16LE(method === 0 ? 10 : 20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(method, 10);
  header.writeUInt16LE(time, 12);
  header.writeUInt16LE(date, 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(compressedSize, 20);
  header.writeUInt32LE(uncompressedSize, 24);
  header.writeUInt16LE(fileName.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(externalAttrs >>> 0, 38);
  header.writeUInt32LE(offset, 42);
  return Buffer.concat([header, fileName]);
}

function zipEndOfCentralDirectory({ entryCount, centralSize, centralOffset }) {
  const footer = Buffer.alloc(22);
  footer.writeUInt32LE(0x06054b50, 0);
  footer.writeUInt16LE(0, 4);
  footer.writeUInt16LE(0, 6);
  footer.writeUInt16LE(entryCount, 8);
  footer.writeUInt16LE(entryCount, 10);
  footer.writeUInt32LE(centralSize, 12);
  footer.writeUInt32LE(centralOffset, 16);
  footer.writeUInt16LE(0, 20);
  return footer;
}

export function buildSkillsZip(root = defaultRoot, archivePrefix = "JobSentinel-agent-skills") {
  const fileChunks = [];
  const centralChunks = [];
  let offset = 0;

  for (const entry of collectSkillsArchiveEntries(root, archivePrefix)) {
    const body = entry.type === "file" ? readFileSync(entry.absolutePath) : Buffer.alloc(0);
    const method = entry.type === "file" && body.length > 0 ? 8 : 0;
    const compressed = method === 8 ? deflateRawSync(body, { level: 9 }) : body;
    const crc = crc32(body);
    const localHeader = zipLocalFileHeader({
      archivePath: entry.archivePath,
      crc,
      compressedSize: compressed.length,
      uncompressedSize: body.length,
      method,
    });
    const externalAttrs = zipDosAttrs(entry);
    const centralHeader = zipCentralDirectoryHeader({
      archivePath: entry.archivePath,
      crc,
      compressedSize: compressed.length,
      uncompressedSize: body.length,
      method,
      offset,
      externalAttrs,
    });

    fileChunks.push(localHeader, compressed);
    centralChunks.push(centralHeader);
    offset += localHeader.length + compressed.length;
  }

  const central = Buffer.concat(centralChunks);
  return Buffer.concat([
    ...fileChunks,
    central,
    zipEndOfCentralDirectory({
      entryCount: centralChunks.length,
      centralSize: central.length,
      centralOffset: offset,
    }),
  ]);
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
  console.log(`Agent Skills ZIP archive written: ${result.zipArchivePath}`);
  console.log(`Agent Skills ZIP checksum written: ${result.zipChecksumPath}`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
