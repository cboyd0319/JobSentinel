import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  hasLegacyPreferenceListCopy,
  hasNonProtectiveScoreCopy,
  hasRawErrorBoundaryDetails,
  hasTechnicalRecoveryCopy,
  hasTechnicalFirstUserCopy,
} from "../../harness/checks/product-copy.mjs";
function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}
function withFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-product-copy-"));
  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
test("product copy rejects technical recovery and raw error details", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/app/errors/ErrorBoundary.tsx",
      [
        "const title = `${pageName || 'Page'} Error`;",
        "return this.state.error.message;",
        "Try reloading the app to continue.",
        "Reload App",
        "Reset App Window & Reload",
        "If reload does not work",
        "Support details (development only)",
        "Automatic error reporting and logging",
        "Capture error with error reporting system",
        "Clear Temporary App Data",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/app/errors/PageErrorBoundary.tsx",
      "This keeps happening. This page may be temporarily unavailable.\nSupport details (development only)\nAutomatic error reporting",
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/errors/ComponentErrorBoundary.tsx",
      "This section failed to load\nShow support details\nNo support details available\nAutomatic error reporting",
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/errors/ModalErrorBoundary.tsx",
      "This window failed to load\nPlease close and try again later\nTry closing and checking back later\nSupport details (development only)\nNo support details available\nAutomatic error reporting\n",
    );
    writeFixtureFile(
      root,
      "src/features/settings/sources/health/ScraperHealthDashboard.tsx",
      "window state",
    );
    writeFixtureFile(
      root,
      "src/dev-runtime/vitals.ts",
      "In production, you could send to analytics service\nsendToAnalytics(metric)\nwith analytics services or custom reporting\n",
    );

    assert.equal(
      hasRawErrorBoundaryDetails(root, "src/app/errors/ErrorBoundary.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalRecoveryCopy(root, "src/app/errors/ErrorBoundary.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalRecoveryCopy(
        root,
        "src/features/dashboard/errors/ComponentErrorBoundary.tsx",
      ),
      true,
    );
    assert.equal(
      hasTechnicalRecoveryCopy(root, "src/app/errors/PageErrorBoundary.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalRecoveryCopy(root, "src/features/dashboard/errors/ModalErrorBoundary.tsx"),
      true,
    );
    assert.equal(hasTechnicalFirstUserCopy(root, "src/dev-runtime/vitals.ts"), true);
    assert.equal(
      hasTechnicalRecoveryCopy(
        root,
        "src/features/settings/sources/health/ScraperHealthDashboard.tsx",
      ),
      true,
    );
    assert.equal(
      hasRawErrorBoundaryDetails(
        root,
        "src/features/settings/sources/health/ScraperHealthDashboard.tsx",
      ),
      false,
    );
  });
});

test("product copy rejects non-protective scoring and legacy preference copy", () => {
  withFixture((root) => {
    writeFixtureFile(root, "src/ui/score-display/ScoreDisplay.tsx", "Great Match!");
    writeFixtureFile(
      root,
      "docs/features/application-tracking.md",
      "Job-word boosters",
    );
    writeFixtureFile(
      root,
      "src/features/resumes/shared/resumeScore.ts",
      'if (score >= 90) return "Excellent";\nif (score >= 80) return "Great";\nreturn "Poor";\n',
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/filterLabels.ts",
      "Strong (70%+)\n",
    );
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      "Match Priority Guide\nThese percentages explain the default priority order.\n",
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/ScoreBreakdownModal.tsx",
      "40% influence\n",
    );
    writeFixtureFile(
      root,
      "src/features/resumes/matching/resumeMatchModel.ts",
      "(50% influence)\nOverall match uses these default priorities.\n",
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/components/GhostIndicator.tsx",
      "Posting Risk Warning\nGeneric Content\n",
    );

    assert.equal(
      hasNonProtectiveScoreCopy(root, "src/ui/score-display/ScoreDisplay.tsx"),
      true,
    );
    assert.equal(
      hasNonProtectiveScoreCopy(
        root,
        "src/features/dashboard/components/filterLabels.ts",
      ),
      true,
    );
    assert.equal(
      hasNonProtectiveScoreCopy(root, "docs/features/smart-scoring.md"),
      true,
    );
    assert.equal(
      hasNonProtectiveScoreCopy(
        root,
        "src/features/dashboard/components/ScoreBreakdownModal.tsx",
      ),
      true,
    );
    assert.equal(
      hasNonProtectiveScoreCopy(
        root,
        "src/features/resumes/matching/resumeMatchModel.ts",
      ),
      true,
    );
    assert.equal(
      hasNonProtectiveScoreCopy(
        root,
        "src/features/dashboard/components/GhostIndicator.tsx",
      ),
      true,
    );
    assert.equal(
      hasLegacyPreferenceListCopy(
        root,
        "docs/features/application-tracking.md",
      ),
      true,
    );
    assert.equal(
      hasNonProtectiveScoreCopy(root, "src/features/resumes/shared/resumeScore.ts"),
      true,
    );
    assert.equal(
      hasNonProtectiveScoreCopy(root, "src/app/errors/ErrorBoundary.tsx"),
      false,
    );
  });
});

