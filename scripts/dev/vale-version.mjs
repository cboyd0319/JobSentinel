// Compares the local Vale CLI with the Vale version the hosted prose lint pins in the release workflow.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const label = "Vale prose linter";

/** The `VALE_VERSION` that `.github/workflows/release.yml` installs, or undefined when it has no pin. */
export function pinnedValeVersion(root) {
  try {
    return readFileSync(join(root, ".github/workflows/release.yml"), "utf8").match(/^\s*VALE_VERSION: "([^"]+)"\s*$/m)?.[1];
  } catch {
    return undefined;
  }
}

/** Only warns: another local Vale still lints, but its results can differ from the hosted lane. */
export function checkValeVersion(root, { execFileSync: exec = execFileSync } = {}) {
  const pinned = pinnedValeVersion(root);
  if (!pinned) return { status: "warn", label, detail: ".github/workflows/release.yml does not pin VALE_VERSION" };
  let output;
  try {
    output = exec("vale", ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 10_000 }).trim();
  } catch {
    return { status: "warn", label, detail: `vale unavailable; the hosted prose lint uses Vale ${pinned}` };
  }
  if (output.match(/\d+\.\d+\.\d+/)?.[0] === pinned) return { status: "pass", label, detail: output };
  return { status: "warn", label, detail: `${output}; the hosted prose lint pins Vale ${pinned}, so local results may differ` };
}
