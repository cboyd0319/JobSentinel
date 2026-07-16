import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  hasActiveUserDocGlyphMarkers,
  hasConfusingApplicationTrackingAtsLabel,
  hasConfusingResumeMatcherAiLabel,
  hasConfusingSalaryAiLabel,
  hasFeatureDocMetadataFooter,
  hasFeaturePlainDocGlyphMarkers,
  hasFeatureStatusColorEmojiMarkers,
  hasMarketIntelligenceDocGlyphMarkers,
  hasNotificationsDocGlyphMarkers,
  hasResumeOrSalaryFeatureDocEmojiMarkers,
  hasSmartScoringDocGlyphMarkers,
  hasStaleApplicationTrackingDocClaims,
  hasStaleMarketIntelligenceDocShape,
  hasStaleResumeMatcherDocShape,
  hasStaleSalaryAiFutureUiClaim,
  hasStaleSmartScoringSalaryMarkerClaim,
  hasStaleUserDataExportRoadmapClaim,
  hasStaleUserDataManagementDocShape,
  hasSynonymOrRemotePreferenceDocDrift,
} from "./docs-drift-feature-docs.mjs";
import {
  activeStatusPath,
  deepLinksStatusEmojiPattern,
  isoDatePattern,
  requiredGrantFacingDocs,
  speculativeCloudDeploymentDocs,
  statusEmojiPattern,
} from "./docs-drift-constants.mjs";
import {
  hasDeveloperArchitectureDocMarkers,
  hasDeveloperMaintenanceDocDrift,
  hasDeveloperTestingDocMarkers,
  hasFixedWaitInActiveE2eRuntime,
  hasStaleArchitectureCloudDependencyClaim,
  hasStaleE2eWaitGuidance,
  hasStaleTestQualityDocGuidance,
  hasTopLevelActiveDocDrift,
  hasTopLevelActiveDocGlyphMarkers,
} from "./docs-drift-developer.mjs";
import {
  hasBookmarkletDocStatusEmojiMarkers,
  hasDeveloperLayoutDocGlyphMarkers,
  hasMacosVerificationClaimWithoutEvidence,
  hasMaintainedDocGlyphMarkers,
  hasStaleGettingStartedToolingDocs,
  hasStaleLinuxBuildWorkflowTriggerDoc,
  hasStaleMacosDeveloperDocs,
  hasStalePlatformDataPathDocs,
  hasStalePlatformVersionTags,
  hasStaleSqliteConfigurationDoc,
  hasStaleTestingReleaseScopedNote,
  hasUnindexedReleaseNote,
  hasUnlinkedLinuxBuildGuide,
} from "./docs-drift-platform.mjs";

export {
  hasDeveloperArchitectureDocMarkers,
  hasDeveloperMaintenanceDocDrift,
  hasDeveloperTestingDocMarkers,
  hasFixedWaitInActiveE2eRuntime,
  hasStaleArchitectureCloudDependencyClaim,
  hasStaleE2eWaitGuidance,
  hasStaleTestQualityDocGuidance,
  hasTopLevelActiveDocDrift,
  hasTopLevelActiveDocGlyphMarkers,
} from "./docs-drift-developer.mjs";
export {
  hasBookmarkletDocStatusEmojiMarkers,
  hasDeveloperLayoutDocGlyphMarkers,
  hasMacosVerificationClaimWithoutEvidence,
  hasMaintainedDocGlyphMarkers,
  hasStaleGettingStartedToolingDocs,
  hasStaleLinuxBuildWorkflowTriggerDoc,
  hasStaleMacosDeveloperDocs,
  hasStalePlatformDataPathDocs,
  hasStalePlatformVersionTags,
  hasStaleSqliteConfigurationDoc,
  hasStaleTestingReleaseScopedNote,
  hasUnindexedReleaseNote,
  hasUnlinkedLinuxBuildGuide,
} from "./docs-drift-platform.mjs";

