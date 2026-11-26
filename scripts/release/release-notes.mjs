#!/usr/bin/env node
// Owns the release body: the versioned release notes, when present, followed by the macOS Package Status block.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { getArgValue, isMainModule } from "./args.mjs";
import { normalizeReleaseVersion } from "./validate-release-version.mjs";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export const packageStatus = [
  "macOS package status is enforced by the release workflow.",
  "In no-Apple-Developer-account mode, the macOS DMG is ad-hoc signed, not Developer ID signed, not notarized, and not Gatekeeper-ready. It requires a first-open Privacy & Security approval on macOS. Verify the matching `.sha256` checksum before opening.",
  "When Developer ID signing and notarization are configured, the macOS workflow requires Gatekeeper acceptance before upload.",
].join("\n\n") + "\n";

/** The body for `docs/releases/vX.Y.Z.md` plus a Package Status section, or the status block alone without notes. */
export function composeReleaseNotes({ root = defaultRoot, version }) {
  let notes = "";
  try {
    notes = readFileSync(join(root, `docs/releases/v${normalizeReleaseVersion(version)}.md`), "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return notes ? `${notes}\n## Package Status\n\n${packageStatus}` : packageStatus;
}

/** Line endings unified to LF and trailing whitespace dropped: GitHub may store a body with CRLF and no final newline. */
const normalizeBody = (text) => String(text ?? "").replace(/\r\n?/g, "\n").trimEnd();

/** Fails unless the release body matches the notes regenerated from the checked-out tag commit, up to line endings. */
export function assertReleaseBody(release, notes) {
  if (normalizeBody(release?.body) !== normalizeBody(notes)) {
    throw new Error(`Release ${release?.id} body differs from the release notes generated from the tag commit; refusing to publish edited notes.`);
  }
}

if (isMainModule(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const version = getArgValue(args, "--version");
    const out = getArgValue(args, "--out");
    if (!version || !out) throw new Error("Usage: release-notes.mjs --version X.Y.Z --out <file>");
    writeFileSync(out, composeReleaseNotes({ version }));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
