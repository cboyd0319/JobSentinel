#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { checkAgentSkills } from "../check-agent-skills.mjs";
import { checkDependencyRationale } from "../check-dependency-rationale.mjs";
import { checkDuplication } from "../check-duplication.mjs";
import { checkExternalAiGateway } from "../check-external-ai-gateway.mjs";
import { checkFrontendBoundaries } from "../check-frontend-boundaries.mjs";
import { checkTestQuality } from "../check-test-quality.mjs";
import { collectLanguageStyleViolations } from "../harness/checks/language-style.mjs";
import { summarizeHarnessScore } from "../harness-score.mjs";
import { collectDependencyPinViolations } from "./dependency-pins.mjs";
import { checkHarnessContracts } from "./harness/contracts.mjs";
import { checkHarnessRepositoryFiles } from "./harness/repository-files.mjs";
import { checkRepoBloat } from "./repo-bloat.mjs";
import {
  checkSecuritySensors,
  formatSecuritySensorSummary,
} from "./security-sensors.mjs";
import { checkTauriInvokes } from "./tauri-invokes.mjs";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const harnessManifestPath = "docs/harness/manifest.json";
const featurePrivacyLabelsPath = "docs/harness/feature-privacy-labels.json";

function collectFocusedSensorViolations(root) {
  return [
    ...checkFrontendBoundaries(root),
    ...checkExternalAiGateway(root),
    ...checkSecuritySensors(root),
    ...checkAgentSkills(root),
    ...collectDependencyPinViolations(root),
    ...checkRepoBloat(root),
    ...checkDuplication(root),
    ...checkDependencyRationale(root),
    ...checkTauriInvokes(root),
    ...checkTestQuality(root),
    ...collectLanguageStyleViolations(root),
  ];
}

function collectHarnessScoreViolations(root) {
  const score = summarizeHarnessScore(root);
  if (score.allPerfect) return [];

  const errors = [
    `five-tuple harness score must be 100/100; current score is ${score.overall}/100`,
  ];
  for (const framework of score.frameworks) {
    for (const subsystem of framework.subsystems) {
      for (const item of subsystem.checks) {
        if (!item.pass) {
          errors.push(
            `${framework.name} ${subsystem.name}: ${item.label} [${item.evidence}]`,
          );
        }
      }
    }
  }
  return errors;
}

export function checkHarness(root = defaultRoot) {
  const manifest = JSON.parse(
    readFileSync(join(root, harnessManifestPath), "utf8"),
  );
  return [
    ...checkHarnessContracts(root, manifest),
    ...checkHarnessRepositoryFiles(root, manifest),
    ...collectFocusedSensorViolations(root),
    ...collectHarnessScoreViolations(root),
  ];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.argv[2] ? resolve(process.argv[2]) : defaultRoot;
  const errors = checkHarness(root);
  if (errors.length > 0) {
    console.error("Harness check failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(formatSecuritySensorSummary());
  console.log("Harness check passed.");
}

export { featurePrivacyLabelsPath, harnessManifestPath };
