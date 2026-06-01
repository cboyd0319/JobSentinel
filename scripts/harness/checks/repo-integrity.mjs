import { readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { readPackageManifest } from "./dependency-ownership.mjs";
import { listTrackedFiles } from "./repo-artifacts.mjs";

export function isJobSentinelProject(root) {
  try {
    return readPackageManifest(root).name === "jobsentinel";
  } catch {
    return false;
  }
}

export function hasUnreferencedDocsImage(root, path) {
  if (!path.startsWith("docs/images/") || extname(path) !== ".png") {
    return false;
  }

  const fileName = path.split("/").at(-1);
  if (!fileName) {
    return true;
  }

  const references = [`docs/images/${fileName}`, `images/${fileName}`, `../images/${fileName}`];

  return !listTrackedFiles(root).some((trackedPath) => {
    if (
      trackedPath.startsWith("docs/archive/") ||
      trackedPath.startsWith("docs/releases/") ||
      !trackedPath.endsWith(".md") ||
      (trackedPath !== "README.md" && !trackedPath.startsWith("docs/"))
    ) {
      return false;
    }

    const text = readFileSync(join(root, trackedPath), "utf8");
    return references.some((reference) => text.includes(reference));
  });
}

export function hasDuplicateDocsScreenshotCapture(root, path) {
  if (path !== "tests/e2e/playwright/screenshots.spec.ts") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const captures = [...text.matchAll(/screenshotPath\(\s*testInfo,\s*["']([^"']+)["']\s*\)/g)].map(
    (match) => match[1],
  );

  return new Set(captures).size !== captures.length;
}

export function hasContradictoryPlansIndexReleaseStatus(root, path) {
  if (path !== "docs/plans/README.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /## Current Release Plans[\s\S]*\|\s*v\d+\.\d+\.\d+\s*\|\s*Unreleased\s*\|/.test(text) &&
    /## Archived Plans[\s\S]*\|\s*v\d+\.\d+\.\d+\s*\|\s*Complete on main\s*\|/.test(text)
  );
}
