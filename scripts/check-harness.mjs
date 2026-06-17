#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { checkFrontendBoundaries } from "./check-frontend-boundaries.mjs";
import { checkExternalAiGateway } from "./check-external-ai-gateway.mjs";
import {
  checkSecuritySensors,
  formatSecuritySensorSummary,
} from "./check-security-sensors.mjs";
import { checkRepoBloat } from "./check-repo-bloat.mjs";
import {
  evaluateMacosReadiness,
  readReadmeMacosReadinessPercent,
} from "./check-macos-readiness.mjs";
import { checkTauriInvokes } from "./check-tauri-invokes.mjs";
import { checkTestQuality } from "./check-test-quality.mjs";
import { summarizeHarnessScore } from "./harness-score.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const ignoredPathParts = new Set([
  ".git",
  ".vale",
  ".venv",
  "node_modules",
  "dist",
  "target",
  ".claude",
  "coverage",
  "browser-extension",
  "playwright-report",
  "test-results",
]);

const harnessManifestPath = "docs/harness/manifest.json";
const featurePrivacyLabelsPath = "docs/harness/feature-privacy-labels.json";
const harnessManifest = JSON.parse(readFileSync(join(root, harnessManifestPath), "utf8"));
const manifestSnippets = harnessManifest.requiredHarnessSnippets;
const manifestReadmeReferences = harnessManifest.readmeReferences ?? {};
const manifestPublicWiki = harnessManifest.publicWiki ?? {};

const requiredFiles = Array.isArray(harnessManifest.requiredFiles)
  ? harnessManifest.requiredFiles
  : [];
const requiredHarnessSnippets =
  typeof manifestSnippets === "object" &&
  manifestSnippets !== null &&
  !Array.isArray(manifestSnippets)
    ? manifestSnippets
    : {};
const readmeReferenceHeading = manifestReadmeReferences.heading ?? "";
const readmeReferencePath = manifestReadmeReferences.path ?? "";
const readmeReferenceIndexHeading = manifestReadmeReferences.indexHeading ?? "";
const readmeExcludedTestUrlExplanation =
  manifestReadmeReferences.excludedTestUrlExplanation ?? "";
const requiredReadmeReferenceUrls = Array.isArray(manifestReadmeReferences.requiredUrls)
  ? manifestReadmeReferences.requiredUrls
  : [];
const requiredPublicWikiPages = Array.isArray(manifestPublicWiki.requiredPages)
  ? manifestPublicWiki.requiredPages
  : [];

const errors = [];
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

if (harnessManifest.version !== 1) {
  errors.push(`${harnessManifestPath} must use manifest version 1`);
}

if (!Array.isArray(harnessManifest.requiredFiles)) {
  errors.push(`${harnessManifestPath} requiredFiles must be an array`);
}

if (
  typeof manifestSnippets !== "object" ||
  manifestSnippets === null ||
  Array.isArray(manifestSnippets)
) {
  errors.push(`${harnessManifestPath} requiredHarnessSnippets must be an object`);
}

if (!readmeReferenceHeading) {
  errors.push(`${harnessManifestPath} readmeReferences.heading is required`);
}

if (!readmeReferencePath) {
  errors.push(`${harnessManifestPath} readmeReferences.path is required`);
}

if (!readmeReferenceIndexHeading) {
  errors.push(`${harnessManifestPath} readmeReferences.indexHeading is required`);
}

if (!Array.isArray(manifestReadmeReferences.requiredUrls)) {
  errors.push(`${harnessManifestPath} readmeReferences.requiredUrls must be an array`);
}

if (
  typeof manifestPublicWiki !== "object" ||
  manifestPublicWiki === null ||
  Array.isArray(manifestPublicWiki)
) {
  errors.push(`${harnessManifestPath} publicWiki must be an object`);
}

if (manifestPublicWiki.url !== "https://github.com/cboyd0319/JobSentinel/wiki") {
  errors.push(`${harnessManifestPath} publicWiki.url must point to the public wiki`);
}

if (manifestPublicWiki.remote !== "https://github.com/cboyd0319/JobSentinel.wiki.git") {
  errors.push(`${harnessManifestPath} publicWiki.remote must point to the wiki Git remote`);
}

