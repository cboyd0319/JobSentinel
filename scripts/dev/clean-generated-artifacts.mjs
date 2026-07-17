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
export const generatedArtifactFiles = Object.freeze([".DS_Store"]);

export function cleanGeneratedArtifacts(root, { deep = false } = {}) {
  const removed = [];
  const directories = deep
    ? [...generatedArtifactDirectories, "target"]
    : generatedArtifactDirectories;
  for (const directory of directories) {
    const path = join(root, directory);
    if (!existsSync(path)) continue;
    rmSync(path, { recursive: true, force: true });
    removed.push(directory);
  }
  for (const file of generatedArtifactFiles) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    rmSync(path, { force: true });
    removed.push(file);
  }
  return removed;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const removed = cleanGeneratedArtifacts(process.cwd(), {
    deep: process.argv.includes("--deep"),
  });
  console.log(removed.length ? `Removed generated artifacts: ${removed.join(", ")}` : "No generated artifacts to remove.");
}
