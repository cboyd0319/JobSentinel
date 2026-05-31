import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const manifestPath = "docs/harness/manifest.json";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

test("harness policy manifest owns required docs and source policy", () => {
  const manifest = readJson(manifestPath);

  assert.equal(manifest.version, 1);
  assert.ok(manifest.requiredFiles.includes("AGENTS.md"));
  assert.ok(manifest.requiredFiles.includes(manifestPath));
  assert.ok(manifest.requiredHarnessSnippets["README.md"].includes("Core workflows work locally."));
  assert.equal(manifest.readmeReferences.heading, "## References and external sources");
  assert.equal(manifest.readmeReferences.excludedTestUrlExplanation, "Security test payloads");
  assert.ok(
    manifest.readmeReferences.requiredUrls.length > 100,
    "README source policy should stay in the manifest, not in the checker script",
  );
});

test("harness policy manifest stays portable and reviewable", () => {
  const manifestText = readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(manifestText);

  assert.equal(manifestText.includes("/Users/"), false);
  assert.equal(manifestText.includes("jobsentinel_openai_grant_application_packet"), false);
  assert.ok(Array.isArray(manifest.requiredFiles));
  assert.ok(typeof manifest.requiredHarnessSnippets === "object");
  assert.ok(Array.isArray(manifest.readmeReferences.requiredUrls));
});

test("check-harness consumes manifest instead of hardcoding large policy tables", () => {
  const checker = readFileSync("scripts/check-harness.mjs", "utf8");

  assert.ok(checker.includes(manifestPath));
  assert.equal(checker.includes("const requiredHarnessSnippets = {"), false);
  assert.equal(checker.includes("const requiredReadmeReferenceUrls = ["), false);
});
