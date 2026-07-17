import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

export function createFixtureRunner(prefix, { git = false } = {}) {
  return function withFixture(callback) {
    const root = mkdtempSync(join(tmpdir(), prefix));
    try {
      if (git) {
        execFileSync("git", ["init", "--quiet"], { cwd: root });
      }
      return callback(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  };
}
