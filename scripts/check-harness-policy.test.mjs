import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const manifestPath = "docs/harness/manifest.json";
const featurePrivacyLabelsPath = "docs/harness/feature-privacy-labels.json";

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

test("harness policy manifest owns required docs and source policy", () => {
  const manifest = readJson(manifestPath);

  assert.equal(manifest.version, 1);
  assert.ok(manifest.requiredFiles.includes("AGENTS.md"));
  assert.ok(manifest.requiredFiles.includes(".github/PULL_REQUEST_TEMPLATE.md"));
  assert.ok(manifest.requiredFiles.includes(manifestPath));
  assert.ok(manifest.requiredFiles.includes(featurePrivacyLabelsPath));
  assert.ok(manifest.requiredHarnessSnippets["README.md"].includes("Core workflows work locally."));
  assert.ok(
    manifest.requiredHarnessSnippets[".github/PULL_REQUEST_TEMPLATE.md"].includes(
      "Rule 0: user privacy and security are non-negotiable.",
    ),
  );
  assert.ok(
    manifest.requiredHarnessSnippets["AGENTS.md"].includes(
      "Rule 0: user privacy and security are non-negotiable.",
    ),
  );
  assert.ok(
    manifest.requiredHarnessSnippets["CLAUDE.md"].includes(
      "Rule 0: user privacy and security are non-negotiable.",
    ),
  );
  assert.ok(
    manifest.requiredHarnessSnippets[".github/copilot-instructions.md"].includes(
      "Rule 0: user privacy and security are non-negotiable.",
    ),
  );
  assert.ok(manifest.requiredFiles.includes("docs/references.md"));
  assert.ok(manifest.requiredFiles.includes("docs/developer/DESIGN_SPEC.md"));
  assert.ok(
    manifest.requiredHarnessSnippets["docs/plans/index.json"].includes(
      "Quiet Shield redesign",
    ),
  );
  assert.ok(
    manifest.requiredHarnessSnippets["docs/plans/index.json"].includes(
      "Computer Use or Playwright screenshot proof",
    ),
  );
  assert.ok(
    manifest.requiredHarnessSnippets["docs/plans/active/status.md"].includes(
      "Quiet Shield redesign is now part of the active repo-wide goal and the repo harness.",
    ),
  );
  assert.ok(
    manifest.requiredHarnessSnippets["docs/plans/active/current-work.md"].includes(
      "Locked redesign:",
    ),
  );
  assert.ok(
    manifest.requiredHarnessSnippets["DESIGN.md"].includes(
      "theme tokens, contrast checks, screenshots, and native Computer Use validation",
    ),
  );
  assert.ok(
    manifest.requiredHarnessSnippets["docs/design/design-spec.md"].includes(
      "full migration until all major routes are verified",
    ),
  );
  assert.ok(
    manifest.requiredHarnessSnippets["docs/developer/DESIGN_SPEC.md"].includes(
      "Harness checks require this file to stay a pointer",
    ),
  );
  assert.equal(manifest.readmeReferences.path, "docs/references.md");
  assert.equal(manifest.readmeReferences.heading, "## References and external sources");
  assert.equal(manifest.readmeReferences.indexHeading, "# References and External Sources");
  assert.equal(manifest.readmeReferences.excludedTestUrlExplanation, "Security test payloads");
  assert.equal(manifest.publicWiki.url, "https://github.com/cboyd0319/JobSentinel/wiki");
  assert.equal(manifest.publicWiki.remote, "https://github.com/cboyd0319/JobSentinel.wiki.git");
  assert.equal(manifest.publicWiki.defaultBranch, "master");
  assert.deepEqual(manifest.publicWiki.requiredPages, ["Home.md", "Capabilities.md"]);
  assert.ok(manifest.publicWiki.mustStayCurrentWhen.includes("capabilities"));
  assert.ok(manifest.publicWiki.mustStayCurrentWhen.includes("user-facing copy"));
  assert.ok(
    manifest.readmeReferences.requiredUrls.length > 100,
    "README source policy should stay in the manifest, not in the checker script",
  );
});

test("feature privacy label manifest records core local-first boundaries", () => {
  const labels = readJson(featurePrivacyLabelsPath);
  const featureIds = new Set(labels.features.map((feature) => feature.id));

  assert.equal(labels.version, 1);
  assert.ok(labels.labels.includes("Local only"));
  assert.ok(labels.labels.includes("External AI optional"));
  assert.ok(labels.labels.includes("Sensitive"));
  assert.ok(featureIds.has("job-tracking"));
  assert.ok(featureIds.has("resume-job-fit-explanation"));
  assert.ok(featureIds.has("safe-support-report"));
  assert.ok(labels.features.length >= 13);
  assert.equal(
    labels.features.some(
      (feature) =>
        feature.id === "resume-job-fit-explanation" &&
        feature.labels.includes("Sensitive") &&
        feature.externalAi.allowed === true &&
        feature.externalAi.required === false,
    ),
    true,
  );
});

test("harness policy manifest stays portable and reviewable", () => {
  const manifestText = readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(manifestText);
  const localHomePathPrefix = ["", "Users", ""].join("/");

  assert.equal(manifestText.includes(localHomePathPrefix), false);
  assert.equal(manifestText.includes("jobsentinel_openai_grant_application_packet"), false);
  assert.ok(Array.isArray(manifest.requiredFiles));
  assert.ok(typeof manifest.requiredHarnessSnippets === "object");
  assert.ok(Array.isArray(manifest.readmeReferences.requiredUrls));
  assert.ok(Array.isArray(manifest.publicWiki.requiredPages));
});

test("check-harness consumes manifest instead of hardcoding large policy tables", () => {
  const checker = readFileSync("scripts/check-harness.mjs", "utf8");

  assert.ok(checker.includes(manifestPath));
  assert.ok(checker.includes(featurePrivacyLabelsPath));
  assert.ok(checker.includes("machineSpecificLocalPathNeedles"));
  assert.ok(checker.includes("docLocalAbsolutePathPattern"));
  assert.ok(checker.includes("<repo-root>/<home> placeholders"));
  assert.ok(checker.includes("manifestPublicWiki"));
  assert.ok(checker.includes("publicWiki.requiredPages"));
  assert.equal(checker.includes("const requiredHarnessSnippets = {"), false);
  assert.equal(checker.includes("const requiredReadmeReferenceUrls = ["), false);
});
