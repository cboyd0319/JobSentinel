import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  activeUserDocGlyphPaths,
  applicationTrackingPlainLabelPaths,
  featurePlainDocGlyphPaths,
  resumeMatcherPlainLabelPaths,
  salaryPlainLabelPaths,
} from "./docs-drift-constants.mjs";

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

export function hasFeatureStatusColorEmojiMarkers(root, path) {
  if (
    path !== "docs/features/ghost-detection.md" &&
    path !== "docs/features/resume-builder.md"
  ) {
    return false;
  }

  return /[\u{1f7e2}\u{1f7e1}\u{1f7e0}\u{1f534}]\s+\*\*/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasFeatureDocMetadataFooter(root, path) {
  if (!path.startsWith("docs/features/") || !path.endsWith(".md")) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /^>\s+\*\*(?:Status|Completion|Coverage|Last Updated|Last Reviewed|Version|Tests|Supported Scrapers|Architecture):\*\*/m.test(
      text,
    ) ||
    /^\*\*(?:Status|Last Updated|Last Reviewed|Version|Updated|Maintained By|Implementation Status|Tests|Next Phase|Next Feature):\*\*/m.test(
      text,
    ) ||
    /^## Version History$/m.test(text)
  );
}

export function hasSynonymOrRemotePreferenceDocDrift(root, path) {
  if (
    path !== "docs/features/synonym-matching.md" &&
    path !== "docs/features/remote-preference-scoring.md"
  ) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /[✅❌⚠️✓✗→]/u.test(text) ||
    /Custom Synonyms \(v2\.1\+\)|Database-backed Synonyms \(v2\.2\+\)|Fuzzy Matching \(v2\.3\+\)/.test(
      text,
    ) ||
    /common tech terms|Python developer needed|"title_allowlist": \["Senior Engineer"\]/i.test(
      text,
    ) ||
    /Potential improvements for v2\.0\+/.test(text) ||
    /^\*\*Module:\*\*/m.test(text) ||
    /(?:User Preference Modes|Graduated Scoring Matrix|Scoring Weight)/i.test(
      text,
    ) ||
    /\|\s*Score\s*\|\s*Meaning\s*\|/i.test(text) ||
    /preference × job type/.test(text) ||
    /\*\*Last Updated:\*\* March 18, 2026/.test(text)
  );
}