if (manifestPublicWiki.defaultBranch !== "master") {
  errors.push(`${harnessManifestPath} publicWiki.defaultBranch must match the wiki remote`);
}

if (!Array.isArray(manifestPublicWiki.requiredPages) || requiredPublicWikiPages.length === 0) {
  errors.push(`${harnessManifestPath} publicWiki.requiredPages must list wiki pages`);
}

const macosReadiness = evaluateMacosReadiness({ root });
const macosReadinessFailed = macosReadiness.criteria.filter((item) => !item.ok);
const readmeMacosReadiness = readReadmeMacosReadinessPercent(root);

if (macosReadinessFailed.length > 0) {
  errors.push(
    `macOS no-account readiness checks failed: ${macosReadinessFailed
      .map((item) => item.id)
      .join(", ")}`,
  );
}

if (readmeMacosReadiness !== macosReadiness.percentage) {
  errors.push(
    `README.md macOS readiness percentage must be ${macosReadiness.percentage}, found ${readmeMacosReadiness ?? "missing"}`,
  );
}

for (const requiredWikiPage of ["Home.md", "Capabilities.md"]) {
  if (!requiredPublicWikiPages.includes(requiredWikiPage)) {
    errors.push(`${harnessManifestPath} publicWiki.requiredPages missing ${requiredWikiPage}`);
  }
}

for (const page of requiredPublicWikiPages) {
  if (typeof page !== "string" || !/^[A-Za-z0-9._-]+\.md$/.test(page)) {
    errors.push(`${harnessManifestPath} publicWiki.requiredPages has invalid page: ${String(page)}`);
  }
}

if (
  !Array.isArray(manifestPublicWiki.mustStayCurrentWhen) ||
  manifestPublicWiki.mustStayCurrentWhen.length === 0
) {
  errors.push(`${harnessManifestPath} publicWiki.mustStayCurrentWhen must list update triggers`);
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
  if (!manifestPublicWiki.mustStayCurrentWhen?.includes(trigger)) {
    errors.push(`${harnessManifestPath} publicWiki.mustStayCurrentWhen missing ${trigger}`);
  }
}

function repoPath(path) {
  return join(root, path);
}

function read(path) {
  return readFileSync(repoPath(path), "utf8");
}

const externalUrlPattern = /https?:\/\/[^\s<>"'`]+/g;

function normalizeExternalUrl(rawUrl) {
  return rawUrl
    .trim()
    .replace(/^<|>$/g, "")
    .replace(/[)\].,;:]+$/g, "")
    .split("#")[0];
}

function shouldIgnoreExternalReference(url) {
  const lowerUrl = url.toLowerCase();

  return (
    lowerUrl.includes("example.com") ||
    lowerUrl.includes("example.org") ||
    lowerUrl.includes("localhost") ||
    lowerUrl.includes("127.0.0.1") ||
    lowerUrl.includes("0.0.0.0") ||
    lowerUrl.includes("webhook.site") ||
    lowerUrl.includes("token") ||
    lowerUrl.includes("secret") ||
    lowerUrl.includes("password") ||
    lowerUrl.includes("github_pat") ||
    /:\/\/[^/\s]+@/.test(url) ||
    /\$\{|<[^>]+>/.test(url)
  );
}

function extractExternalUrls(text) {
  return [...text.matchAll(externalUrlPattern)]
    .map((match) => normalizeExternalUrl(match[0]))
    .filter((url) => url !== "" && !shouldIgnoreExternalReference(url));
}

function collectMarkdownFiles(dir = root) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const rel = relative(root, fullPath);
    const parts = rel.split(/[\\/]/);

    if (parts.some((part) => ignoredPathParts.has(part))) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(rel);
    }
  }

  return files.sort();
}

const textFilePattern =
  /\.(?:cjs|css|env|example|html|js|json|jsx|md|mjs|rs|sh|sql|toml|ts|tsx|txt|ya?ml)$/;
const textFileNames = new Set([
  ".env.example",
  ".gitignore",
  "AGENTS.md",
  "CLAUDE.md",
  "LICENSE",
]);

