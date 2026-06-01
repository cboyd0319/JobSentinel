import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const requiredGrantFacingDocs = new Set([
  "PRIVACY.md",
  "RESPONSIBLE_AI.md",
  "ROADMAP.md",
  "docs/research/job-seeker-behavior.md",
  "docs/research/ats-transparency.md",
  "docs/research/ghost-jobs.md",
  "docs/research/job-site-data-sources.md",
  "docs/research/pay-equity.md",
  "docs/research/salary-negotiation.md",
]);

const speculativeCloudDeploymentDocs = new Map([
  [
    "docs/developer/ARCHITECTURE.md",
    /Cloud Architecture \(not implemented\)|Cloud Backend \(GCP\/AWS\)|or in the cloud/,
  ],
  ["docs/developer/GETTING_STARTED.md", /src-tauri\/src\/cloud\/|GCP\/AWS deployment/],
  ["docs/ROADMAP.md", /GCP Cloud Run \/ AWS Lambda deployment/],
]);

const statusEmojiPattern =
  /[\u{2705}\u{274c}\u{26a0}\u{23f3}\u{26a1}\u{1f517}\u{1f512}\u{1f4c4}\u{1f4dd}\u{1f7e2}\u{1f7e1}\u{1f534}\u{1f4ca}\u{1f4e7}\u{1f4c8}\u{1f4c9}\u{1f3af}\u{1f680}\u{1f4a1}\u{1f50d}\u{2b50}]/u;
const deepLinksStatusEmojiPattern =
  /[\u{2705}\u{274c}\u{26a0}\u{1f510}]/u;

export function collectMissingGrantFacingDocs(root) {
  return [...requiredGrantFacingDocs].filter(
    (path) => !existsSync(join(root, path)),
  );
}

export function hasSpeculativeCloudDeploymentDoc(root, path) {
  const pattern = speculativeCloudDeploymentDocs.get(path);

  if (!pattern) {
    return false;
  }

  return pattern.test(readFileSync(join(root, path), "utf8"));
}

