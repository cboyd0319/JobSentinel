import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { checkRepoBloat } from "./check-repo-bloat.mjs";

function writeFixtureFile(root, path, content = "") {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function withGitFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), "jobsentinel-repo-bloat-"));

  try {
    execFileSync("git", ["init", "--quiet"], { cwd: root });
    callback(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("checkRepoBloat rejects reserved E2E fixture placeholders", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "tests/e2e/fixtures/.gitkeep");
    writeFixtureFile(
      root,
      "tests/e2e/fixtures/README.md",
      "This directory is reserved for future tests.\n",
    );

    execFileSync(
      "git",
      ["add", "package.json", "tests/e2e/fixtures/.gitkeep", "tests/e2e/fixtures/README.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove tracked generated or disposable file: tests/e2e/fixtures/.gitkeep",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove tracked generated or disposable file: tests/e2e/fixtures/README.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects tracked gitkeep placeholders", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "docs/plans/active/.gitkeep");
    writeFixtureFile(root, "docs/plans/active/current-plan.md", "# Current Plan\n");
    writeFixtureFile(root, "docs/plans/completed/.gitkeep");
    writeFixtureFile(root, "docs/plans/completed/done-plan.md", "# Done Plan\n");

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/plans/active/.gitkeep",
        "docs/plans/active/current-plan.md",
        "docs/plans/completed/.gitkeep",
        "docs/plans/completed/done-plan.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove tracked generated or disposable file: docs/plans/active/.gitkeep",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove tracked generated or disposable file: docs/plans/completed/.gitkeep",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects speculative cloud deployment docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      "## Cloud Architecture (not implemented)\n\nCloud Backend (GCP/AWS)\n\nCore can run on any OS or in the cloud.\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      "src-tauri/src/cloud/ # GCP/AWS deployment\n",
    );
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      "- GCP Cloud Run / AWS Lambda deployment\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/developer/ARCHITECTURE.md",
        "docs/developer/GETTING_STARTED.md",
        "docs/ROADMAP.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove speculative cloud deployment doc: docs/developer/ARCHITECTURE.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove speculative cloud deployment doc: docs/developer/GETTING_STARTED.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("remove speculative cloud deployment doc: docs/ROADMAP.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale shipped-feature roadmap statuses", () => {
  withGitFixture((root) => {
    const plannedStatusIcon = String.fromCodePoint(0x1f532);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      [
        "- **Implementation:** `src-tauri/src/core/import/` module (planned)",
        `3. ${plannedStatusIcon} Universal Job Importer with Schema.org parsing`,
        `4. ${plannedStatusIcon} Deep Link Generator for 15+ sites`,
        `5. ${plannedStatusIcon} Bookmarklet generator`,
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/ROADMAP.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove stale shipped-feature status doc: docs/ROADMAP.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects roadmap status emoji", () => {
  withGitFixture((root) => {
    const doneStatusIcon = String.fromCodePoint(0x2705);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "docs/ROADMAP.md", `| Feature | ${doneStatusIcon} Done |\n`);

    execFileSync("git", ["add", "package.json", "docs/ROADMAP.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace roadmap status emoji with text: docs/ROADMAP.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale informal maintainer footers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/ERROR_HANDLING.md",
      "**Maintained By**: The Rust Mac Overlord 🦀\n",
    );

    execFileSync("git", ["add", "package.json", "docs/developer/ERROR_HANDLING.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace stale informal maintainer footer: docs/developer/ERROR_HANDLING.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale docs tree claims", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      "│   ├── migrations/          # 4 SQLite migrations\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/INTEGRATION_TESTING.md",
      "└── fixtures/                          # Test HTML/JSON responses\n\nTest HTML responses stored in `fixtures/`:\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/developer/GETTING_STARTED.md",
        "docs/developer/INTEGRATION_TESTING.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale hardcoded migration count: docs/developer/GETTING_STARTED.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove stale integration fixture directory claim: docs/developer/INTEGRATION_TESTING.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale scheduler refactor docs", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      "`workers/scraper.rs` - Scraper worker threads\n`workers/notifier.rs` - Notification worker\n",
    );
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      "**v1.5 Refactoring Priority**\n\n`db/mod.rs` | 4442 | CRITICAL - needs modularization\n",
    );
    writeFixtureFile(
      root,
      "docs/security/KEYRING.md",
      "Used by: notify/mod.rs, scheduler/scrapers.rs\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/developer/ARCHITECTURE.md",
        "docs/developer/GETTING_STARTED.md",
        "docs/security/KEYRING.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale scheduler worker path docs: docs/developer/ARCHITECTURE.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "remove stale refactoring-priority table: docs/developer/GETTING_STARTED.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("remove stale scheduler scraper path docs: docs/security/KEYRING.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale Linux platform stub markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/platforms/linux/mod.rs",
      [
        "//! Linux-Specific Implementation (v2.0 - Coming Soon)",
        "//! This module will contain Linux-specific code for JobSentinel v2.0.",
        "tracing::info!(\"Linux platform initialized (v2.0 - limited functionality)\");",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "src-tauri/src/platforms/linux/mod.rs"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace stale Linux platform stub markers: src-tauri/src/platforms/linux/mod.rs",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale user-data export roadmap claims", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      [
        "- **Export anytime** - You can export your data as JSON (feature coming in v1.5)",
        "Consider creating a backup first (feature coming in v1.5).",
        "**v1.5 (Q1 2026):**",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/user-data-management.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale user-data export roadmap claim: docs/features/user-data-management.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects Deep Links doc emoji and version promises", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/user/DEEP_LINKS.md",
      [
        "These are clearly marked with a 🔐 icon.",
        "| **Legal** | ✅ Always | ⚠️ Site-dependent |",
        "- **Saved Searches** (coming in v2.7) - Save favorite deep link searches",
        "Not yet, but planned for v2.7.",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/user/DEEP_LINKS.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace Deep Links doc emoji/version promises: docs/user/DEEP_LINKS.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects Quick Start doc emoji markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      [
        "- ✅ **Remote** - Work from anywhere",
        "### Resume Builder 📄",
        "- 🚀 **Speed up applications** with One-Click Apply",
        "**Happy job hunting!** 🎯",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/user/QUICK_START.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace Quick Start doc emoji markers: docs/user/QUICK_START.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects front-door doc emoji markers", () => {
  withGitFixture((root) => {
    const chartIcon = String.fromCodePoint(0x1f4ca);
    const rocketIcon = String.fromCodePoint(0x1f680);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "README.md", `# JobSentinel ${rocketIcon}\n`);
    writeFixtureFile(root, "docs/README.md", `### What's New in v2.5 ${chartIcon}\n`);

    execFileSync("git", ["add", "package.json", "README.md", "docs/README.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace front-door doc emoji markers: README.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace front-door doc emoji markers: docs/README.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects scraper doc emoji markers", () => {
  withGitFixture((root) => {
    const doneIcon = String.fromCodePoint(0x2705);
    const warningIcon = String.fromCodePoint(0x26a0, 0xfe0f);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/scrapers.md",
      [
        `| LinkedIn | ${doneIcon} Production |`,
        `- ${warningIcon} User responsibility: comply with site terms`,
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/scrapers.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace scraper doc emoji markers: docs/features/scrapers.md"),
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
      "docs/features/scraper-health.md",
      [
        `LinkedIn ${greenIcon} Healthy`,
        `Click **${testIcon} Test** button`,
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/scraper-health.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace scraper health doc emoji markers: docs/features/scraper-health.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects feature status color emoji markers", () => {
  withGitFixture((root) => {
    const yellowIcon = String.fromCodePoint(0x1f7e1);
    const redIcon = String.fromCodePoint(0x1f534);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/ghost-detection.md",
      [
        `- ${yellowIcon} **Yellow** - Minor concerns`,
        `- ${redIcon} **Red** - Probably fake`,
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/resume-builder.md",
      [
        `- ${yellowIcon} **60-79** - Good, but could be better`,
        `- ${redIcon} **0-39** - Major issues`,
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/features/ghost-detection.md", "docs/features/resume-builder.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace feature status color emoji markers: docs/features/ghost-detection.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace feature status color emoji markers: docs/features/resume-builder.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects Market Intelligence doc emoji markers", () => {
  withGitFixture((root) => {
    const chartIcon = String.fromCodePoint(0x1f4c8);
    const moneyIcon = String.fromCodePoint(0x1f4b0);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/market-intelligence.md",
      [
        `## ${chartIcon} Overview`,
        `- **${moneyIcon} Salary Trends** - Monitor salary changes`,
        "pub fn severity_emoji(&self) -> &str;",
        "pub fn sentiment_emoji(&self) -> &str;",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/market-intelligence.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace Market Intelligence doc emoji/stale indicator markers: docs/features/market-intelligence.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale application tracking doc claims", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/application-tracking.md",
      [
        "## 🎨 UI Integration (Future)",
        "// src/pages/ApplicationTracker.tsx",
        "const kanban = await invoke<ApplicationsByStatus>('get_applications_by_status');",
        "- [ ] Tauri commands",
        "- [ ] UI components (Kanban board)",
        "**Next Feature:** UI Connections & Polish (v1.4 E4)",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/application-tracking.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale application tracking doc claims: docs/features/application-tracking.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale smart scoring salary marker claims", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      [
        "Predicted salaries are marked with a 🤖 icon.",
        "**Implementation Status:** ✅ Complete (All features implemented)",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/smart-scoring.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "remove stale smart-scoring salary marker claim: docs/features/smart-scoring.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw private query logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/jobs.rs",
      'tracing::info!("Command: search_jobs_query (query: {}, limit: {})", query, limit);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/commands/automation.rs",
      'tracing::info!("Command: find_answer_for_question (question: {})", question);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/queries.rs",
      'tracing::debug!("Performing full-text search with query: \'{}\'", query);\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/jobs.rs",
        "src-tauri/src/commands/automation.rs",
        "src-tauri/src/core/db/queries.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw private query logging: src-tauri/src/commands/jobs.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw private query logging: src-tauri/src/commands/automation.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw private query logging: src-tauri/src/core/db/queries.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw scraper URL and query logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/cache.rs",
      'tracing::debug!("Cache HIT for URL: {}", url);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/http_client.rs",
      'tracing::debug!("Cache miss, fetching: {}", url);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/scrapers/dice.rs",
      'tracing::info!("Fetching jobs from Dice for query: {}", self.query);\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/core/scrapers/cache.rs",
        "src-tauri/src/core/scrapers/http_client.rs",
        "src-tauri/src/core/scrapers/dice.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw scraper URL/query logging: src-tauri/src/core/scrapers/cache.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw scraper URL/query logging: src-tauri/src/core/scrapers/http_client.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw scraper URL/query logging: src-tauri/src/core/scrapers/dice.rs"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects raw local path logging", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "src-tauri/src/commands/resume.rs",
      'tracing::info!("Command: upload_resume (name: {}, path: {})", name, file_path);\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/automation/form_filler.rs",
      'tracing::debug!(resume_path = %resume_path.display(), "Uploading resume");\n',
    );
    writeFixtureFile(
      root,
      "src-tauri/src/core/db/connection.rs",
      'tracing::info!("Pre-migration backup created: {}", backup_path.display());\n',
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "src-tauri/src/commands/resume.rs",
        "src-tauri/src/core/automation/form_filler.rs",
        "src-tauri/src/core/db/connection.rs",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace raw local path logging: src-tauri/src/commands/resume.rs"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace raw local path logging: src-tauri/src/core/automation/form_filler.rs",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace raw local path logging: src-tauri/src/core/db/connection.rs"),
      violations.join("\n"),
    );
  });
});