test("product copy rejects stale match-ranking labels", () => {
  withFixture((root) => {
    for (const [path, copy] of [
      ["src/ui/score-display/ScoreDisplay.tsx", "Strong Match"],
      ["src/ui/score-display/ScoreDisplay.stories.tsx", "Excellent (90%+)"],
      ["src/ui/score-display/ScoreDisplay.stories.tsx", "Average (50-69%)"],
      ["src/ui/score-display/ScoreDisplay.stories.tsx", "Low (&lt;50%)"],
      ["src/ui/score-display/ScoreDisplay.stories.tsx", "AllScoreRanges"],
      ["src/ui/score-display/ScoreDisplay.stories.tsx", "HighScore"],
      [
        "src/features/dashboard/components/ScoreBreakdownModal.tsx",
        "Match Details",
      ],
      [
        "src/features/dashboard/components/ScoreBreakdownModal.tsx",
        "Part of overall score",
      ],
      ["src/ui/score-display/ScoreDisplay.tsx", "Score factor weights"],
      ["src/ui/score-display/ScoreDisplay.tsx", "<td>{factor.weight}%</td>"],
      [
        "src/features/dashboard/components/ScoreBreakdownModal.tsx",
        "<span>{factorPercentage}%</span>",
      ],
      [
        "src/features/resumes/matching/ResumeMatchPage.tsx",
        "Format result: ${Math.round(result.format_score)}%",
      ],
      ["src/features/resumes/matching/ResumeMatchPage.tsx", "Overall Match"],
      [
        "src/features/resumes/matching/ResumeMatchPage.tsx",
        "<span>{Math.round(score)}%</span>",
      ],
      ["src/features/dashboard/components/filterLabels.ts", "Best Match First"],
      [
        "src/features/dashboard/components/filterLabels.ts",
        "Lowest Match First",
      ],
      ["src/features/onboarding/SetupWizard.tsx", "strongest matches"],
      ["docs/user/QUICK_START.md", "weaker or adjacent matches"],
      ["docs/features/smart-scoring.md", "Low Match"],
      ["docs/features/smart-scoring.md", "Match Factors"],
      ["docs/features/smart-scoring.md", "Smart Scoring System"],
      ["docs/features/smart-scoring.md", "Smart scoring should:"],
      ["docs/features/smart-scoring.md", "match percentage"],
      ["docs/style-guide/GLOSSARY.md", "match score"],
      ["docs/style-guide/WRITING-FOR-JOB-SEEKERS.md", "match scores"],
      [
        "PRIVACY.md",
        "Alert details may include public job details and match score",
      ],
      ["RESPONSIBLE_AI.md", "Present match scores as hiring guarantees"],
      ["docs/features/resume-matcher.md", "How To Read Match Results"],
      ["docs/features/resume-matcher.md", "Overall match"],
      ["docs/features/resume-matcher.md", "Low match"],
    ]) {
      writeFixtureFile(root, path, `${copy}\n`);
      assert.equal(hasNonProtectiveScoreCopy(root, path), true);
    }
  });
});
