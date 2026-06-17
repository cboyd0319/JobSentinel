import { spawnSync } from "node:child_process";
import { join } from "node:path";

export function collectCargoCompatibleUpdateViolations(root, { spawn = spawnSync } = {}) {
  const srcTauriRoot = join(root, "src-tauri");
  const result = spawn(
    "cargo",
    ["update", "--dry-run", "--verbose", "--manifest-path", join(srcTauriRoot, "Cargo.toml")],
    {
      cwd: srcTauriRoot,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 10,
    },
  );

  if (result.error) {
    return [`cargo update dry-run failed: ${result.error.message}`];
  }

  if (result.status !== 0) {
    return [
      `cargo update dry-run exited ${result.status}: ${String(result.stderr || result.stdout).trim()}`,
    ];
  }

  const updateLines = `${result.stdout}\n${result.stderr}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      return /^(Adding|Downgrading|Removing|Updating)\s/.test(line) &&
        !line.includes("crates.io index");
    });

  return updateLines.map((line) => `Cargo.lock has a compatible update pending: ${line}`);
}
