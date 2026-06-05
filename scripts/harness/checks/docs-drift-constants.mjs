export const requiredGrantFacingDocs = new Set([
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

export const speculativeCloudDeploymentDocs = new Map([
  [
    "docs/developer/ARCHITECTURE.md",
    /Cloud Architecture \(not implemented\)|Cloud Backend \(GCP\/AWS\)|or in the cloud/,
  ],
  ["docs/developer/GETTING_STARTED.md", /src-tauri\/src\/cloud\/|GCP\/AWS deployment/],
  ["docs/ROADMAP.md", /GCP Cloud Run \/ AWS Lambda deployment/],
]);

export const topLevelActiveDocsPaths = new Set([
  "docs/BOOKMARKLET.md",
  "docs/ML_FEATURE.md",
  "docs/ML_QUICKSTART.md",
  "docs/developer/FRONTEND_TESTING.md",
  "docs/developer/TESTING.md",
]);

export const developerTestingDocsPaths = new Set([
  "docs/developer/TESTING.md",
  "docs/developer/FRONTEND_TESTING.md",
  "docs/developer/INTEGRATION_TESTING.md",
  "docs/developer/MUTATION_TESTING.md",
]);

export const developerArchitectureDocsPaths = new Set([
  "docs/developer/ARCHITECTURE.md",
  "docs/developer/ERROR_HANDLING.md",
]);

export const developerMaintenanceDocsPaths = new Set([
  "docs/developer/ADDING_DEEP_LINK_SITES.md",
  "docs/developer/CI_CD.md",
  "docs/developer/CONTRIBUTING.md",
  "docs/developer/GETTING_STARTED.md",
  "docs/developer/MACOS_DEVELOPMENT.md",
  "docs/developer/RELEASING.md",
  "docs/developer/WHY_TAURI.md",
]);

export const applicationTrackingPlainLabelPaths = new Set([
  "docs/README.md",
  "docs/ROADMAP.md",
  "docs/features/application-tracking.md",
]);

export const resumeMatcherPlainLabelPaths = new Set([
  "docs/README.md",
  "docs/ROADMAP.md",
  "docs/developer/ARCHITECTURE.md",
  "docs/features/resume-matcher.md",
]);

export const salaryPlainLabelPaths = new Set([
  "docs/README.md",
  "docs/developer/ARCHITECTURE.md",
  "docs/features/salary-ai.md",
]);

export const activeUserDocGlyphPaths = new Set([
  "docs/features/application-tracking.md",
  "docs/features/user-data-management.md",
  "docs/user/QUICK_START.md",
]);

export const featurePlainDocGlyphPaths = new Set([
  "docs/features/ghost-detection.md",
  "docs/features/json-resume-import.md",
]);

export const maintainedDocGlyphPaths = new Set([
  "docs/README.md",
  "docs/ROADMAP.md",
  "docs/style-guide/GLOSSARY.md",
]);

export const developerLayoutDocGlyphPaths = new Set([
  "docs/developer/FRONTEND_TESTING.md",
  "docs/developer/GETTING_STARTED.md",
  "docs/developer/INTEGRATION_TESTING.md",
  "docs/developer/TESTING.md",
]);

export const statusEmojiPattern =
  /[\u{2705}\u{274c}\u{26a0}\u{23f3}\u{26a1}\u{1f517}\u{1f512}\u{1f4c4}\u{1f4dd}\u{1f7e2}\u{1f7e1}\u{1f534}\u{1f4ca}\u{1f4e7}\u{1f4c8}\u{1f4c9}\u{1f3af}\u{1f680}\u{1f4a1}\u{1f50d}\u{2b50}]/u;
export const deepLinksStatusEmojiPattern =
  /[\u{2705}\u{274c}\u{26a0}\u{1f510}]/u;

export const activeStatusPath = "docs/plans/active/status.md";
export const isoDatePattern = /\b20\d{2}-\d{2}-\d{2}\b/g;
