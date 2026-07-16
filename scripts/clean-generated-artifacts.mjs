import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const generatedArtifactDirectories = Object.freeze([
  "coverage",
  "dist",
  "dist-ssr",
  "playwright-report",
  "storybook-static",
  "test-results",
]);

export function cleanGeneratedArtifacts(root) {
  const removed = [];
  for (const directory of generatedArtifactDirectories) {
    const path = join(root, directory);
    if (!existsSync(path)) continue;
    rmSync(path, { recursive: true, force: true });
    removed.push(directory);
  }
  return removed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const removed = cleanGeneratedArtifacts(process.cwd());
  console.log(removed.length ? `Removed generated artifacts: ${removed.join(", ")}` : "No generated artifacts to remove.");
}
