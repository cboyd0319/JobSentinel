#!/usr/bin/env node

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  collectDocsDriftViolations,
  collectMissingGrantFacingDocs,
} from "../harness/checks/docs-drift.mjs";
import { collectPrivacyLoggingViolations } from "../harness/checks/privacy-logging.mjs";
import {
  collectFilesystemBloat,
  collectRepositoryFileSizeViolations,
  collectUnexpectedRootEntries,
  isTrackedBloat,
  listTrackedFiles,
} from "../harness/checks/repo-artifacts.mjs";
import { isJobSentinelProject } from "../harness/checks/repo-integrity.mjs";
import { collectProductPolicyViolations } from "./repo-bloat/product-policy.mjs";
import { collectRepositoryPolicyViolations } from "./repo-bloat/repository-policy.mjs";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function checkRepoBloat(root = defaultRoot) {
  const violations = [];
  if (!existsSync(root)) return [`repo root does not exist: ${root}`];

  if (isJobSentinelProject(root)) {
    for (const path of collectMissingGrantFacingDocs(root)) {
      violations.push(`add required grant-facing doc: ${path}`);
    }
  }
  for (const rootEntry of collectUnexpectedRootEntries(root)) {
    violations.push(`classify root entry or move/remove it: ${rootEntry}`);
  }
  for (const artifact of collectFilesystemBloat(root)) {
    violations.push(`remove local artifact: ${artifact}`);
  }
  violations.push(...collectRepositoryFileSizeViolations(root));

  for (const path of listTrackedFiles(root)) {
    if (isTrackedBloat(path)) {
      violations.push(`remove tracked generated or disposable file: ${path}`);
    }
    violations.push(...collectDocsDriftViolations(root, path));
    violations.push(...collectPrivacyLoggingViolations(root, path));
    violations.push(...collectProductPolicyViolations(root, path));
    violations.push(...collectRepositoryPolicyViolations(root, path));
  }
  return violations.sort();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.argv[2] ? resolve(process.argv[2]) : defaultRoot;
  const violations = checkRepoBloat(root);
  if (violations.length > 0) {
    console.error("Repo bloat check failed:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exit(1);
  }
  console.log("Repo bloat check passed.");
}