function shouldScanTextFile(fileName) {
  return textFileNames.has(fileName) || textFilePattern.test(fileName);
}

function collectTextFiles(dir = root) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const rel = relative(root, fullPath);
    const parts = rel.split(/[\\/]/);

    if (parts.some((part) => ignoredPathParts.has(part))) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...collectTextFiles(fullPath));
    } else if (entry.isFile() && shouldScanTextFile(entry.name)) {
      files.push(rel);
    }
  }

  return files.sort();
}

function normalizePathForLocalPathScan(path) {
  return normalize(path).replaceAll("\\", "/").replace(/\/+$/g, "");
}

function lineNumberAtIndex(text, index) {
  let line = 1;

  for (let position = 0; position < index; position += 1) {
    if (text.charCodeAt(position) === 10) {
      line += 1;
    }
  }

  return line;
}

function countTextLines(text) {
  if (text.length === 0) {
    return 0;
  }

  const trailingNewlineAdjustment = /\r?\n$/.test(text) ? 1 : 0;
  return text.split(/\r?\n/).length - trailingNewlineAdjustment;
}

function localPathBoundaryAllowsLeak(text, index, needle) {
  const next = text[index + needle.length] ?? "";

  return next === "" || /[\s"'`)>\],;:\\/]/.test(next);
}

const normalizedRootForLocalPathScan = normalizePathForLocalPathScan(root);
const normalizedHomeForLocalPathScan = process.env.HOME
  ? normalizePathForLocalPathScan(process.env.HOME)
  : "";
const machineSpecificLocalPathNeedles = [
  normalizedRootForLocalPathScan,
  normalizedRootForLocalPathScan.replaceAll("/", "\\"),
  normalizedHomeForLocalPathScan,
  normalizedHomeForLocalPathScan.replaceAll("/", "\\"),
]
  .filter((needle) => needle.length > 4)
  .filter((needle, index, needles) => needles.indexOf(needle) === index);

const docLocalAbsolutePathPattern =
  /(?:\/Users\/[A-Za-z0-9._-]+(?:\/[^\s)`'"<>]*)?|\/home\/[A-Za-z0-9._-]+(?:\/[^\s)`'"<>]*)?|[A-Za-z]:\\Users\\[^\\\s)`'"<>]+(?:\\[^\s)`'"<>]*)?|Documents\/GitHub\/JobSentinel)/g;

function checkNoMachineSpecificLocalPaths() {
  for (const path of collectTextFiles()) {
    const text = read(path);

    for (const needle of machineSpecificLocalPathNeedles) {
      let index = text.indexOf(needle);

      while (index !== -1) {
        if (localPathBoundaryAllowsLeak(text, index, needle)) {
          errors.push(
            `${path}:${lineNumberAtIndex(
              text,
              index,
            )} contains a machine-specific local path; use repo-relative paths or <repo-root>/<home> placeholders`,
          );
        }

        index = text.indexOf(needle, index + 1);
      }
    }
  }

  for (const path of collectMarkdownFiles()) {
    const text = read(path);
    let match;

    docLocalAbsolutePathPattern.lastIndex = 0;
    while ((match = docLocalAbsolutePathPattern.exec(text)) !== null) {
      errors.push(
        `${path}:${lineNumberAtIndex(
          text,
          match.index,
        )} contains an absolute local path; docs must use repo-relative paths or <repo-root>/<home> placeholders`,
      );
    }
  }
}

for (const path of requiredFiles) {
  if (!existsSync(repoPath(path))) {
    errors.push(`missing required harness file: ${path}`);
  }
}