export {
  hasActiveUserDocGlyphMarkers,
  hasConfusingApplicationTrackingAtsLabel,
  hasConfusingResumeMatcherAiLabel,
  hasConfusingSalaryAiLabel,
  hasFeatureDocMetadataFooter,
  hasFeaturePlainDocGlyphMarkers,
  hasFeatureStatusColorEmojiMarkers,
  hasMarketIntelligenceDocGlyphMarkers,
  hasNotificationsDocGlyphMarkers,
  hasResumeOrSalaryFeatureDocEmojiMarkers,
  hasSmartScoringDocGlyphMarkers,
  hasStaleApplicationTrackingDocClaims,
  hasStaleMarketIntelligenceDocShape,
  hasStaleResumeMatcherDocShape,
  hasStaleSalaryAiFutureUiClaim,
  hasStaleSmartScoringSalaryMarkerClaim,
  hasStaleUserDataExportRoadmapClaim,
  hasStaleUserDataManagementDocShape,
  hasSynonymOrRemotePreferenceDocDrift,
} from "./docs-drift-feature-docs.mjs";

function collectActiveMarkdownPaths(root, relativeDir = "docs/plans/active") {
  const fullDir = join(root, relativeDir);

  if (!existsSync(fullDir)) {
    return [];
  }

  return readdirSync(fullDir, { withFileTypes: true }).flatMap((entry) => {
    const childPath = `${relativeDir}/${entry.name}`;

    if (entry.isDirectory()) {
      return collectActiveMarkdownPaths(root, childPath);
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      return [childPath];
    }

    return [];
  });
}

function collectIsoDates(root, path) {
  const fullPath = join(root, path);

  if (!existsSync(fullPath)) {
    return [];
  }

  return readFileSync(fullPath, "utf8").match(isoDatePattern) ?? [];
}

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

export function hasActiveStatusStaleLastUpdatedDate(root, path) {
  if (path !== activeStatusPath) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  const statusDate = /^Last updated:\s*(20\d{2}-\d{2}-\d{2})\./m.exec(text)?.[1];

  if (!statusDate) {
    return true;
  }

  const newestActiveDate = collectActiveMarkdownPaths(root)
    .flatMap((activePath) => collectIsoDates(root, activePath))
    .sort()
    .at(-1);

  return Boolean(newestActiveDate && statusDate < newestActiveDate);
}

