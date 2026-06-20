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

test("checkRepoBloat rejects overbroad localStorage migration claims", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      "- Backend persistence for all user data (localStorage → SQLite)\n",
    );

    execFileSync("git", ["add", "package.json", "docs/ROADMAP.md"], { cwd: root });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace overbroad localStorage migration claim: docs/ROADMAP.md"),
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
        "- 🚀 **Review applications** with Application Assist",
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

test("checkRepoBloat rejects active user doc glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/application-tracking.md",
      ["applications", "├── id (PRIMARY KEY)", "To Apply → Applied", ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      "Only notify for jobs scoring ≥ threshold\n",
    );
    writeFixtureFile(
      root,
      "docs/user/QUICK_START.md",
      "Go to System Settings → Privacy & Security\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/application-tracking.md",
        "docs/features/user-data-management.md",
        "docs/user/QUICK_START.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace active user doc glyph markers: docs/features/application-tracking.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace active user doc glyph markers: docs/features/user-data-management.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace active user doc glyph markers: docs/user/QUICK_START.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects feature doc glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/ghost-detection.md",
      "Customize in Settings → Detection → Ghost Job Settings\n",
    );
    writeFixtureFile(
      root,
      "docs/features/json-resume-import.md",
      "\"beginner\" → Beginner\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/ghost-detection.md",
        "docs/features/json-resume-import.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace feature doc glyph markers: docs/features/ghost-detection.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace feature doc glyph markers: docs/features/json-resume-import.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects maintained doc glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "docs/README.md", ["docs/", "├── README.md", "└── images/", ""].join("\n"));
    writeFixtureFile(root, "docs/ROADMAP.md", "Resume → Builder Integration\n");
    writeFixtureFile(
      root,
      "docs/style-guide/GLOSSARY.md",
      "Go to System Settings → Privacy & Security\n",
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/README.md", "docs/ROADMAP.md", "docs/style-guide/GLOSSARY.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace maintained doc glyph markers: docs/README.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace maintained doc glyph markers: docs/ROADMAP.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace maintained doc glyph markers: docs/style-guide/GLOSSARY.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects developer layout doc glyph markers", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/developer/GETTING_STARTED.md",
      ["JobSentinel/", "├── src/", "└── vite.config.ts", ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/FRONTEND_TESTING.md",
      ["src/", "├── components/", "└── test/", ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/TESTING.md",
      ["src-tauri/", "├── src/", "└── tests/", ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/INTEGRATION_TESTING.md",
      "Full pipelines - Scraper → Scorer → Database → Notifications\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/developer/FRONTEND_TESTING.md",
        "docs/developer/GETTING_STARTED.md",
        "docs/developer/TESTING.md",
        "docs/developer/INTEGRATION_TESTING.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace developer layout doc glyph markers: docs/developer/FRONTEND_TESTING.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace developer layout doc glyph markers: docs/developer/GETTING_STARTED.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace developer layout doc glyph markers: docs/developer/TESTING.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace developer layout doc glyph markers: docs/developer/INTEGRATION_TESTING.md"),
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

test("checkRepoBloat rejects feature doc stale metadata blocks", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/ghost-detection.md",
      "**Version:** 2.6.4 | **Last Updated:** March 18, 2026\n",
    );
    writeFixtureFile(
      root,
      "docs/features/notifications.md",
      "**Version:** 2.6.4 | **Last Updated:** March 18, 2026\n",
    );
    writeFixtureFile(
      root,
      "docs/features/application-assist.md",
      "**Version:** 2.6.4 | **Last Updated:** March 18, 2026\n",
    );
    writeFixtureFile(
      root,
      "docs/features/resume-builder.md",
      "**Version:** 2.6.4 | **Last Updated:** March 18, 2026\n",
    );
    writeFixtureFile(
      root,
      "docs/features/user-data-management.md",
      [
        "**Version:** 2.6.4 | **Status:** Stable | **Last Updated:** March 18, 2026",
        "**Version:** 2.6.4 | **Updated:** March 18, 2026",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/resume-matcher.md",
      "> **Status:** ENABLED - Module fully functional\n> **Version:** 2.6.4\n",
    );
    writeFixtureFile(
      root,
      "docs/features/smart-scoring.md",
      "## Version History\n\n**Next Phase:** ML-based skills matching (v2.7)\n",
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/ghost-detection.md",
        "docs/features/notifications.md",
        "docs/features/application-assist.md",
        "docs/features/resume-builder.md",
        "docs/features/user-data-management.md",
        "docs/features/resume-matcher.md",
        "docs/features/smart-scoring.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace feature doc stale metadata: docs/features/ghost-detection.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace feature doc stale metadata: docs/features/notifications.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace feature doc stale metadata: docs/features/application-assist.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace feature doc stale metadata: docs/features/resume-builder.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace feature doc stale metadata: docs/features/user-data-management.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace feature doc stale metadata: docs/features/resume-matcher.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace feature doc stale metadata: docs/features/smart-scoring.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects synonym and remote preference doc drift", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/synonym-matching.md",
      [
        '- ✅ "py" matches "py script"',
        '- "Kuberntes" → "Kubernetes"',
        'The system comes with synonym groups for common tech terms:',
        '- "Python developer needed"',
        '"title_allowlist": ["Senior Engineer"]',
        "### Custom Synonyms (v2.1+)",
        "**Version:** 2.6.4 | **Last Updated:** March 18, 2026",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/remote-preference-scoring.md",
      [
        "| Hybrid | 0.5 | ⚠ Prefer remote-only |",
        "- All preference × job type combinations",
        "**Module:** `src-tauri/src/core/scoring/remote.rs`",
        "### User Preference Modes",
        "### Graduated Scoring Matrix",
        "### Scoring Weight",
        "| Job Type | Score | Meaning |",
        "Potential improvements for v2.0+:",
        "**Version:** 2.6.4 | **Last Updated:** March 18, 2026",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/features/synonym-matching.md",
        "docs/features/remote-preference-scoring.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync synonym and remote preference docs: docs/features/synonym-matching.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "sync synonym and remote preference docs: docs/features/remote-preference-scoring.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects Hiring Trends doc glyph markers", () => {
  withGitFixture((root) => {
    const chartIcon = String.fromCodePoint(0x1f4c8);
    const moneyIcon = String.fromCodePoint(0x1f4b0);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/hiring-trends.md",
      [
        `## ${chartIcon} Overview`,
        `- **${moneyIcon} Salary Trends** - Monitor salary changes`,
        "┌──────────────┐",
        "│ Dashboard    │",
        "└──────────────┘",
        "Trend → Dashboard",
        "Company ▲",
        "pub fn severity_emoji(&self) -> &str;",
        "pub fn sentiment_emoji(&self) -> &str;",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/hiring-trends.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace Hiring Trends doc glyph/stale indicator markers: docs/features/hiring-trends.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale Hiring Trends doc shape", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/hiring-trends.md",
      [
        "## Technical Documentation",
        "## Real-Time Analytics & Trend Visualization",
        "data-driven career decisions with comprehensive market insights",
        "## Architecture",
        "### Database Schema",
        "## Usage Guide",
        "## API Reference",
        "## Implementation Status",
        "### Phase 2: Enhanced Analytics Planned",
        "### Phase 3: Advanced Visualization Complete",
        "- [ ] Machine learning trend prediction",
        "## Scheduled Jobs",
        "### Daily Analysis (Recommended: 2 AM)",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/hiring-trends.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync Hiring Trends docs with local evidence guidance: docs/features/hiring-trends.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects Resume Matcher and Salary AI feature doc emoji markers", () => {
  withGitFixture((root) => {
    const targetIcon = String.fromCodePoint(0x1f3af);
    const chartIcon = String.fromCodePoint(0x1f4ca);
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/resume-matcher.md",
      [`## ${targetIcon} Overview`, `- **${chartIcon} Gap Analysis**`, "✓ Matching Skills", ""].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/features/pay-protection.md",
      [
        `## ${targetIcon} Overview`,
        `- **${chartIcon} Salary Benchmarks**`,
        "job_hash (FK → jobs)",
        "├── placeholders",
        "",
      ].join("\n"),
    );

    execFileSync(
      "git",
      ["add", "package.json", "docs/features/resume-matcher.md", "docs/features/pay-protection.md"],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "replace resume and salary feature doc emoji markers: docs/features/resume-matcher.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace resume and salary feature doc emoji markers: docs/features/pay-protection.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects stale Resume Matcher doc UI shape", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/resume-matcher.md",
      [
        "# AI Resume-Job Matcher",
        "## Intelligent Resume Analysis & Job Compatibility Scoring",
        "Stop manually comparing job requirements and let JobSentinel do the matching work.",
        "## Architecture",
        "### Database Schema",
        "## Usage Guide",
        "## Matching Algorithm",
        "### Future Enhancements",
        "- [ ] A/B Testing",
        "- [ ] Resume Optimization - Suggest keywords to add",
        "## API Reference",
        "## Implementation Status",
        "keyword match against job description",
        "Keyword-based skill extraction",
        "// src/pages/ResumeManager.tsx",
        "const filteredSkills = match.matching_skills.filter(skill => skill.category === selectedCategory);",
        "return <ResumeMatchScoreBreakdown skillsScore={match.skills_score} />;",
        "return <span>{skill.name} {skill.confidence} {skill.years_experience}</span>;",
        "",
      ].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/resume-matcher.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes(
        "sync resume matcher docs with live Resume page shape: docs/features/resume-matcher.md",
      ),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects confusing Resume Matcher AI labels", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/ROADMAP.md",
      [
        "- AI Resume-Job Matcher: PDF parsing, skill extraction, matching",
        "### AI Resume-Job Matcher (Working)",
        "",
      ].join("\n"),
    );
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      ["#### `core/resume/`", "", "**Purpose**: AI Resume-Job Matcher", ""].join("\n"),
    );
    writeFixtureFile(root, "docs/features/resume-matcher.md", "# Resume Matcher\n");

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/ROADMAP.md",
        "docs/developer/ARCHITECTURE.md",
        "docs/features/resume-matcher.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("replace confusing Resume Matcher AI label: docs/ROADMAP.md"),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes(
        "replace confusing Resume Matcher AI label: docs/developer/ARCHITECTURE.md",
      ),
      violations.join("\n"),
    );
    assert.ok(
      violations.includes("replace confusing Resume Matcher AI label: docs/features/resume-matcher.md"),
      violations.join("\n"),
    );
  });
});

test("checkRepoBloat rejects confusing Salary AI labels", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(root, "docs/README.md", "- Salary AI with negotiation insights\n");
    writeFixtureFile(
      root,
      "docs/developer/ARCHITECTURE.md",
      ["#### `core/salary/`", "", "**Purpose**: Salary AI", ""].join("\n"),
    );
    writeFixtureFile(root, "docs/features/pay-protection.md", "# Salary AI\n");

    execFileSync(
      "git",
      [
        "add",
        "package.json",
        "docs/README.md",
        "docs/developer/ARCHITECTURE.md",
        "docs/features/pay-protection.md",
      ],
      { cwd: root },
    );

    const violations = checkRepoBloat(root);

    for (const path of [
      "docs/README.md",
      "docs/developer/ARCHITECTURE.md",
      "docs/features/pay-protection.md",
    ]) {
      assert.ok(
        violations.includes(`replace confusing Salary AI label: ${path}`),
        violations.join("\n"),
      );
    }
  });
});

test("checkRepoBloat rejects stale Salary AI future UI claim", () => {
  withGitFixture((root) => {
    writeFixtureFile(root, "package.json", "{}\n");
    writeFixtureFile(
      root,
      "docs/features/pay-protection.md",
      ["### Phase 2-4: Future", "", "- [ ] UI components", ""].join("\n"),
    );

    execFileSync("git", ["add", "package.json", "docs/features/pay-protection.md"], {
      cwd: root,
    });

    const violations = checkRepoBloat(root);

    assert.ok(
      violations.includes("remove stale Salary AI future UI claim: docs/features/pay-protection.md"),
      violations.join("\n"),
    );
  });
});
