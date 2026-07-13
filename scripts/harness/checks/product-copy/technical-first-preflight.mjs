import { readFileSync } from "node:fs";
import { join } from "node:path";

const payPlainLanguagePaths = new Set([
  "README.md",
  "ROADMAP.md",
  "docs/features/pay-protection.md",
  "docs/features/hiring-trends.md",
  "docs/features/resume-matcher.md",
  "docs/harness/readme-information-design.md",
  "docs/research/pay-equity.md",
  "src/pages/Salary.tsx",
]);

const hiringTrendsCopyPaths = new Set([
  "docs/README.md",
  "docs/features/hiring-trends.md",
  "src/config/tourSteps.ts",
  "src/components/LocationHeatmap.tsx",
  "src/components/MarketAlertCard.tsx",
  "src/components/MarketSnapshotCard.tsx",
  "src/app/Navigation.tsx",
  "src/mocks/handlers/marketIntelligence.ts",
  "src/pages/Market.tsx",
  "src/pages/marketErrorCopy.ts",
  "tests/e2e/playwright/page-objects/MarketIntelligencePage.ts",
]);
const firstRunPlainCopyPaths = new Set([
  "src/app/App.tsx",
  "src/components/CareerProfileSelector.tsx",
  "src/config/tourSteps.ts",
  "src/pages/SetupWizard.tsx",
  "src/pages/SetupWizardSearchSummary.tsx",
  "src/pages/setupWizardPreferences.ts",
  "docs/user/QUICK_START.md",
]);
const installSecurityCopyPaths = new Set([
  "README.md",
  "docs/style-guide/GLOSSARY.md",
  "docs/user/QUICK_START.md",
]);

const ruleZeroPrecisionCopyPaths = new Set([
  "PRIVACY.md",
  "RESPONSIBLE_AI.md",
  "SECURITY.md",
  "README.md",
  "docs/features/notifications.md",
  "docs/features/application-assist.md",
  "docs/harness/readme-information-design.md",
  "docs/user/DEEP_LINKS.md",
  "docs/user/QUICK_START.md",
  "src/components/ErrorBoundary.tsx",
  "src/components/ModalErrorBoundary.tsx",
  "src/components/PageErrorBoundary.tsx",
]);

const publicIssueTemplatePrivacyPaths = new Set([
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/ISSUE_TEMPLATE/question.yml",
  ".github/ISSUE_TEMPLATE/scraper_issue.yml",
]);

