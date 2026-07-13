import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { hasTechnicalFirstUserCopy } from "../harness/checks/product-copy.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withFixture(callback) {
  const root = mkdtempSync(
    join(tmpdir(), "jobsentinel-product-copy-user-guidance-"),
  );

  try {
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("product copy rejects user-doc sidecar drift", () => {
  withFixture((root) => {
    for (const [path, copy] of [
      ["docs/README.md", "Job Source Adapters"],
      ["docs/features/resume-builder.md", "ats-optimizer.png"],
      [
        "docs/features/resume-builder.md",
        "**80-100** - Strong visible evidence",
      ],
      ["docs/features/json-resume-import.md", "JSON Resume"],
      ["docs/features/json-resume-import.md", "raw JSON strings"],
      ["docs/features/json-resume-import.md", "malformed JSON errors"],
      ["docs/features/job-sources.md", "feeds or APIs"],
      ["docs/features/job-sources.md", "Requests/hour"],
      ["docs/features/job-sources.md", "Official/public board API"],
      ["docs/user/QUICK_START.md", "build JobSentinel from the source code"],
      ["docs/user/QUICK_START.md", "source-code setup guide"],
      ["docs/features/notifications.md", "fit label or percentage"],
    ]) {
      writeFixtureFile(root, path, `${copy}\n`);
      assert.equal(hasTechnicalFirstUserCopy(root, path), true);
    }
  });
});

test("product copy rejects stale settings alert and source setup copy", () => {
  withFixture((root) => {
    for (const staleCopy of [
      "Manual email setup",
      "Auto-enable Slack if valid connection link entered.",
      'placeholder="Paste Slack connection link"',
      "Request USAJobs access code",
      '<dt className="font-medium">Job-source link</dt>',
      "Paste a job-source link from a service you trust",
      "Recommended for you",
      "Share ${savedFile.fileName} only if you want help.",
    ]) {
      writeFixtureFile(
        root,
        "src/features/settings/SettingsPage.tsx",
        `${staleCopy}\n`,
      );
      assert.equal(
        hasTechnicalFirstUserCopy(
          root,
          "src/features/settings/SettingsPage.tsx",
        ),
        true,
      );
    }

    writeFixtureFile(
      root,
      "docs/features/notifications.md",
      "Slack, Discord, and Teams give you a private connection link for chat alerts.\n",
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/notifications.md"),
      true,
    );
  });
});

test("product copy rejects raw alert threshold percentages", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/settings/notifications/NotificationPreferences.tsx",
      "{config.minScoreThreshold}%\n",
    );

    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "src/features/settings/notifications/NotificationPreferences.tsx",
      ),
      true,
    );
  });
});

test("product copy rejects stale recovery and login privacy copy", () => {
  withFixture((root) => {
    for (const [path, copy] of [
      ["src/components/ErrorLogPanel.tsx", "{displayMessage}"],
      ["src/components/ErrorLogPanel.tsx", "Save Extra Local Details"],
      ["src/components/ErrorLogPanel.tsx", "Save Full Local Problem Details"],
      ["docs/user/QUICK_START.md", "app password or sending details"],
      ["docs/user/DEEP_LINKS.md", "This is expected - log in to view results."],
      ["docs/user/DEEP_LINKS.md", "Bulk open (open multiple sites at once)"],
    ]) {
      writeFixtureFile(root, path, `${copy}\n`);
      assert.equal(hasTechnicalFirstUserCopy(root, path), true);
    }
  });
});

test("product copy rejects technical feedback preview labels", () => {
  withFixture((root) => {
    for (const staleCopy of ["App version", "Platform", "Device type"]) {
      writeFixtureFile(
        root,
        "src/components/feedback/DebugInfoPreview.tsx",
        `${staleCopy}\n`,
      );
      assert.equal(
        hasTechnicalFirstUserCopy(
          root,
          "src/components/feedback/DebugInfoPreview.tsx",
        ),
        true,
      );
    }
  });
});

