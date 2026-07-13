import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "../check-repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-bloat-feature-docs-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects scraper doc emoji markers", () => {
  withGitFixture((root) => {
    const doneIcon = String.fromCodePoint(0x2705);
    const warningIcon = String.fromCodePoint(0x26a0, 0xfe0f);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/job-sources.md",
      [
        `| LinkedIn | ${doneIcon} Production |`,
        `- ${warningIcon} User responsibility: comply with site terms`,
        "Settings → Job Sources",
        "┌─────────┐",
        "One-Click Connect — No Technical Knowledge Required!",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/job-sources.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace scraper doc emoji markers: docs/features/job-sources.md"),
      violations.join("\n"),
    );
  });
});
test("checkRepoBloat rejects stale scraper reliability and rate-limit docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/job-sources.md",
      [
        "JobSentinel includes production-ready scrapers for 13 major job boards.",
        `- [x] ${["All 13 job board", "scrapers"].join(" ")} (production-ready)`,
        "- [ ] CAPTCHA solver integration",
        "- [ ] Proxy rotation for large-scale scraping",
        "4. **Session Management:** Rotate cookies if multiple accounts",
        "4. **Rate Limiting:** Conservative 5-second delays (Cloudflare protection)",
        "limiter.wait(\"usajobs\", limits::USAJOBS).await;       // 60/hour",
        "| **USAJobs**         | 60            | 0.017         | Official API, conservative     |",
        "| **RemoteOK**        | 1000          | 0.278         | Public API                     |",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/job-sources.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync scraper reliability and rate-limit docs: docs/features/job-sources.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects scraper health doc emoji markers", () => {
  withGitFixture((root) => {
    const greenIcon = String.fromCodePoint(0x1f7e2);
    const testIcon = String.fromCodePoint(0x1f9ea);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/job-source-status.md",
      [
        `LinkedIn ${greenIcon} Healthy`,
        `Click **${testIcon} Test** button`,
        "Settings → Scrapers → LinkedIn",
        "────────────────────────",
        "┌────────────────────────────────┐",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/job-source-status.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace scraper health doc emoji markers: docs/features/job-source-status.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale scraper health coverage", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/job-source-status.md",
      "The health monitoring system automatically tracks all 13 scrapers.\n",
    );
    writeFixtureFile(
      root,
      "src/mocks/handlers.ts",
      [
        "interface MockSmokeTestResult {",
        "  scraper_name: string;",
        "  success: boolean;",
        "  response_time_ms: number;",
        "}",
        "const MOCK_SCRAPERS = [{ scraper_name: \"usa_jobs\" }];",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/features/dashboard/DashboardPage.tsx",
      "const emptyState = '13 job boards on your schedule';\n",
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "JobSentinel is now watching 13 job sources for you.\n",
    );
    writeFixtureFile(
      root,
      "docs/style-guide/WRITING-FOR-JOB-SEEKERS.md",
      "| vague | JobSentinel checks 13 job boards every hour |\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/WHY_TAURI.md",
      "| Scrape 13 job boards | 30-60s |\n",
    );
    writeFixtureFile(
      root,
      "docs/releases/v2.1.md",
      "All 13 scrapers wired\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/job-source-status.md",
        "src/mocks/handlers.ts",
        "src/features/dashboard/DashboardPage.tsx",
        "docs/user/QUICK_START.md",
        "docs/style-guide/WRITING-FOR-JOB-SEEKERS.md",
        "docs/developer/WHY_TAURI.md",
        "docs/releases/v2.1.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("sync scraper health source coverage: docs/features/job-source-status.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("sync scraper health source coverage: src/mocks/handlers.ts"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("sync scraper health source coverage: src/features/dashboard/DashboardPage.tsx"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("sync scraper health source coverage: docs/user/QUICK_START.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync scraper health source coverage: docs/style-guide/WRITING-FOR-JOB-SEEKERS.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("sync scraper health source coverage: docs/developer/WHY_TAURI.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("sync scraper health source coverage: docs/releases/v2.1.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects technical source-health user copy", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src/components/ScraperHealthDashboard.tsx",
      [
        "const title = 'Scraper Health Dashboard';",
        "const loading = 'Loading scraper health...';",
        "const results = 'Smoke Test Results';",
        "const badge = 'PASS';",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "src/pages/Settings.tsx",
      "const help = 'Monitor scraper status, run smoke tests, and view run history';\n",
    );
    writeFixtureFile(
      root,
      "src/components/scraperHealthDashboardModel.ts",
      'const source = { label: "Healthy" };\n',
    );
    writeFixtureFile(
      root,
      "docs/features/job-source-status.md",
      "# Scraper Health Monitoring\n\nRun smoke tests from the dashboard.\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src/components/ScraperHealthDashboard.tsx",
        "src/components/scraperHealthDashboardModel.ts",
        "src/pages/Settings.tsx",
        "docs/features/job-source-status.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "keep source-health copy plain-language: src/components/ScraperHealthDashboard.tsx",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "keep source-health copy plain-language: src/components/scraperHealthDashboardModel.ts",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("keep source-health copy plain-language: src/pages/Settings.tsx"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "keep source-health copy plain-language: docs/features/job-source-status.md",
      ),
      violations.join("\n"),
    );
  });
});