export function getTechnicalFirstPreflightResult(root, path) {
  if (path === "src/utils/vitals.ts") {
    const text = readFileSync(join(root, path), "utf8");
    return /analytics service|analytics services|custom reporting|sendToAnalytics|telemetry/i.test(text);
  }

  if (path === "src/components/CompanyResearchPanel.tsx") {
    const text = readFileSync(join(root, path), "utf8");
    const companyResearchPatterns = [
      /Information about .* is being gathered/i,
      /Check back later for more details/i,
      /Request timed out/i,
      /Failed to load company information/i,
      /Taking longer than expected/i,
    ];

    return companyResearchPatterns.some((pattern) => pattern.test(text));
  }

  if (path === "src/utils/export.ts" || path === "src/utils/export.test.ts") {
    const text = readFileSync(join(root, path), "utf8");
    return /jobsentinel-config-\$\{date\}\.json|jobsentinel-config-\\d/.test(text);
  }

  if (path === "docs/README.md") {
    const text = readFileSync(join(root, path), "utf8");
    return /Job Source Adapters/i.test(text);
  }

  if (
    path === "src/components/MarketSnapshotCard.tsx" ||
    path === "src/components/MarketSnapshotCard.test.tsx"
  ) {
    const text = readFileSync(join(root, path), "utf8");
    const marketSnapshotPatterns = [
      /Market Sentiment/i,
      /market sentiment:/i,
      /<span>\{snapshot\.market_sentiment\}<\/span>/i,
      /getByText\(\/(?:bearish|neutral)\/i/i,
      /Market data/i,
      /market data/i,
      /No market snapshot yet/i,
    ];

    return marketSnapshotPatterns.some((pattern) => pattern.test(text));
  }

  if (hiringTrendsCopyPaths.has(path)) {
    const text = readFileSync(join(root, path), "utf8");
    const hiringTrendPatterns = [
      /Market Intel/i,
      /Market Intelligence/i,
      /(?:>\s*|["'`])Market Alerts(?:\s*<|["'`])/i,
      /Market snapshots/i,
      /(?:>\s*|["'`])Market alerts(?:\s*<|["'`])/i,
      /Loading market alerts/i,
      /No market alerts/i,
      /Failed to Load Market Data/i,
      /Market data unavailable/i,
      /Refresh Market Data/i,
      /job market trends/i,
      /Job Market by Location/i,
      /No location data yet/i,
      /No market snapshot yet/i,
      /monitored postings/i,
      /Skill demand/i,
      /real skill demand/i,
      /source bias/i,
      /sources currently monitored/i,
      /job-board bias/i,
      /Optional notification channels are used only if configured/i,
      /Notification delivery is optional and user-configured/i,
    ];

    if (hiringTrendPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }

    if (path === "src/pages/Market.tsx") {
      return false;
    }
  }

  if (firstRunPlainCopyPaths.has(path)) {
    const text = readFileSync(join(root, path), "utf8");
    const firstRunPatterns = [
      /setup wizard/i,
      /Loading setup wizard/i,
      /Career Path/i,
      /Review & Edit/i,
      /Customize Your Search/i,
      /Continue with This Path/i,
      /Continue with My Own Search/i,
      /My Own Search/i,
      /Starts with \{?profile\.keywordsBoost\.length\}? helpful skills/i,
      /Hacker News hiring posts/i,
    ];

    if (firstRunPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (installSecurityCopyPaths.has(path)) {
    const text = readFileSync(join(root, path), "utf8");
    const hasSecurityOverride = /Open Anyway|Run anyway/i.test(text);
    const hasDownloadCheck = /downloaded\s+JobSentinel from the latest download page/i.test(text);
    const hasMacOverride = /Open Anyway/i.test(text);
    const hasChecksumCheck = /checksum|\.sha256/i.test(text);

    if (hasSecurityOverride && !hasDownloadCheck) {
      return true;
    }

    if (hasMacOverride && !hasChecksumCheck) {
      return true;
    }
  }

  if (ruleZeroPrecisionCopyPaths.has(path)) {
    const text = readFileSync(join(root, path), "utf8");
    const ruleZeroPatterns = [
      /Your data is safe/i,
      /Your saved details are safe/i,
      /Your data stays yours\. Always/i,
      /No data is ever sent/i,
      /Works completely offline/i,
      /Sensitive data never written/i,
      /without exposing private data/i,
      /already sanitized before sharing/i,
      /Saved details are never stored in plain text/i,
      /Rule 0 privacy and security guarantee/i,
      /It does not share your profile details/i,
      /No tracking or analytics/i,
      /GitHub feedback, and Google Drive are user-configured/i,
      /External alerts\s*\|[^\n]*(?:GitHub|Google Drive)/i,
      /Feedback or issue-report sharing through configured GitHub or Google Drive/i,
      /Optional user-configured job-source addresses/i,
      /These addresses are off unless configured/i,
      /metadata only/i,
      /raw titles/i,
      /raw location/i,
      /raw local match reasons/i,
      /raw prompts/i,
      /payload minimization/i,
      /payload preview/i,
      /user-configured alerts/i,
      /user-configured\s+channels/i,
      /metadata logging/i,
      /local metadata logging/i,
      /source host/i,
      /title count/i,
      /work location mode/i,
      /requested-job limit/i,
    ];

    if (ruleZeroPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }

    if (path === "PRIVACY.md" || path === "SECURITY.md") {
      return false;
    }
  }

  if (publicIssueTemplatePrivacyPaths.has(path)) {
    const text = readFileSync(join(root, path), "utf8");

    if (!/Please don't include (?:any )?personal information/i.test(text)) {
      return true;
    }

    if (/redacts sensitive\s+details before you share it/i.test(text)) {
      return true;
    }

    if (!/redacts known\s+sensitive details before you review and share it/i.test(text)) {
      return true;
    }
  }

  if (payPlainLanguagePaths.has(path)) {
    const text = readFileSync(join(root, path), "utf8");
    const payJargonPatterns = [
      /under-anchoring/i,
      /under-leveling/i,
      /under-leveled/i,
      /What does it optimize for/i,
      /does not optimize for/i,
      /optimization target/i,
    ];

    if (payJargonPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  if (
    path === "README.md" ||
    path === "ROADMAP.md" ||
    path === "PRIVACY.md" ||
    path === "RESPONSIBLE_AI.md" ||
    path === "docs/harness/readme-information-design.md"
  ) {
    const text = readFileSync(join(root, path), "utf8");
    const frontDoorAtsPatterns = [
      /ATS transparency/i,
      /ATS-readable application clarity/i,
      /Manipulate ATS systems/i,
      /official ATS postings/i,
      /public ATS postings/i,
      /Company-site and ATS verification/i,
      /ATS pages/i,
    ];

    if (frontDoorAtsPatterns.some((pattern) => pattern.test(text))) {
      return true;
    }
  }

  return undefined;
}
