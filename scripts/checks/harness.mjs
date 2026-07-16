#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  collectHarnessContractViolations,
  harnessManifestPath,
} from "../harness/contract.mjs";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function checkHarness(root = defaultRoot) {
  return collectHarnessContractViolations(root);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.argv[2] ? resolve(process.argv[2]) : defaultRoot;
  const errors = checkHarness(root);
  if (errors.length > 0) {
    console.error("Harness check failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log("Harness contract, state, architecture, hosted-workflow policy, and file-size coverage passed.");
  }
}

export { harnessManifestPath };