if (existsSync(repoPath(featurePrivacyLabelsPath))) {
  const featurePrivacyLabels = JSON.parse(read(featurePrivacyLabelsPath));

  if (featurePrivacyLabels.version !== 1) {
    errors.push(`${featurePrivacyLabelsPath} must use version 1`);
  }

  const declaredLabels = Array.isArray(featurePrivacyLabels.labels)
    ? featurePrivacyLabels.labels
    : [];

  for (const label of allowedFeaturePrivacyLabels) {
    if (!declaredLabels.includes(label)) {
      errors.push(`${featurePrivacyLabelsPath} labels missing required label: ${label}`);
    }
  }

  const features = Array.isArray(featurePrivacyLabels.features)
    ? featurePrivacyLabels.features
    : [];
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
  const featureIds = new Set();

  if (features.length < requiredFeatureIds.length) {
    errors.push(`${featurePrivacyLabelsPath} must list core privacy-labeled features`);
  }

  for (const feature of features) {
    if (!feature || typeof feature !== "object") {
      errors.push(`${featurePrivacyLabelsPath} contains a non-object feature entry`);
      continue;
    }

    if (typeof feature.id !== "string" || feature.id.trim() === "") {
      errors.push(`${featurePrivacyLabelsPath} contains a feature without id`);
      continue;
    }

    if (featureIds.has(feature.id)) {
      errors.push(`${featurePrivacyLabelsPath} has duplicate feature id: ${feature.id}`);
    }
    featureIds.add(feature.id);

    if (typeof feature.name !== "string" || feature.name.trim() === "") {
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
          errors.push(`${featurePrivacyLabelsPath} ${feature.id} has unknown data category: ${category}`);
        }
      }
    }

    const hasSensitiveCategory = feature.dataCategories?.some((category) =>
      sensitiveExternalAiDataCategories.has(category),
    );
    if (hasSensitiveCategory && !feature.labels?.includes("Sensitive")) {
      errors.push(`${featurePrivacyLabelsPath} ${feature.id} uses sensitive data without Sensitive label`);
    }

    if (feature.labels?.includes("Public-data only") && hasSensitiveCategory) {
      errors.push(`${featurePrivacyLabelsPath} ${feature.id} cannot be Public-data only with sensitive data`);
    }

    if (feature.labels?.includes("External AI required") && !feature.externalAi?.required) {
      errors.push(`${featurePrivacyLabelsPath} ${feature.id} must mark externalAi.required`);
    }

    if (feature.externalAi?.required && !feature.labels?.includes("External AI required")) {
      errors.push(`${featurePrivacyLabelsPath} ${feature.id} requires external AI without required label`);
    }

    if (feature.externalAi?.allowed && !feature.labels?.some((label) => label.startsWith("External AI"))) {
      errors.push(`${featurePrivacyLabelsPath} ${feature.id} allows external AI without external-AI label`);
    }

    if (typeof feature.externalAi?.fallback !== "string" || feature.externalAi.fallback.trim() === "") {
      errors.push(`${featurePrivacyLabelsPath} ${feature.id} must include local fallback guidance`);
    }
  }

  for (const requiredFeatureId of requiredFeatureIds) {
    if (!featureIds.has(requiredFeatureId)) {
      errors.push(`${featurePrivacyLabelsPath} missing required feature: ${requiredFeatureId}`);
    }
  }
}

for (const [path, snippets] of Object.entries(requiredHarnessSnippets)) {
  if (!existsSync(repoPath(path))) {
    continue;
  }

  const text = read(path);
  const normalizedText = text.replace(/\s+/g, " ");
  for (const snippet of snippets) {
    const normalizedSnippet = snippet.replace(/\s+/g, " ");
    if (!normalizedText.includes(normalizedSnippet)) {
      errors.push(`${path} must include harness snippet: ${snippet}`);
    }
  }
}

if (existsSync(repoPath("README.md"))) {
  const readmeText = read("README.md");

  if (!readmeText.includes(readmeReferenceHeading)) {
    errors.push(`README.md must include ${readmeReferenceHeading}`);
  }

  if (readmeReferencePath && !readmeText.includes(`](${readmeReferencePath})`)) {
    errors.push(`README.md reference section must link to ${readmeReferencePath}`);
  }
}

