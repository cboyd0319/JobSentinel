#!/usr/bin/env node
// Produces installer-adjacent update metadata and signature without overwriting existing files.
import { createHash } from "node:crypto";
import { closeSync, constants, fstatSync, fsyncSync, lstatSync, openSync, readSync, realpathSync, unlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { signReleaseBytes } from "./sign-pack-envelope.mjs";
import { createUpdateManifest } from "./update-candidate-metadata.mjs";

export function parseArgs(args) {
  const values = {}, allowed = ["--package", "--metadata", "--publisher-key-id", "--expected-public-key-hex", "--key-env"];
  for (let i = 0; i < args.length; i += 2) {
    if (!allowed.includes(args[i]) || Object.hasOwn(values, args[i]) || !args[i + 1] || args[i + 1].startsWith("--")) throw new Error("Invalid signing arguments");
    values[args[i]] = args[i + 1];
  }
  if (allowed.some(key => !values[key]) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(values["--key-env"])) throw new Error("Invalid signing arguments");
  return values;
}

function openRegular(path, limit) {
  const entry = lstatSync(path);
  if (!entry.isFile() || entry.size === 0 || entry.size > limit) throw new Error("Invalid release input");
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  const info = fstatSync(fd);
  if (!info.isFile() || info.dev !== entry.dev || info.ino !== entry.ino || info.size !== entry.size) {
    closeSync(fd); throw new Error("Release input changed");
  }
  return fd;
}

export function main({ args = process.argv.slice(2), environment = process.env } = {}) {
  const values = parseArgs(args);
  const keyName = values["--key-env"], privateKeyPkcs8Base64 = environment[keyName];
  delete environment[keyName];
  if (!privateKeyPkcs8Base64) throw new Error("Signing key is unavailable");
  const input = resolve(values["--package"]);
  const packagePath = join(realpathSync(dirname(input)), basename(input));
  const metadataFd = openRegular(resolve(values["--metadata"]), 64 * 1024);
  let spec;
  try {
    const buffer = Buffer.alloc(64 * 1024 + 1);
    let count = 0, read;
    do { read = readSync(metadataFd, buffer, count, buffer.length - count); count += read; } while (read && count < buffer.length);
    if (count > 64 * 1024) throw new Error("Metadata exceeds limit");
    spec = JSON.parse(buffer.subarray(0, count).toString("utf8"));
  } finally { closeSync(metadataFd); }
  const packageFd = openRegular(packagePath, 512 * 1024 * 1024);
  let packageBytes, packageSha256, packageIdentity;
  try {
    const before = fstatSync(packageFd), hash = createHash("sha256"), buffer = Buffer.alloc(64 * 1024);
    packageBytes = 0;
    for (;;) {
      const count = readSync(packageFd, buffer);
      if (!count) break;
      packageBytes += count;
      if (packageBytes > 512 * 1024 * 1024) throw new Error("Package exceeds limit");
      hash.update(buffer.subarray(0, count));
    }
    const after = fstatSync(packageFd);
    if (packageBytes !== before.size || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs) throw new Error("Package changed");
    packageSha256 = hash.digest("hex");
    packageIdentity = after;
  } finally { closeSync(packageFd); }
  const metadata = createUpdateManifest(spec, { publisherKeyId:values["--publisher-key-id"], packageBytes, packageSha256, extension:extname(packagePath) });
  const signature = signReleaseBytes({ message:Buffer.concat([Buffer.from("jobsentinel.update-candidate.v1\0"), metadata]),
    expectedPublicKeyHex:values["--expected-public-key-hex"], privateKeyPkcs8Base64 }).toString("hex");
  const unchanged = () => {
    const current = lstatSync(packagePath);
    if (!current.isFile() || ["dev", "ino", "size", "mtimeMs", "ctimeMs"].some(key => current[key] !== packageIdentity[key])) throw new Error("Package changed");
  };
  unchanged();
  const outputs = [];
  try {
    for (const [suffix, bytes] of [[".manifest.json", metadata], [".sig", signature]]) {
      const path = `${packagePath}${suffix}`, fd = openSync(path, "wx", 0o600);
      outputs.push({path,fd,identity:fstatSync(fd)});
      writeFileSync(fd, bytes); fsyncSync(fd);
    }
    unchanged();
  } catch (error) {
    for (const output of outputs) { closeSync(output.fd); output.fd = undefined; }
    for (const {path,identity} of outputs) {
      try {
        const current = lstatSync(path);
        if (current.dev === identity.dev && current.ino === identity.ino) unlinkSync(path);
      } catch { /* A replaced or removed output belongs to its current owner. */ }
    }
    throw error;
  } finally { for (const {fd} of outputs) if (fd !== undefined) closeSync(fd); }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try { main(); } catch { console.error("Update candidate signing failed."); process.exitCode = 1; }
}