export function hasStaleInformalMaintainerFooter(root, path) {
  if (!path.endsWith(".md")) {
    return false;
  }

  return /Maintained By\**:\s*The Rust Mac Overlord/i.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleHardcodedMigrationCount(root, path) {
  if (path !== "docs/developer/GETTING_STARTED.md") {
    return false;
  }

  return /\b\d+\s+SQLite migrations\b/.test(readFileSync(join(root, path), "utf8"));
}

export function hasStaleIntegrationFixtureDirectoryClaim(root, path) {
  if (path !== "docs/developer/INTEGRATION_TESTING.md") {
    return false;
  }

  return /fixtures\/\s+# Test HTML\/JSON responses|Test HTML responses stored in `fixtures\/`/m.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleSchedulerWorkerPathDocs(root, path) {
  if (path !== "docs/developer/ARCHITECTURE.md") {
    return false;
  }

  return /workers\/(?:scraper|scorer|notifier)\.rs/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleSchedulerScraperPathDocs(root, path) {
  if (path !== "docs/security/KEYRING.md") {
    return false;
  }

  return /scheduler\/scrapers\.rs/.test(readFileSync(join(root, path), "utf8"));
}

export function hasStaleErrorHandlingScrapeAllDoc(root, path) {
  if (path !== "docs/developer/ERROR_HANDLING.md") {
    return false;
  }

  return /self\.scrape_all\(\)\.await/.test(readFileSync(join(root, path), "utf8"));
}

export function hasStaleRefactoringPriorityTable(root, path) {
  if (path !== "docs/developer/GETTING_STARTED.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /\*\*v1\.5 Refactoring Priority\*\*/.test(text) ||
    /needs modularization|candidate for split|frontend refactoring planned/.test(text)
  );
}

export function hasStaleLinuxPlatformStubMarkers(root, path) {
  if (path !== "src-tauri/src/platforms/linux/mod.rs") {
    return false;
  }

  return /Coming Soon|will contain Linux-specific code|limited functionality/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleShippedFeatureStatusDoc(root, path) {
  if (path !== "docs/ROADMAP.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /src-tauri\/src\/core\/import\/` module \(planned\)/.test(text) ||
    /\u{1f532} Universal Job Importer with Schema\.org parsing/u.test(text) ||
    /\u{1f532} Deep Link Generator for 15\+ sites/u.test(text) ||
    /\u{1f532} Bookmarklet generator/u.test(text)
  );
}

export function hasRoadmapStatusEmoji(root, path) {
  if (path !== "docs/ROADMAP.md") {
    return false;
  }

  return /[\u{2705}\u{1f532}]/u.test(readFileSync(join(root, path), "utf8"));
}

export function hasRoadmapVersionDrift(root, path) {
  if (path !== "docs/ROADMAP.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /\*\*Last Updated:\*\*|## Current Version:|v2\.7\+ Planned|v2\.7\.[01]\s+-\s+/.test(
      text,
    ) || /\((?:v2\.2\+|v2\.6\+|v1\.6\+)\)|Frontend Architecture \(v2\.6\+\)/.test(text)
  );
}

export function hasFrontDoorDocStaleFooter(root, path) {
  if (path !== "docs/README.md") {
    return false;
  }

  return /\*\*Last Updated:\*\*/.test(readFileSync(join(root, path), "utf8"));
}

export function hasDocsReadmeReleaseLogShape(root, path) {
  if (path !== "docs/README.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /## Current Status[\s\S]{0,400}\*\*Release version:\*\*/.test(text) ||
    /### What's New in v\d+\.\d+/i.test(text) ||
    /### Backend Modules \(\d+ registered Tauri commands\)/.test(text) ||
    /### Planned \/ Unreleased Features/.test(text) ||
    /\*\*Unreleased work implemented on main:\*\*/.test(text)
  );
}

export function hasStaleUserDataExportRoadmapClaim(root, path) {
  if (path !== "docs/features/user-data-management.md") {
    return false;
  }

  return /feature coming in v1\.5|\*\*v1\.5 \(Q1 2026\):\*\*|Export anytime.*JSON/.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleUserDataManagementDocShape(root, path) {
  if (path !== "docs/features/user-data-management.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /Your job search, organized and persistent/i.test(text) ||
    /smart variable substitution/i.test(text) ||
    /Tech Startup|Fortune 500/i.test(text) ||
    /## Tauri Commands \(API Reference\)/i.test(text) ||
    /These commands power the user data features/i.test(text) ||
    /### Database Schema/i.test(text) ||
    /CREATE TABLE/i.test(text) ||
    /## Open Gaps/i.test(text) ||
    /The current user-data commands do not provide a full JSON export\/import/i.test(text)
  );
}

export function hasStaleCargoDenyIgnore(root, path) {
  if (path !== "src-tauri/deny.toml") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return /RUSTSEC-2025-0057/.test(text);
}

export function hasOverbroadLocalStorageMigrationClaim(root, path) {
  if (path !== "docs/ROADMAP.md") {
    return false;
  }

  return /Backend persistence for all user data \(localStorage\s*(?:\u{2192}|->)\s*SQLite\)/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasDeepLinksEmojiOrVersionPromise(root, path) {
  if (path !== "docs/user/DEEP_LINKS.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    deepLinksStatusEmojiPattern.test(text) ||
    /coming in v2\.7|planned for v2\.7|^### v\d+\.\d+/m.test(text)
  );
}

export function hasQuickStartEmojiMarkers(root, path) {
  if (path !== "docs/user/QUICK_START.md") {
    return false;
  }

  return statusEmojiPattern.test(readFileSync(join(root, path), "utf8"));
}

export function hasFrontDoorDocEmojiMarkers(root, path) {
  if (path !== "README.md" && path !== "docs/README.md") {
    return false;
  }

  return statusEmojiPattern.test(readFileSync(join(root, path), "utf8"));
}