if (readmeReferencePath && existsSync(repoPath(readmeReferencePath))) {
  const referenceText = read(readmeReferencePath);

  if (!referenceText.includes(readmeReferenceIndexHeading)) {
    errors.push(`${readmeReferencePath} must include ${readmeReferenceIndexHeading}`);
  }

  if (
    readmeExcludedTestUrlExplanation &&
    !referenceText.includes(readmeExcludedTestUrlExplanation)
  ) {
    errors.push(`${readmeReferencePath} must explain excluded test and placeholder URLs`);
  }

  const readmeExternalReferences = new Set(extractExternalUrls(referenceText));

  for (const url of requiredReadmeReferenceUrls) {
    if (!readmeExternalReferences.has(normalizeExternalUrl(url))) {
      errors.push(`${readmeReferencePath} missing required research source: ${url}`);
    }
  }
} else if (readmeReferencePath) {
  errors.push(`${readmeReferencePath} must exist for README source references`);
}

const startupContextBudgets = new Map([
  ["AGENTS.md", { maxLines: 160, maxBytes: 8000 }],
  ["docs/harness/README.md", { maxLines: 160, maxBytes: 9000 }],
  ["docs/plans/active/status.md", { maxLines: 140, maxBytes: 9000 }],
  ["docs/plans/active/current-work.md", { maxLines: 220, maxBytes: 12000 }],
]);

for (const [path, budget] of startupContextBudgets) {
  if (!existsSync(repoPath(path))) {
    continue;
  }

  const text = read(path);
  const lineCount = countTextLines(text);
  const byteCount = Buffer.byteLength(text, "utf8");

  if (lineCount > budget.maxLines) {
    errors.push(
      `${path} has ${lineCount} lines; keep it at or below ${budget.maxLines} lines for the startup context budget`,
    );
  }

  if (byteCount > budget.maxBytes) {
    errors.push(
      `${path} has ${byteCount} bytes; keep it at or below ${budget.maxBytes} bytes for the startup context budget`,
    );
  }
}

const localLinkPattern = /!?\[[^\]]*]\(([^)]+)\)/g;

for (const path of collectMarkdownFiles()) {
  if (!existsSync(repoPath(path))) {
    continue;
  }

  const text = read(path);
  let match;

  while ((match = localLinkPattern.exec(text)) !== null) {
    const rawTarget = match[1].trim();
    const target = rawTarget.replace(/^<|>$/g, "").split("#")[0];

    if (
      target === "" ||
      target.startsWith("http://") ||
      target.startsWith("https://") ||
      target.startsWith("mailto:") ||
      target.startsWith("#")
    ) {
      continue;
    }

    const resolved = normalize(resolve(root, dirname(path), target));
    if (!resolved.startsWith(root)) {
      errors.push(`${path} links outside repo: ${rawTarget}`);
      continue;
    }

    if (!existsSync(resolved)) {
      const displayPath = relative(root, resolved);
      errors.push(`${path} has broken local link: ${rawTarget} -> ${displayPath}`);
      continue;
    }

    if (statSync(resolved).isDirectory()) {
      const indexPath = join(resolved, "README.md");
      if (!existsSync(indexPath)) {
        errors.push(`${path} links to directory without README.md: ${rawTarget}`);
      }
    }
  }
}

checkNoMachineSpecificLocalPaths();

const packageJson = JSON.parse(read("package.json"));
const packageLockJson = JSON.parse(read("package-lock.json"));
const tauriConfig = JSON.parse(read("src-tauri/tauri.conf.json"));
const cargoToml = read("src-tauri/Cargo.toml");
const cargoVersion = cargoToml.match(/^version\s*=\s*"([^"]+)"/m)?.[1];

if (packageJson.version !== tauriConfig.version) {
  errors.push(
    `version mismatch: package.json=${packageJson.version}, src-tauri/tauri.conf.json=${tauriConfig.version}`,
  );
}

if (packageLockJson.version !== packageJson.version) {
  errors.push(
    `version mismatch: package.json=${packageJson.version}, package-lock.json=${packageLockJson.version}`,
  );
}

if (packageLockJson.packages?.[""]?.version !== packageJson.version) {
  errors.push(
    `version mismatch: package.json=${packageJson.version}, package-lock.json root package=${packageLockJson.packages?.[""]?.version}`,
  );
}

if (cargoVersion !== packageJson.version) {
  errors.push(
    `version mismatch: package.json=${packageJson.version}, src-tauri/Cargo.toml=${cargoVersion ?? "missing"}`,
  );
}