export function hasMarketIntelligenceDocGlyphMarkers(root, path) {
  if (path !== "docs/features/hiring-trends.md") {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|severity_emoji|type_emoji|sentiment_emoji|[\u{2190}-\u{21ff}\u{2500}-\u{257f}\u{25b2}\u{25bc}])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleMarketIntelligenceDocShape(root, path) {
  if (path !== "docs/features/hiring-trends.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /Technical Documentation/i.test(text) ||
    /Real-Time Analytics & Trend Visualization/i.test(text) ||
    /comprehensive market insights/i.test(text) ||
    /## Architecture/i.test(text) ||
    /### Database Schema/i.test(text) ||
    /## Usage Guide/i.test(text) ||
    /## API Reference/i.test(text) ||
    /## Implementation Status/i.test(text) ||
    /Phase 2: Enhanced Analytics Planned/i.test(text) ||
    /Phase 3: Advanced Visualization/i.test(text) ||
    /Machine learning trend prediction/i.test(text) ||
    /## Scheduled Jobs/i.test(text) ||
    /Daily Analysis \(Recommended: 2 AM\)/i.test(text)
  );
}

export function hasResumeOrSalaryFeatureDocEmojiMarkers(root, path) {
  if (path !== "docs/features/resume-matcher.md" && path !== "docs/features/pay-protection.md") {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|[\u{1f1e6}-\u{1f1ff}\u{2192}\u{2500}\u{2502}\u{2514}\u{251c}\u{2713}\u{2717}\u{2022}])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleResumeMatcherDocShape(root, path) {
  if (path !== "docs/features/resume-matcher.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /^# AI Resume-Job Matcher/m.test(text) ||
    /Intelligent Resume Analysis & Job Compatibility Scoring/i.test(text) ||
    /Stop manually comparing job requirements/i.test(text) ||
    /## Architecture/i.test(text) ||
    /### Database Schema/i.test(text) ||
    /## Usage Guide/i.test(text) ||
    /## Matching Algorithm/i.test(text) ||
    /### Future Enhancements/i.test(text) ||
    /A\/B Testing/i.test(text) ||
    /## API Reference/i.test(text) ||
    /## Implementation Status/i.test(text) ||
    /keyword match against job description/i.test(text) ||
    /Keyword-based skill extraction/i.test(text) ||
    /Resume Optimization[\s\S]*Suggest keywords to add/i.test(text) ||
    /src\/pages\/ResumeManager\.tsx/.test(text) ||
    /match\.matching_skills\.filter\(skill => skill\.category/.test(text) ||
    /match\.(?:skills_score|experience_score|education_score)\b/.test(text) ||
    /\bskill\.(?:name|confidence|years_experience)\b/.test(text)
  );
}

export function hasConfusingResumeMatcherAiLabel(root, path) {
  if (!resumeMatcherPlainLabelPaths.has(path)) {
    return false;
  }

  return /\b(?:AI Resume-Job Matcher|Resume Matcher)\b/i.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasConfusingSalaryAiLabel(root, path) {
  if (!salaryPlainLabelPaths.has(path)) {
    return false;
  }

  return /Salary AI/i.test(readFileSync(join(root, path), "utf8"));
}

export function hasSmartScoringDocGlyphMarkers(root, path) {
  if (path !== "docs/features/smart-scoring.md") {
    return false;
  }

  return /[\u{2713}\u{2717}\u{2192}\u{251c}\u{2514}\u{2500}\u{2502}]/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasNotificationsDocGlyphMarkers(root, path) {
  if (path !== "docs/features/notifications.md") {
    return false;
  }

  return /[\u{2192}\u{251c}\u{2514}\u{2500}\u{2502}\u{22ef}]/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasActiveUserDocGlyphMarkers(root, path) {
  if (!activeUserDocGlyphPaths.has(path)) {
    return false;
  }

  return /[\u{2192}\u{2193}\u{2199}\u{2198}\u{2265}\u{2500}\u{2502}\u{2514}\u{251c}\u{22ef}]/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasFeaturePlainDocGlyphMarkers(root, path) {
  if (!featurePlainDocGlyphPaths.has(path)) {
    return false;
  }

  return /(?:\p{Extended_Pictographic}|[\u{2190}-\u{21ff}\u{2500}-\u{257f}])/u.test(
    readFileSync(join(root, path), "utf8"),
  );
}

export function hasStaleSalaryAiFutureUiClaim(root, path) {
  if (path !== "docs/features/pay-protection.md") {
    return false;
  }

  return /- \[ \] UI components/.test(readFileSync(join(root, path), "utf8"));
}

export function hasStaleApplicationTrackingDocClaims(root, path) {
  if (path !== "docs/features/application-tracking.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /Never lose track of a job application again/i.test(text) ||
    /Trello board/i.test(text) ||
    /Application Tracking System/i.test(text) ||
    /ATS module/i.test(text) ||
    /Technical Interview/i.test(text) ||
    /technical_interview/i.test(text) ||
    /Phase 2 \(Future\)/i.test(text) ||
    /Phase 3 \(Advanced\)/i.test(text) ||
    /Machine Learning/i.test(text) ||
    /A\/B Testing/i.test(text) ||
    /API Reference/i.test(text) ||
    /Implementation Status/i.test(text) ||
    /UI Integration \(Future\)/.test(text) ||
    /src\/pages\/ApplicationTracker\.tsx/.test(text) ||
    /invoke<ApplicationsByStatus>\('get_applications_by_status'\)/.test(text) ||
    /- \[ \] Tauri commands/.test(text) ||
    /- \[ \] UI components \(Kanban board\)/.test(text) ||
    /UI Connections & Polish \(v1\.4 E4\)/.test(text)
  );
}

export function hasConfusingApplicationTrackingAtsLabel(root, path) {
  if (!applicationTrackingPlainLabelPaths.has(path)) {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /Application Tracking System \(ATS\)/i.test(text) ||
    /\[ATS\]\(features\/application-tracking\.md\)/i.test(text)
  );
}

export function hasStaleSmartScoringSalaryMarkerClaim(root, path) {
  if (path !== "docs/features/smart-scoring.md") {
    return false;
  }

  const text = readFileSync(join(root, path), "utf8");
  return (
    /Predicted salaries are marked with a .* icon/u.test(text) ||
    /\*\*Implementation Status:\*\* ✅ Complete/.test(text)
  );
}