test("product copy rejects prescriptive resume review copy", () => {
  withFixture((root) => {
    for (const staleCopy of [
      "Overall match: ${Math.round(result.overall_score)}%",
      "Overall match: 84%",
      "How to fix: {issue.fix}",
      "How to fix: Use one short paragraph.",
    ]) {
      writeFixtureFile(
        root,
        "src/features/resumes/matching/ResumeMatchPage.tsx",
        `${staleCopy}\n`,
      );
      assert.equal(
        hasTechnicalFirstUserCopy(
          root,
          "src/features/resumes/matching/ResumeMatchPage.tsx",
        ),
        true,
      );
    }
  });
});

test("product copy rejects Application Profile send/sent stats", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/application-assist/ApplicationProfilePage.tsx",
      "Marked Sent\nReady to Send\nSubmission Rate\n",
    );

    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "src/features/application-assist/ApplicationProfilePage.tsx",
      ),
      true,
    );
  });
});

test("product copy rejects raw connected-source metadata labels", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/settings/SettingsPage.tsx",
      "<dt>Source host</dt>\n",
    );
    writeFixtureFile(
      root,
      "PRIVACY.md",
      "contact time, source host, title count, work location mode, requested-job limit\n",
    );
    writeFixtureFile(
      root,
      "docs/features/job-source-status.md",
      "contact time, source host, title count, work location mode, requested-job limit\n",
    );
    writeFixtureFile(
      root,
      "docs/features/job-sources.md",
      "contact time, source host, title count, work location mode, requested-job limit\n",
    );

    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/features/settings/SettingsPage.tsx"),
      true,
    );
    assert.equal(hasTechnicalFirstUserCopy(root, "PRIVACY.md"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/job-source-status.md"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/job-sources.md"),
      true,
    );
  });
});

test("product copy rejects technical source-check flow wording", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      [
        "Source checks use bounded requests, source-specific limits, and shared retry helpers.",
        "duplicate handling, health checks, and bounded website reads",
        "local search, follows source-specific boundaries",
        "job source health docs",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/job-sources.md",
      [
        "Every source check must use source-specific limits and shared retry helpers where feasible",
        "Page, feed, source-check, and import requests cap decoded bodies at 16 MiB",
        "The job source health dashboard tracks source status",
        "Source health must never leak credentials",
        "  -> source-boundary check",
        "  -> bounded public request",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/job-source-status.md",
      [
        "Scheduled source health",
        "The Settings troubleshooting dashboard should show:",
        "Source health must follow the same rules for job sources:",
        "",
      ].join("\n"),
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "README.md"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/job-sources.md"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/job-source-status.md"),
      true,
    );
  });
});

test("product copy rejects bare dashboard summary recovery", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/dashboard/components/DashboardWidgets.tsx",
      [
        'setError("Could not load application summary");',
        'aria-label="Analytics charts"',
        ">Analytics Dashboard<",
        "Weekly Activity",
        "Jobs by Source",
        "Salary Distribution",
        "Quick Stats",
        "",
      ].join("\n"),
    );

    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "src/features/dashboard/components/DashboardWidgets.tsx",
      ),
      true,
    );
  });
});

test("product copy rejects overbroad browser import promises", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/features/settings/sources/browser-import/BrowserImportSection.tsx",
      [
        "Browse to any job posting (LinkedIn, Indeed, etc.)",
        "Supported Sites:",
        "Major Job Boards:",
        "Most modern career sites",
        "Official ATS job pages",
        "public ATS sources",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/browser-import.md",
      [
        "The browser import button works best on individual job pages from:",
        "",
        "- LinkedIn",
        "- Indeed",
        "- Glassdoor",
        "",
      ].join("\n"),
    );

    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "src/features/settings/sources/browser-import/BrowserImportSection.tsx",
      ),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/browser-import.md"),
      true,
    );
  });
});

