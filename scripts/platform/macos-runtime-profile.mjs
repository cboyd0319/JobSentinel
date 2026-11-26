// Enforces upgradable Essentials builds and the absence of bundled model payloads.

import { readFileSync, readdirSync } from "node:fs";
import { basename, join, relative } from "node:path";

const modelLifecycleCommands = [
  "download_ml_model",
  "cancel_ml_model_download",
  "remove_ml_models",
  "get_ml_status",
  "semantic_match_skills",
  "match_resume_semantic",
];

export function runtimeProfileArtifactViolations(dmgPath) {
  if (basename(dmgPath).includes("_stronger-local_")) {
    return ["stronger local matching is installed in Settings, not a separate app package"];
  }
  return [];
}

export function assertMacosRuntimeProfileArtifact(dmgPath) {
  const violations = runtimeProfileArtifactViolations(dmgPath);
  if (violations.length > 0) {
    throw new Error(`Runtime profile artifact check failed:\n- ${violations.join("\n- ")}`);
  }
}

export function runtimeProfileCommandViolations(binaryContents) {
  return modelLifecycleCommands
    .filter((command) => !binaryContents.includes(command))
    .map((command) => `Essentials model setup command missing: ${command}`);
}

export function modelPayloadFiles(appPath) {
  const payloadFiles = [];

  function visit(path) {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const entryPath = join(path, entry.name);
      if (entry.isDirectory()) {
        visit(entryPath);
      } else if (/\.(safetensors|onnx|gguf|ggml)$|^(model|pytorch_model.*)\.bin$|^tokenizer([._].*)?$|^vocab\.(json|txt)$/i.test(entry.name)) {
        payloadFiles.push(relative(appPath, entryPath));
      }
    }
  }

  visit(appPath);
  return payloadFiles.sort();
}

export function verifyMacosRuntimeProfile(appPath, executable) {
  console.log(`Scanning native commands: ${executable}`);
  const commandViolations = runtimeProfileCommandViolations(readFileSync(executable));
  if (commandViolations.length > 0) {
    throw new Error(`Runtime profile check failed:\n- ${commandViolations.join("\n- ")}`);
  }

  const payloadFiles = modelPayloadFiles(appPath);
  if (payloadFiles.length > 0) {
    throw new Error(`Bundled model payload files are forbidden:\n- ${payloadFiles.join("\n- ")}`);
  }

  console.log("Essentials in-place model setup verified.");
  console.log("Model payload absence verified: no model weights or tokenizer files in app bundle.");
}
