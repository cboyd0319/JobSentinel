import { basename } from "node:path";

export function parseSha256Checksum(content, expectedFileName) {
  const entries = [];
  for (const line of String(content ?? "").split(/\r?\n/)) {
    const match = line.match(/^\s*([a-fA-F0-9]{64})\s+\*?(.+?)\s*$/);
    if (match) {
      entries.push({
        digest: match[1].toLowerCase(),
        fileName: match[2],
      });
    }
  }
  if (entries.length !== 1) {
    throw new Error(
      "SHA-256 checksum file must contain exactly one digest line.",
    );
  }
  if (expectedFileName && basename(entries[0].fileName) !== expectedFileName) {
    throw new Error(
      `SHA-256 checksum filename expected ${expectedFileName}, found ${entries[0].fileName}.`,
    );
  }
  return entries[0].digest;
}