export function hasActiveStatusStaleMeasuredCounts(root, path) {
  if (path !== activeStatusPath) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8").replace(/\s+/g, " ");

  return (
    /`scripts\/check-repo-bloat\.mjs`[^.]{0,160}\b\d[\d,]*(?:[- ]line| lines)\b/i.test(
      text,
    ) ||
    /\b(?:focused\s+)?[a-z0-9-]+(?:\s+[a-z0-9-]+){0,4}\s+coverage\s+is\s+now\s+\d+\s+tests\b/i.test(
      text,
    )
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
  if (path !== "crates/jobsentinel-platform/src/linux/mod.rs") {
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

export function hasStaleCargoDenyIgnore(root, path) {
  if (path !== "deny.toml") {
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


const docsDriftRules = [
  [hasSpeculativeCloudDeploymentDoc, "remove speculative cloud deployment doc"],
  [hasStaleInformalMaintainerFooter, "replace stale informal maintainer footer"],
  [hasActiveStatusStaleLastUpdatedDate, "sync active status last-updated date"],
  [hasActiveStatusStaleMeasuredCounts, "replace stale active status measured counts"],
  [hasStaleHardcodedMigrationCount, "remove stale hardcoded migration count"],
  [hasStaleIntegrationFixtureDirectoryClaim, "remove stale integration fixture directory claim"],
  [hasStaleSchedulerWorkerPathDocs, "remove stale scheduler worker path docs"],
  [hasStaleSchedulerScraperPathDocs, "remove stale scheduler scraper path docs"],
  [hasStaleErrorHandlingScrapeAllDoc, "remove stale scrape_all error-handling doc"],
  [hasStaleRefactoringPriorityTable, "remove stale refactoring-priority table"],
  [hasStaleLinuxPlatformStubMarkers, "replace stale Linux platform stub markers"],
  [hasStaleShippedFeatureStatusDoc, "remove stale shipped-feature status doc"],
  [hasRoadmapStatusEmoji, "replace roadmap status emoji with text"],
  [hasRoadmapVersionDrift, "replace roadmap version drift markers"],
  [hasFrontDoorDocStaleFooter, "replace front-door doc stale footer"],
  [hasDocsReadmeReleaseLogShape, "replace docs README release-log shape"],
  [hasStaleUserDataExportRoadmapClaim, "remove stale user-data export roadmap claim"],
  [hasStaleUserDataManagementDocShape, "sync user-data docs with local privacy guidance"],
  [hasStaleCargoDenyIgnore, "remove stale cargo-deny advisory ignore"],
  [hasOverbroadLocalStorageMigrationClaim, "replace overbroad localStorage migration claim"],
  [hasDeepLinksEmojiOrVersionPromise, "replace Deep Links doc emoji/version promises"],
  [hasQuickStartEmojiMarkers, "replace Quick Start doc emoji markers"],
  [hasFrontDoorDocEmojiMarkers, "replace front-door doc emoji markers"],
  [hasBookmarkletDocStatusEmojiMarkers, "replace bookmarklet doc status emoji markers"],
  [hasFeatureStatusColorEmojiMarkers, "replace feature status color emoji markers"],
  [hasFeatureDocMetadataFooter, "replace feature doc stale metadata"],
  [hasSynonymOrRemotePreferenceDocDrift, "sync synonym and remote preference docs"],
  [hasStaleTestQualityDocGuidance, "replace stale test-quality doc guidance"],
  [hasDeveloperTestingDocMarkers, "replace developer testing doc stale markers"],
  [hasStaleTestingReleaseScopedNote, "replace release-scoped testing note"],
  [hasDeveloperArchitectureDocMarkers, "replace developer architecture doc stale markers"],
  [hasStaleArchitectureCloudDependencyClaim, "replace obsolete cloud-dependency claim"],
  [hasDeveloperMaintenanceDocDrift, "replace developer maintenance doc stale markers"],
  [hasTopLevelActiveDocDrift, "replace top-level active doc stale markers"],
  [hasTopLevelActiveDocGlyphMarkers, "replace top-level active doc glyph markers"],
  [hasStaleE2eWaitGuidance, "replace stale E2E wait guidance"],
  [hasFixedWaitInActiveE2eRuntime, "replace fixed E2E runtime wait"],
  [hasStaleGettingStartedToolingDocs, "sync getting-started tooling docs"],
  [hasStalePlatformVersionTags, "replace platform release tags"],
  [hasStalePlatformDataPathDocs, "sync platform data path docs"],
  [hasStaleMacosDeveloperDocs, "sync macOS developer docs"],
  [hasMacosVerificationClaimWithoutEvidence, "add macOS verification evidence pointer"],
  [hasStaleSqliteConfigurationDoc, "sync SQLite configuration doc"],
  [hasUnlinkedLinuxBuildGuide, "link Linux build guide from docs hub"],
  [hasStaleLinuxBuildWorkflowTriggerDoc, "sync Linux build workflow trigger doc"],
  [hasUnindexedReleaseNote, "index historical release note"],
  [hasMarketIntelligenceDocGlyphMarkers, "replace Hiring Trends doc glyph/stale indicator markers"],
  [hasStaleMarketIntelligenceDocShape, "sync Hiring Trends docs with local evidence guidance"],
  [hasResumeOrSalaryFeatureDocEmojiMarkers, "replace resume and salary feature doc emoji markers"],
  [hasStaleResumeMatcherDocShape, "sync resume matcher docs with live Resume page shape"],
  [hasConfusingResumeMatcherAiLabel, "replace confusing Resume Matcher AI label"],
  [hasConfusingSalaryAiLabel, "replace confusing Salary AI label"],
  [hasSmartScoringDocGlyphMarkers, "replace smart scoring doc glyph markers"],
  [hasNotificationsDocGlyphMarkers, "replace notifications doc glyph markers"],
  [hasActiveUserDocGlyphMarkers, "replace active user doc glyph markers"],
  [hasFeaturePlainDocGlyphMarkers, "replace feature doc glyph markers"],
  [hasMaintainedDocGlyphMarkers, "replace maintained doc glyph markers"],
  [hasDeveloperLayoutDocGlyphMarkers, "replace developer layout doc glyph markers"],
  [hasStaleSalaryAiFutureUiClaim, "remove stale Salary AI future UI claim"],
  [hasStaleApplicationTrackingDocClaims, "remove stale application tracking doc claims"],
  [hasConfusingApplicationTrackingAtsLabel, "replace confusing application tracking ATS label"],
  [hasStaleSmartScoringSalaryMarkerClaim, "remove stale smart-scoring salary marker claim"],
];

export function collectDocsDriftViolations(root, path) {
  return docsDriftRules
    .filter(([predicate]) => predicate(root, path))
    .map(([, message]) => `${message}: ${path}`);
}
