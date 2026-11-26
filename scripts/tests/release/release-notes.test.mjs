// Proves hosted staging and the manual windows-linux draft get the same release body, Package Status included.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { assertReleaseBody, composeReleaseNotes, packageStatus } from "../../release/release-notes.mjs";

test("release notes append the Package Status section exactly as staging did", () => {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-notes-"));
  try {
    mkdirSync(join(root, "docs/releases"), { recursive: true });
    writeFileSync(join(root, "docs/releases/v3.0.0.md"), "# JobSentinel 3.0.0\n\nHighlights.\n");
    assert.equal(
      composeReleaseNotes({ root, version: "v3.0.0" }),
      "# JobSentinel 3.0.0\n\nHighlights.\n\n## Package Status\n\nmacOS package status is enforced by the release workflow.\n\n" +
        "In no-Apple-Developer-account mode, the macOS DMG is ad-hoc signed, not Developer ID signed, not notarized, and not Gatekeeper-ready. " +
        "It requires a first-open Privacy & Security approval on macOS. Verify the matching `.sha256` checksum before opening.\n\n" +
        "When Developer ID signing and notarization are configured, the macOS workflow requires Gatekeeper acceptance before upload.\n",
    );
    assert.equal(composeReleaseNotes({ root, version: "3.0.1" }), packageStatus);
    writeFileSync(join(root, "docs/releases/v3.0.2.md"), "");
    assert.equal(composeReleaseNotes({ root, version: "3.0.2" }), packageStatus);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("release body check ignores CRLF and trailing whitespace but nothing else", () => {
  const notes = `# JobSentinel 3.0.0\n\nHighlights.\n\n## Package Status\n\n${packageStatus}`;
  assert.doesNotThrow(() => assertReleaseBody({ id: 1, body: notes.replace(/\n/g, "\r\n").trimEnd() }, notes));
  assert.doesNotThrow(() => assertReleaseBody({ id: 1, body: notes.replace(/\n/g, "\r") }, notes));
  const withoutStatus = notes.slice(0, notes.indexOf("\n## Package Status"));
  const altered = notes.replace("not Gatekeeper-ready", "Gatekeeper-ready");
  for (const body of [withoutStatus, withoutStatus.replace(/\n/g, "\r\n"), altered, `${notes}\nExtra line.`, `  ${notes}`, "", null, undefined]) {
    assert.throws(() => assertReleaseBody({ id: 1, body }, notes), /Release 1 body differs from the release notes generated from the tag commit/, JSON.stringify(body));
  }
});
