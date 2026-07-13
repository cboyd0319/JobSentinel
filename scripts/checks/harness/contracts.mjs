import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  evaluateMacosReadiness,
  readReadmeMacosReadinessPercent,
} from "../../check-macos-readiness.mjs";
import { collectProductionExternalAiRequestFeatureIds } from "../../harness-external-ai-features.mjs";

const manifestPath = "docs/harness/manifest.json";
const featurePrivacyLabelsPath = "docs/harness/feature-privacy-labels.json";
const allowedFeaturePrivacyLabels = new Set([
  "Local only",
  "External AI optional",
  "External AI required",
  "Sensitive",
  "Public-data only",
]);
const allowedExternalAiDataCategories = new Set([
  "job_posting",
  "public_metadata",
  "resume",
  "salary_floor",
  "private_notes",
  "application_history",
  "career_goals",
  "location_preferences",
  "full_database",
]);
const sensitiveExternalAiDataCategories = new Set([
  "resume",
  "salary_floor",
  "private_notes",
  "application_history",
  "career_goals",
  "location_preferences",
  "full_database",
]);
const requiredFeatureIds = [
  "job-tracking",
  "saved-searches",
  "application-kanban",
  "first-seen-last-seen-job-tracking",
  "ghost-job-heuristic-scoring",
  "ghost-job-external-ai-explanation",
  "job-description-summary",
  "resume-job-fit-explanation",
  "negotiation-prep",
  "salary-floor-protection",
  "salary-transparency-check",
  "safe-support-report",
  "research-evaluation",
];

function repoPath(root, path) {
  return join(root, path);
}

function read(root, path) {
  return readFileSync(repoPath(root, path), "utf8");
}

function checkManifestContract(manifest) {
  const errors = [];
  const snippets = manifest.requiredHarnessSnippets;
  const references = manifest.readmeReferences ?? {};
  const publicWiki = manifest.publicWiki ?? {};

  if (manifest.version !== 1) errors.push(`${manifestPath} must use manifest version 1`);
  if (!Array.isArray(manifest.requiredFiles)) {
    errors.push(`${manifestPath} requiredFiles must be an array`);
  }
  if (!snippets || typeof snippets !== "object" || Array.isArray(snippets)) {
    errors.push(`${manifestPath} requiredHarnessSnippets must be an object`);
  }
  if (!references.heading) errors.push(`${manifestPath} readmeReferences.heading is required`);
  if (!references.path) errors.push(`${manifestPath} readmeReferences.path is required`);
  if (!references.indexHeading) {
    errors.push(`${manifestPath} readmeReferences.indexHeading is required`);
  }
  if (!Array.isArray(references.requiredUrls)) {
    errors.push(`${manifestPath} readmeReferences.requiredUrls must be an array`);
  }
  if (!publicWiki || typeof publicWiki !== "object" || Array.isArray(publicWiki)) {
    errors.push(`${manifestPath} publicWiki must be an object`);
  }
  if (publicWiki.url !== "https://github.com/cboyd0319/JobSentinel/wiki") {
    errors.push(`${manifestPath} publicWiki.url must point to the public wiki`);
  }
  if (publicWiki.remote !== "https://github.com/cboyd0319/JobSentinel.wiki.git") {
    errors.push(`${manifestPath} publicWiki.remote must point to the wiki Git remote`);
  }
  if (publicWiki.defaultBranch !== "master") {
    errors.push(`${manifestPath} publicWiki.defaultBranch must match the wiki remote`);
  }

  const pages = Array.isArray(publicWiki.requiredPages) ? publicWiki.requiredPages : [];
  if (pages.length === 0) {
    errors.push(`${manifestPath} publicWiki.requiredPages must list wiki pages`);
  }
  for (const requiredPage of ["Home.md", "Capabilities.md"]) {
    if (!pages.includes(requiredPage)) {
      errors.push(`${manifestPath} publicWiki.requiredPages missing ${requiredPage}`);
    }
  }
  for (const page of pages) {
    if (typeof page !== "string" || !/^[A-Za-z0-9._-]+\.md$/.test(page)) {
      errors.push(`${manifestPath} publicWiki.requiredPages has invalid page: ${String(page)}`);
    }
  }

  const triggers = publicWiki.mustStayCurrentWhen;
  if (!Array.isArray(triggers) || triggers.length === 0) {
    errors.push(`${manifestPath} publicWiki.mustStayCurrentWhen must list update triggers`);
  }
  for (const trigger of [
    "behavior",
    "setup",
    "commands",
    "architecture",
    "security",
    "release flow",
    "capabilities",
    "user-facing copy",
  ]) {
    if (!triggers?.includes(trigger)) {
      errors.push(`${manifestPath} publicWiki.mustStayCurrentWhen missing ${trigger}`);
    }
  }
  return errors;
}