test("product copy rejects automated-scan deep-link wording", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "src/components/DeepLinkGenerator.tsx",
      [
        "Create ready-to-use searches for job sites that JobSentinel cannot scan automatically.",
        "JobSentinel does not check automatically.",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/user/DEEP_LINKS.md",
      [
        "# Job Site Search Links",
        "Access sites that block automated scans",
        "**100% Legal:**",
        "Search links let you search these sites legally without automated scans.",
        "Some sites limit automatic checking or require you to view results in your own browser.",
        "JobSentinel does not bypass site controls.",
        "JobSentinel does not bypass human checks, login, or site limits.",
        "| Login and human checks | Handled by you on the site | Not bypassed |",
        "[technical contributor guide](../developer/ADDING_DEEP_LINK_SITES.md)",
        "## Comparison with Scrapers",
        "**Use scanners for:** Sites that allow it",
        "## Supported Sites (18)",
        "| Feature | Search Links | Monitored sources |",
        "Saved locally when a monitored source returns a job",
        "Official or public sources that allow local monitoring",
        "- Advanced filters (salary, experience level)",
        "",
      ].join("\n"),
    );

    assert.equal(
      hasTechnicalFirstUserCopy(root, "src/components/DeepLinkGenerator.tsx"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/user/DEEP_LINKS.md"),
      true,
    );
  });
});

test("product copy rejects first-run scanning copy in README", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      [
        "Review the search before scanning starts.",
        "After setup, JobSentinel starts scanning.",
        "JobSentinel supports scheduled source adapters through a common source HTTP client.",
        "ATS platforms include Greenhouse and Lever.",
        "USAJobs can use an access code for background monitoring.",
        "Read the full job source adapter guide.",
        "",
      ].join("\n"),
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "README.md"), true);
  });
});

test("product copy rejects front-door pay jargon", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      "What does it optimize for?\nunder-leveling cues\ndoes not optimize for application volume\n",
    );
    writeFixtureFile(root, "ROADMAP.md", "under-anchoring guidance\n");
    writeFixtureFile(
      root,
      "src/features/salary/SalarySearchCard.tsx",
      "role is under-leveled\n",
    );
    writeFixtureFile(
      root,
      "docs/features/pay-protection.md",
      "offer may be under-leveled\n",
    );
    writeFixtureFile(root, "docs/research/pay-equity.md", "under-leveling\n");
    writeFixtureFile(
      root,
      "docs/features/hiring-trends.md",
      "spot under-leveling\n",
    );
    writeFixtureFile(
      root,
      "docs/features/resume-matcher.md",
      "Notice under-leveled roles\n",
    );
    writeFixtureFile(
      root,
      "docs/harness/readme-information-design.md",
      "optimization target\n",
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "README.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "ROADMAP.md"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "src/features/salary/SalarySearchCard.tsx",
      ),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/pay-protection.md"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/research/pay-equity.md"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/hiring-trends.md"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(root, "docs/features/resume-matcher.md"),
      true,
    );
    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "docs/harness/readme-information-design.md",
      ),
      true,
    );
  });
});

test("product copy rejects front-door ATS jargon", () => {
  withFixture((root) => {
    writeFixtureFile(
      root,
      "README.md",
      "ATS transparency\nofficial ATS postings\npublic ATS postings\n",
    );
    writeFixtureFile(
      root,
      "ROADMAP.md",
      "Company-site and ATS verification\nATS pages\n",
    );
    writeFixtureFile(
      root,
      "RESPONSIBLE_AI.md",
      "ATS-readable application clarity\nManipulate ATS systems\n",
    );
    writeFixtureFile(
      root,
      "docs/harness/readme-information-design.md",
      "ATS transparency\n",
    );

    assert.equal(hasTechnicalFirstUserCopy(root, "README.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "ROADMAP.md"), true);
    assert.equal(hasTechnicalFirstUserCopy(root, "RESPONSIBLE_AI.md"), true);
    assert.equal(
      hasTechnicalFirstUserCopy(
        root,
        "docs/harness/readme-information-design.md",
      ),
      true,
    );
  });
});
