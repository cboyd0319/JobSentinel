#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  collectRepositoryFileSizeReviewCandidates,
  collectRepositoryFileSizeViolations,
} from "../harness/checks/repo-file-size.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const violations = collectRepositoryFileSizeViolations(root);
if (violations.length > 0) {
  console.error("File-size check failed:");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  const review = collectRepositoryFileSizeReviewCandidates(root);
  console.log("Hard source limits passed for every governed source and configuration file.");
  console.log(`Modularization review threshold reached by ${review.length} file(s):`);
  for (const path of review) console.log(`- ${path}`);
}