function checkMacosReadiness(root) {
  const errors = [];
  const readiness = evaluateMacosReadiness({ root });
  const failed = readiness.criteria.filter((item) => !item.ok);
  if (failed.length > 0) {
    errors.push(
      `macOS no-account readiness checks failed: ${failed.map((item) => item.id).join(", ")}`,
    );
  }
  const readmePercentage = readReadmeMacosReadinessPercent(root);
  if (readmePercentage !== readiness.percentage) {
    errors.push(
      `README.md macOS readiness percentage must be ${readiness.percentage}, found ${readmePercentage ?? "missing"}`,
    );
  }
  return errors;
}

function checkFeaturePrivacyLabels(root) {
  if (!existsSync(repoPath(root, featurePrivacyLabelsPath))) return [];

  const errors = [];
  const policy = JSON.parse(read(root, featurePrivacyLabelsPath));
  if (policy.version !== 1) errors.push(`${featurePrivacyLabelsPath} must use version 1`);

  const declaredLabels = Array.isArray(policy.labels) ? policy.labels : [];
  for (const label of allowedFeaturePrivacyLabels) {
    if (!declaredLabels.includes(label)) {
      errors.push(`${featurePrivacyLabelsPath} labels missing required label: ${label}`);
    }
  }

  const features = Array.isArray(policy.features) ? policy.features : [];
  const featureIds = new Set();
  const featuresById = new Map();
  if (features.length < requiredFeatureIds.length) {
    errors.push(`${featurePrivacyLabelsPath} must list core privacy-labeled features`);
  }

  for (const feature of features) {
    if (!feature || typeof feature !== "object") {
      errors.push(`${featurePrivacyLabelsPath} contains a non-object feature entry`);
      continue;
    }
    if (typeof feature.id !== "string" || !feature.id.trim()) {
      errors.push(`${featurePrivacyLabelsPath} contains a feature without id`);
      continue;
    }
    if (featureIds.has(feature.id)) {
      errors.push(`${featurePrivacyLabelsPath} has duplicate feature id: ${feature.id}`);
    }
    featureIds.add(feature.id);
    featuresById.set(feature.id, feature);

    if (typeof feature.name !== "string" || !feature.name.trim()) {
      errors.push(`${featurePrivacyLabelsPath} ${feature.id} must include a name`);
    }
    if (!Array.isArray(feature.labels) || feature.labels.length === 0) {
      errors.push(`${featurePrivacyLabelsPath} ${feature.id} must include labels`);
    } else {
      for (const label of feature.labels) {
        if (!allowedFeaturePrivacyLabels.has(label)) {
          errors.push(`${featurePrivacyLabelsPath} ${feature.id} has unknown label: ${label}`);
        }
      }
    }

    if (!Array.isArray(feature.dataCategories) || feature.dataCategories.length === 0) {
      errors.push(`${featurePrivacyLabelsPath} ${feature.id} must include dataCategories`);
    } else {
      for (const category of feature.dataCategories) {
        if (!allowedExternalAiDataCategories.has(category)) {
          errors.push(
            `${featurePrivacyLabelsPath} ${feature.id} has unknown data category: ${category}`,
          );
        }
      }
    }

    const sensitive = feature.dataCategories?.some((category) =>
      sensitiveExternalAiDataCategories.has(category),
    );
    if (sensitive && !feature.labels?.includes("Sensitive")) {
      errors.push(
        `${featurePrivacyLabelsPath} ${feature.id} uses sensitive data without Sensitive label`,
      );
    }
    if (feature.labels?.includes("Public-data only") && sensitive) {
      errors.push(
        `${featurePrivacyLabelsPath} ${feature.id} cannot be Public-data only with sensitive data`,
      );
    }
    if (feature.labels?.includes("External AI required") && !feature.externalAi?.required) {
      errors.push(`${featurePrivacyLabelsPath} ${feature.id} must mark externalAi.required`);
    }
    if (feature.externalAi?.required && !feature.labels?.includes("External AI required")) {
      errors.push(
        `${featurePrivacyLabelsPath} ${feature.id} requires external AI without required label`,
      );
    }
    if (
      feature.externalAi?.allowed &&
      !feature.labels?.some((label) => label.startsWith("External AI"))
    ) {
      errors.push(
        `${featurePrivacyLabelsPath} ${feature.id} allows external AI without external-AI label`,
      );
    }
    if (typeof feature.externalAi?.fallback !== "string" || !feature.externalAi.fallback.trim()) {
      errors.push(
        `${featurePrivacyLabelsPath} ${feature.id} must include local fallback guidance`,
      );
    }
  }

  for (const id of requiredFeatureIds) {
    if (!featureIds.has(id)) errors.push(`${featurePrivacyLabelsPath} missing required feature: ${id}`);
  }
  for (const id of collectProductionExternalAiRequestFeatureIds(root)) {
    const feature = featuresById.get(id);
    if (!feature) {
      errors.push(`${featurePrivacyLabelsPath} missing shipped external-AI request feature: ${id}`);
    } else if (!feature.externalAi?.allowed) {
      errors.push(
        `${featurePrivacyLabelsPath} ${id} must allow external AI because production code sends it through the gateway`,
      );
    }
  }
  return errors;
}

