#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  collectCommandBoundaryCastViolations,
  collectCommandLimitValidationViolations,
  collectDocumentedCommandCountViolations,
  collectRegisteredCommands,
  collectRegisteredStubCommandViolations,
} from "./tauri-invokes/backend.mjs";
import {
  collectFrontendInvokes,
  collectFrontendRequiredArgViolations,
} from "./tauri-invokes/frontend.mjs";

const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function checkTauriInvokes(root = defaultRoot) {
  const violations = [];
  const registered = collectRegisteredCommands(root);
  if (!registered) {
    return ["could not find tauri::generate_handler! command registrations"];
  }

  const invokes = collectFrontendInvokes(root);
  for (const [command, locations] of [...invokes.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (!registered.has(command)) {
      violations.push(
        `${locations.join(", ")} invokes unregistered Tauri command: ${command}`,
      );
    }
  }

  violations.push(...collectDocumentedCommandCountViolations(root, registered.size));
  violations.push(...collectRegisteredStubCommandViolations(root));
  violations.push(...collectCommandBoundaryCastViolations(root));
  violations.push(...collectCommandLimitValidationViolations(root));
  violations.push(...collectFrontendRequiredArgViolations(root));
  return violations;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.argv[2] ? resolve(process.argv[2]) : defaultRoot;
  const violations = checkTauriInvokes(root);

  if (violations.length > 0) {
    console.error("Tauri invoke check failed:");
    for (const violation of violations) console.error(`- ${violation}`);
    process.exit(1);
  }

  console.log("Tauri invoke check passed.");
}
