// Proves Essentials includes in-place model setup while excluding downloaded model payloads.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildTauriArgs } from "../../platform/build-macos-dmg.mjs";
import { verifyMacosRuntimeProfile } from "../../platform/macos-runtime-profile.mjs";
import {
  modelPayloadFiles,
  runtimeProfileArtifactViolations,
  runtimeProfileCommandViolations,
} from "../../release/verify-macos-package.mjs";

const commands = [
  "download_ml_model", "cancel_ml_model_download", "remove_ml_models",
  "get_ml_status", "semantic_match_skills", "match_resume_semantic",
];

test("every shipping platform includes the runtime for an in-place model upgrade", () => {
  const config = JSON.parse(readFileSync(new URL("../../../src-tauri/tauri.conf.json", import.meta.url), "utf8"));
  assert.ok(config.build.features?.includes("embedded-ml"));
  assert.deepEqual(buildTauriArgs([]), ["build", "--bundles", "app"]);
});

test("stronger local matching is a download choice rather than a separate package", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../../../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.scripts["tauri:build:macos:stronger-local"], undefined);
  assert.equal(packageJson.scripts["tauri:verify:macos:stronger-local"], undefined);
  assert.notDeepEqual(runtimeProfileArtifactViolations("JobSentinel_3.0.0_stronger-local_aarch64.dmg"), []);
  assert.deepEqual(runtimeProfileArtifactViolations("JobSentinel_3.0.0_aarch64.dmg"), []);
});

test("Essentials verification requires every governed model lifecycle command", () => {
  assert.deepEqual(runtimeProfileCommandViolations(commands.join("\n")), []);
  for (const missing of commands) {
    const violations = runtimeProfileCommandViolations(commands.filter((command) => command !== missing).join("\n"));
    assert.equal(violations.length, 1);
    assert.ok(violations[0].includes(missing));
  }
  assert.equal(runtimeProfileCommandViolations("").length, commands.length);
});

test("macOS runtime verifier scans release-sized executables", () => {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-macos-large-binary-"));
  const executable = join(root, "jobsentinel");
  try {
    writeFileSync(executable, "a".repeat(2 * 1024 * 1024) + commands.join("\n"));
    assert.doesNotThrow(() => verifyMacosRuntimeProfile(root, executable));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("model-free packages exclude weights and tokenizer payloads case-insensitively", () => {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-macos-model-payload-"));
  const modelDir = join("Contents", "Resources", "models");
  const payloads = ["MODEL.SAFETENSORS", "model.onnx", "weights.gguf", "model.bin", "pytorch_model.bin", "tokenizer.json", "tokenizer_config.json", "tokenizer.model", "vocab.txt"];
  try {
    mkdirSync(join(root, modelDir), { recursive: true });
    for (const name of [...payloads, "config.json", "README.md"]) writeFileSync(join(root, modelDir, name), "fixture");
    assert.deepEqual(modelPayloadFiles(root), payloads.map((name) => join(modelDir, name)).sort());
    const executable = join(root, "jobsentinel");
    writeFileSync(executable, commands.join("\n"));
    assert.throws(() => verifyMacosRuntimeProfile(root, executable), /Bundled model payload/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