const currentVersion = packageJson.version;
const versionClaims = {
  "README.md": [`v${currentVersion}`, "github/v/release/cboyd0319/JobSentinel"],
  "docs/README.md": [`Package metadata version: \`${currentVersion}\``],
  "docs/ROADMAP.md": ["Use `package.json` for the current release package version."],
};

for (const [path, claims] of Object.entries(versionClaims)) {
  const text = read(path);
  for (const claim of claims) {
    if (!text.includes(claim)) {
      errors.push(`${path} must include current version claim: ${claim}`);
    }
  }
}

const mainRs = read("src-tauri/src/main.rs");
const generateHandlerMatch = mainRs.match(/tauri::generate_handler!\[\s*([\s\S]*?)\s*\]\)/);
if (!generateHandlerMatch) {
  errors.push("could not find tauri::generate_handler! block in src-tauri/src/main.rs");
}

const registeredCommandCount = [
  ...(generateHandlerMatch?.[1].matchAll(
    /commands::((?:[a-zA-Z0-9_]+::)+)([a-zA-Z0-9_]+)/g,
  ) ?? []),
].length;
const measuredCommandClaim = `${registeredCommandCount} registered Tauri commands`;

for (const path of ["README.md", "docs/ROADMAP.md"]) {
  if (!read(path).includes(measuredCommandClaim)) {
    errors.push(`${path} must include current command claim: ${measuredCommandClaim}`);
  }
}

const currentTestCountDocs = [
  "README.md",
  "docs/README.md",
  "docs/ROADMAP.md",
  "docs/developer/TESTING.md",
  "docs/developer/FRONTEND_TESTING.md",
  "docs/developer/INTEGRATION_TESTING.md",
];

const hardcodedTestCountPattern =
  /\b(?:\d+\+?\s+(?:unit|integration|component|frontend|e2e|rust|js)?\s*tests?\b|(?:unit|integration|component|frontend|e2e|rust|js)\s+tests?:\s*\d+\+?)/i;

for (const path of currentTestCountDocs) {
  const lines = read(path).split(/\r?\n/);

  lines.forEach((line, index) => {
    const normalizedLine = line.trim();

    if (!hardcodedTestCountPattern.test(normalizedLine)) {
      return;
    }

    if (/\bnew\s+(?:component\s+)?tests?\b/i.test(normalizedLine)) {
      return;
    }

    errors.push(
      `${path}:${index + 1} has hardcoded current test-count claim; reference fresh command output instead`,
    );
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

const allTargetClippyHardGatePattern =
  /cargo\s+clippy(?=[^\n`]*--all-targets)(?=[^\n`]*-D\s+warnings)/;

for (const path of rustLintPolicyDocs) {
  const lines = read(path).split(/\r?\n/);

  lines.forEach((line, index) => {
    if (!allTargetClippyHardGatePattern.test(line)) {
      return;
    }

    errors.push(
      `${path}:${index + 1} uses all-target clippy as a hard gate; use production clippy policy instead`,
    );
  });
}

for (const violation of checkFrontendBoundaries(root)) {
  errors.push(violation);
}

for (const violation of checkExternalAiGateway(root)) {
  errors.push(violation);
}

for (const violation of checkSecuritySensors(root)) {
  errors.push(violation);
}

for (const violation of checkRepoBloat(root)) {
  errors.push(violation);
}

for (const violation of checkTauriInvokes(root)) {
  errors.push(violation);
}

for (const violation of checkTestQuality(root)) {
  errors.push(violation);
}

const harnessScore = summarizeHarnessScore(root);
if (!harnessScore.allPerfect) {
  errors.push(`five-tuple harness score must be 100/100; current score is ${harnessScore.overall}/100`);

  for (const framework of harnessScore.frameworks) {
    for (const subsystem of framework.subsystems) {
      for (const item of subsystem.checks) {
        if (!item.pass) {
          errors.push(`${framework.name} ${subsystem.name}: ${item.label} [${item.evidence}]`);
        }
      }
    }
  }
}

if (errors.length > 0) {
  console.error("Harness check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(formatSecuritySensorSummary());
console.log("Harness check passed.");
