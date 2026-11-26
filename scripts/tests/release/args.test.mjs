// Verifies shared release argument parsing and symlink-safe entrypoint detection.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { getArgValue, getRepoArg, hasArg, isMainModule, splitList } from "../../release/args.mjs";
import { parseConfirmArgs } from "../../release/confirm-verified-draft.mjs";
import { parseDraftAssetArgs } from "../../release/draft-assets.mjs";
import { parseArgs as parseAssetArgs } from "../../release/public-assets/options.mjs";
import { parseArgs as parseMacosArgs } from "../../release/verify-latest-macos-release.mjs";

test("argument helpers read spaced, inline and list values", () => {
  assert.equal(getArgValue(["--tag", "v3.0.0"], "--tag"), "v3.0.0");
  assert.equal(getArgValue(["--tag=v3.0.0"], "--tag"), "v3.0.0");
  assert.equal(hasArg(["--draft"], "--draft"), true);
  assert.deepEqual(splitList(" windows, ,linux "), ["windows", "linux"]);
});

test("every --repo parser accepts only owner/name without dot parts, backslashes or tabs", () => {
  assert.equal(getRepoArg(["--repo", "o/r.js"]), "o/r.js");
  assert.equal(getRepoArg([], "o/r"), "o/r");
  assert.equal(getRepoArg([]), undefined);
  for (const dangling of [["--repo"], ["--tag", "v3.0.0", "--repo"], ["--repo="], ["--repo", "--tag", "v3.0.0"]]) {
    assert.throws(() => getRepoArg(dangling, "o/r"), /--repo requires an owner\/name value|Invalid GitHub repository/, dangling.join(" "));
  }
  const parsers = [
    (repo) => getRepoArg(["--repo", repo]),
    (repo) => parseAssetArgs(["--repo", repo]),
    (repo) => parseMacosArgs([`--repo=${repo}`]),
    (repo) => parseConfirmArgs(["--repo", repo]),
    (repo) => parseDraftAssetArgs(["upload", "--repo", repo]),
  ];
  for (const repo of ["o/r\\..\\..\\x", "o/r/.\t./x", "o/..", "./r", "o/r/x", "o", "o/r?x"]) {
    for (const parse of parsers) assert.throws(() => parse(repo), /Invalid GitHub repository/, repo);
  }
});

test("isMainModule resolves symlinked entrypoints and rejects other scripts", () => {
  const dir = mkdtempSync(join(tmpdir(), "jobsentinel-args-"));
  try {
    const argsUrl = pathToFileURL(fileURLToPath(new URL("../../release/args.mjs", import.meta.url))).href;
    const script = join(dir, "cli.mjs");
    writeFileSync(script, `import { isMainModule } from ${JSON.stringify(argsUrl)};\nconsole.log(isMainModule(import.meta.url));\n`);
    const link = join(dir, "linked-cli.mjs");
    symlinkSync(script, link);
    assert.equal(execFileSync(process.execPath, [script], { encoding: "utf8" }).trim(), "true");
    assert.equal(execFileSync(process.execPath, [link], { encoding: "utf8" }).trim(), "true");
    assert.equal(isMainModule(pathToFileURL(script).href, join(dir, "other.mjs")), false);
    assert.equal(isMainModule(pathToFileURL(script).href, undefined), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
