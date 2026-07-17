import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../../checks/repo-bloat.mjs";
import { writeTechnicalFirstUserCopyFixtures } from "./repo-bloat-product-copy-fixtures.mjs";
const APP_ASSIST_PLATFORM = "src/dev-runtime/features/application-assist/atsPlatform.ts";
const DEV_RUNTIME_HANDLERS = "src/dev-runtime/mocks/handlers.ts";
function writeFixtureFile(root,path,content="") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}
function withGitFixture(callback) {
  const root = mkdtempSync(
    join(tmpdir(), "jb-copy-"),
  );
  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
test("checkRepoBloat rejects job-search framing", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/application-positioning.md",
      [
        ["bypass", "ATS"].join(" "),
        ["scrape", "LinkedIn"].join(" "),
        ["beat", "the", "algorithm"].join(" "),
        ["mass", "apply"].join(" "),
        ["automate", "applications"].join(" "),
        "",
      ].join("\n"),
    );
    execFileSync(
      "git",
      ["add", "package.json", "docs/features/application-positioning.md"],
      {
        cwd: root,
      },
    );
    const violations = checkRepoBloat(root);
    assert.ok(
      violations.includes(
        "replace banned job-search framing: docs/features/application-positioning.md",
      ),
      violations.join("\n"),
    );
  });
});
test("checkRepoBloat rejects technical-first user copy", () => {
  withGitFixture((root) => {
    writeTechnicalFirstUserCopyFixtures(root, writeFixtureFile);
    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "README.md",
        "src/features/resumes/library/ResumeLibraryPage.tsx",
        "src/features/resumes/matching/ResumeMatchPage.tsx",
        "src/features/applications/ApplicationsPage.tsx",
        "src/features/application-assist/ApplicationProfilePage.tsx",
        "src/features/dashboard/DashboardPage.tsx",
        "src/features/dashboard/components/DashboardHeader.tsx",
        "src/features/dashboard/hooks/useDashboardJobOps.ts",
        "src/features/dashboard/hooks/useDashboardSavedSearches.ts",
        "src/features/dashboard/components/QuickActions.tsx",
        "src/features/market/MarketPage.tsx",
        "src/features/resumes/builder/ResumeBuilderPage.tsx",
        "src/features/salary/SalaryPage.tsx",
        "src/features/settings/SettingsPage.tsx",
        "src/features/onboarding/SetupWizard.tsx",
        "src/features/settings/sources/browser-import/BrowserImportSection.tsx",
        "src/features/applications/CoverLetterTemplates.tsx",
        "src/features/search-links/SearchLinksPage.tsx",
        "src/app/errors/ErrorBoundary.tsx",
        "src/features/settings/support/ErrorLogPanel.tsx",
        "src/features/dashboard/components/ScoreBreakdownModal.tsx",
        "src/ui/score-display/ScoreDisplay.tsx",
        "src/ui/score-display/internal/scoreReasons.ts",
        "src/features/settings/sources/health/ScraperHealthDashboard.tsx",
        "src/features/dashboard/components/JobImportModal.tsx",
        "src/features/dashboard/components/JobCard.tsx",
        "src/features/dashboard/components/jobCardGuidance.ts",
        "src/features/resumes/builder/AtsLiveScorePanel.tsx",
        "src/features/applications/AnalyticsPanel.tsx",
        "src/features/dashboard/components/DashboardWidgets.tsx",
        "src/features/applications/InterviewScheduler.tsx",
        "src/features/onboarding/CareerProfileSelector.tsx",
        "src/app/commands/CommandPalette.tsx",
        "src/app/commands/KeyboardShortcutsHelp.tsx",
        "src/app/Navigation.tsx",
        "src/features/application-assist/ApplyButton.tsx",
        "src/features/application-assist/ScreeningAnswersForm.tsx",
        "src/features/settings/support/feedback/DebugInfoPreview.tsx",
        "src/features/settings/support/feedback/FeedbackModal.tsx",
        "src/features/settings/support/feedback/SuccessScreen.tsx",
        "src/app/keyboard/KeyboardShortcutsProvider.tsx",
        DEV_RUNTIME_HANDLERS,
        APP_ASSIST_PLATFORM,
        "src/features/application-assist/applicationFormValidation.ts",
        "src/features/settings/credentials/notificationConnectionValidation.ts",
        "src/shared/validation/contactFieldValidation.ts",
        "src/shared/errorReporting/messages.ts",
        "docs/features/notifications.md",
        "docs/features/application-assist.md",
        "docs/features/job-sources.md",
        "docs/features/user-data-management.md",
        "docs/features/browser-import.md",
        "docs/user/DEEP_LINKS.md",
        "docs/user/QUICK_START.md",
      ],
      { cwd: root },
    );
    const violations = checkRepoBloat(root);
    for (const path of [
      "src/features/resumes/library/ResumeLibraryPage.tsx",
      "src/features/resumes/matching/ResumeMatchPage.tsx",
      "src/features/applications/ApplicationsPage.tsx",
      "src/features/application-assist/ApplicationProfilePage.tsx",
      "src/features/dashboard/DashboardPage.tsx",
      "src/features/dashboard/components/DashboardHeader.tsx",
      "src/features/dashboard/hooks/useDashboardJobOps.ts",
      "src/features/dashboard/hooks/useDashboardSavedSearches.ts",
      "src/features/dashboard/components/QuickActions.tsx",
      "src/features/market/MarketPage.tsx",
      "src/features/resumes/builder/ResumeBuilderPage.tsx",
      "src/features/salary/SalaryPage.tsx",
      "src/features/settings/SettingsPage.tsx",
      "src/features/onboarding/SetupWizard.tsx",
      "src/features/settings/sources/browser-import/BrowserImportSection.tsx",
      "src/features/applications/CoverLetterTemplates.tsx",
      "src/features/search-links/SearchLinksPage.tsx",
      "src/app/errors/ErrorBoundary.tsx",
      "src/features/settings/support/ErrorLogPanel.tsx",
      "src/features/dashboard/components/ScoreBreakdownModal.tsx",
      "src/ui/score-display/ScoreDisplay.tsx",
      "src/ui/score-display/internal/scoreReasons.ts",
      "src/features/settings/sources/health/ScraperHealthDashboard.tsx",
      "src/features/dashboard/components/JobImportModal.tsx",
      "src/features/dashboard/components/JobCard.tsx",
      "src/features/resumes/builder/AtsLiveScorePanel.tsx",
      "src/features/applications/AnalyticsPanel.tsx",
      "src/features/dashboard/components/DashboardWidgets.tsx",
      "src/features/applications/InterviewScheduler.tsx",
      "src/features/onboarding/CareerProfileSelector.tsx",
      "src/app/commands/CommandPalette.tsx",
      "src/app/commands/KeyboardShortcutsHelp.tsx",
      "src/app/Navigation.tsx",
      "src/features/application-assist/ApplyButton.tsx",
      "src/features/application-assist/ScreeningAnswersForm.tsx",
      "src/features/settings/support/feedback/DebugInfoPreview.tsx",
      "src/features/settings/support/feedback/FeedbackModal.tsx",
      "src/features/settings/support/feedback/SuccessScreen.tsx",
      "src/app/keyboard/KeyboardShortcutsProvider.tsx",
      DEV_RUNTIME_HANDLERS,
      APP_ASSIST_PLATFORM,
      "src/features/application-assist/applicationFormValidation.ts",
      "src/features/settings/credentials/notificationConnectionValidation.ts",
      "src/shared/validation/contactFieldValidation.ts",
      "src/shared/errorReporting/messages.ts",
      "README.md",
      "docs/features/notifications.md",
      "docs/features/application-assist.md",
      "docs/features/job-sources.md",
      "docs/features/user-data-management.md",
      "docs/features/browser-import.md",
      "docs/user/DEEP_LINKS.md",
      "docs/user/QUICK_START.md",
    ]) {
      assert.ok(
        violations.includes(`replace technical-first user copy: ${path}`),
        violations.join("\n"),
      );
    }
  });
});