function checkVersionAndCommandClaims(root) {
  const errors = [];
  const packageJson = JSON.parse(read(root, "package.json"));
  const packageLock = JSON.parse(read(root, "package-lock.json"));
  const tauriConfig = JSON.parse(read(root, "src-tauri/tauri.conf.json"));
  const cargoVersion = read(root, "Cargo.toml").match(/^version\s*=\s*"([^"]+)"/m)?.[1];

  const mismatches = [
    [tauriConfig.version, "src-tauri/tauri.conf.json"],
    [packageLock.version, "package-lock.json"],
    [packageLock.packages?.[""]?.version, "package-lock.json root package"],
    [cargoVersion, "Cargo.toml"],
  ];
  for (const [version, source] of mismatches) {
    if (version !== packageJson.version) {
      errors.push(
        `version mismatch: package.json=${packageJson.version}, ${source}=${version ?? "missing"}`,
      );
    }
  }

  const versionClaims = {
    "README.md": [`v${packageJson.version}`, "github/v/release/cboyd0319/JobSentinel"],
    "docs/README.md": [`Package metadata version: \`${packageJson.version}\``],
    "docs/ROADMAP.md": ["Use `package.json` for the current release package version."],
  };
  for (const [path, claims] of Object.entries(versionClaims)) {
    const text = read(root, path);
    for (const claim of claims) {
      if (!text.includes(claim)) errors.push(`${path} must include current version claim: ${claim}`);
    }
  }

  const registry = read(root, "src-tauri/src/command_handlers.rs");
  const block = registry.match(/(?:::)?tauri::generate_handler!\[\s*([\s\S]*?)\s*\]/);
  if (!block) {
    errors.push(
      "could not find tauri::generate_handler! block in src-tauri/src/command_handlers.rs",
    );
  }
  const count = [
    ...(block?.[1].matchAll(
      /commands::((?:[a-zA-Z0-9_]+::)+)([a-zA-Z0-9_]+)/g,
    ) ?? []),
  ].length;
  const claim = `${count} registered Tauri commands`;
  for (const path of ["README.md", "docs/ROADMAP.md"]) {
    if (!read(root, path).includes(claim)) {
      errors.push(`${path} must include current command claim: ${claim}`);
    }
  }
  return errors;
}

function checkDocumentationClaims(root) {
  const errors = [];
  const testCountDocs = [
    "README.md",
    "docs/README.md",
    "docs/ROADMAP.md",
    "docs/developer/TESTING.md",
    "docs/developer/FRONTEND_TESTING.md",
    "docs/developer/INTEGRATION_TESTING.md",
  ];
  const testCountPattern =
    /\b(?:\d+\+?\s+(?:unit|integration|component|frontend|e2e|rust|js)?\s*tests?\b|(?:unit|integration|component|frontend|e2e|rust|js)\s+tests?:\s*\d+\+?)/i;
  for (const path of testCountDocs) {
    read(root, path)
      .split(/\r?\n/)
      .forEach((line, index) => {
        const normalized = line.trim();
        if (testCountPattern.test(normalized) && !/\bnew\s+(?:component\s+)?tests?\b/i.test(normalized)) {
          errors.push(
            `${path}:${index + 1} has hardcoded current test-count claim; reference fresh command output instead`,
          );
        }
      });
  }

  const rustLintPolicyDocs = [
    "AGENTS.md",
    "README.md",
    "docs/harness/agent-operating-model.md",
    "docs/harness/verification-matrix.md",
    "docs/developer/CONTRIBUTING.md",
    "docs/developer/CI_CD.md",
    "docs/developer/TESTING.md",
  ];
  const hardGate = /cargo\s+clippy(?=[^\n`]*--all-targets)(?=[^\n`]*-D\s+warnings)/;
  for (const path of rustLintPolicyDocs) {
    read(root, path)
      .split(/\r?\n/)
      .forEach((line, index) => {
        if (hardGate.test(line)) {
          errors.push(
            `${path}:${index + 1} uses all-target clippy as a hard gate; use production clippy policy instead`,
          );
        }
      });
  }
  return errors;
}

export function checkHarnessContracts(root, manifest) {
  return [
    ...checkManifestContract(manifest),
    ...checkMacosReadiness(root),
    ...checkFeaturePrivacyLabels(root),
    ...checkVersionAndCommandClaims(root),
    ...checkDocumentationClaims(root),
  ];
}
